"""
Checklist de tasques del Night Audit.

Cada tancament diari té una sèrie de verificacions que la recepció no pot
oblidar. Aquest mòdul defineix les tasques (fixes) i les crea automàticament
amb les dades associades de cada tancament (recomptes, imports, mètodes de
pagament...).

Les tasques es creen en executar el night audit; l'usuari les marca com a
`done` o `skipped` des del frontend.
"""

from typing import List, Dict
from sqlalchemy.orm import Session

from ..models.models import NightAudit, NightAuditTask

# Definició de les tasques (ordre = sort_order). Les que tenen `data` calculat
# es reomplen amb les dades del summary del tancament.
CHECKLIST_TASKS: List[Dict] = [
    {
        "key": "extras_invoiced",
        "title": "Extres de sortides facturats",
        "description": "Comprovar que tots els extres (minibar, room service, POS...) de les reserves que surten avui estan facturats al foli.",
        "sort": 1,
    },
    {
        "key": "deposits_captured",
        "title": "Dipòsits capturats",
        "description": "Comprovar que els dipòsits i preautoritzacions de les sortides estan capturats o descomptats del foli.",
        "sort": 2,
    },
    {
        "key": "comanda_closure",
        "title": "Volcat dels tancaments de Comanda",
        "description": "Importar i verificar el tancament del TPV de Comanda al sistema comptable.",
        "sort": 3,
    },
    {
        "key": "cash_reconciliation",
        "title": "Quadrament de caixa i mètodes de pagament",
        "description": "Creuar targetes (consulta de totals del TPV), transferències i efectiu amb el tancament.",
        "sort": 4,
    },
    {
        "key": "morning_lists",
        "title": "Llistats de sortides i entrades (torn del matí)",
        "description": "Generar i repassar els llistats d'arribades i sortides per al torn del matí.",
        "sort": 5,
    },
    {
        "key": "police_report",
        "title": "Fixes de policia (viatgers)",
        "description": "Enviar el registre de viatgers del dia a la SES Hospederías.",
        "sort": 6,
    },
    {
        "key": "day_close",
        "title": "Tancament del dia",
        "description": "Tancar el dia i emetre el tancament de caixa (CIERRE) a Compta.",
        "sort": 7,
    },
]


def _task_data(key: str, summary: dict) -> dict:
    """Dades associades a cada tasca, calculades del summary del tancament."""
    if key == "extras_invoiced":
        return {
            "extras_posted": summary.get("extras_posted", 0),
            "extras_revenue": summary.get("extras_revenue", "0"),
        }
    if key == "cash_reconciliation":
        return {
            "payments_by_method": summary.get("payments_by_method", {}),
            "payments_total": summary.get("payments_total", "0"),
        }
    if key == "morning_lists":
        return {
            "arrivals": summary.get("arrivals", 0),
            "departures": summary.get("departures", 0),
        }
    if key == "police_report":
        return {
            "police_registry_count": summary.get("police_registry_count", 0),
        }
    return {}


def build_checklist(db: Session, audit: NightAudit, summary: dict) -> List[NightAuditTask]:
    """Crea les tasques del checklist per a un tancament (idempotent)."""
    # Si ja hi ha tasques per aquest audit, no les dupliquem.
    existing = db.query(NightAuditTask).filter(NightAuditTask.night_audit_id == audit.id).count()
    if existing > 0:
        return db.query(NightAuditTask).filter(NightAuditTask.night_audit_id == audit.id).order_by(NightAuditTask.sort_order).all()

    tasks = []
    for spec in CHECKLIST_TASKS:
        task = NightAuditTask(
            night_audit_id=audit.id,
            task_key=spec["key"],
            title=spec["title"],
            description=spec["description"],
            status="pending",
            sort_order=spec["sort"],
            data=_task_data(spec["key"], summary),
        )
        db.add(task)
        tasks.append(task)
    db.flush()
    return tasks
