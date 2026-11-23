# Anonimizacja zapisów historycznych i bieżąca zgodność

[English](history-redaction.md)

Z części dokumentacji historycznej i kopii archiwalnych raportów
przeznaczonych do prezentacji usunięto ścieżki lokalnych maszyn i
tymczasowych potwierdzeń. Historyczne skróty źródeł, danych wejściowych
i archiwów zachowują znaczenie. Redagowane kopie różnią się bajtami od
surowych potwierdzeń i przedstawiają wcześniejszą weryfikację.
Statusy błędów i niepełnych wyników oraz granice akceptacji zachowano.

Sprawdzone zmiany prezentacji historii obejmują poniższe 14 ścieżek
repozytorium. Zmiana dotyczy wybranych rewizji.

- `.superpowers/sdd/2026-09-18-capstone-integration/task-1-report.md`
- `.superpowers/sdd/2026-09-18-capstone-integration/task-4-report.md`
- `.superpowers/sdd/2026-09-18-capstone-integration/task-6-report.md`
- `docs/curriculum-review-2026-10-08.md`
- `docs/dependency-audit-2026-10-06.md`
- `docs/evidence/capstone/msrv-report.json`
- `docs/evidence/capstone/stable-report.json`
- `docs/progress.md`
- `docs/superpowers/plans/2026-09-18-capstone-integration.md`
- `docs/superpowers/plans/2026-09-25-macros-as-api.md`
- `docs/superpowers/plans/2026-10-15-advanced-continuation.md`
- `docs/superpowers/specs/2026-09-13-cargo-dependency-lifecycle-design.md`
- `docs/verification.md`
- `src/content/fixtures/m11-m10-identity.json`

Przypadek M10 różni się tylko w `provenance.inputPath`, gdzie wpisano
`<private-input:legacy-m10-projection>`. Historyczny SHA256 to
`59b75a892df2a1be2920e49d33eed7956c5029c8328302f38506eded29611fa7`.
Dokładny SHA256 kopii po anonimizacji to
`2ef586f7b67f8f83621c1e53c3b4bfdddec9dc89c1af4612ed702f978607c563`.
Bieżący wyjątek w odczycie sprawdza ten dokładny skrót bajtów,
dokładny tekst zastępczy i SHA256
`7b0e3731da535f2c4eb4f844d0510958ae455367aa9a105470f953428a296785`
po odczytaniu JSON, zamaskowaniu wyłącznie `provenance.inputPath`
przez `<metadata-path-omitted-for-semantic-identity>` i serializacji
`JSON.stringify` w kolejności odczytanych kluczy i tablic. Zachowuje to
pozostałe pochodzenie, tożsamości źródeł, schemat, identyfikatory,
definicje, uporządkowane tablice i struktury zapisanego stanu. Wyjątek
obejmuje konkretną przejrzaną zmianę. Kolejne zmiany wymagają oceny.

Niezmienne potwierdzenia `async-send-pre-handoff.json`,
`async-cancel-pre-transfer.json` i `documentation-guided-repair-legacy.json`
zachowują oryginalne bajty i dawny skrót przypadku. Trzy bieżące
mechanizmy odczytu dopuszczają wyłącznie tego przejrzanego następcę.
Odczyt danych anulowania zachowuje także wcześniej przejrzany
wyjątek dotyczący obsługi testów natywnych. Każdy inny wpis nadal
wymaga skrótu wszystkich oryginalnych bajtów. Odczyt danych
zastosowania wiedzy M10 nadal sprawdza znaczenie tablic i historyczne
tożsamości źródeł.

Przepisane drzewa historyczne zachowują pierwotne mechanizmy odczytu.
W szczególności `async-lending-send-compatibility.test.ts`,
`async-lending-cancel-compatibility.test.ts` i
`documentation-guided-repair-integration.test.ts` mogą po anonimizacji
odpaść w pierwotnych asercjach skrótu całych plików. Wyniki następcy
dotyczą tylko jego HEAD. Testy historycznych rewizji, świeże dowody
natywne, gotowość publikacji i usunięcie danych u zewnętrznego dostawcy
mają osobne wymagania. Zwykły test zainicjalizowanego prefiksu może
zostać pominięty bez wymaganych danych dopuszczenia. Pominięcie lub
brak warunku wstępnego nie daje wyniku natywnego.
[Datowane dowody i zakres weryfikacji async](async-transfer-evidence.pl.md)
