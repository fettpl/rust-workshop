import type { ProjectContract, ProjectPackage } from "../../domain/types";
import { propertyContractsFiles } from "./property-contracts/archive";

export const propertyContractsPackage: ProjectPackage = {
  id: "property-contracts-workshop",
  title: "Projekt: kontrakty własności",
  description:
    "Prawdziwy pakiet Cargo z Proptest do formułowania własności, generowania danych, shrinkingu i odtwarzania kontrprzykładów.",
  instructions: [
    "Rozpakuj starter i uruchom cargo fmt --all -- --check oraz cargo test --locked. Starter kompiluje się, ale testy kontraktowe ujawniają celowe todo!.",
    "Zaimplementuj czyste funkcje selekcji Mini grep i podsumowania rekordów Log Analyzer przed dopisywaniem strategii Proptest.",
    "Zbuduj ograniczone strategie dla poprawnych i błędnych danych, obserwuj shrinking, zachowaj kontrprzykład w proptest-regressions/ i odtwórz go jednym testem.",
    "Sprawdź relację metamorfologiczną dla niepasującego sufiksu oraz warunki, przy których ta relacja przestaje obowiązywać.",
    "Uruchom cargo fmt --all -- --check, cargo test --locked, cargo test replay_saved_regression --locked oraz cargo clippy --all-targets --locked -- -D warnings.",
  ],
  // Proptest configuration and a fixed suffix property do not provide the
  // lessons' custom reducer/replay protocol or guarded metamorphic validator.
  revealStepRefs: [
    { lessonId: "property-invariants", stepId: "property-invariants-gate" },
    {
      lessonId: "property-generated-inputs",
      stepId: "property-generated-inputs-gate",
    },
  ],
  files: propertyContractsFiles,
};

export const propertyContractsProject: ProjectContract = {
  id: "property-contracts",
  title: "Projekt: kontrakty własności",
  objective:
    "Zbuduj executable property contracts dla selekcji tekstu i podsumowania rekordów, a następnie zminimalizuj i odtwórz znalezioną granicę.",
  lessonIds: [
    "property-invariants",
    "property-generated-inputs",
    "property-shrinking-replay",
    "property-metamorphic-transfer",
  ],
  reviewConceptIds: [
    "property-invariant-contracts",
    "property-generated-inputs",
    "property-shrinking-replay",
    "property-metamorphic-transfer",
  ],
  requiredBehaviors: [
    "Selekcja Mini grep zachowuje kolejność, numer linii, tekst i dokładnie jedną pozycję dla każdego elementu unii kontekstu.",
    "Podsumowanie Log Analyzer rozdziela rekordy poprawne i błędne, a filtr poziomu nie usuwa niezależnego licznika błędów.",
    "Strategie mają jawne granice i osobne gałęzie dla danych poprawnych oraz odrzucanych; test nie ukrywa większości przypadków przez filter_map.",
    "Kontrprzykład jest mniejszy po shrinkingu, zapisany w stabilnym formacie, odtworzony bez losowości środowiska i dodany jako regresja.",
    "Relacja metamorfologiczna ma warunek wstępny, transformację i wskazaną granicę, przy której nie wolno jej stosować.",
  ],
  requiredEvidence: [
    "Testy Proptest używają strategii złożonych z ograniczonych generatorów i niezależnych oracle, a nie tylko przykładów tabelarycznych.",
    "Checked-in regression fixture przechodzi osobnym testem replay, a kontrolowane mutanty klasyfikacji malformed i trimowania wiadomości zostają odrzucone.",
    "README opisuje pole dowodu generatora, różnicę między property testing i fuzzingiem oraz fakt, że pakiet nie uruchamia kodu z przeglądarki.",
  ],
  constraints: [
    "Rust 2024 z dokładnie proptest 1.11.0 jako dev-dependency; brak zależności runtime.",
    "Generator ogranicza przypadki do 24 rekordów, 32 bajtów zapytania i 40 bajtów wiadomości.",
    "Pakiet jest zaufanym artefaktem autora; aplikacja pobiera starter lub rozwiązanie, lecz nie wykonuje lokalnego Cargo ani kodu uczącego się.",
    "Własność mówi o zadeklarowanej domenie, strategii i oracle; nie dowodzi wszystkich możliwych danych wejściowych ani implementacji systemowej.",
  ],
  lessonId: "property-invariants",
  adversarialLessonId: "property-shrinking-replay",
  adversarialInject:
    "Usuń drugie dopasowanie z selekcji, pomiń malformed przy aktywnym filtrze albo uznaj pierwszy przypadek za shrink bez zmniejszania go. Wskaż property i regresję, która ujawnia zmianę.",
  retrospective: [
    "Jaki dokładnie oracle sprawdza kontrakt i czego generator nie obejmuje?",
    "Dlaczego zredukowany kontrprzykład powinien zachować klasę błędu, a nie tylko być krótszy?",
    "Kiedy relacja metamorfologiczna dla niepasującego sufiksu przestaje obowiązywać?",
  ],
  package: propertyContractsPackage,
};
