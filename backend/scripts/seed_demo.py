import sys, os
from datetime import date, timedelta, datetime
from decimal import Decimal
import uuid

# Configuración de rutas para importar desde la raíz de backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.models import (
    Tenant, Property, RoomType, Room, RatePlan, Rate,
    Guest, Reservation, ReservationNight, Folio, FolioItem,
    HousekeepingTask
)
from app.services.bootstrap import bootstrap

def seed_demo():
    # Crear el esquema (idempotente) y el tenant + owner iniciales.
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bootstrap(db)
        print("🚀 Iniciando seeding de datos de demostración...")

        # 1. TENANT & PROPERTY
        tenant = db.query(Tenant).first()
        if not tenant:
            tenant = Tenant(
                id=uuid.uuid4(),
                name="Demo Hotel Group",
                slug="demo-hotel",
                active=True
            )
            db.add(tenant)
            db.commit()
            print("✅ Tenant creado.")

        property_hotel = db.query(Property).first()
        if not property_hotel:
            property_hotel = Property(
                id=uuid.uuid4(),
                tenant_id=tenant.id,
                name="Estada Grand Hotel",
                code="EGH01",
                timezone="Europe/Madrid",
                currency="EUR",
                address={"street": "Calle Mayor 1", "city": "Madrid", "country": "Spain"},
                active=True
            )
            db.add(property_hotel)
            db.commit()
            print("✅ Propiedad creada.")

        # 2. ROOM TYPES
        types_data = [
            {"code": "STD", "name": "Estándar", "max_adults": 2, "max_children": 1, "base_occ": 1},
            {"code": "DLX", "name": "Deluxe", "max_adults": 2, "max_children": 2, "base_occ": 1},
            {"code": "SUI", "name": "Suite", "max_adults": 3, "max_children": 2, "base_occ": 2},
        ]

        for data in types_data:
            rt = db.query(RoomType).filter(RoomType.code == data["code"], RoomType.property_id == property_hotel.id).first()
            if not rt:
                rt = RoomType(
                    id=uuid.uuid4(),
                    property_id=property_hotel.id,
                    code=data["code"],
                    name=data["name"],
                    description=f"Habitación tipo {data['name']}",
                    max_adults=data["max_adults"],
                    max_children=data["max_children"],
                    base_occupancy=data["base_occ"],
                    active=True
                )
                db.add(rt)

        db.commit()
        # Asegurar que tenemos la lista actualizada
        room_types = db.query(RoomType).filter(RoomType.property_id == property_hotel.id).all()

        # 3. ROOMS (101-110)
        for i in range(101, 111):
            exists = db.query(Room).filter(Room.number == str(i), Room.property_id == property_hotel.id).first()
            if not exists:
                # Asignar tipo cíclicamente
                rt = room_types[i % len(room_types)]
                room = Room(
                    id=uuid.uuid4(),
                    property_id=property_hotel.id,
                    room_type_id=rt.id,
                    number=str(i),
                    floor=str(i // 100),
                    status="clean",
                    active=True
                )
                db.add(room)
        db.commit()
        print("✅ Habitaciones creadas.")

        # 4. RATE PLANS
        plans_data = [
            {"code": "BAR", "name": "Best Available Rate", "min": 1, "max": 30},
            {"code": "NONREF", "name": "No Reembolsable", "min": 1, "max": 30},
        ]
        for data in plans_data:
            rp = db.query(RatePlan).filter(RatePlan.code == data["code"], RatePlan.property_id == property_hotel.id).first()
            if not rp:
                rp = RatePlan(
                    id=uuid.uuid4(),
                    property_id=property_hotel.id,
                    code=data["code"],
                    name=data["name"],
                    description="Plan de tarifa demo",
                    min_stay=data["min"],
                    max_stay=data["max"],
                    policies={"cancelation": "24h"},
                    active=True
                )
                db.add(rp)
        db.commit()
        rate_plans = db.query(RatePlan).filter(RatePlan.property_id == property_hotel.id).all()

        # 5. RATES (Próximos 30 días)
        today = date.today()
        for rt in room_types:
            for rp in rate_plans:
                for day in range(30):
                    target_date = today + timedelta(days=day)
                    exists = db.query(Rate).filter(Rate.room_type_id == rt.id, Rate.rate_plan_id == rp.id, Rate.date == target_date).first()
                    if not exists:
                        price = Decimal("100.00") if rt.code == "STD" else Decimal("150.00") if rt.code == "DLX" else Decimal("250.00")
                        if rp.code == "NONREF": price *= Decimal("0.8")

                        rate = Rate(
                            id=uuid.uuid4(),
                            room_type_id=rt.id,
                            rate_plan_id=rp.id,
                            date=target_date,
                            price=price,
                            currency="EUR",
                            closed_to_arrival=False,
                            closed_to_departure=False,
                            stop_sell=False
                        )
                        db.add(rate)
        db.commit()
        print("✅ Tarifas generadas para 30 días.")

        # 6. GUESTS
        guests_data = [
            ("Juan", "Pérez", "juan@example.com", "12345678X"),
            ("María", "García", "maria@example.com", "87654321Y"),
            ("Carlos", "López", "carlos@example.com", "11223344Z"),
            ("Ana", "Martínez", "ana@example.com", "55667788W"),
            ("Luis", "Rodríguez", "luis@example.com", "99887766Q"),
        ]
        for i, (fn, ln, em, doc) in enumerate(guests_data):
            exists = db.query(Guest).filter(Guest.email == em).first()
            if not exists:
                g = Guest(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    first_name=fn,
                    last_name=ln,
                    email=em,
                    phone=f"+34600{100000 + i*11111}",
                    document_type="DNI",
                    document_number=doc,
                    marketing_opt_in=True,
                    notes="Guest de demo"
                )
                db.add(g)
        db.commit()
        guests = db.query(Guest).filter(Guest.tenant_id == tenant.id).all()

        # 7. RESERVATIONS
        rooms = db.query(Room).filter(Room.property_id == property_hotel.id).all()
        res_statuses = ["checked_out", "checked_in", "confirmed", "confirmed", "quote"]

        for i in range(min(len(guests), 8)):
            guest = guests[i]
            rt = room_types[i % len(room_types)]
            rp = rate_plans[i % len(rate_plans)]
            status = res_statuses[i % len(res_statuses)]

            # Fechas relativas
            if status == "checked_out":
                check_in = today - timedelta(days=10)
                check_out = today - timedelta(days=5)
            elif status == "checked_in":
                check_in = today - timedelta(days=2)
                check_out = today + timedelta(days=3)
            else:
                check_in = today + timedelta(days=i+1)
                check_out = check_in + timedelta(days=2)

            res = Reservation(
                id=uuid.uuid4(),
                property_id=property_hotel.id,
                guest_id=guest.id,
                room_type_id=rt.id,
                rate_plan_id=rp.id,
                assigned_room_id=rooms[i].id,
                confirmation_code=f"CONF-{1000+i}",
                status=status,
                source="direct_web",
                check_in=check_in,
                check_out=check_out,
                adults=2,
                children=0,
                total_amount=Decimal("300.00"),
                currency="EUR",
                notes="Reserva de prueba"
            )
            db.add(res)
            db.flush()

            # Reservation Nights
            curr_date = check_in
            while curr_date < check_out:
                rn = ReservationNight(
                    id=uuid.uuid4(),
                    reservation_id=res.id,
                    room_type_id=rt.id,
                    rate_plan_id=rp.id,
                    date=curr_date,
                    base_rate=Decimal("150.00"),
                    amount=Decimal("150.00"),
                    taxes=Decimal("15.00"),
                    discounts=Decimal("0.00")
                )
                db.add(rn)
                curr_date += timedelta(days=1)

            # Folio
            folio = Folio(
                id=uuid.uuid4(),
                property_id=property_hotel.id,
                reservation_id=res.id,
                guest_id=guest.id,
                kind="reservation",
                status="open" if status != "checked_out" else "closed",
                currency="EUR",
                total_amount=Decimal("300.00"),
                paid_amount=Decimal("0.00"),
                balance=Decimal("300.00")
            )
            db.add(folio)
            db.flush()

            # Folio Item
            item = FolioItem(
                id=uuid.uuid4(),
                folio_id=folio.id,
                type="room_night",
                description="Alojamiento",
                quantity=1,
                unit_price=Decimal("300.00"),
                tax_rate=Decimal("10.0"),
                amount=Decimal("300.00"),
                posted_at=datetime.now()
            )
            db.add(item)

        db.commit()
        print("✅ Reservas, noches y folios creados.")

        # 8. HOUSEKEEPING TASKS
        for room in rooms[:5]:
            task = HousekeepingTask(
                id=uuid.uuid4(),
                property_id=property_hotel.id,
                room_id=room.id,
                type="cleaning",
                status="pending",
                priority=3,
                due_at=datetime.now(),
                notes="Limpieza de salida"
            )
            db.add(task)
        db.commit()
        print("✅ Tareas de limpieza creadas.")

        print("\n✨ Seed completado exitosamente.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error durante el seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo()
