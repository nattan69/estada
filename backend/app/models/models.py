import uuid
import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Date, Numeric,
    ForeignKey, JSON, Text, Index, func
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base

def uuid_pk():
    return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


# ============================================================
# ENUMS
# ============================================================

class Role(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    RECEPTION = "reception"
    HOUSEKEEPING = "housekeeping"
    ACCOUNTING = "accounting"

class ReservationStatus(str, enum.Enum):
    QUOTE = "quote"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELED = "canceled"
    NO_SHOW = "no_show"

class ReservationSource(str, enum.Enum):
    DIRECT_WEB = "direct_web"
    BOOKING_ENGINE = "booking_engine"
    PHONE = "phone"
    WALK_IN = "walk_in"
    OTA = "ota"
    CHANNEL_MANAGER = "channel_manager"
    CORPORATE = "corporate"
    ARIADNA = "ariadna"          # afegit per integracio

class RoomStatus(str, enum.Enum):
    CLEAN = "clean"
    DIRTY = "dirty"
    INSPECTED = "inspected"
    BLOCKED = "blocked"
    OUT_OF_SERVICE = "out_of_service"

class FolioStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"

class FolioItemType(str, enum.Enum):
    ROOM_NIGHT = "room_night"
    PRODUCT = "product"
    SERVICE = "service"
    TAX = "tax"
    DISCOUNT = "discount"
    NO_SHOW_FEE = "no_show_fee"
    POS_CHARGE = "pos_charge"      # cargs desde Comanda (TPV)

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    CANCELED = "canceled"

class HousekeepingTaskType(str, enum.Enum):
    CLEANING = "cleaning"
    INSPECTION = "inspection"
    MAINTENANCE = "maintenance"
    TURNDOWN = "turndown"

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELED = "canceled"

class MaintenanceStatus(str, enum.Enum):
    PENDENT = "pendent"
    EN_CURS = "en_curs"
    EN_ESPERA_PECA = "en_espera_peca"
    RESOLT = "resolt"
    CANCELAT = "cancelat"

class IntegrationType(str, enum.Enum):
    PAYMENTS = "payments"
    CHANNEL_MANAGER = "channel_manager"
    BOOKING_ENGINE = "booking_engine"
    DOOR_LOCK = "door_lock"
    POS = "pos"                   # Comanda
    ACCOUNTING = "accounting"
    KIOSK = "kiosk"
    ARIADNA = "ariadna"           # recepcionista IA


# ============================================================
# MODELS
# ============================================================

class Tenant(Base):
    __tablename__ = "tenants"
    id = uuid_pk()
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    properties = relationship("Property", back_populates="tenant", cascade="all, delete-orphan")
    guests = relationship("Guest", back_populates="tenant", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="tenant", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"
    id = uuid_pk()
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False)
    name = Column(String)
    password_hash = Column(String, nullable=False)
    role = Column(String, default=Role.RECEPTION.value)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="users")
    assigned_tasks = relationship("HousekeepingTask", foreign_keys="HousekeepingTask.assigned_to_id", back_populates="assignee")
    created_tasks = relationship("HousekeepingTask", foreign_keys="HousekeepingTask.created_by_id", back_populates="creator")
    audit_logs = relationship("AuditLog", back_populates="user")

    __table_args__ = (Index("ix_users_tenant_email", "tenant_id", "email", unique=True),)


class Property(Base):
    __tablename__ = "properties"
    id = uuid_pk()
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    timezone = Column(String, default="Europe/Madrid")
    currency = Column(String, default="EUR")
    address = Column(JSON)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="properties")
    room_types = relationship("RoomType", back_populates="property", cascade="all, delete-orphan")
    rooms = relationship("Room", back_populates="property", cascade="all, delete-orphan")
    rate_plans = relationship("RatePlan", back_populates="property", cascade="all, delete-orphan")
    reservations = relationship("Reservation", back_populates="property")
    folios = relationship("Folio", back_populates="property")
    housekeeping_tasks = relationship("HousekeepingTask", back_populates="property", cascade="all, delete-orphan")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="property", cascade="all, delete-orphan")
    integrations = relationship("Integration", back_populates="property", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_properties_tenant_code", "tenant_id", "code", unique=True),)


class RoomType(Base):
    __tablename__ = "room_types"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    max_adults = Column(Integer, default=2)
    max_children = Column(Integer, default=0)
    base_occupancy = Column(Integer, default=2)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    property = relationship("Property", back_populates="room_types")
    rooms = relationship("Room", back_populates="room_type")
    rates = relationship("Rate", back_populates="room_type")
    inventories = relationship("Inventory", back_populates="room_type")
    reservations = relationship("Reservation", back_populates="room_type")
    nights = relationship("ReservationNight", back_populates="room_type")

    __table_args__ = (Index("ix_room_types_prop_code", "property_id", "code", unique=True),)


class Room(Base):
    __tablename__ = "rooms"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id", ondelete="CASCADE"), nullable=False)
    number = Column(String, nullable=False)
    floor = Column(String)
    status = Column(String, default=RoomStatus.CLEAN.value)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    property = relationship("Property", back_populates="rooms")
    room_type = relationship("RoomType", back_populates="rooms")
    reservations = relationship("Reservation", back_populates="assigned_room")
    tasks = relationship("HousekeepingTask", back_populates="room")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="room")

    __table_args__ = (
        Index("ix_rooms_prop_number", "property_id", "number", unique=True),
        Index("ix_rooms_prop_status", "property_id", "status"),
    )


class RatePlan(Base):
    __tablename__ = "rate_plans"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    min_stay = Column(Integer, default=1)
    max_stay = Column(Integer)
    policies = Column(JSON)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    property = relationship("Property", back_populates="rate_plans")
    rates = relationship("Rate", back_populates="rate_plan")
    reservations = relationship("Reservation", back_populates="rate_plan")
    nights = relationship("ReservationNight", back_populates="rate_plan")

    __table_args__ = (Index("ix_rate_plans_prop_code", "property_id", "code", unique=True),)


class Rate(Base):
    __tablename__ = "rates"
    id = uuid_pk()
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id", ondelete="CASCADE"), nullable=False)
    rate_plan_id = Column(UUID(as_uuid=True), ForeignKey("rate_plans.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    currency = Column(String, default="EUR")
    closed_to_arrival = Column(Boolean, default=False)
    closed_to_departure = Column(Boolean, default=False)
    stop_sell = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    room_type = relationship("RoomType", back_populates="rates")
    rate_plan = relationship("RatePlan", back_populates="rates")

    __table_args__ = (
        Index("ix_rates_rt_rp_date", "room_type_id", "rate_plan_id", "date", unique=True),
        Index("ix_rates_rt_date", "room_type_id", "date"),
    )


class Inventory(Base):
    __tablename__ = "inventories"
    id = uuid_pk()
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    allotment = Column(Integer, nullable=False)
    sold = Column(Integer, default=0)
    blocked = Column(Integer, default=0)
    overbooking_allowed = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    room_type = relationship("RoomType", back_populates="inventories")

    __table_args__ = (
        Index("ix_inv_rt_date", "room_type_id", "date", unique=True),
        Index("ix_inv_rt_date_idx", "room_type_id", "date"),
    )


class Guest(Base):
    __tablename__ = "guests"
    id = uuid_pk()
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    document_type = Column(String)
    document_number = Column(String)
    marketing_opt_in = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="guests")
    reservations = relationship("Reservation", back_populates="guest")

    __table_args__ = (
        Index("ix_guests_tenant_email", "tenant_id", "email"),
        Index("ix_guests_tenant_name", "tenant_id", "last_name", "first_name"),
    )


class Reservation(Base):
    __tablename__ = "reservations"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    guest_id = Column(UUID(as_uuid=True), ForeignKey("guests.id"), nullable=False)
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id"), nullable=False)
    rate_plan_id = Column(UUID(as_uuid=True), ForeignKey("rate_plans.id"))
    assigned_room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"))
    confirmation_code = Column(String, nullable=False)
    status = Column(String, default=ReservationStatus.CONFIRMED.value)
    source = Column(String, default=ReservationSource.DIRECT_WEB.value)
    agency_code = Column(String)  # codi del contracte d'agència (Yield & Allotment), opcional
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    adults = Column(Integer, default=2)
    children = Column(Integer, default=0)
    total_amount = Column(Numeric(12, 2), default=0)
    currency = Column(String, default="EUR")
    notes = Column(Text)
    canceled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    property = relationship("Property", back_populates="reservations")
    guest = relationship("Guest", back_populates="reservations")
    room_type = relationship("RoomType", back_populates="reservations")
    rate_plan = relationship("RatePlan", back_populates="reservations")
    assigned_room = relationship("Room", back_populates="reservations")
    nights = relationship("ReservationNight", back_populates="reservation", cascade="all, delete-orphan")
    folio = relationship("Folio", back_populates="reservation", uselist=False, passive_deletes=True)

    __table_args__ = (
        Index("ix_res_prop_code", "property_id", "confirmation_code", unique=True),
        Index("ix_res_dates", "property_id", "check_in", "check_out", "status"),
    )


class ReservationNight(Base):
    __tablename__ = "reservation_nights"
    id = uuid_pk()
    reservation_id = Column(UUID(as_uuid=True), ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False)
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id"), nullable=False)
    rate_plan_id = Column(UUID(as_uuid=True), ForeignKey("rate_plans.id"))
    date = Column(Date, nullable=False)
    base_rate = Column(Numeric(12, 2), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    taxes = Column(Numeric(12, 2), default=0)
    discounts = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reservation = relationship("Reservation", back_populates="nights")
    room_type = relationship("RoomType", back_populates="nights")
    rate_plan = relationship("RatePlan", back_populates="nights")

    __table_args__ = (
        Index("ix_nights_res_date", "reservation_id", "date", unique=True),
        Index("ix_nights_rt_date", "room_type_id", "date"),
    )


class Folio(Base):
    __tablename__ = "folios"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey("reservations.id", ondelete="SET NULL"))
    guest_id = Column(UUID(as_uuid=True), ForeignKey("guests.id", ondelete="SET NULL"))
    kind = Column(String, default="reservation")
    status = Column(String, default=FolioStatus.OPEN.value)
    currency = Column(String, default="EUR")
    total_amount = Column(Numeric(12, 2), default=0)
    paid_amount = Column(Numeric(12, 2), default=0)
    balance = Column(Numeric(12, 2), default=0)
    closed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    property = relationship("Property", back_populates="folios")
    reservation = relationship("Reservation", back_populates="folio")
    guest = relationship("Guest")
    items = relationship("FolioItem", back_populates="folio", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="folio", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_folios_prop_status", "property_id", "status"),
        Index("ix_folios_reservation", "reservation_id"),
        Index("ix_folios_guest", "guest_id"),
    )


class FolioItem(Base):
    __tablename__ = "folio_items"
    id = uuid_pk()
    folio_id = Column(UUID(as_uuid=True), ForeignKey("folios.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(6, 3), default=0)
    amount = Column(Numeric(12, 2), nullable=False)
    external_id = Column(String)  # idempotencia (cargos POS de Comanda)
    posted_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    folio = relationship("Folio", back_populates="items")

    __table_args__ = (
        Index("ix_items_folio", "folio_id"),
        Index("ix_items_external", "external_id", unique=True),
    )


class Payment(Base):
    __tablename__ = "payments"
    id = uuid_pk()
    folio_id = Column(UUID(as_uuid=True), ForeignKey("folios.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String, nullable=False)
    method = Column(String)
    status = Column(String, default=PaymentStatus.PENDING.value)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String, default="EUR")
    external_ref = Column(String)
    idempotency_key = Column(String, unique=True)
    failure_reason = Column(String)
    authorized_at = Column(DateTime(timezone=True))
    captured_at = Column(DateTime(timezone=True))
    refunded_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    folio = relationship("Folio", back_populates="payments")

    __table_args__ = (Index("ix_payments_folio_status", "folio_id", "status"),)


class HousekeepingTask(Base):
    __tablename__ = "housekeeping_tasks"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, default=HousekeepingTaskType.CLEANING.value)
    status = Column(String, default=TaskStatus.PENDING.value)
    priority = Column(Integer, default=3)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    due_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    property = relationship("Property", back_populates="housekeeping_tasks")
    room = relationship("Room", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tasks")
    creator = relationship("User", foreign_keys=[created_by_id], back_populates="created_tasks")

    __table_args__ = (
        Index("ix_hk_prop_status", "property_id", "status"),
        Index("ix_hk_room_status", "room_id", "status"),
    )


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    description = Column(Text)
    priority = Column(Integer, default=3)
    status = Column(String, default=MaintenanceStatus.PENDENT.value)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reported_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    property = relationship("Property")
    room = relationship("Room")
    assignee = relationship("User", foreign_keys=[assigned_to_id])
    creator = relationship("User", foreign_keys=[created_by_id])

    __table_args__ = (
        Index("ix_maint_prop_status", "property_id", "status"),
        Index("ix_maint_room_status", "room_id", "status"),
    )


class Integration(Base):
    __tablename__ = "integrations"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    credentials = Column(JSON)
    settings = Column(JSON)
    active = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    property = relationship("Property", back_populates="integrations")

    __table_args__ = (Index("ix_integ_prop_provider", "property_id", "provider", unique=True),)


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    id = uuid_pk()
    provider = Column(String, nullable=False)
    external_id = Column(String)
    type = Column(String, nullable=False)
    payload = Column(JSON)
    signature = Column(String)
    status = Column(String, default="pending")
    attempts = Column(Integer, default=0)
    processed_at = Column(DateTime(timezone=True))
    error = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_webhooks_provider_ext", "provider", "external_id", unique=True),
        Index("ix_webhooks_status", "status", "created_at"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = uuid_pk()
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    entity = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    audit_metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (Index("ix_audit_tenant_entity", "tenant_id", "entity", "entity_id"),)



class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    id = uuid_pk()
    aggregate = Column(String, nullable=False)
    aggregate_id = Column(String, nullable=False)
    type = Column(String, nullable=False)
    payload = Column(JSON)
    status = Column(String, default="pending")
    attempts = Column(Integer, default=0)
    available_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    error = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_outbox_status_avail", "status", "available_at"),)

class FiscalRecord(Base):
    __tablename__ = "fiscal_records"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    folio_id = Column(UUID(as_uuid=True), ForeignKey("folios.id"), nullable=False)

    invoice_number = Column(String, nullable=False, unique=True)
    invoice_type = Column(String, nullable=False)
    total = Column(Numeric(12, 2), nullable=False)
    base_imponible = Column(Numeric(12, 2), nullable=False)
    iva = Column(Numeric(12, 2), nullable=False)
    irpf = Column(Numeric(12, 2), default=0)
    vat_breakdown = Column(JSON, nullable=False, default=list)
    payload = Column(Text, nullable=False)
    previous_hash = Column(String, nullable=False)
    payload_hash = Column(String, nullable=False)
    hash = Column(String, nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())

    property = relationship("Property")
    folio = relationship("Folio")

    __table_args__ = (
        Index("ix_fiscal_prop_issued", "property_id", "issued_at"),
        Index("ix_fiscal_invoice", "invoice_number", unique=True),
    )


class FiscalSequence(Base):
    __tablename__ = "fiscal_sequences"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    last_number = Column(Integer, default=0)

    property = relationship("Property")

    __table_args__ = (
        Index("ix_fiscal_seq_prop_year", "property_id", "year", unique=True),
    )


class NightAudit(Base):
    """Tancament de caixa diari (Night Audit).

    Registra cada execució del tancament per a un property i una data de
    negoci. El `summary` (JSON) guarda el resum: nits postades, revenue,
    no-shows, check-outs, folios tancats i ocupació.
    """
    __tablename__ = "night_audits"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    audit_date = Column(Date, nullable=False)
    status = Column(String, default="running")  # running | completed | failed
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    summary = Column(JSON)
    error = Column(Text)

    property = relationship("Property")
    created_by = relationship("User", foreign_keys=[created_by_id])

    __table_args__ = (
        Index("ix_night_audit_prop_date", "property_id", "audit_date", unique=True),
        Index("ix_night_audit_prop_status", "property_id", "status"),
    )


class AgencyContract(Base):
    """Contracte de turoperació amb una agència (Yield & Allotment).

    Parametritza les condicions contractuals signades amb l'agència:
    garantia (garantit vs. lliure), dies de release, comissió i política
    d'anul·lació. Els cupos (allotments) per tipus d'habitació i data es
    guarden a `ContractAllotment`.
    """
    __tablename__ = "agency_contracts"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    agency_name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    guarantee_type = Column(String, default="free")  # guaranteed | free
    release_days = Column(Integer, default=0)        # dies abans de l'arribada per alliberar el cupo
    commission = Column(Numeric(6, 3), default=0)    # % de comissió de l'agència
    cancellation_policy = Column(JSON)               # condicions d'anul·lació (dies, penalització)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    property = relationship("Property")
    allotments = relationship("ContractAllotment", back_populates="contract", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_agency_contracts_prop_code", "property_id", "code", unique=True),
        Index("ix_agency_contracts_prop_dates", "property_id", "start_date", "end_date"),
    )


class ContractAllotment(Base):
    """Cupo/contingent d'un contracte per a un tipus d'habitació i una data.

    Representa quantes habitacions d'un `room_type` l'agència pot vendre en
    una data concreta, a quina tarifa pactada i amb quin descompte. El camp
    `release_date` marca quan el cupo no venut s'allibera (torna a l'hotel).
    """
    __tablename__ = "contract_allotments"
    id = uuid_pk()
    contract_id = Column(UUID(as_uuid=True), ForeignKey("agency_contracts.id", ondelete="CASCADE"), nullable=False)
    room_type_id = Column(UUID(as_uuid=True), ForeignKey("room_types.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    allotment = Column(Integer, nullable=False)
    sold = Column(Integer, default=0)
    release_date = Column(Date)                       # data d'alliberament del cupo no venut
    contracted_rate = Column(Numeric(12, 2))         # tarifa pactada amb l'agència
    discount_pct = Column(Numeric(6, 3), default=0)   # descompte sobre la tarifa
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    contract = relationship("AgencyContract", back_populates="allotments")
    room_type = relationship("RoomType")

    __table_args__ = (
        Index("ix_contract_allot_contract_date", "contract_id", "date"),
        Index("ix_contract_allot_rt_date", "room_type_id", "date"),
        Index("ix_contract_allot_contract_rt_date", "contract_id", "room_type_id", "date", unique=True),
    )
