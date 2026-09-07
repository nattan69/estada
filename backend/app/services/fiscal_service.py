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
