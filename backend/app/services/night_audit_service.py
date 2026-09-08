"""Night Audit: tancament de caixa diari.

El Night Audit és el procés que tanca el dia de negoci d'un property. En un
PMS real fa moltes coses (postar nits, tancar folios, marcar no-shows, fer
check-outs, generar reports, sincronitzar amb comptabilitat). Aquí n'implementem
el nucli financer, de forma idempotent i transaccional:

1. **Postar la nit** (`room_night`) al folio de cada reserva `checked_in`,
   amb l'import de la `ReservationNight` corresponent a la data d'auditoria.
2. **Check-out automàtic** de les reserves que surten avui (`check_out == audit_date`).
3. **No-shows**: reserves `confirmed` amb `check_in == audit_date` que no han
   fet check-in es marquen `no_show`.
4. **Tancar folios** de reserves `checked_out` amb saldo zero.
5. **Resum** (ocupació, revenue, nits postades, folios tancats) que es guarda
   al registre `NightAudit`.

Idempotència: cada execució queda registrada a `night_audits` amb un índex
únic `(property_id, audit_date)`. Si ja s'ha tancat aquesta data, es retorna
el registre existent sense tornar a postar res.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..models.models import (
    Folio,
    FolioItem,
    FolioItemType,
    NightAudit,
    Reservation,
    ReservationNight,
    ReservationStatus,
    Room,
)

logger = logging.getLogger(__name__)


def _get_or_create_folio(db: Session, reservation: Reservation) -> Folio:
    """Retorna el folio de la reserva, creant-lo si no existeix."""
    folio = reservation.folio
    if folio is None:
        folio = Folio(
            property_id=reservation.property_id,
            reservation_id=reservation.id,
            guest_id=reservation.guest_id,
            kind="reservation",
            status="open",
            currency=reservation.currency or "EUR",
        )
        db.add(folio)
        db.flush()
    return folio


def _post_room_night(db: Session, reservation: Reservation, night: ReservationNight) -> FolioItem:
    """Posta la nit d'una reserva al seu folio com a `room_night`."""
    folio = _get_or_create_folio(db, reservation)
    amount = Decimal(str(night.amount or 0))
    item = FolioItem(
        folio_id=folio.id,
        type=FolioItemType.ROOM_NIGHT.value,
        description=f"Allotjament {night.date.isoformat()}",
        quantity=1,
        unit_price=amount,
        tax_rate=Decimal("0.00"),
        amount=amount,
    )
    db.add(item)
    folio.total_amount = (folio.total_amount or Decimal("0")) + amount
    folio.balance = (folio.total_amount or Decimal("0")) - (folio.paid_amount or Decimal("0"))
    return item


def run_night_audit(
    db: Session,
    property_id: UUID,
    audit_date: Optional[date] = None,
    created_by_id: Optional[UUID] = None,
) -> NightAudit:
    """Executa el tancament de caixa per a un property i una data.

    Idempotent: si ja existeix un `NightAudit` per a `(property_id, audit_date)`,
    el retorna sense tornar a postar res.
    """
    audit_date = audit_date or date.today()

    existing = (
        db.query(NightAudit)
        .filter(
            NightAudit.property_id == property_id,
            NightAudit.audit_date == audit_date,
        )
        .first()
    )
    if existing is not None:
        return existing

    audit = NightAudit(
        property_id=property_id,
        audit_date=audit_date,
        status="running",
        created_by_id=created_by_id,
    )
    db.add(audit)
    db.flush()

    summary: dict = {
        "audit_date": audit_date.isoformat(),
        "rooms_total": 0,
        "rooms_occupied": 0,
        "occupancy_pct": "0",
        "arrivals": 0,
        "departures": 0,
        "no_shows": 0,
        "nights_posted": 0,
        "room_revenue": "0",
        "other_revenue": "0",
        "total_revenue": "0",
        "folios_closed": 0,
        "folios_open": 0,
    }

    try:
        # --- Ocupació i habitacions ---
        rooms_total = db.query(Room).filter(Room.property_id == property_id, Room.active.is_(True)).count()
        summary["rooms_total"] = rooms_total

        # --- Reserves checked_in (estades en curs) ---
        in_house = (
            db.query(Reservation)
            .filter(
                Reservation.property_id == property_id,
                Reservation.status == ReservationStatus.CHECKED_IN.value,
            )
            .all()
        )
        summary["rooms_occupied"] = len(in_house)
        if rooms_total:
            summary["occupancy_pct"] = str(round(Decimal(len(in_house)) / Decimal(rooms_total) * 100, 2))

        # --- 1. Postar la nit d'avui a cada estada en curs ---
        nights_posted = 0
        room_revenue = Decimal("0")
        for res in in_house:
            night = (
                db.query(ReservationNight)
                .filter(
                    ReservationNight.reservation_id == res.id,
                    ReservationNight.date == audit_date,
                )
                .first()
            )
            if night is None:
                # No hi ha nit registrada per a aquesta data: res a postar.
                continue
            _post_room_night(db, res, night)
            nights_posted += 1
            room_revenue += Decimal(str(night.amount or 0))
        summary["nights_posted"] = nights_posted
        summary["room_revenue"] = str(room_revenue)

        # --- 2. Check-out automàtic de les reserves que surten avui ---
        departures = (
            db.query(Reservation)
            .filter(
                Reservation.property_id == property_id,
                Reservation.status == ReservationStatus.CHECKED_IN.value,
                Reservation.check_out == audit_date,
            )
            .all()
        )
        for res in departures:
            res.status = ReservationStatus.CHECKED_OUT.value
        summary["departures"] = len(departures)

        # --- 2b. Arrivals: reserves que arriben avui (ja checked_in o checked_out) ---
        arrivals = (
            db.query(Reservation)
            .filter(
                Reservation.property_id == property_id,
                Reservation.check_in == audit_date,
                Reservation.status.in_([
                    ReservationStatus.CHECKED_IN.value,
                    ReservationStatus.CHECKED_OUT.value,
                ]),
            )
            .count()
        )
        summary["arrivals"] = arrivals

        # --- 3. No-shows: confirmed amb check_in d'avui que no han fet check-in ---
        no_shows = (
            db.query(Reservation)
            .filter(
                Reservation.property_id == property_id,
                Reservation.status == ReservationStatus.CONFIRMED.value,
                Reservation.check_in == audit_date,
            )
            .all()
        )
        for res in no_shows:
            res.status = ReservationStatus.NO_SHOW.value
        summary["no_shows"] = len(no_shows)

        # --- 4. Tancar folios de reserves checked_out amb saldo zero ---
        folios_closed = 0
        folios_open = 0
        checked_out = (
            db.query(Reservation)
            .filter(
                Reservation.property_id == property_id,
                Reservation.status == ReservationStatus.CHECKED_OUT.value,
            )
            .all()
        )
        for res in checked_out:
            folio = res.folio
            if folio is None:
                continue
            if folio.status == "closed":
                folios_closed += 1
                continue
            if (folio.balance or Decimal("0")) == 0:
                folio.status = "closed"
                folio.closed_at = datetime.now(timezone.utc)
                folios_closed += 1
            else:
                folios_open += 1
        summary["folios_closed"] = folios_closed
        summary["folios_open"] = folios_open

        # --- 5. Revenue total (nits + altres càrrecs del dia) ---
        # Altres càrrecs: FolioItems no-room_night postats avui.
        other_revenue = Decimal("0")
        # (Simplificat: el revenue de nits ja s'ha comptat; aquí podríem sumar
        #  els càrrecs POS/producte del dia. Ho deixem a 0 per ara.)
        summary["other_revenue"] = str(other_revenue)
        summary["total_revenue"] = str(room_revenue + other_revenue)

        audit.summary = summary
        audit.status = "completed"
        audit.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(audit)
        return audit

    except Exception as exc:  # noqa: BLE001 — volem registrar el fracàs i rellançar
        db.rollback()
        # Després del rollback l'objecte `audit` queda detached: en creem un de
        # nou amb estat `failed` perquè quedi constància del fracàs.
        failed = NightAudit(
            property_id=property_id,
            audit_date=audit_date,
            status="failed",
            created_by_id=created_by_id,
            error=str(exc)[:2000],
            completed_at=datetime.now(timezone.utc),
        )
        db.add(failed)
        db.commit()
        logger.exception("Night audit failed for property %s on %s", property_id, audit_date)
        raise
