import type { ProjectContract, ProjectPackage } from "../../domain/types";
import { miniGrepFiles } from "./mini-grep/archive";

export const miniGrepPackage: ProjectPackage = {
  id: "mini-grep-workshop",
  title: "Projekt: ograniczony Mini grep",
  description:
    "Zbuduj std-only bibliotekę i CLI, które wyszukują literalny tekst w plikach, zachowują granice wejścia i jawnie klasyfikują ścieżki.",
  instructions: [
    "Rozpakuj starter i uruchom cargo fmt --check oraz cargo check --locked. Starter kompiluje się, ale jego testy zatrzymują się wyłącznie na celowych todo! w kontrakcie.",
    "Zaimplementuj Query, wybór unii kontekstu oraz ograniczony BufRead przed rozpoczęciem traversal. Nie materializuj całego wejścia ani zbyt długiej linii.",
    "Zachowaj kontrakt mini-grep [-C N] [--] QUERY PATH...: literalny UTF-8, katalogi depth-first sortowane według PathBuf i brak podążania za symlinkami.",
    "Uruchom cargo test --locked, cargo test --doc --locked, cargo clippy --all-targets -- -D warnings oraz testy procesu. Stdout powstaje dopiero po przetworzeniu wszystkich wejść.",
    "README, ADR i threat model opisują limity, błędy I/O oraz brak gwarancji snapshotu i ochrony przed TOCTOU. Pobranie pakietu nie zalicza lekcji.",
  ],
  revealStepRefs: [
    {
      lessonId: "grep-context-selection",
      stepId: "grep-context-selection-gate",
    },
    {
      lessonId: "grep-bounded-input",
      stepId: "grep-bounded-input-gate",
    },
    {
      lessonId: "grep-path-policy",
      stepId: "grep-path-policy-gate",
    },
    {
      lessonId: "grep-cli-contract",
      stepId: "grep-cli-contract-gate",
    },
  ],
  // The starter ships the completed fuzz decoder and full-output comparisons.
  // Seeds and evidence documentation do not supply a reducer or report classifier.
  starterRevealStepRefs: [
    { lessonId: "fuzz-input-domain", stepId: "fuzz-input-domain-gate" },
    {
      lessonId: "fuzz-oracle-sensitivity",
      stepId: "fuzz-oracle-sensitivity-gate",
    },
  ],
  files: miniGrepFiles,
};

export const miniGrepProject: ProjectContract = {
  id: "mini-grep",
  title: "Projekt: ograniczony Mini grep",
  objective:
    "Połącz czystą selekcję kontekstu, ograniczony odczyt tekstu, jawną politykę ścieżek i kontrakt procesu w małym narzędziu Rust.",
  lessonId: "grep-context-selection",
  lessonIds: [
    "grep-context-selection",
    "grep-bounded-input",
    "grep-path-policy",
    "grep-cli-contract",
    "fuzz-input-domain",
    "fuzz-oracle-sensitivity",
    "fuzz-counterexample-regression",
    "fuzz-campaign-evidence",
  ],
  reviewConceptIds: [
    "grep-context-selection",
    "grep-bounded-input",
    "grep-path-policy",
    "grep-cli-contract",
    "fuzz-input-domain",
    "fuzz-oracle-sensitivity",
    "fuzz-counterexample-regression",
    "fuzz-campaign-evidence",
  ],
  requiredBehaviors: [
    "Niepusty literalny Query wybiera unię okien kontekstu bez duplikatów, z CRLF i końcową linią bez LF traktowanymi zgodnie z kontraktem.",
    "BufRead odrzuca binarne, błędne UTF-8 i zbyt długie linie bez skopiowania całej nadmiarowej linii oraz zachowuje pierwotną przyczynę I/O.",
    "Katalogi są przeglądane depth-first w sortowanym porządku PathBuf; symlinki i pliki specjalne są odrzucane, a limity wpisów, głębokości i wyniku są jawne.",
    "Binarka rozdziela stdout od stderr i zwraca 0 dla trafień, 1 dla ich braku oraz 2 dla błędu; błąd po wcześniejszym trafieniu nie publikuje częściowego stdout.",
    "Authored fuzz adapter zachowuje trzybajtowy framing, surowe body i jawne wykluczenia; stable replay stałej regresji jest oddzielony od kampanii nightly.",
  ],
  requiredEvidence: [
    "Testy unit, integracyjne, doctest i niezależne testy procesu sprawdzają granice wejścia, kontekst, katalogi oraz kody wyjścia.",
    "Test własności porównuje czystą selekcję z niezależnym oraclem; maintainerowy fuzz harness jest osobnym narzędziem, bez zależności runtime pakietu.",
    "Celowe mutacje wyboru kontekstu, limitu BufRead, śledzenia symlinków i publikowania częściowego stdout muszą odrzucić test albo proces.",
    "FUZZ-MANIFEST.json, FUZZ-EVIDENCE.md i raport verifiera przechowują hash archiwum, manifestu, toolchain, run identity, logi, corpus oraz oryginalny i zredukowany witness.",
  ],
  constraints: [
    "Pakiet używa Rust 2024 i wyłącznie biblioteki standardowej; nie implementuje regexów, globów ani uniwersalnego grep.",
    "Limit pojedynczej linii nie jest ogólną gwarancją alokacji obcej implementacji BufRead, a stdout nie jest transakcyjny przy awarii urządzenia wyjściowego.",
    "Polityka ścieżek nie jest sandboxem i nie daje ochrony przed TOCTOU, symlinkiem w komponencie nadrzędnym ani snapshotem zmienianego pliku.",
    "Kampania jest ograniczoną obserwacją na pinned nightly; replay, timeout, brak instrumentacji i stale artifact nie są dowodem braku błędów.",
  ],
  adversarialLessonId: "grep-cli-contract",
  adversarialInject:
    "Usuń deduplikację nakładających się okien, użyj read_line bez limitu, podążaj za symlinkiem albo zapisz trafienia do stdout przed otwarciem kolejnej ścieżki. Wskaż test, który ujawnia zmianę.",
  retrospective: [
    "Dlaczego test z małymi porcjami BufRead mówi więcej o granicy linii niż sam read_line?",
    "Której gwarancji nie daje symlink_metadata pomiędzy metadanymi a open i dlaczego nie należy jej obiecywać?",
    "Dlaczego kod 1 dla braku dopasowań różni się od kodu 2 dla błędu, mimo że oba nie mają stdout?",
  ],
  package: miniGrepPackage,
};
