import type { ProjectContract, ProjectPackage } from "../../domain/types";
import { project as legacyProject } from "../catalog";
import { numberGuessingFiles } from "./number-guessing/archive";

export const numberGuessingPackage: ProjectPackage = {
  id: "number-guessing-workshop",
  title: "Projekt: Number Guessing+",
  description:
    "Kompletny pakiet Cargo z losowym sekretem, jawnym stanem gry i testowalnym terminalem.",
  instructions: [
    "Rozpakuj starter. Kompiluje się, lecz testy kontraktu celowo zatrzymują się na todo!.",
    "Zaimplementuj parser, stan Game i strumień play przed adapterem CLI.",
    "Zachowaj rand 0.10.3, zwykły losowy sekret w normalnej grze oraz --secret wyłącznie dla powtarzalnego ćwiczenia.",
    "Uruchom cargo fmt --check, cargo check --locked, cargo test --locked, cargo test --doc --locked i cargo clippy --all-targets -- -D warnings.",
  ],
  revealStepRefs: [
    { lessonId: "guess-input-contract", stepId: "guess-input-contract-gate" },
    { lessonId: "guess-round-state", stepId: "guess-round-state-gate" },
    { lessonId: "guess-session-io", stepId: "guess-session-io-gate" },
    { lessonId: "guess-random-boundary", stepId: "guess-random-boundary-gate" },
  ],
  files: numberGuessingFiles,
};

export const numberGuessingProject: ProjectContract = {
  ...legacyProject,
  title: "Projekt: Number Guessing+",
  objective:
    "Zbuduj testowalną grę terminalową z losowym sekretem, parserem, stanem i jawnymi granicami I/O.",
  lessonIds: [
    "number-guessing-transfer",
    "adversarial-no-clone",
    "guess-input-contract",
    "guess-round-state",
    "guess-session-io",
    "guess-random-boundary",
  ],
  reviewConceptIds: [
    "function-ownership",
    "shared-borrow",
    "ownership-repair",
    "guess-input-contract",
    "guess-round-state",
    "guess-session-io",
    "guess-random-boundary",
  ],
  adversarialLessonId: "guess-session-io",
  adversarialInject: `${legacyProject.adversarialInject} Usuń flush po promptcie, odejmij próbę po błędnym tekście albo potraktuj trafienie ostatnią próbą jako porażkę. Wskaż test procesu lub kontraktu, który to ujawnia.`,
  retrospective: [
    "Dlaczego parser nie powinien zmieniać stanu gry?",
    "Co gwarantuje flush promptu przed odczytem?",
    "Dlaczego zwykłe losowanie nie jest testem seedowanej sekwencji?",
  ],
  requiredBehaviors: [
    "Parser przyjmuje tylko q lub cyframi zapisany strzał 1..=100.",
    "Każdy poprawny strzał zużywa próbę, a trafienie ostatnią próbą wygrywa.",
    "Normalna gra losuje jeden sekret; --secret daje powtarzalną sesję ćwiczeniową.",
  ],
  requiredEvidence: [
    "Testy parsera, stanów terminalnych i granicy linii.",
    "Testy procesu dla dokładnych transkryptów i adaptacyjnej gry losowej.",
    "Cargo.lock, fmt, check, test, doctest i clippy dla referencji.",
  ],
  constraints: [
    "Rust 2024 oraz dokładnie rand 0.10.3 z thread_rng.",
    "Brak obietnicy kryptograficzności lub sekwencji seedowanej.",
    "Limit linii ogranicza adapter, nie dowolny BufRead dostarczony przez wywołującego.",
  ],
  package: numberGuessingPackage,
};
