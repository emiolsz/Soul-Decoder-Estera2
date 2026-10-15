"""Każdy parametr wybiera własny słownik 22 interpretacji."""
from dane import CONTENT

def pobierz_analize_premium(numer, klucz):
    sekcja = CONTENT['report']['sections'].get(klucz)
    if sekcja is None:
        raise ValueError('Nieznana pozycja profilu')
    return '\n\n'.join(sekcja['extended'][str(numer)])
