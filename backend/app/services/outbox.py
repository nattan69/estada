"""Outbox transaccional: publicació i dispatch d'esdeveniments de domini.

Patró outbox: quan passa un fet de negoci (reserva creada, càrrec POS, pagament
capturat...), es publica un `OutboxEvent` DINS la mateixa transacció. Un worker
(o l'endpoint `/outbox/dispatch`) els processa després de forma asíncrona.

Això garanteix que cap esdeveniment es perd encara que el procés caigui entre
el commit i l'enviament: l'esdeveniment queda persistit i es reenvia amb
retry/backoff fins que es processa.

Fase actual: el dispatcher marca els esdeveniments com a `processed` (no hi ha
destinacions sortints — webhooks/emails — configurades encara). L'estructura
queda llesta per connectar-hi handlers reals (webhooks sortints, emails, sync
amb OTAs) sense tocar els emissors.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from ..models.models import OutboxEvent

logger = logging.getLogger(__name__)

# Esdeveniments de domini (coincideixen amb la secció 9 de la guia).
MAX_ATTEMPTS = 5
RETRY_BASE_SECONDS = 5  # backoff exponencial: 5, 10, 20, 40, 80


def publish(
    db: Session,
    aggregate: str,
    aggregate_id: str,
    type_: str,
    payload: Optional[dict] = None,
    available_at: Optional[datetime] = None,
) -> OutboxEvent:
    """Publica un esdeveniment a l'outbox (dins la transacció actual).

    No fa `commit` — el cridant ho fa, perquè l'esdeveniment quedi a la mateixa
    transacció que el canvi de negoci que el genera.
    """
    event = OutboxEvent(
        aggregate=aggregate,
        aggregate_id=str(aggregate_id),
        type=type_,
        payload=payload or {},
        status="pending",
        attempts=0,
        available_at=available_at or datetime.now(timezone.utc),
    )
    db.add(event)
    db.flush()
    return event


def _handle(event: OutboxEvent) -> None:
    """Processa un esdeveniment. Aquí s'hi connectaran els handlers reals.

    Per ara no hi ha destinacions sortints (webhooks/emails), així que el
    handler és un no-op que registra l'esdeveniment. Quan s'afegeixin
    destinacions (webhooks sortints, emails pre-stay, sync OTA), es
    despatxarà aquí per `event.type`.
    """
    logger.info("Outbox event processed: %s (%s/%s)", event.type, event.aggregate, event.aggregate_id)


def dispatch_pending(db: Session, limit: int = 100) -> dict:
    """Processa els esdeveniments pendents i disponibles.

    Retorna un resum: quants s'han processat, quants han fallat i quants
    queden pendents (perquè encara no estan disponibles o han excedit intents).
    """
    now = datetime.now(timezone.utc)
    pending = (
        db.query(OutboxEvent)
        .filter(
            OutboxEvent.status == "pending",
            OutboxEvent.available_at <= now,
        )
        .order_by(OutboxEvent.created_at.asc())
        .limit(limit)
        .all()
    )

    processed = 0
    failed = 0
    deferred = 0

    for event in pending:
        try:
            _handle(event)
            event.status = "processed"
            event.processed_at = now
            event.error = None
            processed += 1
        except Exception as exc:  # noqa: BLE001 — volem capturar-ho tot i reenviar
            event.attempts += 1
            event.error = str(exc)[:2000]
            if event.attempts >= MAX_ATTEMPTS:
                event.status = "failed"
                failed += 1
            else:
                # Backoff exponencial: 5s * 2^(attempts-1).
                delay = RETRY_BASE_SECONDS * (2 ** (event.attempts - 1))
                event.available_at = now + timedelta(seconds=delay)
                deferred += 1
            logger.warning("Outbox event %s failed (attempt %d): %s", event.id, event.attempts, exc)

    db.commit()
    return {
        "processed": processed,
        "failed": failed,
        "deferred": deferred,
        "remaining_pending": _count_pending(db),
    }


def _count_pending(db: Session) -> int:
    return (
        db.query(OutboxEvent)
        .filter(OutboxEvent.status == "pending")
        .count()
    )
