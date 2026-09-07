from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.models import RoomType, Rate, RatePlan, Inventory


def each_night(check_in: date, check_out: date) -> list[date]:
    nights = []
    current = check_in
    while current < check_out:
        nights.append(current)
        current += timedelta(days=1)
    return nights


def _check_restrictions(
    rate_plan: RatePlan | None,
    total_nights: int,
    adults: int,
    children: int,
    room_type: RoomType,
) -> None:
    """Valida restriccions d'estada i ocupacio ABANS de fer cap reserva."""
    if adults > room_type.max_adults:
        raise ValueError("Excede el maximo de adultos")
    if children > room_type.max_children:
        raise ValueError("Excede el maximo de ninos")
    # base_occupancy es la capacitat base; si es vol permetre sobraocupacio
    # controlada, fer-ho via la politica del plan, no bloquejant aqui.
    if rate_plan:
        if rate_plan.min_stay and total_nights < rate_plan.min_stay:
            raise ValueError("No se cumple la estancia minima")
        if rate_plan.max_stay and total_nights > rate_plan.max_stay:
            raise ValueError("Excede la estancia maxima")


def search_availability(
    db: Session,
    property_id: str,
    check_in: date,
    check_out: date,
    adults: int,
    children: int = 0,
    rate_plan_id: str | None = None,
):
    nights = each_night(check_in, check_out)
    total_nights = len(nights)

    if total_nights == 0:
        raise ValueError("Rango de fechas invalido")

    # Normalizar property_id a UUID (el modelo usa UUID, el query param llega como str)
    if isinstance(property_id, str):
        property_id = UUID(property_id)
    if rate_plan_id and isinstance(rate_plan_id, str):
        rate_plan_id = UUID(rate_plan_id)

    room_types = db.query(RoomType).filter(
        RoomType.property_id == property_id,
        RoomType.active == True,
    ).all()

    response = []

    for room_type in room_types:
        available = True
        total = Decimal("0")
        breakdown = []

        # Resoldre el plan de tarifa: obligatori per validar min_stay/max_stay
        rate_plan = None
        if rate_plan_id:
            rate_plan = db.query(RatePlan).filter(
                RatePlan.id == rate_plan_id,
                RatePlan.property_id == property_id,
            ).first()
        else:
            rate_plan = db.query(RatePlan).filter(
                RatePlan.property_id == property_id,
                RatePlan.active == True,
            ).order_by(RatePlan.id).first()

        try:
            _check_restrictions(rate_plan, total_nights, adults, children, room_type)
        except ValueError:
            continue

        for night in nights:
            inventory = db.query(Inventory).filter(
                Inventory.room_type_id == room_type.id,
                Inventory.date == night,
            ).first()

            rate_query = db.query(Rate).filter(
                Rate.room_type_id == room_type.id,
                Rate.date == night,
            )
            if rate_plan_id:
                rate_query = rate_query.filter(Rate.rate_plan_id == rate_plan_id)
            rate = rate_query.first()

            if not inventory or not rate or rate.stop_sell:
                available = False
                break

            # Restriccions PER DIA de la fila Rate
            if rate.closed_to_arrival and night == nights[0]:
                available = False
                break
            if rate.closed_to_departure and night == nights[-1]:
                available = False
                break

            remaining = (
                Decimal(inventory.allotment)
                + Decimal(inventory.overbooking_allowed)
                - Decimal(inventory.sold)
                - Decimal(inventory.blocked)
            )

            if remaining <= 0:
                available = False
                break

            total += Decimal(rate.price)
            breakdown.append({
                "date": night.isoformat(),
                "price": float(rate.price),
                "remaining": int(remaining),
            })

        if available:
            response.append({
                "room_type_id": str(room_type.id),
                "name": room_type.name,
                "total_nights": total_nights,
                "total_price": float(total),
                "currency": "EUR",
                "breakdown": breakdown,
            })

    return response
