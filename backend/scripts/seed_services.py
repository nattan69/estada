"""Seed del catàleg de serveis (amb IVA per servei) i de la config d'ecotaxa.

Els tipus d'IVA segueixen l'especificació de Tomeu:
- 10% (reduït): allotjament, restauració (pensió, room service, minibar).
- 21% (general): spa/wellness, aparcament, botiga, salons, esdeveniments,
  espectacles, bugaderia, telèfon.
"""
import sys, os
from datetime import date
from decimal import Decimal
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.models import Tenant, Property, Service, EcoTaxConfig
from app.services.bootstrap import bootstrap

SERVICES = [
    # (code, name, category, vat_rate, revenue_account)
    ("room", "Allotjament", "allotjament", "0.10", "room_revenue"),
    ("meal", "Pensió", "restauracio", "0.10", "meal_revenue"),
    ("room_service", "Room service", "restauracio", "0.10", "extra_revenue"),
    ("minibar", "Minibar", "restauracio", "0.10", "extra_revenue"),
    ("spa", "Spa i benestar", "benestar", "0.21", "extra_revenue"),
    ("parking", "Aparcament", "aparcament", "0.21", "extra_revenue"),
    ("shop", "Botiga", "botiga", "0.21", "extra_revenue"),
    ("salons", "Lloguer de salons", "esdeveniments", "0.21", "extra_revenue"),
    ("events", "Organització d'esdeveniments", "esdeveniments", "0.21", "extra_revenue"),
    ("spectacles", "Espectacles i festes", "esdeveniments", "0.21", "extra_revenue"),
    ("laundry", "Bugaderia", "serveis", "0.21", "extra_revenue"),
    ("telephone", "Telèfon", "serveis", "0.21", "extra_revenue"),
]


def seed_services():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bootstrap(db)
        tenant = db.query(Tenant).first()
        prop = db.query(Property).first()
        if not tenant or not prop:
            print("❌ Cal executar primer seed_demo.py (tenant + property).")
            return

        # 1. Serveis (catàleg amb IVA per servei).
        created = 0
        for code, name, category, vat, account in SERVICES:
            if db.query(Service).filter(Service.tenant_id == tenant.id, Service.code == code).first():
                continue
            db.add(Service(
                id=uuid.uuid4(),
                tenant_id=tenant.id,
                code=code,
                name=name,
                category=category,
                vat_rate=Decimal(vat),
                revenue_account=account,
                active=True,
            ))
            created += 1
        db.commit()
        print(f"✅ {created} serveis creats (catàleg amb IVA per servei).")

        # 2. Config d'ecotaxa (hotel 4 estrelles: 3,00€ alta / 0,75€ baixa).
        if not db.query(EcoTaxConfig).filter(EcoTaxConfig.property_id == prop.id).first():
            db.add(EcoTaxConfig(
                id=uuid.uuid4(),
                property_id=prop.id,
                category="hotel_4star",
                high_rate=Decimal("3.00"),
                low_rate=Decimal("0.75"),
                high_season_start="05-01",
                high_season_end="10-31",
                discount_from_night=9,
                discount_pct=Decimal("0.50"),
                exempt_age=16,
                vat_rate=Decimal("0.10"),
                year=date.today().year,
                active=True,
            ))
            db.commit()
            print("✅ Config d'ecotaxa creada (hotel 4★: 3,00€ alta / 0,75€ baixa).")
        else:
            print("ℹ️ Config d'ecotaxa ja existeix.")

        print("\n✨ Seed de serveis + ecotaxa completat.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_services()
