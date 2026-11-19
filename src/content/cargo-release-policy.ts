import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";
import type { ManifestContract } from "@/domain/manifest";
import { frameProtocolProject } from "./projects/frame-protocol";

const reviewedAt = "2026-09-17";

export const cargoReleaseSources: Source[] = [
  {
    id: "cargo-manifest-release-reference",
    title: "The Cargo Book: The Manifest Format",
    url: "https://doc.rust-lang.org/cargo/reference/manifest.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie pól rust-version, publish, metadanych lub reguł include/exclude.",
  },
  {
    id: "cargo-package-release-reference",
    title: "The Cargo Book: cargo package",
    url: "https://doc.rust-lang.org/cargo/commands/cargo-package.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu cargo package --list, Cargo.lock albo Cargo.toml.orig.",
  },
  {
    id: "cargo-update-release-reference",
    title: "The Cargo Book: cargo update",
    url: "https://doc.rust-lang.org/cargo/commands/cargo-update.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie wyjaśnienia jawnego update, lockfile lub --locked.",
  },
  {
    id: "cargo-rust-version-release-reference",
    title: "The Cargo Book: rust-version",
    url: "https://doc.rust-lang.org/cargo/reference/rust-version.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu minimalnego wspieranego Rust albo dziedziczenia pola.",
  },
];

export const cargoReleaseCompetencies: Competency[] = [
  {
    id: "maintain-cargo-msrv-lock-policy",
    title:
      "Utrzymujesz compiler floor i deklarację zależności tak, aby zmiana lockfile była jawna i sprawdzalna.",
  },
  {
    id: "rehearse-cargo-package-boundary",
    title:
      "Przygotowujesz metadane i granicę archiwum Cargo, odróżniając deklarowaną politykę plików od wygenerowanego pakietu.",
  },
];

export const cargoReleaseConcepts: Concept[] = [
  {
    id: "cargo-lock-msrv-policy",
    title: "Compiler floor i jawna polityka lockfile",
    prerequisites: ["cargo-resolver-feature-unification"],
    competencyIds: ["maintain-cargo-msrv-lock-policy"],
    evidenceArtifact: "manifest",
    reviewPrompt:
      "Co deklaruje `rust-version`, a co gwarantuje `--locked` w codziennym przebiegu zmian zależności?",
    reviewAnswer:
      '`rust-version = "1.85.0"` deklaruje minimalny wspierany compiler dla pakietu. Jawne `cargo update` może przeliczyć i zmienić Cargo.lock, a późniejszy `--locked` odmówi działania, gdy wybrany graf wymagałby zmiany lockfile.',
    distinguish:
      "Compiler floor jest polem manifestu i może być dziedziczony przez członka workspace. `Cargo.lock` przechowuje konkretny wybór, więc nie wpisuje się do niego ręcznie polityki ani nie traktuje go jako zamiennika deklaracji.",
  },
  {
    id: "cargo-package-rehearsal",
    title: "Metadane i granica archiwum paczki",
    prerequisites: ["cargo-lock-msrv-policy"],
    competencyIds: ["rehearse-cargo-package-boundary"],
    evidenceArtifact: "manifest",
    reviewPrompt:
      "Jak sprawdzisz, co naprawdę trafi do archiwum, gdy manifest używa include albo exclude?",
    reviewAnswer:
      "Manifest ustawia metadane oraz wzorce include albo exclude, lecz faktyczną listę daje dopiero `cargo package --list`. Cargo może przy pakowaniu dodać wygenerowany Cargo.lock i znormalizowane Cargo.toml obok Cargo.toml.orig.",
    distinguish:
      "`include` ustala dozwolony zbiór i ma pierwszeństwo przed `exclude`; bez include można wykluczyć wzorcami pliki z domyślnego zbioru. Oba pola opisują wejściową politykę, nie są dowodem, że archiwum zostało utworzone.",
  },
];

function frameFile(path: string) {
  const file = frameProtocolProject.package?.files.find(
    (candidate) => candidate.path === path,
  );
  if (!file) throw new Error(`Brak pliku Frame Protocol: ${path}`);
  return file;
}

function completedFrameManifest(path: string): string {
  const file = frameFile(path);
  return file.solution ?? file.starter;
}

function floorStarter(): string {
  return completedFrameManifest("Cargo.toml")
    .replace('resolver = "3"', 'resolver = "2"')
    .replace('rust-version = "1.85.0"', 'rust-version = "1.84.0"');
}

function packageStarter(): string {
  return completedFrameManifest("Cargo.toml")
    .replace(/description = "[^"]*"\n/, "")
    .replace(/license = "[^"]*"\n/, "")
    .replace(/repository = "[^"]*"\n/, "")
    .replace(/readme = "[^"]*"\n/, "");
}

function choice(
  id: string,
  kind: "predict" | "observe" | "explain" | "recall",
  title: string,
  prompt: string,
  answers: [string, string, string],
  correct: number,
  explanations: [string, string, string],
  options: { code?: string; editorFile?: string } = {},
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    choices: answers.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((explanation, index) => [String(index), explanation]),
      ),
    },
    ...(options.code === undefined
      ? {}
      : {
          code: options.code,
          solution: options.code,
          editorMode: "toml" as const,
          editorFile: options.editorFile ?? "Cargo.toml",
        }),
    evidenceKind:
      kind === "predict"
        ? "prediction"
        : kind === "recall"
          ? "recall"
          : "exposure",
  };
}

function manifestTask(options: {
  id: string;
  title: string;
  prompt: string;
  contract: ManifestContract;
  solution: string;
  code?: string;
  editorFile: string;
  evidenceKind: "assessment" | "transfer";
}): LessonStep {
  return {
    id: options.id,
    kind: options.id.endsWith("-blank") ? "blank" : "assessment",
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    editorMode: "toml",
    editorFile: options.editorFile,
    evaluator: { kind: "manifest-contract", contract: options.contract },
    evidenceKind: options.evidenceKind,
    evidenceGate: true,
  };
}

const floorContract: ManifestContract = {
  document: "workspace-root",
  assertions: [
    {
      kind: "path-equals",
      path: ["workspace", "members"],
      value: ["crates/frame-protocol", "crates/frame-probe"],
      arrayMode: "set",
    },
    { kind: "path-equals", path: ["workspace", "resolver"], value: "3" },
    {
      kind: "path-equals",
      path: ["workspace", "package", "rust-version"],
      value: "1.85.0",
    },
    {
      kind: "path-equals",
      path: ["workspace", "package", "publish"],
      value: false,
    },
    {
      kind: "dependency",
      table: "workspace.dependencies",
      dependency: {
        name: "serde",
        package: "serde",
        source: { kind: "registry" },
        version: "1.0.229",
        defaultFeatures: false,
        features: { values: [], mode: "equals" },
      },
    },
  ],
};

const floorBlankContract: ManifestContract = {
  document: "package",
  assertions: [
    { kind: "path-equals", path: ["package", "name"], value: "release-lib" },
    {
      kind: "path-equals",
      path: ["package", "version", "workspace"],
      value: true,
    },
    {
      kind: "path-equals",
      path: ["package", "edition", "workspace"],
      value: true,
    },
    {
      kind: "path-equals",
      path: ["package", "rust-version", "workspace"],
      value: true,
    },
    {
      kind: "path-equals",
      path: ["package", "description", "workspace"],
      value: true,
    },
    {
      kind: "path-equals",
      path: ["package", "license", "workspace"],
      value: true,
    },
    {
      kind: "path-equals",
      path: ["package", "repository", "workspace"],
      value: true,
    },
    {
      kind: "path-equals",
      path: ["package", "readme", "workspace"],
      value: true,
    },
    {
      kind: "path-equals",
      path: ["package", "publish", "workspace"],
      value: true,
    },
    {
      kind: "path-equals",
      path: ["features", "default"],
      value: [],
      arrayMode: "set",
    },
    {
      kind: "dependency",
      table: "dependencies",
      dependency: {
        name: "serde",
        source: { kind: "workspace" },
        optional: true,
      },
    },
  ],
};

const floorBlankSolution = String.raw`[package]
name = "release-lib"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
description.workspace = true
license.workspace = true
repository.workspace = true
readme.workspace = true
publish.workspace = true

[features]
default = []

[dependencies]
serde = { workspace = true, optional = true }
`;

const floorReviewContract: ManifestContract = {
  document: "package",
  assertions: [
    { kind: "path-equals", path: ["package", "name"], value: "stable-floor" },
    { kind: "path-equals", path: ["package", "version"], value: "0.1.0" },
    { kind: "path-equals", path: ["package", "edition"], value: "2024" },
    {
      kind: "path-equals",
      path: ["package", "rust-version"],
      value: "1.85.0",
    },
    {
      kind: "path-nonempty-string",
      path: ["package", "description"],
    },
    { kind: "path-equals", path: ["package", "license"], value: "MIT" },
    { kind: "path-equals", path: ["package", "publish"], value: false },
    {
      kind: "dependency",
      table: "dependencies",
      dependency: {
        name: "serde",
        package: "serde",
        source: { kind: "registry" },
        version: "^1.0.229",
        optional: false,
        defaultFeatures: false,
        features: { values: [], mode: "equals" },
      },
    },
  ],
};

const floorReviewSolution = String.raw`[package]
name = "stable-floor"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "A compiler floor exercise."
license = "MIT"
publish = false

[dependencies]
serde = { version = "^1.0.229", default-features = false }
`;

const packageContract: ManifestContract = {
  document: "workspace-root",
  assertions: [
    {
      kind: "path-equals",
      path: ["workspace", "members"],
      value: ["crates/frame-protocol", "crates/frame-probe"],
      arrayMode: "set",
    },
    { kind: "path-equals", path: ["workspace", "resolver"], value: "3" },
    {
      kind: "path-nonempty-string",
      path: ["workspace", "package", "description"],
    },
    {
      kind: "path-nonempty-string",
      path: ["workspace", "package", "license"],
    },
    {
      kind: "path-nonempty-string",
      path: ["workspace", "package", "repository"],
    },
    {
      kind: "path-nonempty-string",
      path: ["workspace", "package", "readme"],
    },
    {
      kind: "path-equals",
      path: ["workspace", "package", "publish"],
      value: false,
    },
    { kind: "path-absent", path: ["workspace", "package", "include"] },
    { kind: "path-absent", path: ["workspace", "package", "exclude"] },
  ],
};

const packageBlankContract: ManifestContract = {
  document: "package",
  assertions: [
    { kind: "path-equals", path: ["package", "name"], value: "signal-kit" },
    { kind: "path-equals", path: ["package", "version"], value: "0.3.0" },
    { kind: "path-equals", path: ["package", "edition"], value: "2024" },
    {
      kind: "path-equals",
      path: ["package", "rust-version"],
      value: "1.85.0",
    },
    {
      kind: "path-nonempty-string",
      path: ["package", "description"],
    },
    { kind: "path-equals", path: ["package", "license"], value: "MIT" },
    {
      kind: "path-equals",
      path: ["package", "repository"],
      value: "https://example.invalid/signal-kit",
    },
    { kind: "path-equals", path: ["package", "readme"], value: "README.md" },
    { kind: "path-equals", path: ["package", "publish"], value: false },
    {
      kind: "path-equals",
      path: ["package", "include"],
      value: ["Cargo.toml", "README.md", "src/**", "tests/**"],
      arrayMode: "set",
    },
    { kind: "path-absent", path: ["package", "exclude"] },
    { kind: "path-equals", path: ["lib", "path"], value: "src/lib.rs" },
  ],
};

const packageBlankSolution = String.raw`[package]
name = "signal-kit"
version = "0.3.0"
edition = "2024"
rust-version = "1.85.0"
description = "A signal library for package rehearsal."
license = "MIT"
repository = "https://example.invalid/signal-kit"
readme = "README.md"
publish = false
include = ["Cargo.toml", "README.md", "src/**", "tests/**"]

[lib]
path = "src/lib.rs"
`;

const packageReviewContract: ManifestContract = {
  document: "package",
  assertions: [
    { kind: "path-equals", path: ["package", "name"], value: "archive-note" },
    { kind: "path-equals", path: ["package", "version"], value: "0.1.0" },
    { kind: "path-equals", path: ["package", "edition"], value: "2024" },
    {
      kind: "path-equals",
      path: ["package", "rust-version"],
      value: "1.85.0",
    },
    {
      kind: "path-nonempty-string",
      path: ["package", "description"],
    },
    {
      kind: "path-equals",
      path: ["package", "license"],
      value: "MIT OR Apache-2.0",
    },
    {
      kind: "path-equals",
      path: ["package", "repository"],
      value: "https://example.invalid/archive-note",
    },
    { kind: "path-equals", path: ["package", "readme"], value: "README.md" },
    { kind: "path-equals", path: ["package", "publish"], value: false },
    {
      kind: "path-equals",
      path: ["package", "exclude"],
      value: ["fixtures/large.bin", "build/generated/**", "notes/**"],
      arrayMode: "set",
    },
    { kind: "path-absent", path: ["package", "include"] },
    { kind: "path-equals", path: ["lib", "path"], value: "src/lib.rs" },
  ],
};

const packageReviewSolution = String.raw`[package]
name = "archive-note"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "An archive boundary exercise."
license = "MIT OR Apache-2.0"
repository = "https://example.invalid/archive-note"
readme = "README.md"
publish = false
exclude = ["fixtures/large.bin", "build/generated/**", "notes/**"]

[lib]
path = "src/lib.rs"
`;

const floorObservation = String.raw`[workspace]
members = ["crates/frame-protocol", "crates/frame-probe"]
resolver = "3"

[workspace.package]
rust-version = "1.85.0"
publish = false

[workspace.dependencies]
serde = { version = "1.0.229", default-features = false }
`;

const packageObservation = String.raw`[package]
name = "trace-report"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "A local trace report package."
license = "MIT"
repository = "https://example.invalid/trace-report"
readme = "README.md"
publish = false
exclude = ["scratch/**", "notes/**"]

[lib]
path = "src/lib.rs"
`;

export const cargoReleaseLessons: Lesson[] = [
  {
    id: "cargo-lock-msrv-policy",
    moduleId: "cargo-dependency-lifecycle",
    conceptIds: ["cargo-lock-msrv-policy"],
    competencyIds: ["maintain-cargo-msrv-lock-policy"],
    prerequisites: ["cargo-resolver-feature-unification"],
    title: "Compiler floor i lockfile mają właściciela",
    subtitle:
      "Ustawisz minimalny Rust workspace i rozdzielisz jawny update lockfile od sprawdzenia z --locked.",
    minutes: 25,
    outcomes: [
      "Rozpoznasz resolver 3, rust-version 1.85.0 i publish=false jako rzeczywiste pola Cargo.",
      "Wyjaśnisz, dlaczego cargo update może zmienić Cargo.lock, a --locked odmawia wymaganej zmiany.",
      "Zastosujesz dziedziczenie metadanych workspace w niezależnym manifeście członka.",
    ],
    steps: [
      choice(
        "cargo-lock-msrv-policy-predict",
        "predict",
        "Przewidź compiler floor",
        'Workspace Frame ma wspierać Rust od wersji `1.85.0`, używać `resolver = "3"` i zachować `publish = false`. Który zestaw pól opisuje tę politykę w Cargo.toml?',
        [
          '`workspace.resolver = "3"`, `workspace.package.rust-version = "1.85.0"` i `workspace.package.publish = false`',
          "Wpis w Cargo.lock z numerem rustc, bez `rust-version` w manifeście",
          "Tabela `[workspace.metadata.ci]`, bo Cargo nie ma pola dla minimalnego Rust",
        ],
        0,
        [
          "Resolver, compiler floor i publish są deklarowane polami Cargo; lockfile zapisuje rozwiązany graf.",
          "Lockfile nie zastępuje `rust-version` ani nie jest tabelą polityki compilerów.",
          "`workspace.metadata` nie jest kontraktem Cargo dla minimalnej wersji Rust.",
        ],
      ),
      choice(
        "cargo-lock-msrv-policy-observe",
        "observe",
        "Obserwacja: update i locked",
        "Poniższy manifest opisuje już właściwy resolver, floor i zależność. W pobranym projekcie możesz osobno wykonać `cargo update` oraz późniejsze `cargo check --workspace --locked`. Która interpretacja jest poprawna?",
        [
          "`cargo update` może jawnie zmienić Cargo.lock, a `--locked` odmawia, gdy sprawdzenie wymagałoby zmiany istniejącego lockfile",
          "`--locked` aktualizuje Cargo.lock, jeśli resolver znajdzie nowsze serde",
          "`cargo update` zmienia tylko Cargo.toml, a Cargo.lock pozostaje nietknięty",
        ],
        0,
        [
          "To rozdziela operację zmiany wyboru od późniejszej kontroli niezmienności lockfile; ten krok nie twierdzi, że komendy wykonano.",
          "`--locked` nie aktualizuje lockfile; kończy się błędem przy wymaganej zmianie.",
          "`cargo update` aktualizuje zależności zapisane w Cargo.lock.",
        ],
        { code: floorObservation },
      ),
      choice(
        "cargo-lock-msrv-policy-explain",
        "explain",
        "TOML 1.0 i floor",
        'Dlaczego kurs pozostawia TOML 1.0 i `rust-version = "1.85.0"`, choć stabilny Cargo 1.94+ akceptuje także TOML 1.1?',
        [
          "TOML 1.0 zachowuje zgodność z compiler floor 1.85; składnia pliku nie podnosi wymaganego narzędzia",
          "TOML 1.1 jest konieczny, aby `--locked` mógł czytać Cargo.lock",
          "`rust-version` określa wersję specyfikacji TOML, więc oba pola są zamienne",
        ],
        0,
        [
          "Deklarowany floor obejmuje używany zapis manifestu; zachowanie TOML 1.0 nie wymusza nowszego Cargo.",
          "`--locked` dotyczy rozwiązania zależności, a nie podnoszenia wersji składni TOML.",
          "`rust-version` opisuje minimalny Rust dla pakietu, nie wersję TOML.",
        ],
      ),
      manifestTask({
        id: "cargo-lock-msrv-policy-gate",
        title: "Przywróć floor workspace",
        prompt:
          'Uzupełnij rootowy `Cargo.toml` Frame Protocol. Zachowaj dokładnie członków `crates/frame-protocol` i `crates/frame-probe`, a także istniejącą deklarację `[workspace.dependencies] serde = { version = "1.0.229", default-features = false }` z pustym zbiorem features. Przywróć `workspace.resolver = "3"`, `workspace.package.rust-version = "1.85.0"` oraz `workspace.package.publish = false`. Nie twórz `[workspace.metadata]` udającego policy CI i nie zmieniaj ręcznie `Cargo.lock`.',
        contract: floorContract,
        solution: completedFrameManifest("Cargo.toml"),
        code: floorStarter(),
        editorFile: "Cargo.toml",
        evidenceKind: "assessment",
      }),
      manifestTask({
        id: "cargo-lock-msrv-policy-blank",
        title: "Odziedzicz floor członka",
        prompt:
          "Utwórz `crates/release-lib/Cargo.toml` dla package `release-lib`. W `[package]` ustaw dokładnie `version.workspace = true`, `edition.workspace = true`, `rust-version.workspace = true`, `description.workspace = true`, `license.workspace = true`, `repository.workspace = true`, `readme.workspace = true` i `publish.workspace = true`; nie zastępuj tych zagnieżdżonych ścieżek wartościami skalarnymi. W `[features]` ustaw `default = []`. W `[dependencies]` dodaj `serde = { workspace = true, optional = true }`. Nie dodawaj lokalnej wersji/rust-version ani sztucznej tabeli polityki.",
        contract: floorBlankContract,
        solution: floorBlankSolution,
        editorFile: "crates/release-lib/Cargo.toml",
        evidenceKind: "transfer",
      }),
      choice(
        "cargo-lock-msrv-policy-recall",
        "recall",
        "Powtórz rozróżnienie",
        'W standalone `stable-floor/Cargo.toml` ma być `rust-version = "1.85.0"`, `publish = false` oraz serde `^1.0.229` z `default-features = false` i bez features. Co należy wyjaśnić obok manifestu?',
        [
          "Że jawne `cargo update` może zmienić lockfile, a późniejsze `--locked` odmawia wymaganej zmiany; nie zapisuje się tego jako fake metadata",
          "Że trzeba ręcznie dopisać nową wersję serde do Cargo.lock przed każdym checkiem",
          "Że `rust-version` gwarantuje wynik builda niezależnie od uruchomionego toolchaina",
        ],
        0,
        [
          "Wyjaśnienie wskazuje procedurę i granicę dowodu; samo TOML nie twierdzi, że Cargo już ją wykonało.",
          "Cargo generuje lockfile; ręczna edycja omija jego mechanizm wyboru.",
          "`rust-version` jest deklaracją wsparcia, a ograniczony dowód wymaga właściwego Cargo i toolchaina.",
        ],
      ),
    ],
    misconceptions: [
      "rust-version jest tylko komentarzem i nie wpływa na deklarację pakietu.",
      "--locked może sam zaktualizować brakujące lub zmienione wersje.",
      "Cargo.lock jest ręcznie utrzymywaną tabelą polityki CI.",
    ],
    transferTask:
      "Zaprojektuj mały workspace z compiler floor 1.85.0. Opisz, które pola dziedziczy członek oraz kiedy świadomie wykonujesz update lockfile, a kiedy wymagasz --locked.",
    evidenceGate:
      "Gate wymaga dwóch członków Frame, resolver 3, floor 1.85.0, publish=false i istniejącego serde 1.0.229 bez defaults; blank wymaga wszystkich wskazanych ścieżek .workspace, a review odtwarza standalone floor.",
    sourceIds: [
      "cargo-manifest-release-reference",
      "cargo-update-release-reference",
      "cargo-rust-version-release-reference",
    ],
  },
  {
    id: "cargo-package-rehearsal",
    moduleId: "cargo-dependency-lifecycle",
    conceptIds: ["cargo-package-rehearsal"],
    competencyIds: ["rehearse-cargo-package-boundary"],
    prerequisites: ["cargo-lock-msrv-policy"],
    title: "Najpierw granica archiwum",
    subtitle:
      "Uzupełnisz metadane paczki i rozdzielisz wzorce include/exclude od obserwacji wygenerowanego archiwum.",
    minutes: 25,
    outcomes: [
      "Rozpoznasz wymagane metadane i publish=false w rootowym workspace.",
      "Dobierzesz include albo exclude bez mieszania dwóch polityk plików.",
      "Zinterpretujesz cargo package --list oraz obecność Cargo.lock, Cargo.toml i Cargo.toml.orig.",
    ],
    steps: [
      choice(
        "cargo-package-rehearsal-predict",
        "predict",
        "Przewidź metadane paczki",
        'Root Frame ma mieć metadane `description`, `license`, `repository`, `readme`, `publish = false`, członków `crates/frame-protocol` i `crates/frame-probe` oraz `resolver = "3"`. Która deklaracja opisuje lokalny rehearsal?',
        [
          "Komplet wymaganych pól w `[workspace.package]`, `publish = false`, bez rootowych `include` i `exclude`",
          "Tylko `[workspace.metadata.package]`, bo package nie czyta pól description ani license",
          "`publish = true` oraz ręcznie wpisana lista plików w Cargo.lock",
        ],
        0,
        [
          "Metadane są polami manifestu, a brak include/exclude zachowuje domyślną politykę; samo publish=false nie publikuje paczki.",
          "`workspace.metadata` jest przestrzenią dla narzędzi, nie zamiennikiem pól package.",
          "Cargo.lock nie jest listą plików archiwum, a publish=false chroni przed publikacją.",
        ],
      ),
      choice(
        "cargo-package-rehearsal-observe",
        "observe",
        "Obserwacja: lista pakietu",
        'Dla standalone `trace-report` z `exclude = ["scratch/**", "notes/**"]` później wybierz `cargo package --list`. Co jest właściwym dowodem?',
        [
          "Output `cargo package --list` jest źródłem prawdy o członkostwie; Cargo może dodać Cargo.lock i wygenerować znormalizowane Cargo.toml obok Cargo.toml.orig",
          "Sama tablica exclude dowodzi, że archiwum już istnieje i nie zawiera plików generowanych",
          "`publish = false` sprawia, że Cargo nie może przygotować lokalnej listy",
        ],
        0,
        [
          "Wzorce są deklaracją, a `--list` obserwuje wynik pakowania; ten krok nie twierdzi, że komendę wykonano.",
          "Cargo może dodać pliki związane z pakowaniem i normalizacją, więc manifest sam nie wystarcza.",
          "publish=false blokuje publikację, lecz rehearsal i listowanie są osobnymi operacjami.",
        ],
        { code: packageObservation, editorFile: "trace-report/Cargo.toml" },
      ),
      choice(
        "cargo-package-rehearsal-explain",
        "explain",
        "Include kontra exclude",
        "Dlaczego `include` w `signal-kit` oraz `exclude` w `archive-note` są dwoma osobnymi wariantami, a nie jedną tabelą polityki?",
        [
          "include wybiera dozwolony zbiór i ma pierwszeństwo przed exclude; wariant bez include może użyć exclude do wycięcia wzorców",
          "exclude zawsze rozszerza include, więc trzeba podać oba pola, aby Cargo je zauważył",
          "Oba pola wskazują Cargo.lock, a nie pliki źródłowe archiwum",
        ],
        0,
        [
          "To rozróżnia jawny allowlist od wykluczeń domyślnego zbioru i pozostawia wynik do sprawdzenia przez `--list`.",
          "Pola są wzajemnie wykluczającymi politykami; include ma pierwszeństwo.",
          "Wzorce dotyczą plików pakietu; Cargo.lock jest osobnym artefaktem pakowania.",
        ],
      ),
      manifestTask({
        id: "cargo-package-rehearsal-gate",
        title: "Przygotuj metadane Frame",
        prompt:
          'Uzupełnij rootowy `Cargo.toml` Frame Protocol dla lokalnego `cargo package -p frame-protocol`. Zachowaj `members = ["crates/frame-protocol", "crates/frame-probe"]` i `resolver = "3"`. W `[workspace.package]` zachowaj niepuste `description`, `license`, `repository` i `readme`, a także `publish = false`; nie dodawaj ani `workspace.package.include`, ani `workspace.package.exclude`. Aplikacja nie wykonała pakowania i nie oczekuje od Ciebie publikacji.',
        contract: packageContract,
        solution: completedFrameManifest("Cargo.toml"),
        code: packageStarter(),
        editorFile: "Cargo.toml",
        evidenceKind: "assessment",
      }),
      manifestTask({
        id: "cargo-package-rehearsal-blank",
        title: "Jawny allowlist biblioteki",
        prompt:
          'Utwórz standalone `signal-kit/Cargo.toml` dla package `signal-kit`: `version = "0.3.0"`, `edition = "2024"`, `rust-version = "1.85.0"`, niepusty `description` (np. `A signal library for package rehearsal.`), `license = "MIT"`, `repository = "https://example.invalid/signal-kit"`, `readme = "README.md"` i `publish = false`. Ustaw `include = ["Cargo.toml", "README.md", "src/**", "tests/**"]`, nie dodawaj `exclude`, oraz ustaw `[lib] path = "src/lib.rs"`. W wyjaśnieniu zaznacz, że `build/generated/signal.rs` nie pasuje do include; później obserwację wykonuje `cargo package --list`, które może pokazać wygenerowane `Cargo.lock`, znormalizowane `Cargo.toml` i `Cargo.toml.orig`.',
        contract: packageBlankContract,
        solution: packageBlankSolution,
        editorFile: "signal-kit/Cargo.toml",
        evidenceKind: "transfer",
      }),
      choice(
        "cargo-package-rehearsal-recall",
        "recall",
        "Powtórz granicę pakowania",
        'Standalone `archive-note/Cargo.toml` ma niepuste metadane, `publish = false`, `[lib] path = "src/lib.rs"`, brak include oraz `exclude = ["fixtures/large.bin", "build/generated/**", "notes/**"]`. Co sprawdzasz po deklaracji?',
        [
          "`cargo package --list`, bo dopiero jego output pokazuje faktyczną listę; deklaracja nie jest twierdzeniem o wykonaniu ani publikacji",
          "Ręcznie tworzony Cargo.toml.orig, bo Cargo nie generuje plików przy package --list",
          "Bezpośrednią publikację, bo publish=false wymaga sprawdzenia na registry",
        ],
        0,
        [
          "`--list` jest lokalną obserwacją zawartości, a Cargo samo obsługuje pliki związane z pakowaniem.",
          "Cargo.toml.orig jest artefaktem generowanym przy pakowaniu; nie należy go ręcznie dopisywać do manifestu.",
          "Ćwiczenie zatrzymuje się na rehearsal i nie uruchamia publikacji.",
        ],
      ),
    ],
    misconceptions: [
      "include i exclude trzeba zawsze deklarować razem.",
      "Tablica include sama dowodzi gotowego archiwum.",
      "publish=false uniemożliwia lokalne sprawdzenie listy plików.",
    ],
    transferTask:
      "Zaprojektuj manifest biblioteki z własną granicą archiwum. Wskaż, co kontroluje include albo exclude, a co musi potwierdzić dopiero output cargo package --list.",
    evidenceGate:
      "Gate wymaga rootowych metadanych, publish=false i braku include/exclude; blank rozróżnia jawny include, lib.path i wykluczenie generated file, a review używa osobnej polityki exclude.",
    sourceIds: [
      "cargo-manifest-release-reference",
      "cargo-package-release-reference",
    ],
  },
];

export const cargoReleaseReviewExercises: Record<string, LessonStep> = {
  "cargo-lock-msrv-policy": {
    id: "cargo-lock-msrv-policy-review",
    kind: "recall",
    title: "Powtórka: standalone compiler floor",
    prompt:
      'Odtwórz standalone `stable-floor/Cargo.toml`: `name = "stable-floor"`, `version = "0.1.0"`, `edition = "2024"`, `rust-version = "1.85.0"`, niepuste `description`, `license = "MIT"`, `publish = false`. W `[dependencies]` dodaj nieopcjonalne registry `serde` z wymaganiem `^1.0.229`, `default-features = false` i pustym zbiorem features. Wyjaśnij, że jawne `cargo update` może zmienić Cargo.lock, a późniejsze `--locked` ma odmówić wymaganej zmiany; nie udawaj tej polityki tabelą metadata.',
    solution: floorReviewSolution,
    editorMode: "toml",
    editorFile: "stable-floor/Cargo.toml",
    evaluator: { kind: "manifest-contract", contract: floorReviewContract },
    evidenceKind: "recall",
  },
  "cargo-package-rehearsal": {
    id: "cargo-package-rehearsal-review",
    kind: "recall",
    title: "Powtórka: exclude archiwum",
    prompt:
      'Odtwórz standalone `archive-note/Cargo.toml`: `name = "archive-note"`, `version = "0.1.0"`, `edition = "2024"`, `rust-version = "1.85.0"`, niepuste `description`, `license = "MIT OR Apache-2.0"`, `repository = "https://example.invalid/archive-note"`, `readme = "README.md"`, `publish = false`, brak `include`, `exclude = ["fixtures/large.bin", "build/generated/**", "notes/**"]` oraz `[lib] path = "src/lib.rs"`. Wyjaśnij, że `cargo package --list` dopiero pokaże faktyczną listę.',
    solution: packageReviewSolution,
    editorMode: "toml",
    editorFile: "archive-note/Cargo.toml",
    evaluator: { kind: "manifest-contract", contract: packageReviewContract },
    evidenceKind: "recall",
  },
};
