# Raport z zadania 1 — obszar roboczy usługi dziennika i kontrakt jej rdzenia

[English](task-1-report.md)

Status: ukończone

## Zmienione pliki

- `src/content/projects/durable-log-service/archive.ts` — manifest obszaru roboczego z trzema pakietami, wygenerowany plik blokady zależności, polska dokumentacja pakietu i układ 35 ścieżek w archiwum.
- `src/content/projects/durable-log-service/core.ts` — manifesty pakietu `ingest-core` korzystającego wyłącznie z biblioteki standardowej, startowe i wzorcowe moduły domeny oraz protokołu, testy publicznego API i deterministyczne testy właściwości protokołu o ograniczonym zakresie.
- `src/content/projects/durable-log-service/store.ts` — manifest przypinający rusqlite 0.40.2 oraz szkielet warstwy zapisu przewidzianej dla tego zadania.
- `src/content/projects/durable-log-service/service.ts` — manifesty środowiska wykonawczego i zależności deweloperskich z przypiętą wersją Tokio 1.53.1 oraz szkielet usługi.
- `src/content/projects/durable-log-service/package.test.ts` — testy składu archiwum, manifestu, publicznego API i kontraktu paczki startowej.

Plik `course.ts` zachował dotychczasową treść. Rejestracja projektu nastąpi po jego ukończeniu.

## Commity

- `00d5963573ca5466b4ab8500eec37d00abe92c46` — `Establish durable log service core contract`
- Sam raport zapisano w osobnym commicie po zmianach w implementacji.

## Wykonane polecenia i ich wyniki

1. `npm test -- --run src/content/projects/durable-log-service/package.test.ts`

   ```text
   Test Files  1 passed (1)
   Tests  3 passed (3)
   ```

2. `npm run typecheck`

   ```text
   > tsc --noEmit
   ```

3. `cargo generate-lockfile --manifest-path <private-temp>/receipt-024/Cargo.toml`

   ```text
   Updating crates.io index
   Locking 25 packages to latest Rust 1.85.0 compatible versions
   ```

4. `cargo fmt --all --manifest-path <private-temp>/receipt-024/Cargo.toml -- --check`

   ```text
   [no output; exit 0]
   ```

5. `rustup run 1.85.0 cargo fmt --all --manifest-path <private-temp>/receipt-024/Cargo.toml -- --check`

   ```text
   [no output; exit 0]
   ```

6. `cargo test --workspace --locked --all-targets --manifest-path <private-temp>/receipt-024/Cargo.toml`

   ```text
   test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
   test result: ok. 6 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
   test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
   ```

7. `rustup run 1.85.0 cargo test --workspace --locked --all-targets --manifest-path <private-temp>/receipt-024/Cargo.toml`

   ```text
   test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
   test result: ok. 6 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
   test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
   ```

8. `cargo check --workspace --locked --all-targets --manifest-path <private-temp>/receipt-023/Cargo.toml`

   ```text
   Finished `dev` profile [unoptimized + debuginfo]
   ```

9. `cargo metadata --format-version 1 --locked --manifest-path <private-temp>/receipt-024/Cargo.toml | jq -r '.packages[] | [.name,.version,(.license // ""),(.source // "path")] | @tsv'`

   ```text
   rusqlite  0.40.2  MIT  registry+https://github.com/rust-lang/crates.io-index
   libsqlite3-sys  0.38.2  MIT  registry+https://github.com/rust-lang/crates.io-index
   tokio  1.53.1  MIT  registry+https://github.com/rust-lang/crates.io-index
   tokio-macros  2.7.2  MIT OR Apache-2.0  registry+https://github.com/rust-lang/crates.io-index
   cc  1.4.7  MIT OR Apache-2.0  registry+https://github.com/rust-lang/crates.io-index
   ```

Plik blokady zawiera 25 pakietów. Powyższe polecenie odczytujące metadane zwraca pełny wykaz licencji zależności przechodnich. Wszystkie wpisy z rejestru wskazują crates.io, a pakiety opracowane na potrzeby kursu są zależnościami lokalnymi.

## Zależności i minimalna obsługiwana wersja Rusta (MSRV)

Weryfikacja potwierdziła zgodność zależności i MSRV. Graf zależności rusqlite 0.40.2 z dołączonym SQLite oraz graf Tokio 1.53.1 skompilowały się i przeszły testy obszaru roboczego na stabilnym Ruście 1.98.1 oraz na dokładnej wersji 1.85.0. Budowa dołączonego SQLite korzysta z natywnego kompilatora C. W tym przebiegu był to Apple clang 21.0.0 dla arm64-apple-darwin27.0.0.

## Zakres zadania i kwestie otwarte

Transakcje, migracje, nadzór nad usługą i zachowanie procesu otrzymały na tym etapie szkielety do rozwinięcia w zadaniach 2 i 3. Manifesty i ścieżki w archiwum pozwalają już odtworzyć rzeczywisty graf zależności. Weryfikacja zachowania tych elementów należy do późniejszych zadań. Plik blokady utrwala graf wybrany przez Cargo w tym przebiegu. Jeśli późniejsze zadanie zmieni manifesty, plik blokady należy odświeżyć za pomocą Cargo.

## Poprawki po przeglądzie z 2026-09-18

Przegląd wykazał pięć problemów. Wszystkie poprawiono w kolejnej zmianie.

- Łańcuch `if let` w `Event::with_correlation`, wymagający Rusta 1.88, zastąpiono zagnieżdżonymi warunkami. Rozwiązanie kompiluje się na standardowym Ruście 1.85.0.
- W `with_correlation` zarezerwowano `-` jako znacznik braku wartości w V2. Wywołanie z `Some("-")` zwraca teraz `ValidationError::Correlation`. Kodowanie V2 nie zamieni po cichu przekazanej wartości na `None`.
- Testy właściwości dla skończonego zbioru danych obejmują długości identyfikatora 1/31/32, jawne przypadki pustego identyfikatora i przekroczenia limitu, 39 wiadomości UTF-8 o ograniczonej długości wygenerowanych z alfabetu o trzech znakach, wszystkie trzy poziomy, trzy stany korelacji oraz zapis i odczyt w obu formatach V1/V2.
- Rozmiar danych ramki jest liczony przed końcowym LF. Ramka z 4096 bajtami danych i LF mieści się w limicie. Przy 4097 bajtach przed LF wynikiem pozostaje `TooLarge`.
- Tymczasowe `assert!(true)` dotyczące przyszłych zadań zastąpiono testami jawnie pominiętymi z uzasadnieniami po polsku. W raporcie nie pojawią się fikcyjne zaliczenia.

Przed wprowadzeniem poprawek potwierdzono błędy w testach:

```text
cargo test -p ingest-core --test public_api --test protocol_properties --locked --manifest-path <private-temp>/receipt-021/Cargo.toml
test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
test result: FAILED. 6 passed; 2 failed; 0 ignored; 0 measured; 0 filtered out
failures: correlation_sentinel_is_rejected, frame_limit_is_measured_before_terminal_newline
```
Po poprawkach wybrane testy przeszły na obu kompilatorach:

```text
cargo test -p ingest-core --test public_api --test protocol_properties --workspace --locked --manifest-path <private-temp>/receipt-020/Cargo.toml
test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
test result: ok. 8 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out

rustup run 1.85.0 cargo test -p ingest-core --test public_api --test protocol_properties --workspace --locked --manifest-path <private-temp>/receipt-020/Cargo.toml
test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
test result: ok. 8 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```
Powtórzono również kontrole oddanego kodu źródłowego. Zakończyły się powodzeniem:

```text
cargo fmt --all --manifest-path <private-temp>/receipt-020/Cargo.toml -- --check
rustup run 1.85.0 cargo fmt --all --manifest-path <private-temp>/receipt-020/Cargo.toml -- --check
[both commands: no output; exit 0]

cargo test --workspace --locked --all-targets --manifest-path <private-temp>/receipt-020/Cargo.toml
rustup run 1.85.0 cargo test --workspace --locked --all-targets --manifest-path <private-temp>/receipt-020/Cargo.toml
[both commands: exit 0; core 4-property and 8-public-API tests passed; six later-task scaffolds were explicitly ignored]

cargo check --workspace --locked --all-targets --manifest-path <private-temp>/receipt-022/Cargo.toml
rustup run 1.85.0 cargo check --workspace --locked --all-targets --manifest-path <private-temp>/receipt-022/Cargo.toml
[both commands: Finished `dev` profile; starter compiled with intentional unused-code warnings]

npm test -- --run src/content/projects/durable-log-service/package.test.ts
Test Files  1 passed (1); Tests  4 passed (4)

npm run typecheck
tsc --noEmit; exit 0
```
Poprawki zapisano w osobnym commicie, aby można było odróżnić wynik przeglądu od pierwotnej implementacji.
