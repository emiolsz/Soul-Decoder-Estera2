"""Import sześciu autorskich słowników DOCX do edytowalnego JSON.

Uruchom: python tools/import-descriptions.py KATALOG_Z_DOCX
Nie zmienia algorytmu. Zachowuje oba warianty Tikkunu.
"""
import json
import re
import sys
from pathlib import Path
from docx import Document

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path(sys.argv[1])
TARGET = ROOT / 'dist/assets/report-content.json'
MATCHES = {'Prawa': '*Dar*docx', 'Lewa': '*Karma*docx', 'Gleboka': '*gleboka*docx',
           'Talent': '*talent*docx', 'Wezel': '*Weze*docx', 'Tikkun': '*Tikkun*docx'}

def clean(text):
    return text.strip().strip('[]').strip()

def parse_entries(lines):
    entries, letters, number = {}, {}, None
    for line in lines:
        match = re.match(r'^(\d{1,2})(?:\s*\(lub 0\))?\s*•\s*([^•]+)\s*•\s*(.+)$', line)
        if match:
            number = int(match.group(1))
            if number in entries:
                raise ValueError(f'Powtórzona wartość {number}')
            entries[str(number)] = []
            symbol = match.group(3).strip()
            if symbol.startswith('[Brak'):
                symbol = '∞'
            letters[str(number)] = {'name': match.group(2).strip(), 'symbol': symbol}
        elif line.startswith('• Zajin •'):
            # Oczywisty brak numeru nagłówka między 6 i 8 w źródłowym DOCX.
            if number != 6:
                raise ValueError('Nieoczekiwany nagłówek Zajin')
            number = 7
            entries['7'] = []
            letters['7'] = {'name': 'Zajin', 'symbol': 'ז'}
        elif number is not None:
            entries[str(number)].extend(clean(p) for p in line.splitlines() if clean(p))
    expected = {str(n) for n in range(1,23)}
    if set(entries) != expected or any(not ps for ps in entries.values()):
        raise ValueError(f'Niekompletny słownik: {expected - set(entries)}')
    return {'extended': entries, 'letters': letters}

data = json.loads(TARGET.read_text()) if TARGET.exists() else {
    'schemaVersion': 1,
    'site': {'headline': 'Odkryj architekturę swojego kodu duszy.',
             'intro': 'Poznaj swój dar, wewnętrzny potencjał i kierunek rozwoju. Zacznij od bezpłatnego raportu osobistego, a potem przyjrzyj się relacjom, które tworzą Twoją historię.'},
    'products': [
        {'id':'osobisty','title':'Kod Duszy • Raport osobisty','subtitle':'Twoja osobista architektura','description':'Sześć parametrów Twojego kodu duszy, ich indywidualne interpretacje i pełna synteza. Raport generowany z daty urodzenia.','kind':'free','status':'ready','naffyUrl':''},
        {'id':'partnerski','title':'Relacja partnerska','subtitle':'Dwie historie. Jedna relacja.','description':'Analiza porównawcza kodów dwóch osób w relacji partnerskiej.','kind':'paid','status':'preparing','naffyUrl':''},
        {'id':'rodzic-dziecko','title':'Relacja rodzic–dziecko','subtitle':'Więź między pokoleniami','description':'Spojrzenie na podobieństwa i różnice w kodach rodzica oraz dziecka.','kind':'paid','status':'preparing','naffyUrl':''},
        {'id':'rodzenstwo','title':'Relacje rodzeństwa','subtitle':'Wspólny ród. Własne ścieżki.','description':'Analiza porównawcza rodzeństwa i tematów, które pojawiają się w rodzinie.','kind':'paid','status':'preparing','naffyUrl':''},
        {'id':'kronika','title':'Pełna Kronika Geometrii Rodowej','subtitle':'Architektura Twojego rodu','description':'Wielopoziomowe mapowanie linii żeńskiej i męskiej, rodzicielstwa, par przodków i rodzeństwa. Posag energetyczny, bilans przodków oraz symbolika dopełnienia cyklu.','kind':'paid','status':'preparing','naffyUrl':''},
        {'id':'alchemia','title':'Alchemia Naczynia','subtitle':'Skrypt Procesu Integracji','description':'Dedykowany, autorski przewodnik tekstowy.','kind':'paid','status':'preparing','naffyUrl':''}
    ],
    'report': json.loads((ROOT/'dist/assets/report-template.json').read_text()),
    **json.loads((ROOT/'dist/assets/content.json').read_text())
}

for key, pattern in MATCHES.items():
    paths = list(INPUT.glob(pattern))
    if len(paths) != 1:
        raise ValueError(f'{key}: oczekiwano jednego DOCX, znaleziono {len(paths)}')
    lines = [p.text.strip() for p in Document(paths[0]).paragraphs if p.text.strip()]
    if key == 'Tikkun':
        divider = next(i for i,p in enumerate(lines) if p == 'Opis pierwotny')
        first = next(i for i,p in enumerate(lines) if re.match(r'^1\s*•',p))
        expanded = parse_entries(lines[first:divider])
        original = parse_entries(lines[divider+1:])
        section = data['report']['sections'][key]
        section['variants'] = {'expanded': expanded, 'original': original}
        section['activeVariant'] = section.get('activeVariant', 'expanded')
        section.update(section['variants'][section['activeVariant']])
    else:
        first = next(i for i,p in enumerate(lines) if re.match(r'^1\s*•',p))
        section = data['report']['sections'][key]
        section.update(parse_entries(lines[first:]))
    # Teksty stałe i przyjęte korekty z finalnego PDF pozostają zachowane.
    section['source'] = paths[0].name
    print(f'{key}: 22 odrębne interpretacje')

TARGET.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Zapisano',TARGET)
