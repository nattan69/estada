"""Servei d'assentaments comptables (JournalEntry).

Genera els assentaments de partida doble del circuit del foli (document
«Folio Mews funcionament», Drive → Projectes/Estada). Aquests assentaments
són els «tancaments» que Estada emet cap al hub **Compta**, que els
consolida i exporta (SAGE/A3).

Regles d'or del circuit (aplicades aquí):
- La taxa turística (ITS) és SEMPRE passiu (mai ingrés).
- No duplicar ingressos: si una nit ja estava pagada per endavant (bestreta),
  el night audit aplica la bestreta contra l'ingrés (no genera ingrés nou).
- Els extres només van al foli si la reserva té línia de crèdit.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from ..models.models import (
    AccountCode,
    JournalEntry,
    JournalEntryLine,
    JournalEntrySource,
    JournalEntryType,
    PaymentType,
)


def _post_entry(
    db: Session,
    *,
    property_id: UUID,
    source: str,
    entry_type: str,
    entry_date: date,
    lines: list[tuple[str, Decimal, Decimal]],  # (account_code, debit, credit)
    description: str = "",
    folio_id: Optional[UUID] = None,
    night_audit_id: Optional[UUID] = None,
    source_id: Optional[UUID] = None,
) -> JournalEntry:
    """Crea un assentament amb les seves línies (partida doble).

    `lines` és una llista de tuples `(account_code, debit, credit)`; cada
    línia té o bé `debit` o bé `credit` (mai tots dos), i la suma de debits
    ha d'igualar la suma de credits.
    """
    entry = JournalEntry(
        property_id=property_id,
        source=source,
        source_id=source_id,
        folio_id=folio_id,
        night_audit_id=night_audit_id,
        entry_type=entry_type,
        entry_date=entry_date,
        description=description,
        external_id=f"estada:{entry_type}:{uuid4()}",  # idempotència cap a Compta
    )
    db.add(entry)
    db.flush()
    for account_code, debit, credit in lines:
        db.add(
            JournalEntryLine(
                entry_id=entry.id,
                account_code=account_code,
                debit=debit,
                credit=credit,
            )
        )
    return entry


def journal_advance_received(
    db: Session,
    *,
    property_id: UUID,
    folio_id: UUID,
    amount: Decimal,
    entry_date: date,
) -> JournalEntry:
    """Bestreta rebuda a l'entrada: D CASH, H ADVANCE_CUSTOMERS."""
    amount = Decimal(str(amount or 0))
    return _post_entry(
        db,
        property_id=property_id,
        source=JournalEntrySource.CHECKIN.value,
        entry_type=JournalEntryType.ADVANCE.value,
        entry_date=entry_date,
        folio_id=folio_id,
        description="Bestreta rebuda del client",
        lines=[
            (AccountCode.CASH.value, amount, Decimal("0")),
            (AccountCode.ADVANCE_CUSTOMERS.value, Decimal("0"), amount),
        ],
    )


def _journal_daily_revenue(
    db: Session,
    *,
    property_id: UUID,
    folio_id: UUID,
    amount: Decimal,
    entry_date: date,
    prepaid: bool,
    revenue_account: str,
    entry_type: str,
    description: str,
    night_audit_id: Optional[UUID] = None,
) -> JournalEntry:
    """Assentament d'una producció diària (habitació o pensió) al night audit.

    - `prepaid=True` → la producció aplica la bestreta: D ADVANCE_CUSTOMERS, H <revenue_account>.
    - `prepaid=False` → genera el càrrec al client/TO: D ACCOUNTS_RECEIVABLE, H <revenue_account>.
    """
    amount = Decimal(str(amount or 0))
    debit_account = (
        AccountCode.ADVANCE_CUSTOMERS.value
        if prepaid
        else AccountCode.ACCOUNTS_RECEIVABLE.value
    )
    return _post_entry(
        db,
        property_id=property_id,
        source=JournalEntrySource.NIGHT_AUDIT.value,
        entry_type=entry_type,
        entry_date=entry_date,
        folio_id=folio_id,
        night_audit_id=night_audit_id,
        description=description,
        lines=[
            (debit_account, amount, Decimal("0")),
            (revenue_account, Decimal("0"), amount),
        ],
    )


def journal_room_night(
    db: Session,
    *,
    property_id: UUID,
    folio_id: UUID,
    amount: Decimal,
    entry_date: date,
    prepaid: bool,
    night_audit_id: Optional[UUID] = None,
) -> JournalEntry:
    """Reconeixement de l'ingrés d'una nit d'habitació (night audit)."""
    return _journal_daily_revenue(
        db,
        property_id=property_id,
        folio_id=folio_id,
        amount=amount,
        entry_date=entry_date,
        prepaid=prepaid,
        revenue_account=AccountCode.ROOM_REVENUE.value,
        entry_type=JournalEntryType.ROOM_REVENUE.value,
        description=f"Allotjament {entry_date.isoformat()}",
        night_audit_id=night_audit_id,
    )


def journal_meal(
    db: Session,
    *,
    property_id: UUID,
    folio_id: UUID,
    amount: Decimal,
    entry_date: date,
    prepaid: bool,
    night_audit_id: Optional[UUID] = None,
) -> JournalEntry:
    """Reconeixement de l'ingrés de la pensió diària (night audit)."""
    return _journal_daily_revenue(
        db,
        property_id=property_id,
        folio_id=folio_id,
        amount=amount,
        entry_date=entry_date,
        prepaid=prepaid,
        revenue_account=AccountCode.MEAL_REVENUE.value,
        entry_type=JournalEntryType.MEAL_REVENUE.value,
        description=f"Pensió {entry_date.isoformat()}",
        night_audit_id=night_audit_id,
    )


def journal_payment(
    db: Session,
    *,
    property_id: UUID,
    folio_id: UUID,
    amount: Decimal,
    entry_date: date,
    payment_type: str,
) -> JournalEntry:
    """Cobrament rebut.

    - `deposit` (dipòsit en fer la reserva): D CASH, H DEPOSIT_RECEIVED (4109).
    - `advance` (bestreta a l'entrada): D CASH, H ADVANCE_CUSTOMERS (4108).
    - `settlement` (saldo a la sortida): D CASH, H ACCOUNTS_RECEIVABLE.
    """
    amount = Decimal(str(amount or 0))
    if payment_type == PaymentType.DEPOSIT.value:
        credit_account = AccountCode.DEPOSIT_RECEIVED.value
        source = JournalEntrySource.RESERVATION.value
    elif payment_type == PaymentType.ADVANCE.value:
        credit_account = AccountCode.ADVANCE_CUSTOMERS.value
        source = JournalEntrySource.CHECKIN.value
    else:
        credit_account = AccountCode.ACCOUNTS_RECEIVABLE.value
        source = JournalEntrySource.CHECKOUT.value
    return _post_entry(
        db,
        property_id=property_id,
        source=source,
        entry_type=JournalEntryType.PAYMENT.value,
        entry_date=entry_date,
        folio_id=folio_id,
        description="Cobrament del client",
        lines=[
            (AccountCode.CASH.value, amount, Decimal("0")),
            (credit_account, Decimal("0"), amount),
        ],
    )


def journal_extra_posted(
    db: Session,
    *,
    property_id: UUID,
    folio_id: UUID,
    base_amount: Decimal,
    tax_amount: Decimal,
    entry_date: date,
    tax_account: str = AccountCode.VAT_PAYABLE.value,
    description: str = "Extra carregat",
) -> JournalEntry:
    """Extra carregat al foli del client: D ACCOUNTS_RECEIVABLE,
    H EXTRA_REVENUE (base) + H <tax_account> (quota).

    `tax_account` és `VAT_PAYABLE` per defecte (IVA repercutit); per a la
    taxa turística (ITS) s'ha de passar `TAX_PAYABLE` (passiu per compte de
    l'administració, mai ingrés).
    """
    base_amount = Decimal(str(base_amount or 0))
    tax_amount = Decimal(str(tax_amount or 0))
    total = base_amount + tax_amount
    return _post_entry(
        db,
        property_id=property_id,
        source=JournalEntrySource.POS.value,
        entry_type=JournalEntryType.EXTRA_REVENUE.value,
        entry_date=entry_date,
        folio_id=folio_id,
        description=description,
        lines=[
            (AccountCode.ACCOUNTS_RECEIVABLE.value, total, Decimal("0")),
            (AccountCode.EXTRA_REVENUE.value, Decimal("0"), base_amount),
            (tax_account, Decimal("0"), tax_amount),
        ],
    )
