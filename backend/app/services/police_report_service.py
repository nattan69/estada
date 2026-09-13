"""
Registre de viatgers (fixes de policia / SES Hospederías).

Genera la llista d'hostes que han entrat (check-in) o sortit (check-out) en una
data de negoci, amb les dades completes que exigeix el registre de viatgers
(Llei Orgànica 4/2015 i la plataforma SES Hospederías): nom, cognoms, document,
data de naixement, nacionalitat, sexe i dates d'entrada/sortida.

Els hostes s'obtenen de les reserves (relació guest) i es retornen com a llista
de dicts, llesta per convertir a l'XML/JSON que calgui.
"""

from datetime import date
from typing import List, Dict
from sqlalchemy.orm import Session
from uuid import UUID

from ..models.models import Reservation


def build_guest_registry(db: Session, property_id: UUID, audit_date: date) -> List[Dict]:
    """Retorna els hostes que entren o surten `audit_date` per a la propietat.

    Cada entrada és un dict amb les dades del viatger i les dates de l'estada,
    a més de `movimiento` ('entrada' | 'salida' | 'entrada_salida').
    """
    arrivals = (
        db.query(Reservation)
        .filter(Reservation.property_id == property_id, Reservation.check_in == audit_date)
        .all()
    )
    departures = (
        db.query(Reservation)
        .filter(Reservation.property_id == property_id, Reservation.check_out == audit_date)
        .all()
    )

    records: List[Dict] = []
    seen = set()
    for res in arrivals + departures:
        if res.id in seen:
            continue
        seen.add(res.id)
        guest = res.guest
        is_arrival = res.check_in == audit_date
        is_departure = res.check_out == audit_date
        movimiento = (
            'entrada_salida' if (is_arrival and is_departure)
            else 'entrada' if is_arrival
            else 'salida'
        )
        records.append({
            'reservation_id': str(res.id),
            'confirmation_code': res.confirmation_code or '',
            'movimiento': movimiento,
            'first_name': guest.first_name if guest else '',
            'last_name': guest.last_name if guest else '',
            'document_type': guest.document_type if guest else '',
            'document_number': guest.document_number if guest else '',
            'birth_date': guest.birth_date.isoformat() if (guest and guest.birth_date) else '',
            'nationality': guest.nationality if guest else '',
            'sex': guest.sex if guest else '',
            'country_of_residence': guest.country_of_residence if guest else '',
            'check_in': res.check_in.isoformat(),
            'check_out': res.check_out.isoformat(),
            'adults': res.adults,
            'children': res.children,
        })
    return records


def build_ses_xml(records: List[Dict]) -> str:
    """Genera un XML bàsic del registre de viatgers (estructura SES Hospederías).

    Nota: el protocol SES real requereix signatura/certificat i camps addicionals
    (data d'expedició del document, etc.). Aquest XML és la base exportable; els
    camps es completen segons l'especificació oficial del Ministeri d'Interior.
    """
    import xml.etree.ElementTree as ET
    root = ET.Element('registro_viajeros')
    for r in records:
        v = ET.SubElement(root, 'viajero')
        ET.SubElement(v, 'movimiento').text = r['movimiento']
        ET.SubElement(v, 'nombre').text = r['first_name']
        ET.SubElement(v, 'apellidos').text = r['last_name']
        ET.SubElement(v, 'tipo_documento').text = r['document_type'] or ''
        ET.SubElement(v, 'numero_documento').text = r['document_number'] or ''
        ET.SubElement(v, 'fecha_nacimiento').text = r['birth_date']
        ET.SubElement(v, 'nacionalidad').text = r['nationality'] or ''
        ET.SubElement(v, 'sexo').text = r['sex'] or ''
        ET.SubElement(v, 'pais_residencia').text = r['country_of_residence'] or ''
        ET.SubElement(v, 'fecha_entrada').text = r['check_in']
        ET.SubElement(v, 'fecha_salida').text = r['check_out']
    ET.indent(root, space='  ')
    return ET.tostring(root, encoding='unicode', xml_declaration=True)
