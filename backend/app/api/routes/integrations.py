from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import unicodedata

from ...database import get_db
from ...config import settings
from ...models.models import (
    Reservation, Room, Folio, FolioItem, Payment, WebhookEvent,
    ReservationStatus, ReservationSource, FolioItemType, PaymentStatus,
    CreditLineType, FolioTarget,
)
from ...schemas.schemas import (
    PosRoomChargeCreate, PosRoomChargeResponse,
    OtaWebhookCreate, OtaWebhookResponse,
    VccChargeCreate, PaymentOut,
)
from ...services.outbox import publish
from ...services.journal_service import journal_extra_posted

router = APIRouter()


# ============================================================
# Helpers
# ============================================================

def _normalize(s: Optional[str]) -> str:
    """Normaliza acentos, espacios y mayúsculas para comparar nombres."""
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return " ".join(s.lower().split())


def _check_credit(reservation: Reservation, amount: Decimal) -> Optional[str]:
    """Comprova la línia de crèdit de la reserva abans de carregar un extra.

    Retorna un missatge d'error (string) si el càrrec NO està permès, o `None`
    si es pot carregar. Regla (doc Mews → política de Tomeu):
    - `none`: no s'hi carrega res (cobrament al moment o master).
    - `limited`: es carrega fins al límit; si el foli ja el supera, es rebutja.
    - `full`: es carrega sense límit.
    """
    credit_type = getattr(reservation, "credit_type", None) or CreditLineType.FULL.value
    if credit_type == CreditLineType.NONE.value:
        return "L'habitació no té crèdit: l'extra s'ha de cobrar al moment"
    if credit_type == CreditLineType.LIMITED.value:
        limit = Decimal(str(getattr(reservation, "credit_limit", None) or 0))
        if limit > 0:
            folio = reservation.folio
            already = Decimal(str(folio.balance or 0)) if folio else Decimal("0")
            if already + amount > limit:
                return (
                    f"Límit de crèdit superat (límit {limit}, pendent {already}, "
                    f"càrrec {amount})"
                )
    return None


def _require_api_key(x_api_key: Optional[str], expected: str, name: str) -> None:
    """Valida la cabecera X-API-Key contra la clave configurada."""
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Integración {name} no configurada (falta la clave en .env)",
        )
    if not x_api_key or x_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"API key inválida para {name}",
        )


def _recalc_folio(folio: Folio) -> None:
    """Recalcula total_amount y balance del folio a partir de sus items y pagos."""
    total = sum((i.amount or Decimal("0")) for i in folio.items)
    paid = sum((p.amount or Decimal("0")) for p in folio.payments)
    folio.total_amount = total
    folio.paid_amount = paid
    folio.balance = total - paid


# ============================================================
# 13.1. Comanda (TPV) -> room charges
# ============================================================

@router.post("/pos/room-charges", response_model=PosRoomChargeResponse, status_code=status.HTTP_201_CREATED)
def pos_room_charge(
    payload: PosRoomChargeCreate,
    x_api_key: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_api_key(x_api_key, settings.POS_API_KEY, "Comanda (POS)")

    # 1. Idempotencia: si ya existe un item con este external_id, devolverlo.
    existing = db.query(FolioItem).filter(FolioItem.external_id == payload.external_id).first()
    if existing:
        return PosRoomChargeResponse(
            success=True,
            folio_id=existing.folio_id,
            folio_item_id=existing.id,
            reservation_id=existing.folio.reservation_id if existing.folio else None,
        )

    # 2. Localizar la reserva activa de la habitación (criterio primario: room_number + checked_in).
    room = db.query(Room).filter(Room.number == payload.room_number).first()
    if not room:
        return PosRoomChargeResponse(
            success=False,
            error="room_not_found",
            message=f"No s'ha trobat l'habitació {payload.room_number}",
        )

    reservation = (
        db.query(Reservation)
        .filter(
            Reservation.assigned_room_id == room.id,
            Reservation.status == ReservationStatus.CHECKED_IN.value,
        )
        .first()
    )

    # 3. Si no hay reserva checked-in, error 404.
    if not reservation:
        return PosRoomChargeResponse(
            success=False,
            error="guest_not_found",
            message=f"No s'ha trobat cap guest checked-in a l'habitació {payload.room_number}",
        )

    # Desambiguar por guest_name si hay más de un guest en la misma habitación.
    if payload.guest_name:
        guest = reservation.guest
        if guest:
            full = _normalize(f"{guest.first_name} {guest.last_name}")
            target = _normalize(payload.guest_name)
            if target and target not in full and full not in target:
                return PosRoomChargeResponse(
                    success=False,
                    error="guest_not_found",
                    message=(
                        f"No s'ha trobat cap guest checked-in a l'habitació "
                        f"{payload.room_number} amb el nom {payload.guest_name}"
                    ),
                )

    # 3.5 Comprovar la línia de crèdit abans de carregar l'extra.
    credit_error = _check_credit(reservation, Decimal(str(payload.amount)))
    if credit_error:
        return PosRoomChargeResponse(
            success=False,
            error="credit_denied",
            message=credit_error,
        )

    # 4. Obtener (o crear) el folio de la reserva (els extres van al foli guest).
    folio = None
    for f in reservation.folios:
        if f.folio_target == FolioTarget.GUEST.value:
            folio = f
            break
    if not folio:
        folio = Folio(
            property_id=reservation.property_id,
            reservation_id=reservation.id,
            guest_id=reservation.guest_id,
            kind="reservation",
            folio_target=FolioTarget.GUEST.value,
            status="open",
            currency=reservation.currency or "EUR",
        )
        db.add(folio)
        db.flush()

    # 5. Crear FolioItem con type=pos_charge y tax_rate por línea.
    description = ", ".join(
        f"{it.name} x{it.qty}" for it in payload.items
    ) if payload.items else "Càrrec de Comanda"

    # tax_rate ponderado: si hay items, usar el de la primera línea (o media simple).
    tax_rate = Decimal("0.00")
    if payload.items:
        tax_rate = sum((it.tax_rate for it in payload.items), Decimal("0.00")) / len(payload.items)

    posted_at = payload.timestamp or datetime.now()

    item = FolioItem(
        folio_id=folio.id,
        type=FolioItemType.POS_CHARGE.value,
        description=description,
        quantity=1,
        unit_price=payload.amount,
        tax_rate=tax_rate,
        amount=payload.amount,
        external_id=payload.external_id,
        posted_at=posted_at,
    )
    db.add(item)
    db.flush()

    # 6. Recalcular folio.
    _recalc_folio(folio)

    # 6.5 Assentament comptable de l'extra (D foli → H extra_revenue + IVA).
    base = Decimal(str(payload.amount)) / (Decimal("1") + Decimal(str(tax_rate)))
    tax = Decimal(str(payload.amount)) - base
    journal_extra_posted(
        db,
        property_id=reservation.property_id,
        folio_id=folio.id,
        base_amount=base,
        tax_amount=tax,
        entry_date=(posted_at.date() if hasattr(posted_at, "date") else datetime.now().date()),
        description=description,
    )

    # 7. Publicar esdeveniment de domini (outbox) dins la mateixa transacció.
    publish(
        db,
        aggregate="folio",
        aggregate_id=str(folio.id),
        type_="FolioChargePosted",
        payload={
            "folio_id": str(folio.id),
            "folio_item_id": str(item.id),
            "reservation_id": str(reservation.id),
            "source": "comanda",
            "external_id": payload.external_id,
            "amount": str(payload.amount),
        },
    )

    db.commit()
    db.refresh(item)

    return PosRoomChargeResponse(
        success=True,
        folio_id=folio.id,
        folio_item_id=item.id,
        reservation_id=reservation.id,
    )


# ============================================================
# 13.4. OTA / Channel Manager -> webhooks de reservas
# ============================================================

@router.post("/ota/webhook", response_model=OtaWebhookResponse, status_code=status.HTTP_201_CREATED)
def ota_webhook(
    payload: OtaWebhookCreate,
    x_api_key: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_api_key(x_api_key, settings.OTA_API_KEY, "OTA / Channel Manager")

    # Idempotencia: si ya existe un WebhookEvent con este provider+external_id, devolverlo.
    existing = db.query(WebhookEvent).filter(
        WebhookEvent.provider == payload.provider,
        WebhookEvent.external_id == payload.external_id,
    ).first()
    if existing:
        return OtaWebhookResponse(
            success=True,
            webhook_event_id=existing.id,
            message="Evento ya procesado (idempotente)",
        )

    # Registrar el evento (outbox/auditoría) antes de procesar.
    event = WebhookEvent(
        provider=payload.provider,
        external_id=payload.external_id,
        type=payload.type,
        payload=payload.payload,
        status="pending",
    )
    db.add(event)
    db.flush()

    # Procesar solo eventos de creación de reserva (Fase 1).
    if payload.type == "reservation_created":
        data = payload.payload or {}
        property_id = data.get("property_id")
        guest_id = data.get("guest_id")
        room_type_id = data.get("room_type_id")
        check_in = data.get("check_in")
        check_out = data.get("check_out")

        if not all([property_id, guest_id, room_type_id, check_in, check_out]):
            event.status = "failed"
            event.error = "payload incompleto: faltan property_id/guest_id/room_type_id/check_in/check_out"
            db.commit()
            return OtaWebhookResponse(
                success=False,
                webhook_event_id=event.id,
                error="invalid_payload",
                message=event.error,
            )

        from datetime import date as date_cls
        try:
            check_in_d = date_cls.fromisoformat(str(check_in))
            check_out_d = date_cls.fromisoformat(str(check_out))
        except ValueError:
            event.status = "failed"
            event.error = "fechas inválidas"
            db.commit()
            return OtaWebhookResponse(
                success=False,
                webhook_event_id=event.id,
                error="invalid_dates",
                message="check_in/check_out no son fechas válidas",
            )

        reservation = Reservation(
            property_id=UUID(str(property_id)),
            guest_id=UUID(str(guest_id)),
            room_type_id=UUID(str(room_type_id)),
            rate_plan_id=UUID(str(data["rate_plan_id"])) if data.get("rate_plan_id") else None,
            assigned_room_id=UUID(str(data["assigned_room_id"])) if data.get("assigned_room_id") else None,
            confirmation_code=str(data.get("confirmation_code") or payload.external_id),
            status=ReservationStatus.CONFIRMED.value,
            source=ReservationSource.OTA.value,
            check_in=check_in_d,
            check_out=check_out_d,
            adults=int(data.get("adults", 2)),
            children=int(data.get("children", 0)),
            total_amount=Decimal(str(data.get("total_amount", "0"))),
            currency=str(data.get("currency", "EUR")),
            notes=data.get("notes"),
        )
        db.add(reservation)
        db.flush()

        # Publicar esdeveniment de domini (outbox) dins la mateixa transacció.
        publish(
            db,
            aggregate="reservation",
            aggregate_id=str(reservation.id),
            type_="ReservationCreated",
            payload={
                "reservation_id": str(reservation.id),
                "property_id": str(reservation.property_id),
                "source": "ota",
                "provider": payload.provider,
                "external_id": payload.external_id,
            },
        )

        event.status = "processed"
        event.processed_at = datetime.now()
        db.commit()

        return OtaWebhookResponse(
            success=True,
            reservation_id=reservation.id,
            webhook_event_id=event.id,
        )

    # Otros tipos de evento: solo registrar (Fase 1).
    event.status = "processed"
    event.processed_at = datetime.now()
    db.commit()
    return OtaWebhookResponse(
        success=True,
        webhook_event_id=event.id,
        message=f"Evento {payload.type} registrado (sin procesar en Fase 1)",
    )


# ============================================================
# 13.5. Cobro de tarjetas virtuales (VCC)
# ============================================================

@router.post("/payments/vcc", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def vcc_charge(
    payload: VccChargeCreate,
    x_api_key: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_api_key(x_api_key, settings.POS_API_KEY, "VCC (pasarela)")

    folio = db.get(Folio, payload.folio_id)
    if not folio:
        raise HTTPException(status_code=404, detail="Folio no encontrado")

    # Idempotencia por idempotency_key.
    if payload.idempotency_key:
        existing = db.query(Payment).filter(
            Payment.idempotency_key == payload.idempotency_key
        ).first()
        if existing:
            return existing

    amount = Decimal(str(payload.amount))
    payment = Payment(
        folio_id=folio.id,
        provider="vcc",
        method="virtual_card",
        amount=amount,
        currency=payload.currency,
        external_ref=payload.external_ref,
        idempotency_key=payload.idempotency_key,
        status=PaymentStatus.CAPTURED.value,
        captured_at=datetime.now(),
    )
    db.add(payment)
    db.flush()

    _recalc_folio(folio)

    # Publicar esdeveniment de domini (outbox) dins la mateixa transacció.
    publish(
        db,
        aggregate="payment",
        aggregate_id=str(payment.id),
        type_="PaymentCaptured",
        payload={
            "payment_id": str(payment.id),
            "folio_id": str(folio.id),
            "amount": str(amount),
            "currency": payload.currency,
            "provider": "vcc",
        },
    )

    db.commit()
    db.refresh(payment)
    return payment
