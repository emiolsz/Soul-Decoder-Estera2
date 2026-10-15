"""Kabalistyczna baza danych; treści pochodzą z edytowalnego JSON."""
import json
from pathlib import Path
CONTENT = json.loads((Path(__file__).parent / 'dist/assets/report-content.json').read_text(encoding='utf-8'))
KABALA_DICTIONARY = {int(k): v for k, v in CONTENT['base'].items()}
