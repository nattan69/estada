"""
Parser MRZ (Machine Readable Zone) — estàndard ICAO 9303.

Els documents d'identitat i viatge (passaports, DNI, targetes) tenen una zona
MRZ amb text estructurat que qualsevol lector (físic USB tipus "keyboard wedge"
o OCR sobre foto) retorna com a text pla. Aquest mòdul el normalitza i n'extreu
les dades del client per omplir el formulari automàticament.

Formats suportats:
- TD3 (passaport): 2 línies de 44 caràcters.
- TD2 (ID-2): 2 línies de 36 caràcters.
- TD1 (DNI/ID-1): 3 línies de 30 caràcters.

No hi ha dependències externes: parsing pur i determinista.
"""

import re
from typing import Dict, List, Optional


def _clean_lines(text: str) -> List[str]:
    """Normalitza el text MRZ: majúscules, elimina espais/tabs, salta línies buides."""
    lines = []
    for raw in text.splitlines():
        line = raw.upper().replace(' ', '').replace('\t', '').strip()
        if line:
            lines.append(line)
    return lines


def _parse_date(yymmdd: str) -> Optional[str]:
    """YYMMDD -> YYYY-MM-DD (heurística: <50 => 20xx, >=50 => 19xx)."""
    if not re.fullmatch(r'\d{6}', yymmdd):
        return None
    yy = int(yymmdd[0:2])
    mm = int(yymmdd[2:4])
    dd = int(yymmdd[4:6])
    year = 2000 + yy if yy < 50 else 1900 + yy
    # validació bàsica de mes/dia
    if not (1 <= mm <= 12 and 1 <= dd <= 31):
        return None
    return f"{year:04d}-{mm:02d}-{dd:02d}"


def _parse_name_field(raw: str) -> tuple:
    """Camp del nom: SURNAME<<GIVEN<NAME -> (surname, given_name)."""
    raw = raw.rstrip('<')
    if '<<' in raw:
        surname_part, given_part = raw.split('<<', 1)
    else:
        surname_part, given_part = raw, ''
    surname = surname_part.replace('<', ' ').strip()
    given = given_part.replace('<', ' ').strip()
    return surname, given


def _parse_td3(lines: List[str]) -> Dict:
    l1, l2 = lines[0], lines[1]
    surname, given = _parse_name_field(l1[5:44])
    return {
        'format': 'TD3',
        'document_type': 'PASSPORT',
        'issuing_country': l1[2:5].replace('<', '').strip(),
        'surname': surname,
        'given_name': given,
        'document_number': l2[0:9].replace('<', '').strip(),
        'nationality': l2[10:13].replace('<', '').strip(),
        'birth_date': _parse_date(l2[13:19]),
        'sex': l2[20] if l2[20] in 'MFX' else None,
        'expiry_date': _parse_date(l2[21:27]),
    }


def _parse_td2(lines: List[str]) -> Dict:
    l1, l2 = lines[0], lines[1]
    surname, given = _parse_name_field(l1[5:36])
    return {
        'format': 'TD2',
        'document_type': 'ID',
        'issuing_country': l1[2:5].replace('<', '').strip(),
        'surname': surname,
        'given_name': given,
        'document_number': l2[0:9].replace('<', '').strip(),
        'nationality': l2[10:13].replace('<', '').strip(),
        'birth_date': _parse_date(l2[13:19]),
        'sex': l2[20] if l2[20] in 'MFX' else None,
        'expiry_date': _parse_date(l2[21:27]),
    }


def _parse_td1(lines: List[str]) -> Dict:
    l1, l2, l3 = lines[0], lines[1], lines[2]
    surname, given = _parse_name_field(l3[0:30])
    return {
        'format': 'TD1',
        'document_type': 'DNI' if l1[0] == 'I' else 'ID',
        'issuing_country': l1[2:5].replace('<', '').strip(),
        'surname': surname,
        'given_name': given,
        'document_number': l1[5:30].replace('<', '').strip(),
        'nationality': l2[15:18].replace('<', '').strip(),
        'birth_date': _parse_date(l2[0:6]),
        'sex': l2[7] if l2[7] in 'MFX' else None,
        'expiry_date': _parse_date(l2[8:14]),
    }


def detect_format(lines: List[str]) -> Optional[str]:
    if len(lines) == 2 and all(len(l) == 44 for l in lines):
        return 'TD3'
    if len(lines) == 2 and all(len(l) == 36 for l in lines):
        return 'TD2'
    if len(lines) == 3 and all(len(l) == 30 for l in lines):
        return 'TD1'
    return None


def parse_mrz(text: str) -> Dict:
    """Retorna les dades parsejades del MRZ, o un dict amb 'error' si no es reconeix.

    Camps retornats (segons el format):
      format, document_type, issuing_country, surname, given_name,
      document_number, nationality, birth_date, sex, expiry_date.
    """
    lines = _clean_lines(text)
    fmt = detect_format(lines)
    if not fmt:
        return {
            'error': 'MRZ no reconegut. Esperat TD1 (3 línies de 30), TD2 (2x36) o TD3 (2x44).',
        }
    if fmt == 'TD3':
        return _parse_td3(lines)
    if fmt == 'TD2':
        return _parse_td2(lines)
    return _parse_td1(lines)


def to_guest_fields(parsed: Dict) -> Dict:
    """Converteix el resultat del MRZ a camps del model Guest (snake_case)."""
    if 'error' in parsed:
        return parsed
    return {
        'first_name': parsed.get('given_name') or '',
        'last_name': parsed.get('surname') or '',
        'document_type': parsed.get('document_type'),
        'document_number': parsed.get('document_number') or None,
        'nationality': parsed.get('nationality') or None,
        'birth_date': parsed.get('birth_date'),
        'sex': parsed.get('sex'),
        'expiry_date': parsed.get('expiry_date'),
    }
