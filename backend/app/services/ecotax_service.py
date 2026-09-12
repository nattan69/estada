"""Càlcul de l'Impost sobre Estades Turístiques (ITS/ecotaxa).

L'ecotaxa de les Illes Balears és per persona i nit, amb tarifa segons la
categoria de l'establiment i la temporada (alta/baixa), bonificació a partir
de la novena nit consecutiva i exempció per als menors de 16 anys. Porta un
10% d'IVA (recollit a `EcoTaxConfig.vat_rate`).

La configuració viu a la taula `ecotax_configs` (una per property, amb
historial per `year`). Sense config activa, no s'aplica ecotaxa.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..models.models import EcoTaxConfig

# Mesos de temporada alta (maig–octubre); la resta (novembre–abril) és baixa.
_HIGH_SEASON_MONTHS = {5, 6, 7, 8, 9, 10}


def _season_for(d: date, cfg: EcoTaxConfig) -> str:
    """Determina la temporada (`alta`/`baixa`) d'una data segons la config.

    Usa `high_season_start`/`high_season_end` (format `DD-MM`) si estan ben
    formats; si no, cau al criteri per defecte (mesos maig–octubre = alta).
    """
    try:
        start = cfg.high_season_start
        end = cfg.high_season_end
        if start and end and "-" in start and "-" in end:
            sm, sd = int(start.split("-")[0]), int(start.split("-")[1])
            em, ed = int(end.split("-")[0]), int(end.split("-")[1])
            md = d.month * 100 + d.day
            start_md = sm * 100 + sd
            end_md = em * 100 + ed
            if start_md <= end_md:
                # Interval dins el mateix any (ex: 05-01 → 10-31).
                return "alta" if start_md <= md <= end_md else "baixa"
            # Interval que creua l'any (ex: 11-01 → 04-30).
            return "alta" if (md >= start_md or md <= end_md) else "baixa"
    except (AttributeError, ValueError, TypeError):
        pass
    return "alta" if d.month in _HIGH_SEASON_MONTHS else "baixa"


def _get_active_config(db: Session, property_id: UUID) -> Optional[EcoTaxConfig]:
    """Retorna la config d'ecotaxa activa més recent per a una property."""
    return (
        db.query(EcoTaxConfig)
        .filter(EcoTaxConfig.property_id == property_id, EcoTaxConfig.active.is_(True))
        .order_by(EcoTaxConfig.created_at.desc())
        .first()
    )


def calculate_ecotax(
    db: Session,
    *,
    property_id: UUID,
    check_in: date,
    check_out: date,
    adults: int = 0,
    children: int = 0,
) -> dict:
    """Calcula l'ecotaxa (ITS) d'una reserva.

    Retorna un dict amb:
    - `total`: import total de l'ecotaxa (sense IVA).
    - `vat`: IVA (10%) sobre el total.
    - `lines`: desglossament per nit (`night_index`, `date`, `season`,
      `rate`, `guests_liable`, `amount`).

    Simplificació d'edats: `adults` paguen (assumits ≥16 anys) i `children`
    estan exempts (<16). Per edats individuals caldria un camp `children_ages`
    (pendent d'implementar quan el model ho suporti).
    """
    cfg = _get_active_config(db, property_id)
    if cfg is None:
        return {"total": Decimal("0"), "vat": Decimal("0"), "lines": []}

    high_rate = Decimal(str(cfg.high_rate or 0))
    low_rate = Decimal(str(cfg.low_rate or 0))
    discount_from = int(cfg.discount_from_night or 9)
    discount = Decimal(str(cfg.discount_pct if cfg.discount_pct is not None else Decimal("0.50")))
    vat_rate = Decimal(str(cfg.vat_rate if cfg.vat_rate is not None else Decimal("0.10")))

    # Persones que paguen: adults (≥16). Children (<16) exempts.
    guests_liable = max(0, int(adults or 0))

    lines: list[dict] = []
    total = Decimal("0")
    night_index = 0
    d = check_in
    while d < check_out:
        night_index += 1
        season = _season_for(d, cfg)
        rate = high_rate if season == "alta" else low_rate
        # Bonificació: a partir de la nit `discount_from_night` (9a), −50%.
        if night_index >= discount_from:
            rate = rate * (Decimal("1") - discount)
        amount = (rate * guests_liable).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total += amount
        lines.append(
            {
                "night_index": night_index,
                "date": d,
                "season": season,
                "rate": rate.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                "guests_liable": guests_liable,
                "amount": amount,
            }
        )
        d += timedelta(days=1)

    vat = (total * vat_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {"total": total, "vat": vat, "lines": lines}
