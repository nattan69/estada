"""Càlcul de preus i desglossament d'impostos d'una reserva.

Reuneix el càlcul de la base (habitació + pensió), l'IVA per servei (segons
la taula `services` de la BD) i l'ecotaxa (ITS, segons `ecotax_configs`), per
produir el desglossament complet que el check-in factura a l'entrada i que la
factura (VeriFactu) desglossa.

Convenció: `FolioItem.amount` és NET (base); l'IVA i l'ecotaxa es posten com
a items separats (type=tax) amb `account_code` vat_payable / tax_payable.
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy.orm import Session

from ..models.models import MealPlan, Property, Reservation, Service
from .ecotax_service import calculate_ecotax

DEFAULT_ROOM_VAT = Decimal("0.10")
DEFAULT_MEAL_VAT = Decimal("0.10")


def _vat_rate_for(db: Session, tenant_id: UUID | None, code: str, default: Decimal) -> Decimal:
    """Tipus d'IVA d'un servei per codi (font de veritat: taula `services`)."""
    if tenant_id is None:
        return default
    svc = (
        db.query(Service)
        .filter(Service.tenant_id == tenant_id, Service.code == code, Service.active.is_(True))
        .first()
    )
    if svc and svc.vat_rate is not None:
        return Decimal(str(svc.vat_rate))
    return default


def build_reservation_breakdown(db: Session, reservation: Reservation) -> dict:
    """Desglossament complet (base + IVA + ecotaxa) d'una reserva.

    Retorna un dict amb: `base_room`, `base_meal`, `vat_room`, `vat_meal`,
    `ecotaxa`, `vat_ecotaxa`, `total`, i els `vat_rate_room`/`vat_rate_meal`
    usats. `night.amount` es considera base neta (sense IVA).
    """
    prop = db.get(Property, reservation.property_id)
    tenant_id = prop.tenant_id if prop else None

    vat_room = _vat_rate_for(db, tenant_id, "room", DEFAULT_ROOM_VAT)
    vat_meal = _vat_rate_for(db, tenant_id, "meal", DEFAULT_MEAL_VAT)

    # Base allotjament = suma de les nits (amount = base neta).
    base_room = sum((Decimal(str(n.amount or 0)) for n in reservation.nights), Decimal("0"))

    # Base pensió = meal_plan_price × nits (si hi ha pensió contractada).
    base_meal = Decimal("0")
    if reservation.meal_plan and reservation.meal_plan != MealPlan.ROOM_ONLY.value:
        nights = max(0, (reservation.check_out - reservation.check_in).days)
        base_meal = Decimal(str(reservation.meal_plan_price or 0)) * nights

    vat_room_amount = (base_room * vat_room).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    vat_meal_amount = (base_meal * vat_meal).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Ecotaxa (ITS) + el seu IVA (10%).
    eco = calculate_ecotax(
        db,
        property_id=reservation.property_id,
        check_in=reservation.check_in,
        check_out=reservation.check_out,
        adults=reservation.adults or 0,
        children=reservation.children or 0,
    )
    ecotaxa = Decimal(str(eco["total"]))
    vat_ecotaxa = Decimal(str(eco["vat"]))

    total = base_room + base_meal + vat_room_amount + vat_meal_amount + ecotaxa + vat_ecotaxa

    return {
        "base_room": base_room,
        "base_meal": base_meal,
        "vat_room": vat_room_amount,
        "vat_meal": vat_meal_amount,
        "ecotaxa": ecotaxa,
        "vat_ecotaxa": vat_ecotaxa,
        "total": total,
        "vat_rate_room": vat_room,
        "vat_rate_meal": vat_meal,
    }
