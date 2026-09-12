"""Test del circuit comptable del foli — del dret (prepaid) i del inrevés (postpaid).

Verifica la QUADRATURA de cada cas: foli saldat (balance = 0) i partida doble
equilibrada (suma de débits = suma de crèdits). Cobreix:

- Prepaid: múltiples nits (bestreta que minva), pensió, mètode targeta.
- Postpaid: factura a la sortida (deute que s'acumula i es cancella).
- Ecotaxa (ITS): bonificació a partir de la nit 9.

Font de veritat dels tipus: taula `services` (IVA per servei) i `ecotax_configs`
(per persona/nit, temporada, bonificació nit 9, exempció <16).
"""
import os
import sys
import tempfile
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test_folio_circuit.db")

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.models import (  # noqa: E402
    Tenant, Property, RoomType, Guest, Reservation, ReservationNight,
    Service, EcoTaxConfig, Folio, JournalEntry, JournalEntryLine, MealPlan,
)


def _seed_services(db):
    tenant = db.query(Tenant).first()
    if not db.query(Service).filter(Service.code == "room").first():
        db.add(Service(id=uuid.uuid4(), tenant_id=tenant.id, code="room", name="Allotjament",
                       vat_rate=Decimal("0.10"), revenue_account="room_revenue"))
        db.add(Service(id=uuid.uuid4(), tenant_id=tenant.id, code="meal", name="Pensió",
                       vat_rate=Decimal("0.10"), revenue_account="meal_revenue"))
        db.commit()


def _make_property(db, code, billing_mode):
    tenant = db.query(Tenant).first()
    p = Property(id=uuid.uuid4(), tenant_id=tenant.id, name=f"Hotel {code}", code=code,
                 billing_mode=billing_mode, currency="EUR")
    db.add(p); db.flush()
    db.add(EcoTaxConfig(id=uuid.uuid4(), property_id=p.id, category="hotel_4star",
                        high_rate=Decimal("3.00"), low_rate=Decimal("0.75"),
                        discount_from_night=9, discount_pct=Decimal("0.50"),
                        exempt_age=16, vat_rate=Decimal("0.10"), year=2026))
    rt = RoomType(id=uuid.uuid4(), property_id=p.id, code="STD", name="Estàndard", base_occupancy=2)
    db.add(rt); db.flush()
    db.commit()
    return p, rt


def _make_guest(db, email):
    g = Guest(id=uuid.uuid4(), tenant_id=db.query(Tenant).first().id, first_name="T",
              last_name="Test", email=email)
    db.add(g); db.commit()
    return g


def _make_reservation(db, prop, rt, guest, code, check_in, nights, adults=2, rate=150,
                      meal_plan=MealPlan.ROOM_ONLY.value, meal_price=0):
    check_out = check_in + timedelta(days=nights)
    res = Reservation(id=uuid.uuid4(), property_id=prop.id, guest_id=guest.id, room_type_id=rt.id,
                      confirmation_code=code, status="confirmed", check_in=check_in, check_out=check_out,
                      adults=adults, children=0, meal_plan=meal_plan,
                      meal_plan_price=Decimal(str(meal_price)),
                      total_amount=Decimal(str(rate * nights)), currency="EUR")
    db.add(res); db.flush()
    d = check_in
    while d < check_out:
        db.add(ReservationNight(id=uuid.uuid4(), reservation_id=res.id, room_type_id=rt.id,
                                date=d, base_rate=Decimal(str(rate)), amount=Decimal(str(rate))))
        d += timedelta(days=1)
    db.commit()
    return res


def _login(c):
    r = c.post("/api/v1/auth/login", json={"email": "admin@estada.local", "password": "cambia-esta-contrasenya"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _run_stay(c, headers, res, prop, check_in, nights, payment_method="cash", postpaid=False):
    """Check-in → night audits → check-out."""
    if postpaid:
        r = c.post(f"/api/v1/reservations/{res.id}/check-in", headers=headers)
    else:
        r = c.post(f"/api/v1/reservations/{res.id}/check-in", headers=headers,
                   json={"payment_method": payment_method})
    assert r.status_code == 200
    for i in range(nights):
        r = c.post("/api/v1/night-audit/run", headers=headers,
                   json={"property_id": str(prop.id), "audit_date": (check_in + timedelta(days=i)).isoformat()})
        assert r.status_code == 200
    r = c.post(f"/api/v1/reservations/{res.id}/check-out", headers=headers,
               json={"payment_method": payment_method})
    assert r.status_code == 200
    return res


def _folio_and_nets(db, res):
    db.expire_all()
    folio = res.folios[0]
    entries = db.query(JournalEntry).filter(JournalEntry.folio_id == folio.id).all()
    nets = {}
    for e in entries:
        for l in e.lines:
            nets[l.account_code] = (nets.get(l.account_code, Decimal("0"))
                                    + Decimal(str(l.debit or 0)) - Decimal(str(l.credit or 0)))
    return folio, nets


def _assert_quadratura(db, res):
    folio, nets = _folio_and_nets(db, res)
    assert folio.balance == Decimal("0.00"), f"foli no saldat: balance={folio.balance}"
    assert abs(sum(nets.values())) < Decimal("0.01"), f"partida desequilibrada: {dict(nets)}"
    return folio, nets


def test_prepaid_multiple_nights():
    with TestClient(app) as c:
        headers = _login(c)
        db = SessionLocal()
        _seed_services(db)
        prop, rt = _make_property(db, "T1", "prepaid")
        guest = _make_guest(db, "t1@example.com")
        res = _make_reservation(db, prop, rt, guest, "TEST-1", date(2026, 7, 1), nights=5)
        _run_stay(c, headers, res, prop, date(2026, 7, 1), 5)
        folio, nets = _assert_quadratura(db, res)
        # Bestreta (4108) totalment consumida al final.
        assert nets.get("advance_customers", Decimal("0")) == Decimal("0")
        db.close()


def test_prepaid_with_meal():
    with TestClient(app) as c:
        headers = _login(c)
        db = SessionLocal()
        _seed_services(db)
        prop, rt = _make_property(db, "T2", "prepaid")
        guest = _make_guest(db, "t2@example.com")
        res = _make_reservation(db, prop, rt, guest, "TEST-2", date(2026, 7, 1), nights=3,
                                meal_plan=MealPlan.HALF_BOARD.value, meal_price=40)
        _run_stay(c, headers, res, prop, date(2026, 7, 1), 3)
        folio, nets = _assert_quadratura(db, res)
        assert "meal_revenue" in nets, "falta l'ingrés de pensió"
        db.close()


def test_prepaid_card_method():
    with TestClient(app) as c:
        headers = _login(c)
        db = SessionLocal()
        _seed_services(db)
        prop, rt = _make_property(db, "T3", "prepaid")
        guest = _make_guest(db, "t3@example.com")
        res = _make_reservation(db, prop, rt, guest, "TEST-3", date(2026, 7, 1), nights=1)
        _run_stay(c, headers, res, prop, date(2026, 7, 1), 1, payment_method="card")
        _assert_quadratura(db, res)
        db.close()


def test_postpaid_transfer():
    with TestClient(app) as c:
        headers = _login(c)
        db = SessionLocal()
        _seed_services(db)
        prop, rt = _make_property(db, "T4", "postpaid")
        guest = _make_guest(db, "t4@example.com")
        res = _make_reservation(db, prop, rt, guest, "TEST-4", date(2026, 7, 1), nights=1)
        _run_stay(c, headers, res, prop, date(2026, 7, 1), 1, payment_method="transfer", postpaid=True)
        folio, nets = _assert_quadratura(db, res)
        # En postpaid el deute (AR) queda cancel·lat pel cobrament.
        assert nets.get("accounts_receivable", Decimal("0")) == Decimal("0")
        db.close()


def test_ecotax_night9_bonus():
    from app.services.ecotax_service import calculate_ecotax
    with TestClient(app) as c:
        db = SessionLocal()
        _seed_services(db)
        prop, rt = _make_property(db, "T5", "prepaid")
        # 10 nits, 2 adults, temporada alta: nits 1-8 a 3,00€, nits 9-10 a 1,50€ (−50%).
        eco = (Decimal("3.00") * 8 + Decimal("1.50") * 2) * 2
        calc = calculate_ecotax(db, property_id=prop.id, check_in=date(2026, 7, 1),
                                check_out=date(2026, 7, 11), adults=2)
        assert abs(Decimal(calc["total"]) - eco) < Decimal("0.01"), f"ecotaxa {calc['total']} != {eco}"
        db.close()
