"""
OCR del MRZ (Machine Readable Zone) d'un document d'identitat o viatge.

Rep una imatge (base64) d'un passaport/DNI, extreu el text amb Tesseract,
localitza les línies MRZ i les retorna parsejades via mrz_parser.

La qualitat depèn molt de la foto (enfocament, llum, angle). Per a millors
resultats, la foto ha de ser del document pla, ben il·luminat i amb la zona
MRZ (la part inferior amb els "<<<") ben visible.
"""

import base64
import io
import re
from typing import Dict, Optional

from PIL import Image
import pytesseract

from .mrz_parser import parse_mrz

# Només caràcters que poden aparèixer al MRZ (reduïx el soroll de l'OCR).
MRZ_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"
DOC_TYPES = ('P', 'I', 'A', 'C', 'V')


def _clean_ocr_line(line: str) -> str:
    """Neteja una línia OCR: majúscules, només caràcters MRZ, elimina espais."""
    line = line.upper()
    line = ''.join(c for c in line if c in MRZ_WHITELIST)
    return line


def _extract_mrz_lines(text: str) -> Optional[str]:
    """De tot el text OCR, localitza les 2-3 línies MRZ i les retorna (o None)."""
    candidates = []
    for raw in text.splitlines():
        line = _clean_ocr_line(raw)
        if len(line) in (30, 36, 44) and (line[0] in DOC_TYPES or '<' in line):
            candidates.append(line)
    # El MRZ és un bloc contigu: busquem 2-3 línies seguides del mateix format.
    for i in range(len(candidates) - 1):
        if len(candidates[i]) == len(candidates[i + 1]):
            block = [candidates[i], candidates[i + 1]]
            # TD1 té 3 línies
            if len(candidates[i]) == 30 and i + 2 < len(candidates) and len(candidates[i + 2]) == 30:
                block.append(candidates[i + 2])
            return "\n".join(block)
    return None


def image_to_mrz(image_bytes: bytes) -> Dict:
    """Converteix una imatge (bytes) a dades MRZ parsejades.

    Retorna el resultat de parse_mrz (que inclou 'error' si no es reconeix).
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        return {'error': f'No s\'ha pogut obrir la imatge: {e}'}

    # Convertir a escala de grisos i ampliar (millora l'OCR del MRZ petit).
    img = img.convert('L')
    w, h = img.size
    if max(w, h) < 1200:
        scale = 1200 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    config = (
        '--psm 6 '
        f'-c tessedit_char_whitelist={MRZ_WHITELIST} '
        '-c preserve_interword_spaces=0'
    )
    text = pytesseract.image_to_string(img, lang='eng', config=config)

    mrz = _extract_mrz_lines(text)
    if not mrz:
        return {
            'error': 'No s\'ha detectat la zona MRZ. Prova amb una foto més nítida i ben il·luminada.',
            'raw_text': text[:500],
        }
    result = parse_mrz(mrz)
    if 'error' in result:
        result['raw_text'] = text[:500]
    return result


def ocr_from_base64(image_base64: str) -> Dict:
    """Rep la imatge en base64 (amb o sense prefix data:image/...) i retorna el MRZ parsejat."""
    raw = image_base64
    if ',' in raw and raw.startswith('data:'):
        raw = raw.split(',', 1)[1]
    try:
        image_bytes = base64.b64decode(raw)
    except Exception as e:
        return {'error': f'Base64 invàlid: {e}'}
    return image_to_mrz(image_bytes)
