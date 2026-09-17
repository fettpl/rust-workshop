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

export const cargoDependencySources: Source[] = [
  {
    id: "cargo-dependencies-reference",
    title: "The Cargo Book: Specifying Dependencies",
    url: "https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładów zakresów zależności, aliasów, workspace = true albo default-features.",
  },
  {
    id: "cargo-features-reference",
    title: "The Cargo Book: Features",
    url: "https://doc.rust-lang.org/cargo/reference/features.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie opisu default, dep:..., forwardingu albo unifikacji features.",
  },
  {
    id: "cargo-resolver-reference",
    title: "The Cargo Book: Dependency Resolution",
    url: "https://doc.rust-lang.org/cargo/reference/resolver.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      'Sprawdzaj po zmianie wyjaśnienia resolvera, unifikacji grafu lub resolver = "3".',
  },
  {
    id: "cargo-workspaces-reference",
    title: "The Cargo Book: Workspaces",
    url: "https://doc.rust-lang.org/cargo/reference/workspaces.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie dziedziczenia workspace.dependencies albo układu członków.",
  },
  {
    id: "cargo-tree-command-reference",
    title: "The Cargo Book: cargo tree",
    url: "https://doc.rust-lang.org/cargo/commands/cargo-tree.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie polecenia cargo tree, filtrów krawędzi albo obserwacji features normal/dev.",
  },
];

export const cargoDependencyCompetencies: Competency[] = [
  {
    id: "declare-cargo-dependencies",
    title:
      "Deklarujesz zależność Cargo w poprawnym zakresie, z aliasem, źródłem, wersją i jawnymi domyślnymi features.",
  },
  {
    id: "explain-cargo-feature-unification",
    title:
      "Wyjaśniasz granicę features pakietu oraz przekazujesz opt-in przez zależności workspace bez bezpośredniej zależności klienta.",
  },
];

export const cargoDependencyConcepts: Concept[] = [
  {
    id: "cargo-dependency-contract",
    title: "Deklaracja zależności i jej zakres",
    prerequisites: ["api-compatible-surface"],
    competencyIds: ["declare-cargo-dependencies"],
    evidenceArtifact: "manifest",
    reviewPrompt:
      "Co rozstrzyga wpis w Cargo.toml, a co dopiero wybór konkretnej paczki w Cargo.lock?",
    reviewAnswer:
      "Cargo.toml deklaruje wymaganie: nazwę lub alias, źródło, zakres wersji, zakres zależności i features. Cargo.lock zapisuje konkretny wybór dla danego grafu; nie zastępuje deklaracji ani nie zmienia jej zakresu.",
    distinguish:
      "Zależność w [dependencies] jest dostępna zwykłemu kodowi, a wpis w [dev-dependencies] służy testom i narzędziom deweloperskim. default-features = false wyłącza domyślny zestaw zależności, a nie wszystkie jawnie wybrane features.",
  },
  {
    id: "cargo-resolver-feature-unification",
    title: "Features jako opt-in i unia grafu",
    prerequisites: ["cargo-dependency-contract"],
    competencyIds: ["explain-cargo-feature-unification"],
    evidenceArtifact: "manifest",
    reviewPrompt:
      "Dlaczego klient powinien przekazać feature biblioteki przez `packet-lib/format`, zamiast deklarować `serde` bezpośrednio?",
    reviewAnswer:
      "Feature należy do pakietu, który go definiuje. Klient włącza publiczną funkcję biblioteki przez `packet-lib/format`, a biblioteka dopiero mapuje ją na opcjonalne `serde` i jego features; bezpośrednie serde w kliencie omija ten kontrakt.",
    distinguish:
      'Features o tej samej nazwie w dwóch pakietach nie są automatycznie tym samym. Gdy kilka ścieżek w grafie aktywuje jedną zależność, Cargo buduje ją z unią aktywnych features: `default-features = false` na jednej krawędzi nie wyłącza defaults włączonych na innej. Przy `resolver = "3"` (edycja 2024) Cargo uwzględnia deklarowany Rust version przy wyborze zależności; to nie zmienia granic features. `default = []` oznacza brak automatycznego opt-in, a `dep:serde` ujawnia zależność przez deklarowany feature.',
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

function starterFrameManifest(path: string): string {
  const completed = completedFrameManifest(path);
  if (path === "Cargo.toml") {
    return completed.replace(/\n\[workspace\.dependencies\][\s\S]*$/, "\n");
  }
  return completed
    .replace(/\nformat\s*=\s*\[[^\n]*\]\n/, "\n")
    .replace(/\n\[dependencies\]\nserde\s*=\s*\{[^}]*\}\n/, "\n");
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
  evidenceKind: "assessment" | "transfer";
  editorFile: string;
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

const workspaceDependencyContract: ManifestContract = {
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

const dependencyBlankContract: ManifestContract = {
  document: "package",
  assertions: [
    { kind: "path-equals", path: ["package", "name"], value: "catalog-tool" },
    { kind: "path-equals", path: ["package", "version"], value: "0.1.0" },
    { kind: "path-equals", path: ["package", "edition"], value: "2024" },
    { kind: "path-equals", path: ["package", "rust-version"], value: "1.85.0" },
    { kind: "path-equals", path: ["package", "publish"], value: false },
    {
      kind: "dependency",
      table: "dependencies",
      dependency: {
        name: "wire_serde",
        package: "serde",
        source: { kind: "registry" },
        version: "1.0.229",
        optional: false,
        defaultFeatures: false,
        features: { values: [], mode: "equals" },
      },
    },
    {
      kind: "dependency",
      table: "dev-dependencies",
      dependency: {
        name: "wire_serde",
        package: "serde",
        source: { kind: "registry" },
        version: "1.0.229",
        defaultFeatures: false,
        features: { values: ["alloc"], mode: "equals" },
      },
    },
  ],
};

const dependencyBlankSolution = String.raw`[package]
name = "catalog-tool"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "A catalog dependency exercise."
license = "MIT"
publish = false

[dependencies]
wire_serde = { package = "serde", version = "1.0.229", default-features = false }

[dev-dependencies]
wire_serde = { package = "serde", version = "1.0.229", default-features = false, features = ["alloc"] }
`;

const dependencyReviewContract: ManifestContract = {
  document: "package",
  assertions: [
    { kind: "path-equals", path: ["package", "name"], value: "telemetry" },
    { kind: "path-equals", path: ["package", "version"], value: "0.2.0" },
    { kind: "path-equals", path: ["package", "edition"], value: "2024" },
    { kind: "path-equals", path: ["package", "rust-version"], value: "1.85.0" },
    { kind: "path-equals", path: ["package", "publish"], value: false },
    {
      kind: "dependency",
      table: "dependencies",
      dependency: {
        name: "serde_wire",
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

const dependencyReviewSolution = String.raw`[package]
name = "telemetry"
version = "0.2.0"
edition = "2024"
rust-version = "1.85.0"
description = "A telemetry dependency exercise."
license = "MIT"
publish = false

[dependencies]
serde_wire = { package = "serde", version = "^1.0.229", default-features = false }
`;

const featureContract: ManifestContract = {
  document: "package",
  assertions: [
    { kind: "path-equals", path: ["package", "name"], value: "frame-protocol" },
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
      path: ["package", "authors", "workspace"],
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
    { kind: "path-equals", path: ["lints", "workspace"], value: true },
    {
      kind: "path-equals",
      path: ["features", "default"],
      value: [],
      arrayMode: "set",
    },
    {
      kind: "path-equals",
      path: ["features", "diagnostics"],
      value: [],
      arrayMode: "set",
    },
    {
      kind: "feature-forwarding",
      package: "frame-protocol",
      feature: "format",
      enables: {
        values: ["dep:serde", "serde/alloc", "serde/derive"],
        mode: "equals",
      },
    },
    {
      kind: "dependency",
      table: "dependencies",
      dependency: {
        name: "serde",
        package: "serde",
        source: { kind: "workspace" },
        optional: true,
      },
    },
  ],
};

const featureBlankContract: ManifestContract = {
  document: "package",
  assertions: [
    { kind: "path-equals", path: ["package", "name"], value: "packet-cli" },
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
      kind: "feature-forwarding",
      package: "packet-cli",
      feature: "diagnostics",
      enables: { values: ["packet-lib/diagnostics"], mode: "equals" },
    },
    {
      kind: "feature-forwarding",
      package: "packet-cli",
      feature: "format",
      enables: { values: ["packet-lib/format"], mode: "equals" },
    },
    {
      kind: "dependency",
      table: "dependencies",
      dependency: {
        name: "packet-lib",
        source: { kind: "path", path: "../packet-lib" },
      },
    },
    {
      kind: "dependency-package-absent",
      table: "dependencies",
      package: "serde",
    },
  ],
};

const featureBlankSolution = String.raw`[package]
name = "packet-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
publish.workspace = true

[features]
default = []
diagnostics = ["packet-lib/diagnostics"]
format = ["packet-lib/format"]

[dependencies]
packet-lib = { path = "../packet-lib" }
`;

const featureReviewContract: ManifestContract = {
  document: "package",
  assertions: [
    { kind: "path-equals", path: ["package", "name"], value: "telemetry-cli" },
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
      kind: "feature-forwarding",
      package: "telemetry-cli",
      feature: "json",
      enables: { values: ["telemetry_core/json"], mode: "equals" },
    },
    {
      kind: "feature-forwarding",
      package: "telemetry-cli",
      feature: "diagnostics",
      enables: { values: ["telemetry_core/diagnostics"], mode: "equals" },
    },
    {
      kind: "dependency",
      table: "dependencies",
      dependency: {
        name: "telemetry_core",
        package: "telemetry-lib",
        source: { kind: "path", path: "../telemetry-lib" },
      },
    },
    {
      kind: "dependency-package-absent",
      table: "dependencies",
      package: "serde",
    },
  ],
};

const featureReviewSolution = String.raw`[package]
name = "telemetry-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
publish.workspace = true

[features]
default = []
json = ["telemetry_core/json"]
diagnostics = ["telemetry_core/diagnostics"]

[dependencies]
telemetry_core = { package = "telemetry-lib", path = "../telemetry-lib" }
`;

const dependencyObservation = String.raw`[workspace]
members = ["crates/frame-protocol", "crates/frame-probe"]
resolver = "3"

[workspace.package]
rust-version = "1.85.0"
publish = false

[workspace.dependencies]
serde = { version = "1.0.229", default-features = false }
`;

const featureObservation = String.raw`[workspace]
resolver = "3"

[package]
name = "feature-observation"
version = "0.1.0"
edition = "2024"

[dependencies]
serde = { version = "1.0.229", default-features = false, features = ["alloc"] }

[dev-dependencies]
serde = { version = "1.0.229", features = ["derive"] }
`;

export const cargoDependencyLessons: Lesson[] = [
  {
    id: "cargo-dependency-contract",
    moduleId: "cargo-dependency-lifecycle",
    conceptIds: ["cargo-dependency-contract"],
    competencyIds: ["declare-cargo-dependencies"],
    prerequisites: ["api-compatible-surface"],
    title: "Zależność zaczyna się od deklaracji",
    subtitle:
      "Rozdzielisz zakres normalny i deweloperski, nazwiesz źródło oraz odróżnisz wymaganie od wyboru lockfile.",
    minutes: 25,
    outcomes: [
      "Rozpoznasz tabelę workspace.dependencies i wyłączysz default features zależności.",
      "Odróżnisz alias paczki od nazwy pakietu oraz [dependencies] od [dev-dependencies].",
      "Zinterpretujesz lokalne sprawdzenie Cargo jako obserwację grafu, a kontrakt manifestu jako sprawdzenie deklaracji.",
    ],
    steps: [
      choice(
        "cargo-dependency-contract-predict",
        "predict",
        "Przewidź rolę Cargo.toml",
        "Frame ma używać registry package `serde` w wersji `1.0.229` bez domyślnych features. Co powinien wyrazić wpis w `[workspace.dependencies]`, zanim Cargo wybierze konkretny lockfile?",
        [
          '`serde = { version = "1.0.229", default-features = false }` jako wymaganie workspace',
          'Tylko `serde = "1.0.229"`, bo default features nie należą do deklaracji',
          "Ręcznie wpisana wersja z Cargo.lock, bez tabeli workspace",
        ],
        0,
        [
          "To deklaruje wersję i granicę domyślnych features w workspace; wybór konkretnej paczki następuje później.",
          "`default-features = false` jest częścią deklaracji zależności.",
          "Cargo.lock jest wynikiem rozwiązywania grafu, a nie zamiennikiem Cargo.toml.",
        ],
      ),
      choice(
        "cargo-dependency-contract-observe",
        "observe",
        "Obserwacja: wymaganie i graf",
        "Poniżej widzisz deklarację. W pobranym projekcie uruchom `cargo metadata --no-deps --offline --format-version 1`, aby zobaczyć deklaracje bez pobierania. Późniejsze `cargo check --workspace --locked` sprawdza już rzeczywisty wybór z lockfile. Co jest poprawną interpretacją tej kolejności?",
        [
          "metadata opisuje deklaracje bez rozwiązywania źródeł, a check z `--locked` wymaga zgodnego istniejącego wyboru",
          "metadata dowodzi, że serde skompilował się z alloc i derive",
          "`--locked` zmienia Cargo.toml, jeśli wersja 1.0.229 nie pasuje",
        ],
        0,
        [
          "To rozdziela lokalną obserwację deklaracji od późniejszej, rzeczywistej weryfikacji Cargo.",
          "Samo metadata z `--no-deps` nie jest dowodem kompilacji ani aktywnych features.",
          "`--locked` odmawia wymaganej zmiany lockfile; nie edytuje manifestu.",
        ],
        { code: dependencyObservation },
      ),
      choice(
        "cargo-dependency-contract-explain",
        "explain",
        "Alias i zakres",
        "W standalone package alias `wire_serde` wskazuje package `serde`: zwykły kod ma dostać nieopcjonalną zależność (`optional = false`), wersję `1.0.229` bez defaults, a testy mają osobno dostać `alloc`. Dlaczego druga deklaracja należy do `[dev-dependencies]` i może użyć tego samego aliasu?",
        [
          "Bo zakres testowy jest osobną deklaracją, a alias tabeli jest lokalną nazwą zależności",
          "Bo `[dev-dependencies]` zawsze dziedziczy wszystkie features normalnej zależności",
          "Bo alias jest nazwą pakietu na registry i nie może pojawić się w kodzie",
        ],
        0,
        [
          '`package = "serde"` rozwiązuje nazwę canonical package, a klucz `wire_serde` pozostaje nazwą lokalną; zakresy są niezależne.',
          "Features obu deklaracji nie są automatycznie kopiowane; każda ma własny zestaw.",
          "Alias jest nazwą używaną w kodzie i deklaracji, nie nazwą registry package.",
        ],
      ),
      manifestTask({
        id: "cargo-dependency-contract-gate",
        title: "Uzupełnij zależność workspace",
        prompt:
          'Uzupełnij `Cargo.toml` korzenia Frame Protocol. Zachowaj dokładnie członków `crates/frame-protocol` i `crates/frame-probe`, `resolver = "3"`, `workspace.package.rust-version = "1.85.0"` oraz `workspace.package.publish = false`. Dodaj w `[workspace.dependencies]` registry package `serde` z wymaganiem `1.0.229`, `default-features = false` i pustym zbiorem jawnych features. Kontrakt sprawdza deklarację; późniejsze lokalne Cargo sprawdzi dostępność i wybór wersji.',
        contract: workspaceDependencyContract,
        code: starterFrameManifest("Cargo.toml"),
        solution: completedFrameManifest("Cargo.toml"),
        evidenceKind: "assessment",
        editorFile: "Cargo.toml",
      }),
      manifestTask({
        id: "cargo-dependency-contract-blank",
        title: "Od pustej kartki: dwa zakresy aliasu",
        prompt:
          'Utwórz standalone package `catalog-tool` w `Cargo.toml`: `name = "catalog-tool"`, `version = "0.1.0"`, `edition = "2024"`, `rust-version = "1.85.0"` i `publish = false`. W `[dependencies]` alias `wire_serde` ma wskazywać registry package `serde` jako nieopcjonalną zależność (`optional = false`), w wersji `1.0.229`, z `default-features = false` i pustymi features. W `[dev-dependencies]` użyj tego samego aliasu, package, wersji i wyłączonych defaults, lecz jawnie wybierz wyłącznie feature `alloc`. Nie dodawaj path/git source i nie edytuj lockfile.',
        contract: dependencyBlankContract,
        solution: dependencyBlankSolution,
        evidenceKind: "transfer",
        editorFile: "catalog-tool/Cargo.toml",
      }),
      choice(
        "cargo-dependency-contract-recall",
        "recall",
        "Odtwórz granicę lockfile",
        "Standalone `telemetry` ma alias `serde_wire` do registry package `serde`, wymaganie `^1.0.229`, `default-features = false` i puste features. Które zdanie o `Cargo.toml` oraz `Cargo.lock` jest precyzyjne?",
        [
          "Cargo.toml określa wymaganie, a Cargo.lock zapisuje konkretny wybór dla grafu",
          "Cargo.lock ustala `default-features = false`, nawet jeśli manifest ich nie wyłącza",
          "Alias `serde_wire` musi mieć tę samą nazwę co package w lockfile",
        ],
        0,
        [
          "Wymaganie i rozwiązany wybór są dwiema warstwami; lockfile nie zastępuje deklaracji.",
          "Granica defaults należy do deklaracji zależności, nie jest dopowiadana przez lockfile.",
          "Alias może różnić się od canonical package name; lockfile przechowuje package `serde`.",
        ],
      ),
    ],
    misconceptions: [
      "Cargo.lock zastępuje deklarację zakresu i features w Cargo.toml.",
      "Alias zależności zmienia nazwę package na registry.",
      "Zależność testowa jest automatycznie dostępna zwykłemu kodowi.",
    ],
    transferTask:
      "Zaprojektuj manifest narzędzia, które używa aliasu registry package w kodzie normalnym i w testach z odrębnym zestawem features. Wskaż, które dane opisuje Cargo.toml, a które potwierdzi dopiero Cargo z lockfile.",
    evidenceGate:
      "Gate wymaga rootowego workspace, wersji `1.0.229`, wyłączonych defaults i pustych features. Niezależny blank sprawdza ten sam alias w normalnym i deweloperskim zakresie, a powtórka używa standalone aliasu `serde_wire` i `^1.0.229`.",
    sourceIds: [
      "cargo-dependencies-reference",
      "cargo-workspaces-reference",
      "cargo-resolver-reference",
    ],
  },
  {
    id: "cargo-resolver-feature-unification",
    moduleId: "cargo-dependency-lifecycle",
    conceptIds: ["cargo-resolver-feature-unification"],
    competencyIds: ["explain-cargo-feature-unification"],
    prerequisites: ["cargo-dependency-contract"],
    title: "Feature jest opt-inem pakietu",
    subtitle:
      "Zbudujesz jawne mapowanie opcjonalnej biblioteki i zobaczysz, jak resolver składa aktywne features w unii grafu.",
    minutes: 28,
    outcomes: [
      "Zdefiniujesz pusty default i osobny feature format z dep:serde, serde/alloc oraz serde/derive.",
      "Rozdzielisz feature biblioteki od features klienta i przekażesz je przez zależność path.",
      "Wyjaśnisz, że parser kontraktu sprawdza deklarację lokalnie, a Cargo dopiero sprawdza rzeczywisty graf.",
    ],
    steps: [
      choice(
        "cargo-resolver-feature-unification-predict",
        "predict",
        "Przewidź domyślny graf",
        "Biblioteka ma opcjonalne `serde`, lecz zwykły build ma pozostać std-only. Co musi wyrażać `[features] default`?",
        [
          "`default = []`, aby serde nie włączało się bez jawnego opt-in",
          '`default = ["format"]`, bo każdy feature musi być domyślny',
          "Brak tabeli `[features]`, bo optional dependency sama tworzy bezpieczny default",
        ],
        0,
        [
          "Pusty default nie aktywuje optional dependency; `format` można włączyć jawnie.",
          "Wygodny feature nie musi być domyślny i tutaj naruszyłby granicę std-only.",
          "Brak tabeli nie definiuje wymaganej pustej listy ani mapowania format.",
        ],
      ),
      choice(
        "cargo-resolver-feature-unification-observe",
        "observe",
        "Obserwacja: unia features",
        "Ten osobny przykład pokazuje alias `serde` w dwóch zakresach: normalny ma `default-features = false` i `alloc`, a deweloperski zachowuje defaults i dodaje `derive`. Poza workspace Frame Protocol wykonaj `cargo new --lib feature-observation` i zastąp jego Cargo.toml pokazanym manifestem; zachowaj wygenerowany `src/lib.rs`. Z katalogu nadrzędnego uruchom `cargo generate-lockfile --manifest-path feature-observation/Cargo.toml`, a potem `cargo fetch --manifest-path feature-observation/Cargo.toml --locked` (te dwa kroki mogą wymagać sieci). Teraz porównaj `cargo metadata --manifest-path feature-observation/Cargo.toml --no-deps --offline --format-version 1`, `cargo tree --manifest-path feature-observation/Cargo.toml -e features,no-dev --offline --locked` oraz `cargo tree --manifest-path feature-observation/Cargo.toml -e features --offline --locked`. Drzewo bez dev pokazuje tylko `serde` z `alloc`; drzewo z dev dodaje `default`, `std` i `derive`. Resolver 3 domyślnie preferuje wersje zależności zgodne z zadeklarowanym `rust-version`; to nie zastępuje kompilacji na minimalnym toolchainie. Która interpretacja jest poprawna?",
        [
          "Cargo scala aktywne features package serde w unię: defaults i derive z krawędzi dev dołączają przy grafie dev, mimo false na krawędzi normalnej; `-e features,no-dev` pokazuje tylko normalny graf",
          "`default-features = false` w dependencies wyłącza także defaults z dev-dependencies, a metadata dowodzi kompilacji derive",
          "`format` biblioteki automatycznie włącza feature o tej samej nazwie w każdym kliencie i nie wymaga drzewa features",
        ],
        0,
        [
          "Features są unią na wspólnej zależności; `default-features = false` jest lokalne dla jednej krawędzi. `cargo tree -e features,no-dev` odrzuca krawędzie dev, a `cargo tree -e features` pokazuje ich wkład; resolver 3 nie kopiuje dev features do zwykłego builda.",
          "False na jednej krawędzi nie odbiera defaults włączonych przez drugą, a metadata z `--no-deps` nie kompiluje derive.",
          "Feature biblioteki i feature klienta należą do różnych pakietów; klient musi jawnie przekazać forward.",
        ],
        {
          code: featureObservation,
          editorFile: "feature-observation/Cargo.toml",
        },
      ),
      choice(
        "cargo-resolver-feature-unification-explain",
        "explain",
        "Pakiet, alias i forward",
        'Klient ma feature `format = ["packet-lib/format"]`, a review używa aliasu `telemetry_core` i wpisu `json = ["telemetry_core/json"]`. Co jest wspólną zasadą?',
        [
          "Forward wskazuje feature zależności przez nazwę deklaracji, a direct serde w kliencie obchodzi API biblioteki",
          "Każdy feature `format` w grafie jest automatycznie połączony niezależnie od pakietu",
          "Alias `telemetry_core` oznacza feature package `telemetry-lib`, więc nie trzeba path dependency",
        ],
        0,
        [
          "Nazwa po lewej jest feature klienta, a nazwa po prawej wskazuje feature lokalnej zależności; alias musi istnieć w dependencies.",
          "Features są przestrzenią pakietu; resolver unifikuje aktywację zależności, nie nazwy feature między pakietami.",
          "Alias zmienia nazwę używaną lokalnie; nadal potrzebna jest deklaracja path do package `telemetry-lib`.",
        ],
      ),
      manifestTask({
        id: "cargo-resolver-feature-unification-gate",
        title: "Dodaj opt-in format biblioteki",
        prompt:
          "Uzupełnij `crates/frame-protocol/Cargo.toml` dla package `frame-protocol`. Zachowaj odziedziczone `version.workspace = true`, `edition.workspace = true`, `rust-version.workspace = true`, `authors.workspace = true`, `description.workspace = true`, `license.workspace = true`, `repository.workspace = true`, `readme.workspace = true` i `publish.workspace = true`; zachowaj też `[lints] workspace = true`. W `[features]` pozostaw `default = []` oraz `diagnostics = []`; dodaj `format` z dokładnym zbiorem `dep:serde`, `serde/alloc` i `serde/derive`. W `[dependencies]` dodaj `serde = { workspace = true, optional = true }`. Nie wpisuj registry/path, nie pomijaj `optional`, `alloc` ani `derive`.",
        contract: featureContract,
        code: starterFrameManifest("crates/frame-protocol/Cargo.toml"),
        solution: completedFrameManifest("crates/frame-protocol/Cargo.toml"),
        evidenceKind: "assessment",
        editorFile: "crates/frame-protocol/Cargo.toml",
      }),
      manifestTask({
        id: "cargo-resolver-feature-unification-blank",
        title: "Od pustej kartki: forward klienta",
        prompt:
          'Utwórz `crates/packet-cli/Cargo.toml` dla package `packet-cli`. W `[package]` ustaw `version.workspace = true`, `edition.workspace = true`, `rust-version.workspace = true` i `publish.workspace = true`. W `[features]` ustaw `default = []`, a następnie przekaż dokładnie dwa features lokalnej zależności: `diagnostics = ["packet-lib/diagnostics"]` i `format = ["packet-lib/format"]`. W `[dependencies]` dodaj wyłącznie `packet-lib = { path = "../packet-lib" }`. Nie dodawaj serde bezpośrednio, nie używaj składni `?/` i nie dopisuj innych forwardów.',
        contract: featureBlankContract,
        solution: featureBlankSolution,
        evidenceKind: "transfer",
        editorFile: "crates/packet-cli/Cargo.toml",
      }),
      choice(
        "cargo-resolver-feature-unification-recall",
        "recall",
        "Odtwórz unifikację",
        "Klient przekazuje `json` i `diagnostics` przez alias `telemetry_core` do package `telemetry-lib`. Co należy sprawdzić w deklaracji, zanim uruchomisz Cargo?",
        [
          "Czy każdy wpis wskazuje właściwy alias i feature tej zależności, a `default = []` pozostaje pusty",
          'Czy klient ma bezpośrednie `serde = "1.0.229"`, bo forward nie może wskazywać path dependency',
          "Czy nazwy features obu pakietów są identyczne bez prefiksu aliasu",
        ],
        0,
        [
          "Kontrakt deklaracji sprawdza alias, target feature i pusty default; Cargo później sprawdza graf.",
          "Bezpośrednie serde w kliencie łamie granicę, którą ćwiczenie ma zachować.",
          "Forward wymaga prefiksu aliasu, bo features należą do konkretnej zależności.",
        ],
      ),
    ],
    misconceptions: [
      "Feature o tej samej nazwie jest automatycznie wspólny dla wszystkich pakietów.",
      "Optional dependency jest włączona w default, nawet gdy default jest pusty.",
      "Klient powinien dodać serde bezpośrednio, aby włączyć feature biblioteki.",
    ],
    transferTask:
      "Zaprojektuj publiczny feature klienta, który przekazuje dwa opt-iny biblioteki przez alias path dependency. Opisz, które features pozostają wyłączone domyślnie i które mapowanie dopiero Cargo potwierdzi w grafie.",
    evidenceGate:
      "Gate wymaga odziedziczonego serde, optional oraz dokładnego format z dep:serde, serde/alloc i serde/derive. Niezależny blank przekazuje diagnostics i format przez path dependency bez direct serde, a powtórka używa aliasu telemetry_core oraz json/diagnostics.",
    sourceIds: [
      "cargo-features-reference",
      "cargo-resolver-reference",
      "cargo-dependencies-reference",
      "cargo-tree-command-reference",
    ],
  },
];

export const cargoDependencyReviewExercises: Record<string, LessonStep> = {
  "cargo-dependency-contract": {
    id: "cargo-dependency-contract-review",
    kind: "recall",
    title: "Powtórka: standalone alias registry",
    prompt:
      'Odtwórz standalone `telemetry/Cargo.toml`: `name = "telemetry"`, `version = "0.2.0"`, `edition = "2024"`, `rust-version = "1.85.0"`, `publish = false`; w `[dependencies]` alias `serde_wire` ma wskazywać nieopcjonalny registry package `serde` (`optional = false`), wymagać `^1.0.229`, mieć `default-features = false` i puste features. Rozróżnij wymaganie Cargo.toml od konkretnego wyboru Cargo.lock.',
    solution: dependencyReviewSolution,
    editorMode: "toml",
    editorFile: "telemetry/Cargo.toml",
    evaluator: {
      kind: "manifest-contract",
      contract: dependencyReviewContract,
    },
    evidenceKind: "recall",
  },
  "cargo-resolver-feature-unification": {
    id: "cargo-resolver-feature-unification-review",
    kind: "recall",
    title: "Powtórka: forward przez alias",
    prompt:
      "Odtwórz `crates/telemetry-cli/Cargo.toml` dla `telemetry-cli`: odziedzicz `version`, `edition`, `rust-version` i `publish` przez `.workspace = true`; ustaw `default = []`; przekaż `json` i `diagnostics` przez alias `telemetry_core` jako `telemetry_core/json` i `telemetry_core/diagnostics`; dodaj path dependency do package `telemetry-lib` pod ścieżką `../telemetry-lib`. Nie używaj `?/` i nie dodawaj direct serde.",
    solution: featureReviewSolution,
    editorMode: "toml",
    editorFile: "crates/telemetry-cli/Cargo.toml",
    evaluator: { kind: "manifest-contract", contract: featureReviewContract },
    evidenceKind: "recall",
  },
};
