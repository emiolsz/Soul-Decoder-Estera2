# Soul Decoder Estera 
## Zawartość

- Bezpłatny generator Kodu Duszy: sześć parametrów, 132 opisy, podgląd i PDF.
- Generatory testowe partnerstwa, rodzic–dziecko, rodzeństwa (1–15 osób) i Kroniki: profile, porównania, status żyjąca/nieżyjąca, data odejścia, dwie metody posagu i opisy wieku.
- Przy jednej osobie w rodzeństwie powstaje profil; porównanie wymaga drugiej osoby.
- Alchemia Naczynia pozostaje w przygotowaniu; nie generuje raportu.
- Sześć grafik i złote logo, kremowy nagłówek z cienką złotą linią oraz efekt wodnej fali przy kliknięciu.
- Wydruk oparty na przekazanym PDF: cytat, okładka z sześcioma wartościami w dwóch okręgach, wprowadzenia, interpretacje, synteza, symbole, obliczenia, pełna stopka.
- Dokumenty źródłowe w `materials/`.

## Edytowalne treści

Pracownia opisów pozwala edytować wprowadzenia, wartości 1–22, warianty Tikkunu, syntezę, cytat i opisy posagu według wieku. Treści znajdują się w `dist/assets/report-content.json`, oddzielnie od obliczeń.

Zapis pracowni działa w tej przeglądarce. Aby zachować zmiany na stronie, wybierz „Pobierz plik opisów”, zastąp `dist/assets/report-content.json` w repozytorium i wdroż stronę ponownie. Import JSON pozwala przenieść pracę między komputerami. Nie ma jeszcze serwerowej bazy szkiców, publikacji i historii zmian.

Parametry obliczeń są w `dist/calculator.mjs`, `dist/lineage.mjs` i `dist/method-config.mjs`. Sam opis ani jego redakcja nie zmieniają matematyki. Nieaktywne warianty źródłowe Tikkunu zachowano osobno w bazie.

## Zakres wersji testowej

Rozszerzone raporty mają działającą strukturę generatora i PDF. Porównania relacji i ich synteza są robocze, nie stanowią jeszcze kompletnych autorskich słowników dla wszystkich konfiguracji. Wymagają dalszego dostarczenia i zatwierdzenia treści. Pakiet nie jest gotową platformą sprzedażową.

Nie zaimplementowano jeszcze: logowania linkiem e-mail, kont klienta, prywatnego magazynu PDF, wysyłki e-mail, potwierdzania zakupu Naffy, usuwania kont i obsługi newslettera. Te funkcje wymagają backendu i skonfigurowania usług. Dane wpisane do formularzy nie są trwale zapisywane; pamięć lokalna przechowuje redagowane opisy.

## Kontrola

`node --test tests/*.test.mjs`

`node tools/qa-pdf.mjs /tmp/soul-decoder-qa`

Testy matematyki, opisów i generowania PDF. Wydruk testowy sprawdzono po renderowaniu. Nie wykonano kontroli interakcji w przeglądarce, ponieważ środowisko nie udostępnia narzędzia do jej sterowania.
