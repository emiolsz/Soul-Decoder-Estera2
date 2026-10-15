"""Pierwotna metodyka profilu osoby żyjącej; zachowana z przesłanej aplikacji."""

def redukuj_do_22(liczba):
    if liczba == 0: return 22
    while isinstance(liczba, int) and liczba > 22:
        liczba = sum(int(c) for c in str(liczba))
    return liczba

def generuj_profil_urodzenia(d, m, r):
    """Profil urodzenia według pierwotnej metodyki 22 energii.

    Dzień = Dar, miesiąc = Karma, suma cyfr roku (redukcja tylko gdy >22)
    = Głęboka Osobowość. Talent powstaje z sumy cyfr Głębokiej Osobowości.
    Węzeł oporu wyznaczamy od najwyższej wartości bazowej, odejmując miesiąc;
    Tikkun wyznaczamy z różnicy między Węzłem Oporu a dniem.
    Ta funkcja jest niezależna od analizy wibracji przejścia.
    """
    prawa = redukuj_do_22(d)
    lewa = redukuj_do_22(m)

    # Rok: sumujemy cyfry; jeśli wynik przekracza 22, redukujemy do zakresu 1–22.
    gleboka = redukuj_do_22(sum(int(c) for c in str(r)))

    # Talent/Dar: sumujemy cyfry Głębokiej Osobowości (np. 21 -> 2+1 = 3).
    talent = sum(int(c) for c in str(gleboka))

    # Bierzemy najwyższą z trzech wartości bazowych, następnie odejmujemy miesiąc.
    najwyzsza = max(prawa, lewa, gleboka)
    wezel = redukuj_do_22(najwyzsza - lewa)

    # Tikkun: różnica Węzła Oporu i wartości dnia.
    # Wartość bezwzględna zachowuje wynik w zakresie obsługiwanym przez system 1–22.
    tikkun = redukuj_do_22(abs(wezel - prawa))

    return {
        "Prawa": prawa,
        "Lewa": lewa,
        "Gleboka": gleboka,
        "Talent": talent,
        "Wezel": wezel,
        "Tikkun": tikkun,
    }
