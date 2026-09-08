"""Contract Rules Engine — Gestió de contractes de turoperació (Yield & Allotment).

Fase 1: parametrització del contracte (cupos, release, garantia, tarifes,
descomptes, anul·lació).
Fase 2: auditoria automàtica d'una reserva contra les condicions contractuals
(control de cupo i release, comprovació de preus).

El servei exposa:
- `audit_reservation`: valida una reserva contra el contracte de la seva
  agència i retorna un `ContractAuditResult` (ok / on_request / rejected /
  price_discrepancy / released).
- `release_allotments`: allibera els cupos no venuts que han passat la data
  de release (Fase 3, Dynamic Release).
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..models.models import AgencyContract, ContractAllotment, Reservation


def _find_contract(db: Session, property_id: UUID, agency_code: str) -> Optional[AgencyContract]:
    """Troba el contracte actiu d'una agència per al property donat."""
    return (
        db.query(AgencyContract)
        .filter(
            AgencyContract.property_id == property_id,
            AgencyContract.code == agency_code,
            AgencyContract.active.is_(True),
        )
        .first()
    )


def _find_allotment(
    db: Session, contract_id: UUID, room_type_id: UUID, stay_date: date
) -> Optional[ContractAllotment]:
    """Troba el cupo del contracte per a un tipus d'habitació i una data."""
    return (
        db.query(ContractAllotment)
        .filter(
            ContractAllotment.contract_id == contract_id,
            ContractAllotment.room_type_id == room_type_id,
            ContractAllotment.date == stay_date,
        )
        .first()
    )


def audit_reservation(db: Session, reservation: Reservation) -> dict:
    """Audita una reserva contra el contracte de la seva agència.

    Retorna un dict amb l'estructura de `ContractAuditResult`:
    - `ok`: la reserva compleix el contracte.
    - `on_request`: el cupo està esgotat però el contracte és garantit.
    - `rejected`: el cupo està esgotat i el contracte és lliure (venda lliure).
    - `released`: la data de release ja ha passat (cupo alliberat).
    - `price_discrepancy`: el preu aplicat no quadra amb la tarifa pactada.
    """
    result = {
        "reservation_id": reservation.id,
        "contract_id": None,
        "agency_name": None,
        "status": "ok",
        "reason": None,
        "contracted_rate": None,
        "applied_rate": None,
        "release_date": None,
    }

    if not reservation.agency_code:
        result["reason"] = "Reserva sense agència (no aplica contracte)"
        return result

    contract = _find_contract(db, reservation.property_id, reservation.agency_code)
    if contract is None:
        result["status"] = "rejected"
        result["reason"] = f"Contracte '{reservation.agency_code}' no trobat o inactiu"
        return result

    result["contract_id"] = contract.id
    result["agency_name"] = contract.agency_name

    # Comprova que la reserva cau dins la vigència del contracte.
    if reservation.check_in < contract.start_date or reservation.check_out > contract.end_date:
        result["status"] = "rejected"
        result["reason"] = "Reserva fora de la vigència del contracte"
        return result

    # Audita cada nit de l'estada contra el cupo i la tarifa pactada.
    stay_date = reservation.check_in
    while stay_date < reservation.check_out:
        allotment = _find_allotment(db, contract.id, reservation.room_type_id, stay_date)

        if allotment is None:
            result["status"] = "rejected"
            result["reason"] = f"Sense cupo per a {stay_date.isoformat()}"
            return result

        # Control de release: si la data de release ha passat, el cupo s'allibera.
        if allotment.release_date and stay_date <= allotment.release_date:
            result["status"] = "released"
            result["release_date"] = allotment.release_date
            result["reason"] = f"Cupo alliberat el {allotment.release_date.isoformat()}"
            return result

        # Control de cupo: si està esgotat, depèn de la garantia.
        if allotment.sold >= allotment.allotment:
            if contract.guarantee_type == "guaranteed":
                result["status"] = "on_request"
                result["reason"] = "Cupo esgotat (contracte garantit → on request)"
            else:
                result["status"] = "rejected"
                result["reason"] = "Cupo esgotat (venda lliure → rebutjada)"
            return result

        # Comprovació de preus: tarifa pactada vs. import aplicat.
        if allotment.contracted_rate is not None:
            result["contracted_rate"] = allotment.contracted_rate
            result["applied_rate"] = reservation.total_amount
            if reservation.total_amount != allotment.contracted_rate:
                result["status"] = "price_discrepancy"
                result["reason"] = (
                    f"Discrepància de preu: pactat {allotment.contracted_rate}, "
                    f"aplicat {reservation.total_amount}"
                )
                return result

        stay_date += timedelta(days=1)

    return result


def release_allotments(db: Session, property_id: UUID, as_of: Optional[date] = None) -> int:
    """Allibera els cupos no venuts que han passat la data de release.

    Retorna el nombre de cupos alliberats. Un cupo alliberat es marca amb
    `release_date` passada i `allotment` a 0 (torna a l'hotel).
    """
    as_of = as_of or date.today()
    released = 0

    contracts = (
        db.query(AgencyContract)
        .filter(
            AgencyContract.property_id == property_id,
            AgencyContract.active.is_(True),
        )
        .all()
    )

    for contract in contracts:
        allotments = (
            db.query(ContractAllotment)
            .filter(
                ContractAllotment.contract_id == contract.id,
                ContractAllotment.release_date.isnot(None),
                ContractAllotment.release_date < as_of,
                ContractAllotment.allotment > 0,
            )
            .all()
        )
        for allotment in allotments:
            allotment.allotment = 0
            released += 1

    db.commit()
    return released
