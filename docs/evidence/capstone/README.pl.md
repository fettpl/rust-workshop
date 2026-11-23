# Dowody weryfikacji archiwum Capstone

[English](README.md)

Wyniki pochodzą z weryfikacji rewizji `82e2406`
(`Strengthen capstone exposure audit`) z 2026-09-18.

- `stable-report.json` zawiera przebieg `npm run content:capstone -- --fetch` z zewnętrznym limitem 180 sekund i limitem 120 sekund na polecenie Cargo w weryfikatorze.
- `msrv-report.json` zawiera przebieg `npm run content:capstone -- --fetch --msrv` z tymi samymi limitami i dokładną wersją zestawu narzędzi Rust 1.85.0.

Oba raporty celowo zachowano ze statusem `failed`. Skróty SHA-256 archiwum
i ponownie wygenerowanego archiwum są zgodne. Na stabilnym Ruście mutant
`changed-payload-accepted-as-duplicate` skompilował się bez błędów, ale
jego wykonanie zakończył sygnał `SIGTERM`. Kontrola po przywróceniu
wersji referencyjnej przeszła. Raport nie zawiera wyników późniejszych
mutantów dla stabilnego Rusta. Przebieg MSRV zatrzymał się na sygnale
testu mutanta z limitem czasu. Sygnał nie rozstrzyga o zachowaniu mutanta.
Akceptacja archiwum dla wersji stabilnej i MSRV oraz zgoda na wydanie
wymagają osobnych dowodów.
