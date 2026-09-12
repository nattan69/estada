# Enviament de tancaments d'Estada → Compta (intake, forward-only)
# Decisió Tomeu: Compta és l'hub comptable; Estada EMET els tancaments (foli +
# night audit) i no guarda comptabilitat pròpia.
# Idempotent per external_id ("estada-<tipus>-<id>"): Compta no duplica.
# API key: COMPTA_KEY_ESTADA (X-API-Key) — la mateixa que el backend de Compta espera.
#
# Mapping AccountCode (conceptual, d'Estada) → PGC (Compta). RATIFICAT 12/09
# contra el PGC real per na Flavia. Tots els codis existeixen a Compta.
#
# Nota tècnica (Flavia): 477, 570 i 572 tenen subcomptes. Usa els fills
# (4771 IVA repercutit, 5700 caixa, 5720 banc) O fes els pares movibles.
# Aquí fem servir els FILLS perquè no quedin a mov=0.
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

COMPTA_URL = "http://localhost:8010"  # servei de Compta (OnePlus, tmux compta)

_MAP: dict[str, str] = {
    "cash": "5700",                   # caixa (fill de 570)
    "bank": "5720",                   # banc/transferència (fill de 572)
    "card": "5730",                   # targetes TPV (pont)
    "accounts_receivable": "4300",    # client genèric (postpaid)
    "accounts_receivable_agency": "4310",  # client TO/agència
    "accounts_receivable_vcc": "4311",     # VCC garantia
    "advance_customers": "4108",      # bestreta de clients (passiu)
    "deposit_received": "4109",       # dipòsits de reserves (passiu)
    "room_revenue": "7030",           # Servicios allotjament (subc. 7031 habitacions / 7032 apartaments)
    "meal_revenue": "7052",           # restauració/pensió
    "extra_revenue": "7050",          # altres serveis (7053 minibar, 7054 renta)
    "vat_payable": "4771",            # IVA repercutit (fill de 477)
    "tax_payable": "4755",            # taxa turística (passiu)
    "commission_expense": "623",      # despesa comissió agència
}


def _cfg():
    from ..config import settings
    return (
        settings.COMPTA_URL,
        settings.COMPTA_KEY_ESTADA,
    )


def _map(account_code: str) -> str:
    """Tradueix un AccountCode conceptual al codi PGC de Compta."""
    return _MAP.get(account_code, account_code)


def _entry_payload(
    *,
    external_id: str,
    date_str: str,
    entry_type: str,
    concept: str,
    lines: list[dict],
) -> dict:
    """Construeix el payload d'intake per a Compta (contracte acordat)."""
    return {
        "external_id": external_id,
        "date": date_str,
        "type": entry_type,       # 'FOLIO' | 'CIERRE'
        "concept": concept,
        "lines": lines,
    }


def lines_from_journal_entry(entry) -> list[dict]:
    """Converteix les JournalEntryLine d'Estada al format de Compta.

    Cada línia → {account (PGC mapejat), debit, credit, concept (descripció)}.
    """
    out = []
    for line in entry.lines:
        out.append({
            "account": _map(line.account_code),
            "debit": str(line.debit or 0),
            "credit": str(line.credit or 0),
            "concept": line.description or "",
        })
    return out


def envia_folio_a_compta(entry) -> dict:
    """Envia el tancament d'UN foli (JournalEntry) a Compta.

    Entry ha de ser un JournalEntry d'Estada amb external_id i entry_date.
    Idempotent: `external_id` = `estada-folio-<entry.id>-closure`.
    """
    url, key = _cfg()
    if entry.entry_date is None:
        return {"ok": False, "error": "entry sense data"}
    date_str = entry.entry_date.isoformat()
    payload = _entry_payload(
        external_id=entry.external_id or f"estada-folio-{entry.id}-closure",
        date_str=date_str,
        entry_type="FOLIO",
        concept=entry.description or "Tancament de foli",
        lines=lines_from_journal_entry(entry),
    )
    return _post(url, key, payload)


def emit_pending_folio_entries(db, folio) -> dict:
    """Envia a Compta els assestaments `pending` d'un foli i els marca `emitted`.

    Retorna un resum {enviats, ok, errors}. Idempotent per external_id.
    """
    from ..models.models import JournalEntry

    pendents = (
        db.query(JournalEntry)
        .filter(JournalEntry.folio_id == folio.id, JournalEntry.status == "pending")
        .all()
    )
    enviats, errors = 0, 0
    for entry in pendents:
        res = envia_folio_a_compta(entry)
        if res.get("ok"):
            entry.status = "emitted"
            entry.emitted_at = datetime.now(timezone.utc)
            enviats += 1
        else:
            entry.status = "failed"
            errors += 1
    if enviats:
        db.commit()
    return {"enviats": enviats, "errors": errors}


def envia_cierre_a_compta(
    *,
    property_id: str,
    audit_date_str: str,
    external_id: str,
    concept: str,
    payments_by_method: dict[str, str],
) -> dict:
    """Envia el tancament de caixa diari (night audit) a Compta com a CIERRE.

    Un assentament per dia amb el desglossament de paganments per mètode
    (cash → 570, card → 5730).
    """
    url, key = _cfg()
    lines = []
    for method, amount in (payments_by_method or {}).items():
        account = "570" if method in ("cash", "efectivo", "efectiu") else _map(method)
        lines.append({
            "account": account,
            "debit": str(amount),
            "credit": "0",
            "concept": f"Cobraments {method}",
        })
    payload = _entry_payload(
        external_id=external_id,
        date_str=audit_date_str,
        entry_type="CIERRE",
        concept=concept,
        lines=lines,
    )
    return _post(url, key, payload)


def _post(url: str, key: str, payload: dict) -> dict:
    if not key:
        logger.warning("[COMPTA] COMPTA_KEY_ESTADA no configurada al .env — no s'envia")
        return {"ok": False, "error": "COMPTA_KEY_ESTADA no configurada"}
    try:
        r = httpx.post(
            f"{url}/api/v1/intake/estada",
            headers={"X-API-Key": key},
            json=payload,
            timeout=15,
        )
        data = r.json()
        logger.info(f"[COMPTA] intake {payload['external_id']}: {r.status_code} {data}")
        return {"ok": r.status_code < 400, "status": r.status_code, **data}
    except Exception as e:
        logger.warning(f"[COMPTA] no s'ha pogut enviar {payload['external_id']}: {e}")
        return {"ok": False, "error": str(e)}
