from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal

# ============================================================
# TENANT
# ============================================================
class TenantBase(BaseModel):
    name: str
    slug: str
    active: bool = True

class TenantCreate(TenantBase):
    pass

class TenantOut(TenantBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================
# USER
# ============================================================
class UserBase(BaseModel):
    tenant_id: Optional[UUID] = None
    email: str
    name: Optional[str] = None
    role: str = "reception"
    active: bool = True

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================
# PROPERTY
# ============================================================
class PropertyBase(BaseModel):
    tenant_id: UUID
    name: str
    code: str
    timezone: str = "Europe/Madrid"
    currency: str = "EUR"
    address: Optional[dict] = None
    active: bool = True

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    address: Optional[dict] = None
    active: Optional[bool] = None

class PropertyOut(PropertyBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================
# ROOM TYPE
# ============================================================
class RoomTypeBase(BaseModel):
    property_id: UUID
    code: str
    name: str
    description: Optional[str] = None
    max_adults: int = 2
    max_children: int = 0
    base_occupancy: int = 2
    active: bool = True

class RoomTypeCreate(RoomTypeBase):
    pass

class RoomTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    max_adults: Optional[int] = None
    max_children: Optional[int] = None
    base_occupancy: Optional[int] = None
    active: Optional[bool] = None

class RoomTypeOut(RoomTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================
# ROOM
# ============================================================
class RoomBase(BaseModel):
    property_id: UUID
    room_type_id: UUID
    number: str
    floor: Optional[str] = None
    status: str = "clean"
    active: bool = True

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    number: Optional[str] = None
    floor: Optional[str] = None
    status: Optional[str] = None
    active: Optional[bool] = None

class RoomOut(RoomBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class RoomStatusUpdate(BaseModel):
    status: str

# ============================================================
# RATE PLAN
# ============================================================
class RatePlanBase(BaseModel):
    property_id: UUID
    code: str
    name: str
    description: Optional[str] = None
    min_stay: int = 1
    max_stay: Optional[int] = None
    policies: Optional[dict] = None
    active: bool = True

class RatePlanCreate(RatePlanBase):
    pass

class RatePlanUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    min_stay: Optional[int] = None
    max_stay: Optional[int] = None
    policies: Optional[dict] = None
    active: Optional[bool] = None

class RatePlanOut(RatePlanBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================
# RATE
# ============================================================
class RateEntry(BaseModel):
    date: date
    price: Decimal
    currency: str = "EUR"
    closed_to_arrival: bool = False
    closed_to_departure: bool = False
    stop_sell: bool = False

class RateBulkUpsert(BaseModel):
    room_type_id: UUID
    rate_plan_id: UUID
    rates: List[RateEntry]

class RateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    room_type_id: UUID
    rate_plan_id: UUID
    date: date
    price: Decimal
    currency: str = "EUR"
    closed_to_arrival: bool
    closed_to_departure: bool
    stop_sell: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================
# INVENTORY
# ============================================================
class InventoryEntry(BaseModel):
    date: date
    allotment: int
    sold: int = 0
    blocked: int = 0
    overbooking_allowed: int = 0

class InventoryBulkUpsert(BaseModel):
    room_type_id: UUID
    inventory: List[InventoryEntry]

# ============================================================
# GUEST
# ============================================================
class GuestBase(BaseModel):
    tenant_id: UUID
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    marketing_opt_in: bool = False
    notes: Optional[str] = None

class GuestCreate(GuestBase):
    pass

class GuestUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    marketing_opt_in: Optional[bool] = None
    notes: Optional[str] = None

class GuestOut(GuestBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================
# RESERVATION
# ============================================================
class ReservationBase(BaseModel):
    property_id: UUID
    guest_id: UUID
    room_type_id: UUID
    rate_plan_id: Optional[UUID] = None
    assigned_room_id: Optional[UUID] = None
    confirmation_code: str
    status: str = "confirmed"
    source: str = "direct_web"
    check_in: date
    check_out: date
    adults: int = 2
    children: int = 0
    total_amount: Decimal = Decimal("0.00")
    currency: str = "EUR"
    notes: Optional[str] = None

class ReservationCreate(ReservationBase):
    pass

class ReservationUpdate(BaseModel):
    guest_id: Optional[UUID] = None
    room_type_id: Optional[UUID] = None
    rate_plan_id: Optional[UUID] = None
    assigned_room_id: Optional[UUID] = None
    status: Optional[str] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    adults: Optional[int] = None
    children: Optional[int] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    notes: Optional[str] = None

class ReservationOut(ReservationBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    canceled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ReservationNightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    reservation_id: UUID
    room_type_id: UUID
    rate_plan_id: Optional[UUID] = None
    date: date
    base_rate: Decimal
    amount: Decimal
    taxes: Decimal
    discounts: Decimal
    created_at: Optional[datetime] = None

# ============================================================
# FOLIO
# ============================================================
class FolioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    property_id: UUID
    reservation_id: Optional[UUID] = None
    guest_id: Optional[UUID] = None
    kind: str
    status: str
    currency: str = "EUR"
    total_amount: Decimal
    paid_amount: Decimal
    balance: Decimal
    closed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class FolioItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    folio_id: UUID
    type: str
    description: str
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal
    amount: Decimal
    external_id: Optional[str] = None
    posted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

class ChargeCreate(BaseModel):
    folio_id: UUID
    type: str
    description: str
    quantity: int = 1
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0.00")

class DiscountCreate(BaseModel):
    folio_id: UUID
    description: str
    amount: Decimal

# ============================================================
# PAYMENT
# ============================================================
class PaymentCreate(BaseModel):
    folio_id: UUID
    provider: str
    method: Optional[str] = None
    amount: Decimal
    currency: str = "EUR"
    external_ref: Optional[str] = None
    idempotency_key: Optional[str] = None

class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    folio_id: UUID
    provider: str
    method: Optional[str] = None
    status: str
    amount: Decimal
    currency: str = "EUR"
    external_ref: Optional[str] = None
    idempotency_key: Optional[str] = None
    failure_reason: Optional[str] = None
    authorized_at: Optional[datetime] = None
    captured_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class RefundCreate(BaseModel):
    payment_id: UUID
    amount: Decimal
    reason: Optional[str] = None

# ============================================================
# HOUSEKEEPING
# ============================================================
class HousekeepingTaskBase(BaseModel):
    property_id: UUID
    room_id: UUID
    type: str = "cleaning"
    status: str = "pending"
    priority: int = 3
    assigned_to_id: Optional[UUID] = None
    created_by_id: Optional[UUID] = None
    due_at: Optional[datetime] = None
    notes: Optional[str] = None

class HousekeepingTaskCreate(HousekeepingTaskBase):
    pass

class HousekeepingTaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[int] = None
    assigned_to_id: Optional[UUID] = None
    due_at: Optional[datetime] = None
    notes: Optional[str] = None
    completed_at: Optional[datetime] = None

class HousekeepingTaskOut(HousekeepingTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================
# MAINTENANCE
# ============================================================
class MaintenanceTaskBase(BaseModel):
    property_id: UUID
    room_id: UUID
    type: str
    description: Optional[str] = None
    priority: int = 3
    status: str = "pendent"
    assigned_to_id: Optional[UUID] = None
    created_by_id: Optional[UUID] = None

class MaintenanceTaskCreate(MaintenanceTaskBase):
    pass

class MaintenanceTaskUpdate(BaseModel):
    type: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    assigned_to_id: Optional[UUID] = None

class MaintenanceTaskOut(MaintenanceTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    reported_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================
# INTEGRATIONS & EVENTS
# ============================================================
class IntegrationBase(BaseModel):
    property_id: UUID
    type: str
    provider: str
    credentials: Optional[dict] = None
    settings: Optional[dict] = None
    active: bool = True

class IntegrationCreate(IntegrationBase):
    pass

class IntegrationOut(IntegrationBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    last_sync_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class WebhookEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    provider: str
    external_id: Optional[str] = None
    type: str
    payload: Optional[dict] = None
    signature: Optional[str] = None
    status: str
    attempts: int
    processed_at: Optional[datetime] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    user_id: Optional[UUID] = None
    entity: str
    entity_id: str
    action: str
    audit_metadata: Optional[dict] = None
    created_at: Optional[datetime] = None

class OutboxEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    aggregate: str
    aggregate_id: str
    type: str
    payload: Optional[dict] = None
    status: str
    attempts: int
    available_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None

# ============================================================
# API SPECIAL SCHEMAS
# ============================================================
class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class AvailabilityRequest(BaseModel):
    property_id: UUID
    check_in: date
    check_out: date
    adults: int
    children: int = 0
    rate_plan_id: Optional[UUID] = None

class AvailabilityBreakdown(BaseModel):
    date: date
    price: Decimal
    remaining: int

class AvailabilityResponse(BaseModel):
    room_type_id: UUID
    name: str
    total_nights: int
    total_price: Decimal
    currency: str
    breakdown: List[AvailabilityBreakdown]

class QuoteRequest(AvailabilityRequest):
    pass

class QuoteResponse(AvailabilityResponse):
    pass

class FiscalRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    property_id: UUID
    folio_id: UUID
    invoice_number: str
    invoice_type: str
    total: Decimal
    base_imponible: Decimal
    iva: Decimal
    irpf: Decimal = Decimal("0")
    vat_breakdown: list = []
    payload: str
    previous_hash: str
    payload_hash: str
    hash: str


# ============================================================
# INTEGRACIONES (Fase 3)
# ============================================================

class PosChargeItem(BaseModel):
    """Línea de un cargo de Comanda (TPV)."""
    name: str
    qty: int = 1
    price: Decimal
    tax_rate: Decimal = Decimal("0.00")


class PosRoomChargeCreate(BaseModel):
    """Cargo de habitación enviado por Comanda (TPV)."""
    external_id: str
    guest_name: Optional[str] = None
    room_number: str
    amount: Decimal
    items: List[PosChargeItem] = []
    staff_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class PosRoomChargeResponse(BaseModel):
    success: bool
    folio_id: Optional[UUID] = None
    folio_item_id: Optional[UUID] = None
    reservation_id: Optional[UUID] = None
    error: Optional[str] = None
    message: Optional[str] = None


class OtaWebhookCreate(BaseModel):
    """Evento de reserva enviado por un OTA / Channel Manager."""
    provider: str
    external_id: str
    type: str = "reservation_created"
    payload: dict = {}


class OtaWebhookResponse(BaseModel):
    success: bool
    reservation_id: Optional[UUID] = None
    webhook_event_id: Optional[UUID] = None
    error: Optional[str] = None
    message: Optional[str] = None


class VccChargeCreate(BaseModel):
    """Cobro de una tarjeta virtual (VCC) de agencia."""
    folio_id: UUID
    amount: Decimal
    currency: str = "EUR"
    external_ref: Optional[str] = None
    idempotency_key: Optional[str] = None
    activation_date: Optional[date] = None


# ============================================================
# NIGHT AUDIT
# ============================================================
class NightAuditRunRequest(BaseModel):
    """Petició per llançar el tancament de caixa d'un property."""
    property_id: UUID
    audit_date: Optional[date] = None  # per defecte: avui


class NightAuditSummary(BaseModel):
    """Resum del tancament de caixa (es guarda al camp `summary` JSON)."""
    audit_date: date
    rooms_total: int = 0
    rooms_occupied: int = 0
    occupancy_pct: Decimal = Decimal("0")
    arrivals: int = 0
    departures: int = 0
    no_shows: int = 0
    nights_posted: int = 0
    room_revenue: Decimal = Decimal("0")
    other_revenue: Decimal = Decimal("0")
    total_revenue: Decimal = Decimal("0")
    folios_closed: int = 0
    folios_open: int = 0
    payments_by_method: dict = {}
    payments_total: Decimal = Decimal("0")
    extras_posted: int = 0
    extras_revenue: Decimal = Decimal("0")


class NightAuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    property_id: UUID
    audit_date: date
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by_id: Optional[UUID] = None
    summary: Optional[dict] = None
    error: Optional[str] = None
