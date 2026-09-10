import sys
import os
import random
import string
from datetime import date, datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.models import (
    Tenant, Property, Room, RoomType, RatePlan, Guest, 
    Reservation, ReservationNight, Folio, FolioItem
)
from app.services.bootstrap import bootstrap

def generate_confirmation_code(index):
    return f"CONF-{2000 + index}"

def get_random_guest(db, property_obj, tenant_obj):
    first_names = ["Marc", "Laia", "Jordi", "Montserrat", "Pau", "Meritxell", "Oliver", "Sophie", "Hans", "Elena", "Diego", "Valentina", "Liam", "Emma", "Hiroshi", "Yuki", "Clara", "Xavi", "Berta", "Arnau"]
    last_names = ["Puig", "Sanz", "Vila", "Torrent", "Giménez", "Muller", "Smith", "Dubois", "Rossi", "Tanaka", "Fernández", "Castelló", "Moreno", "Alba", "Roca"]
    
    fname = random.choice(first_names)
    lname = random.choice(last_names)
    email = f"{fname.lower()}.{lname.lower()}{random.randint(10,99)}@example.com"
    
    guest = db.query(Guest).filter(Guest.email == email).first()
    if not guest:
        guest = Guest(
            tenant_id=tenant_obj.id,
            first_name=fname,
            last_name=lname,
            email=email,
            phone=f"+34{random.randint(600000000, 699999999)}",
            document_type="DNI",
            document_number=f"{random.randint(10000000, 99999999)}{random.choice(string.ascii_uppercase)}",
            marketing_opt_in=random.choice([True, False]),
            notes=f"Guest created for seeding. Preference: {random.choice(['Quiet room', 'High floor', 'Near elevator'])}"
        )
        db.add(guest)
        db.commit()
        db.refresh(guest)
    return guest

def seed_reservations():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    bootstrap(db)

    tenant = db.query(Tenant).first()
    property_obj = db.query(Property).first()
    
    if not tenant or not property_obj:
        print("Error: Tenant or Property not found. Run seed_demo.py first.")
        return

    room_types = db.query(RoomType).filter(RoomType.property_id == property_obj.id).all()
    rooms = db.query(Room).filter(Room.property_id == property_obj.id).all()
    rate_plans = db.query(RatePlan).filter(RatePlan.property_id == property_obj.id).all()

    if not room_types or not rate_plans:
        print("Error: RoomTypes or RatePlans not found.")
        return

    # Configuración de distribución de estados
    scenarios = [
        ("checked_out", 5),
        ("checked_in", 8),
        ("confirmed", 15),
        ("quote", 5),
        ("canceled", 4),
        ("no_show", 3)
    ]
    
    sources = ["direct_web", "booking_engine", "phone", "walk_in", "ota", "channel_manager", "corporate", "ariadna"]
    
    # Precios base por tipo de habitación (simplificado para el cálculo)
    price_map = {"STD": 100, "DLX": 150, "SUI": 250}
    
    res_idx = 0
    for status, count in scenarios:
        for _ in range(count):
            res_idx += 1
            code = generate_confirmation_code(res_idx)
            
            # Idempotencia
            if db.query(Reservation).filter(Reservation.confirmation_code == code).first():
                continue

            # Lógica de fechas según estado
            today = date.today()
            if status == "checked_out":
                check_in = today - timedelta(days=random.randint(3, 20))
                check_out = check_in + timedelta(days=random.randint(1, 5))
            elif status == "checked_in":
                check_in = today - timedelta(days=random.randint(0, 5))
                check_out = today + timedelta(days=random.randint(1, 4))
            elif status in ["confirmed", "quote"]:
                check_in = today + timedelta(days=random.randint(1, 60))
                check_out = check_in + timedelta(days=random.randint(1, 7))
            else: # canceled, no_show
                check_in = today + timedelta(days=random.randint(-10, 10))
                check_out = check_in + timedelta(days=random.randint(1, 5))

            # Selección de entidades
            guest = get_random_guest(db, property_obj, tenant)
            rt = random.choice(room_types)
            rp = random.choice(rate_plans)
            source = random.choice(sources)
            
            # Cálculo de precio
            base_val = Decimal(price_map.get(rt.code, 120))
            # Descuento si el plan es NONREF (ejemplo)
            multiplier = Decimal("0.80") if "NONREF" in rp.code.upper() else Decimal("1.00")
            nightly_rate = (base_val * multiplier).quantize(Decimal("0.01"))
            
            num_nights = (check_out - check_in).days
            total_amount = (nightly_rate * num_nights).quantize(Decimal("0.01"))

            # Crear Reserva
            res = Reservation(
                property_id=property_obj.id,
                guest_id=guest.id,
                room_type_id=rt.id,
                rate_plan_id=rp.id,
                confirmation_code=code,
                status=status,
                source=source,
                check_in=check_in,
                check_out=check_out,
                adults=random.randint(1, 3),
                children=random.randint(0, 2),
                total_amount=total_amount,
                currency="EUR",
                notes=f"Seeded reservation for {status} scenario",
                assigned_room_id=random.choice(rooms).id if status in ["confirmed", "checked_in", "checked_out"] else None,
                canceled_at=datetime.now() if status == "canceled" else None
            )
            db.add(res)
            db.flush()

            # Crear Noches de Reserva
            for i in range(num_nights):
                night_date = check_in + timedelta(days=i)
                rn = ReservationNight(
                    reservation_id=res.id,
                    room_type_id=rt.id,
                    rate_plan_id=rp.id,
                    date=night_date,
                    base_rate=nightly_rate,
                    amount=nightly_rate,
                    taxes=(nightly_rate * Decimal("0.10")).quantize(Decimal("0.01")),
                    discounts=Decimal("0.00")
                )
                db.add(rn)

            # Crear Folio
            folio = Folio(
                property_id=property_obj.id,
                reservation_id=res.id,
                guest_id=guest.id,
                kind="reservation",
                status="open" if status != "checked_out" else "closed",
                currency="EUR",
                total_amount=total_amount,
                paid_amount=total_amount if status == "checked_out" else Decimal("0.00"),
                balance=Decimal("0.00") if status == "checked_out" else total_amount
            )
            db.add(folio)
            db.flush()

            # Crear FolioItems (noches)
            for i in range(num_nights):
                fi = FolioItem(
                    folio_id=folio.id,
                    type="room_night",
                    description=f"Room night {i+1}/{num_nights}",
                    quantity=1,
                    unit_price=nightly_rate,
                    tax_rate=Decimal("10.00"),
                    amount=nightly_rate,
                    posted_at=datetime.now()
                )
                db.add(fi)

            # Caso especial No-Show fee
            if status == "no_show":
                no_show_fee = Decimal("50.00")
                folio.total_amount += no_show_fee
                folio.balance += no_show_fee
                fi_ns = FolioItem(
                    folio_id=folio.id,
                    type="no_show_fee",
                    description="No-show penalty fee",
                    quantity=1,
                    unit_price=no_show_fee,
                    tax_rate=Decimal("10.00"),
                    amount=no_show_fee,
                    posted_at=datetime.now()
                )
                db.add(fi_ns)

            db.commit()

    print(f"Successfully seeded {res_idx} reservations.")
    db.close()

if __name__ == "__main__":
    seed_reservations()