# Estada — PMS de Gestio Hotelera

> Document de treball: guia d'implementacio per al PMS de Conceptes (sapedrera.eu).
> Basat en l'esquelet original "Estilo Mews", adaptat a FastAPI + SQLAlchemy
> per coherencia amb l'ecosistema Conceptes (Comanda, Ariadna, Jornals).
>
> Data: 06/09/2026 | Autor: Lucia | Estat: guia tecnica, llest per implementar
>
> Convenio del projecte: codi en castella, camps UUID PK,
> rutes amb prefix "" no "/", mateix patro que Comanda i Ariadna.

---

## Index

1. Visio i abast MVP
2. Stack
3. Arquitectura objectiu
4. Estructura del repositori
5. Model de dades (SQLAlchemy)
6. API base
7. Serveis d'exemple
8. Frontend amb Next.js
9. Esdeveniments i workers
10. Docker i arrancada local
11. Seguretat i compliment
12. VeriFactu (compliance fiscal espanyol)
13. Integracions Conceptes
14. Criteris d'acceptacio del MVP
15. Proximes passes
16. Auth — homogeneitzacio (pendent de disseny)

---

## 1. Visio i abast MVP

**Estada** es el PMS (Property Management System) de Conceptes. Gestiona
estancies hoteleres: disponibilitat, reserves, recepcio, comptes de guest,
neteja, pagaments i reportes. Multi-hotel, API-first, event-driven.

Objectiu: construir un PMS modern amb:

- Automatitzacio operativa
- Operacio en temps real
- Pagaments integrats
- Marketplace / integracions
- Experiencia digital del guest
- API-first
- Arquitectura basada en esdeveniments
- **Compliance fiscal espanyol (VeriFactu)**

### Abast minim viable

1. **Configuracio**
   - Hotel / propietat
   - Tipus d'habitacio
   - Habitacions fisiques
   - Plans de tarifa
   - Tarifes per data
   - Restriccions: minim de nits, stop-sell, tancat a entrada/sortida

2. **Motor de disponibilitat i preus**
   - Cerca per dates
   - Calcul per nit
   - Inventari per tipus d'habitacio
   - Cotitzacio previa a la reserva

3. **Reserves**
   - Crear, modificar, cancelar
   - Estats: confirmada, check-in, check-out, cancelada, no-show
   - Assignacio d'habitacio
   - Historial del guest

4. **Front desk / recepcio**
   - Tape chart / calendari d'ocupacio
   - Arribades i sortides del dia
   - Check-in / check-out
   - Canvi d'habitacio
   - Notes i tasques

5. **Folio / compte del guest**
   - Cargos per nit
   - Productes i serveis
   - Impostos i descomptes
   - Pagaments, reemborsaments, autoritzacions
   - Tancament de folio
   - **Room charges desde Comanda (TPV)**

6. **Housekeeping**
   - Estats: neta, bruta, inspeccionada, bloquejada, fora de servei
   - Tasques de neteja
   - Prioritats i assignacio

7. **Pagaments**
   - Tokenitzacio amb Stripe / Adyen
   - No emmagatzemar targetes directament
   - 3DS / SCA
   - Reemborsaments i cargs parcials

8. **Reportes basics**
   - Ocupacio
   - ADR
   - RevPAR
   - Ingressos per dia
   - Tancament de caixa / night audit

9. **Integracions**
   - Channel manager / OTAs
   - Booking engine
   - Pasareles de pago
   - Cerradures electroniques
   - **POS / restaurant (Comanda)**
   - **Recepcionista IA (Ariadna — la Madona)**
   - Comptabilitat / facturacio (VeriFactu)

---

## 2. Stack

```txt
Frontend:       Next.js 15 + TypeScript + Tailwind + shadcn/ui (na Flavia)
Backend:        FastAPI (Python) + SQLAlchemy + Pydantic v2 (na Maria)
Base de dades:  PostgreSQL (dev: SQLite per rapidessa, mateix patro que Comanda)
Cache / Queue:  Redis + ARQ (o Celery) per workers
Pagos:          Stripe / Adyen
Auth:           JWT (veure seccio 16 — homogeneitzacio)
Infra:          Docker + GitHub Actions
Observabilitat:  logs estructurats + Sentry
API:            REST + OpenAPI (FastAPI genera Swagger automaticament)
Fiscal:         VeriFactu (hash chaining SHA-256, mateix patro que Comanda)
```

> **Decisio (Tomeu):** Python de totes totes. FastAPI + SQLAlchemy per
> coherencia amb Comanda, Ariadna i Jornals. Na Maria pot comencar de
> seguida sense canviar de stack.

---

## 3. Arquitectura objectiu

```
                     ┌─────────────────────┐
                     │   Next.js (web app)  │
                     └──────────┬──────────┘
                                │
        ┌───────────┐           │           ┌───────────┐
        │ Ariadna   │           │           │ Comanda   │
        │ (la       │     FastAPI +        │ │ (TPV)     │
        │  Madona)  │     SQLAlchemy       │ │           │
        └─────┬─────┘                     │ └─────┬─────┘
              │                           │       │
              │  reserves, check-in/out   │       │ room charges
              │  disponibilitat, rates    │       │ (nom + habitacio)
              ▼                           ▼       ▼
        ┌─────────────────────────────────────────────┐
        │                Estada (PMS)                  │
        │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
        │  │Reserves │ │  Folio   │ │ VeriFactu    │  │
        │  │ + Disp. │ │ + Cargs  │ │ (hash chain) │  │
        │  └─────────┘ └──────────┘ └──────────────┘  │
        │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
        │  │Housek.  │ │ Payments │ │ Integracions │  │
        │  └─────────┘ └──────────┘ └──────────────┘  │
        └──────┬──────────────────────────┬───────────┘
               │                          │
          ┌────▼────┐                ┌────▼────┐
          │PostgreSQL│               │  Redis  │
          └─────────┘               │ + ARQ   │
                                    └────┬────┘
                                         │
                              ┌──────────▼──────────┐
                              │      Workers         │
                              │ - Channel manager   │
                              │ - Emails pre-stay   │
                              │ - Night audit       │
                              │ - Webhooks sortints │
                              └─────────────────────┘
```

---

## 4. Estructura del repositori

Seguint el mateix patro que Comanda (`D:\projectes\Commanders`):

```txt
estada/
├─ backend/
│  ├─ app/
│  │  ├─ __init__.py
│  │  ├─ main.py                  # FastAPI app + routers
│  │  ├─ config.py                # Settings (env vars)
│  │  ├─ database.py              # engine + SessionLocal + Base
│  │  ├─ models/
│  │  │  └─ models.py             # Tots els models SQLAlchemy
│  │  ├─ schemas/
│  │  │  └─ schemas.py            # Pydantic schemas
│  │  ├─ api/
│  │  │  └─ routes/
│  │  │     ├─ __init__.py
│  │  │     ├─ auth.py             # login, refresh, me
│  │  │     ├─ properties.py       # CRUD propietats
│  │  │     ├─ room_types.py       # tipus d'habitacio
│  │  │     ├─ rooms.py            # habitacions
│  │  │     ├─ rates.py             # tarifes i inventari
│  │  │     ├─ availability.py     # motor de disponibilitat
│  │  │     ├─ reservations.py      # reserves + check-in/out
│  │  │     ├─ folios.py            # folio + cargs + pagaments
│  │  │     ├─ housekeeping.py      # tasques de neteja
│  │  │     ├─ reports.py           # ocupacio, ADR, RevPAR
│  │  │     ├─ fiscal.py            # VeriFactu (hash chaining)
│  │  │     └─ integrations.py     # POS, Ariadna, OTAs, webhooks
│  │  ├─ services/
│  │  │  ├─ availability_service.py
│  │  │  ├─ reservation_service.py
│  │  │  ├─ folio_service.py
│  │  │  ├─ fiscal_service.py       # VeriFactu hash chaining
│  │  │  └─ pms_adapter/           # NO — Estada ES el PMS
│  │  └─ utils/
│  │     └─ helpers.py              # uuid_pk, generate_code, etc.
│  ├─ requirements.txt
│  └─ .env.example
│
├─ frontend/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                   # dashboard
│  │  ├─ login/
│  │  ├─ front-desk/
│  │  │  ├─ page.tsx
│  │  │  ├─ tape-chart/
│  │  │  ├─ arrivals/
│  │  │  └─ departures/
│  │  ├─ reservations/
│  │  │  ├─ page.tsx
│  │  │  ├─ new/
│  │  │  └─ [id]/
│  │  ├─ folios/
│  │  │  └─ [id]/
│  │  ├─ housekeeping/
│  │  ├─ rates/
│  │  ├─ guests/
│  │  ├─ reports/
│  │  └─ settings/
│  │     ├─ users/
│  │     ├─ rooms/
│  │     └─ integrations/
│  ├─ components/
│  ├─ lib/
│  └─ package.json
│
├─ infra/
│  ├─ docker-compose.yml
│  └─ nginx/
│
├─ docs/
│  ├─ ESTAT.md                     # estat del projecte (Catala)
│  └─ Estada_guia_implementacio.md  # aquest document
│
├─ .env.example
└─ README.md
```

---

## 5. Model de dades (SQLAlchemy)

Arxiu: `backend/app/models/models.py`

Patro seguit: UUID PKs (mateix que Comanda/Ariadna), enums com a strings
amb validacio Pydantic, relationships amb `back_populates`.

> **Convencio de temps (punt 1):** `check_in`/`check_out` d'estada i les
> dates de `Rate`/`Inventory`/`ReservationNight` son `Date` (sense hora).
> Els timestamps (created_at, updated_at, posted_at, etc.) son `DateTime(timezone=True)`.
> No barrejar mai un `date` d'estada amb un `datetime`. Els límits de nit
> sempre s'avaluen pel `timezone` de la propietat (`Property.timezone`),
> mai pel fus local del servidor.

```python
import uuid
import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Date, Numeric,
    ForeignKey, JSON, Text, Index, func
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.dialects.postgresql import UUID

Base = declarative_base()

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
    # Restriccions de durada d'estada: pertanyen al plan, NO a la fila per dia.
    # (Es compleixen sobre TOTA l'estada, no per nit.)
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
    # Restriccions PER DIA (calendari de tarifes). min_stay/max_stay son
    # del RatePlan (durada d'estada), veure seccio 5 al model RatePlan.
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
    # El foli ja no es "delete-orphan" de la reserva: pot ser independent (walk-in).
    # Si s'esborra la reserva, el foli queda deslligat (FK ondelete="SET NULL").
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
    # El foli pot existir SENSE reserva (walk-in, guest de dia, lloguer d'espais,
    # compte d'empresa). Per aixo reservation_id es nullable i NO es unique.
    reservation_id = Column(UUID(as_uuid=True), ForeignKey("reservations.id", ondelete="SET NULL"))
    guest_id = Column(UUID(as_uuid=True), ForeignKey("guests.id", ondelete="SET NULL"))
    # kind: "reservation" (lligat a reserva) | "walk_in" | "company" | "misc"
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
    posted_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    folio = relationship("Folio", back_populates="items")

    __table_args__ = (Index("ix_items_folio", "folio_id"),)


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
    metadata = Column(JSON)
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
```

---

## 6. API base

Tots els endpoints dins de FastAPI routers amb prefix `""` (convenio del projecte,
igual que Comanda). OpenAPI autogenerat per FastAPI.

### Auth i configuracio

```txt
POST   /auth/login
POST   /auth/refresh
GET    /me

GET    /properties
POST   /properties
PATCH  /properties/:id

GET    /room-types
POST   /room-types
PATCH  /room-types/:id

GET    /rooms
POST   /rooms
PATCH  /rooms/:id
PATCH  /rooms/:id/status
```

### Tarifes i inventari

```txt
GET    /rate-plans
POST   /rate-plans
PATCH  /rate-plans/:id

POST   /rates/bulk-upsert
GET    /rates?roomTypeId=&from=&to=&ratePlanId=

POST   /inventory/bulk-upsert
GET    /availability?propertyId=&from=&to=&adults=&children=
POST   /reservations/quote
```

### Reserves

```txt
GET    /reservations?propertyId=&date=&status=
POST   /reservations
GET    /reservations/:id
PATCH  /reservations/:id
POST   /reservations/:id/cancel
POST   /reservations/:id/check-in
POST   /reservations/:id/check-out
POST   /reservations/:id/assign-room
POST   /reservations/:id/change-room
```

### Folio i pagaments

```txt
GET    /folios/:id
POST   /folios/:id/charges
POST   /folios/:id/discounts
POST   /folios/:id/payments
POST   /folios/:id/refunds
POST   /folios/:id/close
```

### Housekeeping

```txt
GET    /housekeeping/tasks?propertyId=&status=
POST   /housekeeping/tasks
PATCH  /housekeeping/tasks/:id
POST   /housekeeping/tasks/:id/complete
```

### Reportes

```txt
GET    /reports/occupancy?propertyId=&from=&to=
GET    /reports/revenue?propertyId=&from=&to=
GET    /reports/adr?propertyId=&from=&to=
GET    /reports/revpar?propertyId=&from=&to=
GET    /reports/front-desk/arrivals?date=
GET    /reports/front-desk/departures?date=
```

### VeriFactu (fiscal)

```txt
GET    /fiscal/records?propertyId=&from=&to=
GET    /fiscal/records/:id
GET    /fiscal/chain/verify          # verifica integritat de la cadena
```

---

## 7. Serveis d'exemple

### 7.1 Disponibilitat

Arxiu: `backend/app/services/availability_service.py`

```python
from datetime import date, timedelta
from decimal import Decimal
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
```

### 7.2 Creacio de reserva

Arxiu: `backend/app/services/reservation_service.py`

```python
import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.models import (
    Reservation, ReservationNight, Folio, FolioItem,
    Inventory, OutboxEvent, ReservationStatus, FolioItemType,
    Rate, RatePlan, RoomType,
)
# Reutilitzem la logica de nits i restriccions (no duplicar codi)
from app.services.availability_service import each_night, _check_restrictions


def generate_confirmation_code():
    return f"RES-{uuid.uuid4().hex[:8].upper()}"


def create_reservation(db: Session, **kwargs):
    property_id = kwargs["property_id"]
    guest_id = kwargs["guest_id"]
    room_type_id = kwargs["room_type_id"]
    rate_plan_id = kwargs.get("rate_plan_id")
    check_in = kwargs["check_in"]
    check_out = kwargs["check_out"]
    adults = kwargs["adults"]
    children = kwargs.get("children", 0)
    source = kwargs.get("source", "direct_web")

    nights = each_night(check_in, check_out)
    total_nights = len(nights)

    if total_nights == 0:
        raise ValueError("Rango de fechas invalido")

    # ---- Validacions de restriccions (min_stay/max_stay/ocupacio) ----
    rate_plan = (
        db.query(RatePlan).filter(RatePlan.id == rate_plan_id).first()
        if rate_plan_id else None
    )
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).one()
    _check_restrictions(rate_plan, total_nights, adults, children, room_type)

    # ---- Tarifes de totes les nits (amb Decimal, mai float) ----
    rates = db.query(Rate).filter(
        Rate.room_type_id == room_type_id,
        Rate.date.in_(nights),
    )
    if rate_plan_id:
        rates = rates.filter(Rate.rate_plan_id == rate_plan_id)
    rates = rates.all()

    if len(rates) != len(nights):
        raise ValueError("No hay tarifa para todas las noches")

    total_amount = sum((Decimal(r.price) for r in rates), Decimal("0"))
    confirmation_code = generate_confirmation_code()

    reservation = Reservation(
        property_id=property_id,
        guest_id=guest_id,
        room_type_id=room_type_id,
        rate_plan_id=rate_plan_id,
        confirmation_code=confirmation_code,
        status=ReservationStatus.CONFIRMED.value,
        source=source,
        check_in=check_in,
        check_out=check_out,
        adults=adults,
        children=children,
        total_amount=total_amount,
    )
    db.add(reservation)
    db.flush()

    # ---- Reservar inventari amb LOCK (punt 3: evita sobrevenda) ----
    # Cada fila d'inventory es bloqueja (SELECT ... FOR UPDATE) abans de
    # comprovar disponibilitat i incrementar sold. La transaccio es manté
    # fins a db.commit(). Sense el lock, dos processos poden vendre la
    # mateixa habitacio (race TOCTOU entre la cerca i la reserva).
    for night in nights:
        inventory = db.query(Inventory).filter(
            Inventory.room_type_id == room_type_id,
            Inventory.date == night,
        ).with_for_update().first()

        if not inventory:
            db.rollback()
            raise ValueError(f"Sin inventario para {night}")

        remaining = (
            Decimal(inventory.allotment)
            + Decimal(inventory.overbooking_allowed)
            - Decimal(inventory.sold)
            - Decimal(inventory.blocked)
        )
        if remaining <= 0:
            db.rollback()
            raise ValueError(f"Sin disponibilidad para {night}")

        rate = next(r for r in rates if r.date == night)

        res_night = ReservationNight(
            reservation_id=reservation.id,
            room_type_id=room_type_id,
            rate_plan_id=rate_plan_id,
            date=night,
            base_rate=rate.price,
            amount=rate.price,
        )
        db.add(res_night)

        inventory.sold = inventory.sold + 1

    # ---- Folio de la reserva ----
    folio = Folio(
        property_id=property_id,
        reservation_id=reservation.id,
        guest_id=guest_id,
        kind="reservation",
        total_amount=total_amount,
        balance=total_amount,
    )
    db.add(folio)
    db.flush()

    for night in nights:
        rate = next(r for r in rates if r.date == night)
        item = FolioItem(
            folio_id=folio.id,
            type=FolioItemType.ROOM_NIGHT.value,
            description=f"Alojamiento {night.isoformat()}",
            quantity=1,
            unit_price=rate.price,
            amount=rate.price,
        )
        db.add(item)

    event = OutboxEvent(
        aggregate="Reservation",
        aggregate_id=str(reservation.id),
        type="ReservationCreated",
        payload={"reservation_id": str(reservation.id), "property_id": property_id},
    )
    db.add(event)

    db.commit()
    return reservation
```

---

## 8. Frontend amb Next.js

Na Flavia s'encarrega del frontend. Stack: Next.js 15 + TypeScript + Tailwind + shadcn/ui.

### Rutes principals

```txt
/dashboard            Vista general del hotel
/front-desk           Panel de recepcio
/front-desk/tape-chart    Calendari tipus grid d'habitacions i reserves
/front-desk/arrivals      Arribades del dia
/front-desk/departures    Sortides del dia
/reservations         Llistat de reserves
/reservations/new     Motor de disponibilitat + creacio de reserva
/reservations/[id]    Fitxa de reserva
/folios/[id]          Compte del guest, cargs, pagaments, reemborsaments
/housekeeping         Tasques i estat d'habitacions
/rates                Tarifes, plans, restriccions
/guests               Perfils de guests
/reports              Ocupacio, ingressos, ADR, RevPAR
/settings/rooms       Habitacions i tipus
/settings/users      Usuaris i rols
/settings/integrations    Connectors i marketplace
```

### Components clau

```txt
components/
├─ tape-chart/
│  ├─ TapeChart.tsx
│  ├─ RoomRow.tsx
│  └─ ReservationBlock.tsx
├─ reservations/
│  ├─ ReservationForm.tsx
│  ├─ ReservationTimeline.tsx
│  └─ ReservationStatusBadge.tsx
├─ folios/
│  ├─ FolioTable.tsx
│  ├─ AddChargeDialog.tsx
│  └─ PaymentDialog.tsx
├─ housekeeping/
│  ├─ RoomStatusBoard.tsx
│  └─ TaskCard.tsx
└─ ui/
   ├─ button.tsx
   ├─ dialog.tsx
   ├─ table.tsx
   └─ calendar.tsx
```

---

## 9. Esdeveniments i workers

### Esdeveniments importants

```txt
ReservationCreated
ReservationUpdated
ReservationCanceled
ReservationCheckedIn
ReservationCheckedOut
RoomAssigned
RoomChanged
RoomStatusChanged
FolioChargePosted          # inclou POS charges desde Comanda
FolioClosed
PaymentAuthorized
PaymentCaptured
PaymentRefunded
HousekeepingTaskCreated
NightAuditCompleted
FiscalRecordCreated        # nou: registre VeriFactu emes
POSRoomChargeReceived      # nou: cret rebut desde Comanda
```

### Workers recomanats (ARQ / Celery)

```txt
workers/
├─ reservation_created.py       # emails, sync OTAs
├─ pre_stay_email.py            # email abans d'arribada
├─ auto_room_assignment.py      # assignacio automatica
├─ payment_webhook.py           # processar webhooks de pagament
├─ channel_manager_sync.py      # sync amb OTAs
├─ invoice_generation.py        # generar factura al tancar folio
├─ night_audit.py               # tancament de caixa diari
└─ outbox_dispatcher.py         # enviar esdeveniments sortints
```

---

## 10. Docker i arrancada local

Arxiu: `infra/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16
    container_name: estada_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: estada
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: estada_redis
    restart: unless-stopped
    ports:
      - "6380:6379"

volumes:
  postgres_data:
```

> Ports 5433/6380 per evitar conflicte amb Comanda (que fa servir 5432/6379).

### Arrancada local

```bash
docker compose -f infra/docker-compose.yml up -d
cp .env.example .env
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
cd ../frontend
pnpm install
pnpm dev
```

> Backend al port 8001 (Comanda es 8000).

---

## 11. Seguretat i compliment

Punts critics:

1. **Multi-tenant real**: filtrar sempre per `tenant_id` i `property_id`.
   - Molts models nomes tenen `property_id` (no `tenant_id`). Resoldre-ho a la
     capa d'API amb una **dependency FastAPI** que, a partir del JWT, injecti el
     `tenant_id`/`property_id` i el fiqui a TOTES les querys (i el validi a cada
     PATCH/DELETE per `id`). Mai confiar que el client passi els ids correctes.
   - Un usuari del tenant A no ha de poder veure ni modificar dades del tenant B.
2. **RBAC per rol**: owner, admin, manager, receptio, housekeeping, comptabilitat.
3. **Audit log obligatori** en reserves, pagaments, folios i canvis d'habitacio.
4. **Idempotency keys** en pagaments i webhooks (camp `idempotency_key`).
5. **No guardar targetes**: usar tokens del proveidor de pagaments (Stripe/Adyen).
6. **PCI DSS** delegat a Stripe/Adyen.
7. **GDPR**: consentiment, retencio, dret a l'oblit.
8. **Backups** amb point-in-time recovery.
9. **Observabilitat**: logs, metriques, traces i alertes.

---

## 12. VeriFactu (compliance fiscal espanyol)

> **Decisio (Tomeu): VeriFactu si o si.** Estada emet factures d'hotel
> i ha de complir amb la normativa fiscal espanyola, igual que Comanda.

### 12.1. Model FiscalRecord

Seguir el **mateix patro que Comanda** (`backend/app/models/models.py`):
hash chaining SHA-256, canonical JSON amb claus ordenades.

```python
class FiscalRecord(Base):
    __tablename__ = "fiscal_records"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    folio_id = Column(UUID(as_uuid=True), ForeignKey("folios.id"), nullable=False)

    # Dades fiscals
    invoice_number = Column(String, nullable=False, unique=True)  # SEQ-AAAA-NNNNN
    invoice_type = Column(String, nullable=False)  # normal, simplified, rectificative
    total = Column(Numeric(12, 2), nullable=False)
    base_imponible = Column(Numeric(12, 2), nullable=False)  # base abans IVA
    iva = Column(Numeric(12, 2), nullable=False)              # import IVA total
    irpf = Column(Numeric(12, 2), default=0)                # retencio IRPF (si aplica)

    # Desglossament per tipus d'IVA (punt 5: un foli pot tenir IVA mixt)
    # Ex: [{"rate": "0.10", "base": "100.00", "tax": "10.00"}, {"rate": "0.21", ...}]
    vat_breakdown = Column(JSON, nullable=False, default=list)

    # Payload canonic COMPLET (JSON ordenat). Imprescindible per poder
    # recomputar payload_hash i VERIFICAR la cadena. Sense això, verify_chain
    # no pot reconstruir el que es va hashrejar.
    payload = Column(Text, nullable=False)

    # Hash chaining (igual que Comanda)
    previous_hash = Column(String, nullable=False)  # hash del registre anterior
    payload_hash = Column(String, nullable=False)    # hash del canonical JSON del payload
    hash = Column(String, nullable=False)            # hash = SHA256(previous_hash + payload_hash)

    issued_at = Column(DateTime(timezone=True), server_default=func.now())

    property = relationship("Property")
    folio = relationship("Folio")

    __table_args__ = (
        Index("ix_fiscal_prop_issued", "property_id", "issued_at"),
        Index("ix_fiscal_invoice", "invoice_number", unique=True),
    )


class FiscalSequence(Base):
    """Comptador atomica de numeracio fiscal per propietat i any.

    Necessari per evitar forats/duplicats a SEQ-AAAA-NNNNN sota concurrència.
    Cada fila es bloqueja amb SELECT ... FOR UPDATE en emetre una factura.
    """
    __tablename__ = "fiscal_sequences"
    id = uuid_pk()
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    last_number = Column(Integer, default=0)

    property = relationship("Property")

    __table_args__ = (
        Index("ix_fiscal_seq_prop_year", "property_id", "year", unique=True),
    )
```

### 12.2. Servei de hash chaining

Arxiu: `backend/app/services/fiscal_service.py`

```python
import json
import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.models import FiscalRecord, FiscalSequence, Folio


def _canonical_json(data: dict) -> str:
    """JSON amb claus ordenades (igual que Comanda)."""
    return json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def _build_vat_breakdown(folio: Folio) -> tuple[list[dict], Decimal, Decimal]:
    """Agrupa els cargs del foli per tipus d'IVA.

    Punt 5: un foli d'hotel pot portar IVA mixt (habitacio 10%, restaurant
    i begudes 21%, etc.). Cadascun del items te el seu propi `tax_rate`.
    Es considera que `amount` es el total amb IVA inclos.
    Retorna (breakdown, base_total, iva_total).
    """
    groups: dict[str, dict] = {}
    for item in folio.items:
        rate = Decimal(str(item.tax_rate or 0))
        gross = Decimal(item.amount)
        net = gross / (1 + rate) if rate else gross
        tax = gross - net
        g = groups.setdefault(
            str(rate), {"rate": str(rate), "base": Decimal("0"), "tax": Decimal("0")}
        )
        g["base"] += net
        g["tax"] += tax

    breakdown = [
        {"rate": g["rate"], "base": str(g["base"].quantize(Decimal("0.01"))),
         "tax": str(g["tax"].quantize(Decimal("0.01")))}
        for g in groups.values()
    ]
    base_total = sum((Decimal(g["base"]) for g in groups.values()), Decimal("0"))
    iva_total = sum((Decimal(g["tax"]) for g in groups.values()), Decimal("0"))
    return breakdown, base_total, iva_total


def generate_invoice_number(db: Session, property_id: str, year: int) -> str:
    """Numeracio SEQ-AAAA-NNNNN atomica per propietat i any.

    Punt 5: un simple SELECT MAX() + 1 pot duplicar numeros sota concurrència.
    Usem una fila comptador bloquejada amb FOR UPDATE (transaccio de curs curt).
    """
    seq = db.query(FiscalSequence).filter(
        FiscalSequence.property_id == property_id,
        FiscalSequence.year == year,
    ).with_for_update().first()
    if not seq:
        seq = FiscalSequence(property_id=property_id, year=year, last_number=0)
        db.add(seq)
        db.flush()
    seq.last_number += 1
    return f"SEQ-{year}-{seq.last_number:05d}"


def create_fiscal_record(db: Session, folio_id: str, property_id: str) -> FiscalRecord:
    folio = db.query(Folio).filter(Folio.id == folio_id).first()
    if not folio:
        raise ValueError("Folio no encontrado")
    if folio.balance != 0:
        raise ValueError("El folio no tiene saldo cero")

    # L'ultim registre de la cadena fiscal de la propietat
    last_record = db.query(FiscalRecord).filter(
        FiscalRecord.property_id == property_id
    ).order_by(FiscalRecord.issued_at.desc()).first()
    previous_hash = last_record.hash if last_record else "0" * 64

    breakdown, base_total, iva_total = _build_vat_breakdown(folio)

    issued = datetime.now(timezone.utc)
    invoice_number = generate_invoice_number(db, property_id, issued.year)

    payload = {
        "invoice_number": invoice_number,
        "invoice_type": "simplified",
        "property_id": str(property_id),
        "folio_id": str(folio_id),
        "currency": folio.currency,
        "total": str(folio.total_amount),
        "base_imponible": str(base_total),
        "iva": str(iva_total),
        "taxes": breakdown,
        "issued_at": issued.isoformat(),
    }

    # El payload canonic COMPLET es desa per poder verificar la cadena despres
    canonical = _canonical_json(payload)
    payload_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    record_hash = hashlib.sha256((previous_hash + payload_hash).encode("utf-8")).hexdigest()

    record = FiscalRecord(
        property_id=property_id,
        folio_id=folio_id,
        invoice_number=invoice_number,
        invoice_type="simplified",
        total=folio.total_amount,
        base_imponible=base_total,
        iva=iva_total,
        vat_breakdown=breakdown,
        payload=canonical,
        previous_hash=previous_hash,
        payload_hash=payload_hash,
        hash=record_hash,
        issued_at=issued,
    )
    db.add(record)
    db.commit()
    return record


def verify_chain(db: Session, property_id: str) -> dict:
    """Verifica la integritat de tota la cadena fiscal.

    Punt 5: recomputa payload_hash i el hash encadenat desde el `payload`
    que es GUARDA a cada registre. Sense el payload emmagatzemat no es pot
    verificar res de forma fiable.
    """
    records = db.query(FiscalRecord).filter(
        FiscalRecord.property_id == property_id
    ).order_by(FiscalRecord.issued_at.asc()).all()

    previous_hash = "0" * 64
    for r in records:
        if r.previous_hash != previous_hash:
            return {"valid": False, "broken_at": r.invoice_number, "reason": "previous_hash_mismatch"}
        payload_hash = hashlib.sha256(r.payload.encode("utf-8")).hexdigest()
        if payload_hash != r.payload_hash:
            return {"valid": False, "broken_at": r.invoice_number, "reason": "payload_hash_mismatch"}
        expected = hashlib.sha256((previous_hash + payload_hash).encode("utf-8")).hexdigest()
        if r.hash != expected:
            return {"valid": False, "broken_at": r.invoice_number, "reason": "chain_hash_mismatch"}
        previous_hash = r.hash

    return {"valid": True, "total_records": len(records)}
```

### 12.3. Quan s'emet

- Quan es **tanca un folio** (`POST /folios/:id/close`) amb saldo zero
- El `folio_service.close_folio()` crida `fiscal_service.create_fiscal_record()`
- La factura es genera automaticament i es enllaca a la cadena
- Endpoint de verificacio: `GET /fiscal/chain/verify`

---

## 13. Integracions Conceptes

### 13.1. Comanda (TPV) → Estada (room charges)

> Definit a `Commanders/docs/INTEGRACIO_JORNADA.md` seccio 14.
> Comanda te un `pms_adapter` multi-proveidor. Quan `PMS_PROVIDER=internal`,
> l'`InternalAdapter` parla amb Estada.

**Endpoint receptor a Estada:**

```txt
POST /integrations/pos/room-charges
  X-API-Key: <POS_API_KEY>
  Body:
  {
    "external_id": "rc-2026-09-06-001",     # idempotencia
    "guest_name": "Pere Llull",
    "room_number": "204",
    "amount": 30.00,
    "items": [
      {"name": "Coca Cola", "qty": 2, "price": 3.50},
      {"name": "Paella", "qty": 1, "price": 18.00},
      {"name": "Cafe", "qty": 2, "price": 2.50}
    ],
    "staff_id": "uuid-del-cambrer-a-comanda",
    "timestamp": "2026-09-06T14:30:00+02:00"
  }

  Response 201:
  {
    "success": true,
    "folio_id": "uuid-del-folio",
    "folio_item_id": "uuid-del-item",
    "reservation_id": "uuid-de-la-reserva"
  }

  Response 404:
  {
    "success": false,
    "error": "guest_not_found",
    "message": "No s'ha trobat cap guest checked-in a l'habitacio 204 amb el nom Pere Llull"
  }
```

**Logica:**
1. Idempotencia: buscar per `external_id`. Si existeix, retornar l'existant.
2. Localitzar la reserva activa de l'habitacio:
   - Criteri PRIMARI: `room_number` + `status=checked_in` (i `property_id`, perque
     el nombre d'habitacio pot repetir-se entre hotels).
   - Si hi ha mes d'un guest a la mateixa habitacio, desambigüar pel `guest_name`
     (normalitzant accents/espais/majuscules) o, si Comanda pot enviar-lo, pel `guest_id`.
3. Si no es troba: error 404 (habitacio sense check-in, guest no trobat, check-out ja fet).
4. Obtenir el foli de la reserva; si la reserva no te foli, crear-ne un de `kind=reservation`.
5. Crear `FolioItem` amb `type=pos_charge`, `description` amb el llistat d'items,
   `amount` = total rebut, i **`tax_rate`** (cada linia te el seu, p.ex. 21% beguda /
   10% menjar) perque VeriFactu pugui desglossar l'IVA correctament; `posted_at` = timestamp rebut.
6. Recalcular `folio.total_amount` i `folio.balance`.
7. Retornar confirmacio.

> **Matching robust (punt 8):** no confiar mai en el nom sol. El criteri primari
> ha de ser `room_number` + reserva checked-in activa. El `guest_name` nomes
> desambigüa si hi ha mes d'una persona a la mateixa habitacio. Normalitzar
> accents/espais/majuscules abans de comparar. En el futur, Comanda hauria
> d'enviar `guest_id` o millor `folio_id`/`reservation_id` per eliminar l'ambiguïtat.

**Configuracio Estada (.env):**
```
# Clau que Comanda usa com PMS_API_KEY. Unificada amb el nom que apareix a
# la capçalera de l'endpoint: POS_API_KEY (tambe val ESTADA_POS_API_KEY).
POS_API_KEY=clau-pos-comanda
```

### 13.2. Ariadna → Estada (la Madona)

> **Decisio (Tomeu): N'Ariadna ha de ser sa Madona i es imprescindible.**
> Ariadna es la recepcionista IA. Es l'interficie principal per gestionar
> l'hotel: crea i modifica reserves, fa check-in/out, assigna habitacions,
> consulta disponibilitat i tarifes, afageix cargs al folio.

Ariadna parla amb Estada via API. No es un endpoint concret — es **tota l'API
de reserves, recepcio, disponibilitat i folio**. Ariadna es un client API
amb privilegis de `reception` (o `manager`).

**Autenticacio:**
- Ariadna te la seva propia API key: `ARIADNA_API_KEY`
- O un usuari amb rol `reception`/`manager` i JWT
- Tots els endpoints de reserves/recepcio accepten aquesta auth

**Endpoints que Ariadna usa principalment:**

| Accio d'Ariadna | Endpoint d'Estada |
|---|---|
| Consultar disponibilitat | `GET /availability` |
| Cotitzar una estancia | `POST /reservations/quote` |
| Crear reserva | `POST /reservations` |
| Modificar reserva | `PATCH /reservations/:id` |
| Cancelar reserva | `POST /reservations/:id/cancel` |
| Fer check-in | `POST /reservations/:id/check-in` |
| Fer check-out | `POST /reservations/:id/check-out` |
| Assignar habitacio | `POST /reservations/:id/assign-room` |
| Canviar habitacio | `POST /reservations/:id/change-room` |
| Veure arribades del dia | `GET /reports/front-desk/arrivals` |
| Veure sortides del dia | `GET /reports/front-desk/departures` |
| Afegir cargo al folio | `POST /folios/:id/charges` |
| Veure folio | `GET /folios/:id` |
| Crear guest | `POST /guests` |

> Ariadna es qui te la logica conversacional: parla amb el guest, enten el
> que vol, i crida l'API d'Estada per executar-ho. Estada es el motor,
> Ariadna es l'interficie humana.

**Configuracio Estada (.env):**
```
ARIADNA_API_KEY=clau-ariadna-xxx
```

### 13.3. Jornada (staff) — indirecte

Jornada no parla directament amb Estada. Jornada sincronitza staff amb
Comanda (definit a `INTEGRACIO_JORNADA.md`), i Comanda es qui te la
relacio amb Estada via room charges. Estada no gestiona personal de
restaurant.

Si en el futur Estada necessita gestio de personal propi (recepcionistes,
housekeeping), es gestionara internament amb el model `User` + RBAC, no via
Jornada.

### 13.4. Reserves d'agències (OTAs, GDS, agències tradicionals)

> **Decisió (Tomeu, 08/09/2026):** Sistema de càrrega de reserves d'agències
> en **3 fases**: Webhooks, Parseig intel·ligent (OCR/IA) i Processament agentic.
> Document complet: `SISTEMA_RESERVES_AGENCIES.md` (carpeta Estada).

**Fase 1 — Webhooks (el nucli):**
- Estada exposa `POST /integrations/ota/webhook`.
- El Channel Manager/OTA envia l'event instantani quan entra una reserva.
- Estada crea la reserva en temps real (idempotent per `external_id`).
- Sincronització de disponibilitat bidireccional → elimina gairebé el 100% del risc d'overbooking.
- **Base ja existent:** model `WebhookEvent` (secció 5), `ReservationSource.OTA`, `IntegrationType.CHANNEL_MANAGER`.

**Fase 2 — Parseig intel·ligent (OCR/IA):**
- Per a agències tradicionals que envien PDF/email/bons (sense API estàndard).
- Un agent d'IA llegeix el correu/adjunt, extreu les dades (dates, habitació, règim, tarifa, peticions) i les volca a Estada via API.

**Fase 3 — Processament agentic:**
- La IA processa la reserva de manera autònoma:
  - Assigna observacions (alergia, llegada de madrugada) a recepció/housekeeping.
  - Detecta duplicats i frau (valida la targeta de garantia).

**Ordre d'implementació:** començar per la Fase 1 (Webhooks), que desbloqueja el valor més gran (overbooking) i encaixa amb el patró d'integracions existent.

### 13.5. Cobrament i liquidació de factures d'agències

> **Decisió (Tomeu, 08/09/2026):** Sistema de cobrament i liquidació de factures
> d'agències en **3 fases**: VCC, Conciliació bancària i Comissions/Net-Gross.
> Document complet: `SISTEMA_COBRAMENT_AGENCIES.md` (carpeta Estada).

**Fase 1 — Cobrament automàtic de Targetes Virtuals (VCC):**
- Quan les agències (Booking, Expedia, Agoda) usen el model **Merchant**, envien una **VCC** amb l'import exacte i una data d'activació.
- El PMS integra la **passarel·la de pagament nativa** (Adyen/Stripe) i la connexió amb el **Channel Manager**.
- Quan arriba el moment d'activació, el PMS demana el cobrament **100% automàtic i en l'ombra**.
- **Control d'imports**: la passarel·la valida que l'import coincideixi amb la **tarifa neta negociada**.
- **Base ja existent:** model `Payment` + `PaymentStatus`, passarel·la Stripe/Adyen (secció 2).

**Fase 2 — Conciliació bancària automàtica (Auto-Reconciliation):**
- Per a agències que paguen per **transferència bancària en massa** (turoperadors, agències tradicionals).
- El PMS usa **algorismes d'IA** per al creuament de pagaments connectats a la **banca oberta (Open Banking)**.
- **Lectura de justificants**: la IA llegeix els extractes bancaris o fitxers de liquidació (remittance advice) en PDF/Excel, identifica les referències de les reserves i paga automàticament cada factura i folio.

**Fase 3 — Gestió de comissions i Net/Gross automatic settlement:**
- El sistema calcula i liquida en temps real la diferència entre el preu **Brut** i el preu **Net** (descomptant la comissió de l'agència).
- **Facturació automàtica**: quan el pagament s'efectua, el PMS genera la factura rectificativa per la comissió i l'envia a l'ERP de l'hotel.
- **Control de discrepàncies**: si l'agència aplica un descompte no autoritzat o una comissió errònia, el sistema ho detecta a l'instant (discrepancy alert).

**Ordre d'implementació:** començar per la Fase 1 (VCC), que elimina el risc de targetes caducades.

### 13.6. Control de reserves amb contractes d'agències (Yield & Allotment)

> **Decisió (Tomeu, 08/09/2026):** Mòdul de **Gestió de Contractes de Turoperació
> (Yield & Allotment Management)** per auditar cada reserva contra les condicions
> contractuals signades amb l'agència.
> Document complet: `SISTEMA_CONTRACTES_AGENCIES.md` (carpeta Estada).

**Fase 1 — Contract Rules Engine (parametrització del contracte):**
- Cupos/Contingents (Allotments), Dies de Release, Garantia (Garantit vs. Lliure), Tarifes i Descomptes, Condicions d'Anul·lació.
- (Opcional) IA per extreure els paràmetres del PDF del contracte.
- **Base ja existent:** model `Inventory` (allotment, overbooking_allowed), `RatePlan` (min_stay/max_stay), `_check_restrictions`.

**Fase 2 — Automated Audit (validació automàtica a l'entrada):**
- Control de Cupó i Release: rebutjar / on request / aplicar PVP.
- Comprovació de Preus: discrepància → "Pendent de Revisió / Discrepància de Preu".

**Fase 3 — Yield & Allotment Control (optimització):**
- Alliberament Dinàmic (Dynamic Release) si l'ocupació és alta.
- Stop Sales automàtics a agències amb venda lliure.

**Fase 4 — Auditoria de liquidació i facturació:**
- Compara Nights Stayed, No-shows/Late Cancellations, Guarantee Commitments.
- Genera informe d'auditoria que quadra l'import a facturar.

**Ordre d'implementació:** començar per la Fase 1 (Contract Rules Engine).

### 13.7. Àrees clau del PMS (on van els 6 camps)

> **Decisió (Tomeu, 08/09/2026):** Distribució dels 6 camps d'un PMS modern
> entre Estada, Comanda i un projecte separat de Domòtica/IoT.

| Camp | On va | Estat |
|---|---|---|
| **1. Perfils de Clients i CRM** | **Estada** (Fase 1) | Model `Guest` ja existeix |
| **2. Housekeeping & Manteniment** | **Estada** (Fase 1) | API de housekeeping ja existeix |
| **3. Revenue Management** | **Estada** (Fase 1) | rates, rate-plans, inventory ja existeixen |
| **4. Serveis addicionals i POS** | **Comanda** (ja cobert) | TPV versàtil a recepció: Spa, lloguers de bicis, transfers, minibar, minimarket. Estada només rep els room charges |
| **5. Night Audit & Reporting** | **Estada** (Fase 1) | Previst (Fase 5 workers) |
| **6. Integracions i Domòtica (IoT)** | **Projecte separat** | Requereix hardware/integració física |

**Resum:**
- **A Estada (Fase 1):** camps **1, 2, 3 i 5** (CRM, Housekeeping, Revenue, Night Audit) — el core comercial i financer.
- **Camp 4 (POS):** ja cobert per **Comanda** (TPV versàtil a recepció: Spa, bicis, transfers, minibar, minimarket). Estada només rep els càrrecs (room charges).
- **Camp 6 (Domòtica/IoT):** **projecte separat** — no és core del PMS, requereix hardware i integració física.

### 13.8. Portal del client (com el portal de l'empleat a Jornals)

> **Decisió (Tomeu, 08/09/2026):** Crear un **portal del client** a Estada,
> anàleg al portal de l'empleat de Jornals, amb informació bidireccional.

**Funcionalitats del portal del client:**
- **Informació bidireccional:** el client veu la seva estada (reserva, folio, càrrecs) i pot comunicar-se amb l'hotel.
- **Obertura de porta de l'habitació via mòbil:** el client pot obrir la porta amb el mòbil (integració amb la domòtica/panys).
- **Validació de càrrecs a l'habitació (crèdits):** el client veu i valida els càrrecs del seu folio en temps real.
- **Promocions:** l'hotel pot oferir promocions personalitzades al client.
- **Fidelització:** nivells de fidelitat, punts, avantatges.

**Integració amb l'ecosistema:**
- El portal del client es connecta amb **Estada** (reserva, folio, càrrecs).
- L'obertura de porta via mòbil es connecta amb la **domòtica/IoT** (projecte separat).
- Les promocions i fidelització es basen en el **CRM** (camp 1).

**Ordre d'implementació:** el portal del client és una **fase posterior** (després del core d'Estada). Es pot anar construint a sobre del CRM i el folio.

### 13.8.1. Portal del client — requisits legals (RGPD, LSSI, eIDAS)

> **Nota legal (Tomeu, 08/09/2026):** El Portal del Client s'ha de dissenyar
> complint estrictament el **RGPD**, la **LSSI** i el reglament **eIDAS** de
> signatura electrònica. Com un Portal de l'Empleat amb el RRHH, però orientat
> al client (Guest App / Portal Web de l'Hòspit).

**Funcionalitat 1 — Obertura de porta amb el mòbil (Clau Digital / Bluetooth / Web App):**
- [ ] **Legal i segur**, sempre que:
  - La clau digital **només s'activa després de verificar la identitat** del client (check-in complet, DNI/passaport validat i fitxa d'entrada signada).
  - Les dades de desencriptació enviades al telèfon compleixin **xifrat d'extrem a extrem (End-to-End)**.
- [ ] **Alternativa tradicional**: oferir sempre una clau/targeta física per a qui no faci servir el mòbil (no obligatorietat).

**Funcionalitat 2 — Imputació i verificació de càrrecs a l'habitació (Charge to Room):**
- [ ] **Legal amb transparència** en les condicions de pagament:
  - **Consentiment i preautorització**: al check-in (o a l'app), el client accepta expressament carregar despeses i preautoritza una targeta com a garantia.
  - **Accés a les factures**: el portal permet consultar el desglossament de despeses en temps real (dret a la informació del consumidor abans del tancament).

**Funcionalitat 3 — Enviament de promocions, upselling i màrqueting (el punt més delicat per RGPD):**
- [ ] **Serveis durant l'estada (cross-selling operatiu)**: oferir serveis de l'hotel directament relacionats amb l'estada (reservar taula al restaurant, llogar pista, servei de spa) → es pot acollir a l'**interès legítim** o a l'**execució del contracte d'allotjament**.
- [ ] **Promocions comercials/futures**: màrqueting no vinculat a l'estada actual o campanyes després del check-out → cal **consentiment exprés (opt-in)**, no marcat per defecte, durant el registre o el primer accés al portal.

**Funcionalitat 4 — Registre de viatgers i signatura digital:**
- [ ] **Obligatori per llei** (filiació policial / seguretat ciutadana).
  - El portal pot fer el **pre-check-in**; les dades es recullen i s'envien a les autoritats segons la normativa.
  - La **signatura digital en pantalla té plena validesa jurídica** si la plataforma compleix el reglament **eIDAS**.

**Bones pràctiques d'implementació:**
- [ ] **Política de privadesa clara**: al primer accés, avís de privadesa resumit + enllaç a la política completa (ús de les dades).
- [ ] **No obligatorietat**: alternativa tradicional (clau/targeta física) per a qui no pugui/no vulgui el mòbil.
- [ ] **Accés mitjançant Web App (PWA)**: en lloc d'una app per instal·lar, un enllaç per SMS/WhatsApp o QR + número de reserva. El client no instal·la res → facilita molt el compliment normatiu.

### 13.9. CRM — projecte separat SENTINELA (integrat amb Estada)

> **Decisió (Tomeu, 08/09/2026):** El CRM és un **projecte SEPARAT** (nom de
> treball: **SENTINELA**), completament lligat amb Estada i viceversa.
> Document complet: `SENTINELA_CRM.md` (carpeta Projectes).

**Rol de cada sistema:**
- **Estada (PMS):** "cor" operatiu — reserves, ocupació, housekeeping, folios, facturació, VeriFactu.
- **SENTINELA (CRM):** "cervell" comercial i de màrqueting — contactes, pipeline, lead scoring, email marketing, campanyes, forecasting.

**Mòduls del CRM:** contactes, pipeline (Kanban), tasques i alertes, canals de comunicació, dashboards/analytics, API i mòbil.

**Integració bidireccional (crítica):**
- **PMS → CRM:** historial d'estades, despesa mitjana, preferències, serveis consumits.
- **CRM → PMS:** leads corporatius, tarifes acordades.
- **Sincronització en temps real** (API bidireccional), **deduplicació** de perfils (email/DNI/telèfon), i **RGPD** (consentiment de màrqueting separat).

**Ordre d'implementació:**
1. Estada (core operatiu).
2. Estada Guest (CRM bàsic).
3. SENTINELA (CRM complet) quan el core d'Estada estigui consolidat.
4. Integració bidireccional.

### 13.10. Manteniment dins Housekeeping (parts a SSTT)

> **Decisió (Tomeu, 08/09/2026):** Dins de Housekeeping, incloure un apartat de
> **manteniment** que permeti **passar parts a SSTT (Serveis Tècnics)** i
> **seguir l'estat de la reparació**.

**Funcionalitats:**
- **Partes a SSTT (Serveis Tècnics):** la cambrera de pisos (o el personal) pot
  registrar una avaria (ex. aixeta que goteja, aire condicionat que no funciona)
  i passar el part al servei tècnic.
- **Seguiment de l'estat de la reparació:** visualitzar en temps real l'estat de
  cada reparació (pendent, en curs, en espera de peça, resolt).
- **Bloqueig automàtic de l'habitació pendent de reparació:** l'habitació amb una
  avaria no resolta queda **bloquejada (Out of Order / Fora de servei)** i no es
  pot assignar ni vendre fins que la reparació estigui resolta, evitant que un
  client ocupe una habitació en mal estat.
- **Notificació al servei tècnic:** avís automàtic quan es registra una avaria.

**Model (proposta):**
- Entitat `MaintenanceTask` (tipus d'avaria, descripció, habitació, prioritat,
  estat, tècnic assignat, dates).
- Estats: `pendent`, `en_curs`, `en_espera_peca`, `resolt`, `cancelat`.
- Relació amb `Room` (l'habitació afectada) i amb `User` (el tècnic assignat).
- Quan una tasca de manteniment està en estat no resolt, la `Room` queda marcada
  com a `BLOCKED` / `OUT_OF_SERVICE` i no es pot assignar ni incloure a la venda.

**Integració amb l'ecosistema:**
- Dins del mòdul de **Housekeeping** d'Estada (camp 2).
- Si hi ha una app de tècnics (SSTT), es pot integrar via API.

---

## 14. Criteris d'acceptacio del MVP

El MVP esta funcional quan pots fer aixo de punta a punta:

```txt
 1. Configurar hotel, habitacions i tarifes
 2. Buscar disponibilitat
 3. Cotitzar una estancia
 4. Crear reserva
 5. Assignar habitacio
 6. Fer check-in
 7. Afegir cargs al folio
 8. Registrar un pagament
 9. Fer check-out
10. Generar factura VeriFactu (hash chaining)
11. Generar tasca de neteja
12. Veure reporte diari
13. Tancar caixa / night audit
14. Rebre un room charge desde Comanda (POS integration)
15. Verificar integritat de la cadena fiscal
```

---

## 15. Proximes passes

### Fase 1: Estructura i model (na Maria)
- [ ] Crear estructura de directoris (backend/app/...)
- [ ] `config.py` amb settings (DB, Redis, API keys, VeriFactu)
- [ ] `database.py` (engine, SessionLocal, Base)
- [ ] Tots els models SQLAlchemy (seccio 5)
- [ ] `FiscalRecord` + `FiscalSequence` + servei de hash chaining (seccio 12)
- [ ] Pydantic schemas
- [ ] Alembic: migracions desde el primer dia (NO `create_all`).

### Fase 2: API core (na Maria)
- [ ] Auth (login, refresh, me) amb JWT
- [ ] CRUD propietats, tipus d'habitacio, habitacions
- [ ] Tarifes i inventari (bulk-upsert)
- [ ] Motor de disponibilitat + cotitzacio
- [ ] Reserves (crear, modificar, cancelar, check-in/out)
- [ ] Folio (cargs, pagaments, tancar)
- [ ] VeriFactu: emitir factura al tancar folio + verificar cadena
- [ ] Tests e2e (verify_e2e.py, mateix patro que Comanda)

### Fase 3: Integracions (na Maria)
- [ ] `POST /integrations/pos/room-charges` (Comanda → Estada)
- [ ] Config `POS_API_KEY` + `ARIADNA_API_KEY`
- [ ] Auth per Ariadna (API key o JWT amb rol reception)
- [ ] Outbox events + worker dispatcher

### Fase 4: Frontend (na Flavia)
- [ ] Dashboard
- [ ] Tape chart (calendari d'ocupacio)
- [ ] Reserves (llistat, creacio, fitxa)
- [ ] Folio (cargs, pagaments)
- [ ] Housekeeping board
- [ ] Rates (tarifes i restriccions)
- [ ] Reports

### Fase 5: Workers i operacio
- [ ] Night audit
- [ ] Channel manager sync (OTAs)
- [ ] Emails pre-stay
- [ ] Docker + CI/CD
- [ ] Deploy

---

## 16. Auth — homogeneitzacio (pendent de disseny)

> **Decisio (Tomeu):** Cal pensar en homogeneitzar la part d'Auth.

### Estat actual de cada producte

| Producte | Auth | Detalls |
|---|---|---|
| Comanda | PIN + DeviceSession | Login per PIN al TPV, sessio per dispositiu (PDA/mobil) |
| Jornada | Propia | Login d'empleats, portal empleat |
| Ariadna | Session-based | Taula de sessions, redirect 307 |
| Estada (proposed) | JWT + RBAC | Roles: owner, admin, manager, reception, housekeeping, accounting |

### Proposites d'homogeneitzacio

1. **JWT compartit (SSO)**: un servei d'auth central que emet JWTs. Tots els
   productes validen el mateix token. Un login serveix per a tot.
   - Pro: experiencia unificada, un usuari pot anar d'Ariadna a Comanda sense re-login
   - Contra: servei critic (si cau, ningue pot entrar enlloc), mes complexitat

2. **OAuth2 / OIDC**: usar Keycloak o Authentik com a IdP. Cada producte es un client.
   - Pro: estandard industrie, suporta SSO real, MFA, refresh tokens
   - Contra: mes infraestructura, mes configuracio

3. **API keys per integracions, JWT per usuaris**: mantenir el patro actual.
   Les integracions (Comanda→Estada, Ariadna→Estada) usen API keys.
   Els usuaris humans usen JWT. Cada producte gestiona el seu propi JWT
   pero amb un format compatible (mateix secret, mateix claims).
   - Pro: simple, no cal servei addicional
   - Contra: no es SSO real — l'usuari ha de fer login a cada producte

4. **Comanda te PIN, no JWT**: Comanda fa servir PIN perque es un TPV
   (el cambrer entra un PIN rapid). Aixo es diferent dels altres productes.
   Potser el PIN es nomes per al dispositiu TPV, i per a la web de gestio
   de Comanda si fa servir JWT.

### Pendent

- Decidir quin model (SSO, OAuth2, JWT compatible, o mixt)
- El PIN de Comanda es queda o es substitueix?
- Ariadna com s'autentica a Estada? (API key o JWT de servei?)
- Cal un servei d'auth central o cada producte gestiona el seu?

> **Accio:** Dissenyar un document d'auth comu quan es tingui mes
> clar. De moment, Estada comença amb JWT + RBAC propi, disenyat per
> ser compatible amb un futur SSO. Les integracions usen API keys
> separades (POS_API_KEY, ARIADNA_API_KEY), mateix patro que Comanda.

---

_Aquest document es una guia d'implementacio per al PMS Estada de Conceptes.
Adaptat de l'esquelet original a FastAPI + SQLAlchemy per coherencia amb
l'ecosistema. Tots els models, endpoints i serveis segueixen el mateix
patro que Comanda i Ariadna.
Codi en castella per convenio del projecte._
