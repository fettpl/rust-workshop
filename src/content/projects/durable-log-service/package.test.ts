import { describe, expect, it } from "vitest";
import {
  projectFiles,
  validateProjectPackage,
} from "../../../domain/project-package";
import {
  durableLogServicePackage,
  durableLogServiceWorkspacePaths,
} from "./archive";

describe("Paczka trwałego dziennika zdarzeń", () => {
  it("publikuje dokładnie opisany workspace z trzema członkami", () => {
    expect(validateProjectPackage(durableLogServicePackage)).toEqual([]);
    expect(durableLogServicePackage.workspaceMembers).toEqual([
      "crates/ingest-core",
      "crates/ingest-store",
      "crates/ingest-service",
    ]);
    expect(
      Object.keys(projectFiles(durableLogServicePackage, "solution")).sort(),
    ).toEqual([...durableLogServiceWorkspacePaths].sort());
    expect(durableLogServiceWorkspacePaths).toHaveLength(37);
  });

  it("preserves the bounded K problem while adding a local change-review worksheet", () => {
    const readmes = {
      starter: projectFiles(durableLogServicePackage, "starter")["README.md"],
      solution: projectFiles(durableLogServicePackage, "solution")["README.md"],
    };
    for (const [variant, documentation] of Object.entries(readmes)) {
      for (const marker of [
        "K=1",
        "K=2",
        "idempot",
        "konflikt",
        "restart",
        "wiersz",
        "potwierdzenia sukcesu",
      ]) {
        expect(documentation, variant + " README").toContain(marker);
      }
      expect(documentation, variant + " README").toMatch(
        /Istniejące żądania klienta pozostają zgodne poza\s+opisanym odrzuceniem z powodu\s+pełnego limitu\./,
      );
      expect(documentation, variant + " README").toMatch(/strumień|strumieni/);
      expect(documentation, variant + " README").toMatch(
        /identyczna\s+próba\s+nadal\s+jest\s+sukcesem/i,
      );
      expect(documentation, variant + " README").toMatch(
        /konflikt\s+pozostaje\s+konfliktem/i,
      );
      expect(documentation, variant + " README").toMatch(
        /restart\s+zachowuje\s+rozliczenie\s+pojemności/i,
      );
      expect(documentation, variant + " README").toMatch(
        /jednoprocesowa\s+może\s+opisać\s+i\s+zademonstrować\s+swoją\s+granicę/i,
      );
      expect(documentation, variant + " README").toMatch(/magazyn|storage/i);
      expect(documentation, variant + " README").toMatch(
        /transakcj|granica.*przyję|admission/i,
      );
      expect(documentation, variant + " README").toMatch(
        /awari|błąd.*zapisu|storage failure/i,
      );
      expect(documentation, variant + " README").toMatch(
        /współbież|concurr|jednoproces/i,
      );
    }
    expect(durableLogServicePackage.workspaceMembers).toEqual([
      "crates/ingest-core",
      "crates/ingest-store",
      "crates/ingest-service",
    ]);
    expect(durableLogServiceWorkspacePaths).toHaveLength(37);
    expect(durableLogServicePackage.revealStepRefs).toHaveLength(12);
    expect(durableLogServicePackage.starterRevealStepRefs).toEqual([]);
  });

  it("packages an unfilled learner worksheet and discloses the solution boundary", () => {
    const starter = projectFiles(durableLogServicePackage, "starter");
    const solution = projectFiles(durableLogServicePackage, "solution");
    for (const files of [starter, solution]) {
      const worksheet = files["CHANGE-REVIEW.md"];
      expect(worksheet).toBeDefined();
      for (const requirement of [
        "Identyfikacja własnego źródła",
        "Dwa projekty rozwiązania",
        "Rzeczywista próba przed poprawką",
        "nie zaobserwowano",
        "K=2 → K=1 → K=3",
        "Wcześniejsza ekspozycja",
        "Samoocena",
        "Przegląd innej osoby",
        "kod wyjścia",
        "globalny",
        "klient–serwis",
      ])
        expect(worksheet).toContain(requirement);
      expect(files["README.md"]).toContain("CHANGE-REVIEW.md");
    }
    const starterMaterial = [
      starter["README.md"],
      starter["CHANGE-REVIEW.md"],
      starter["crates/ingest-store/tests/stream_capacity.rs"],
    ].join("\n");
    expect(starterMaterial).not.toContain("open_with_stream_limit");
    expect(starterMaterial).not.toContain("SELECT COUNT");
    expect(solution["README.md"]).toContain("Store::open_with_stream_limit");
    expect(solution["CHANGE-REVIEW.md"]).toContain(
      "Store::open(path, max_events)",
    );
    expect(solution["CHANGE-REVIEW.md"]).toContain("NonZeroUsize");
    expect(solution["README.md"]).toContain("Event.source");
    expect(solution["README.md"]).toContain("domyślny serwis");
  });

  it("wiąże ekspozycję z ujawnionymi bramkami i zostawia blank/review niezależne", () => {
    const starterFiles = projectFiles(durableLogServicePackage, "starter");
    expect(Object.keys(starterFiles)).toHaveLength(37);
    expect(
      Object.keys(starterFiles).filter((path) => path.endsWith(".md")),
    ).toHaveLength(10);
    for (const [path, content] of Object.entries(starterFiles)) {
      expect(content.length, `starter file is empty: ${path}`).toBeGreaterThan(
        0,
      );
    }
    const primaryStepIds = [
      "capstone-domain-validate",
      "capstone-domain-errors",
      "capstone-commit-replay",
      "capstone-commit-atomicity",
      "capstone-lifecycle-admit",
      "capstone-lifecycle-settle",
      "capstone-protocol-decode",
      "capstone-protocol-migrate",
      "capstone-incident-correlate",
      "capstone-incident-decide",
      "capstone-release-bind",
      "capstone-release-decide",
    ];
    expect(
      durableLogServicePackage.revealStepRefs.map((ref) => ref.stepId),
    ).toEqual(primaryStepIds);
    expect(
      durableLogServicePackage.starterRevealStepRefs?.map((ref) => ref.stepId),
    ).toEqual([]);
    const directAnswerMarkers: Record<string, string[]> = {
      "capstone-domain-validate": ["1–4 bajty"],
      "capstone-domain-errors": ["kod błędu bez treści"],
      "capstone-commit-replay": ["samego klucza i tej samej treści"],
      "capstone-commit-atomicity": ["receipt w transakcji"],
      "capstone-lifecycle-admit": ["QUEUE_FULL"],
      "capstone-lifecycle-settle": ["drain_overdue", "worker został dołączony"],
      "capstone-protocol-decode": ["Wersja 1 ma postać"],
      "capstone-protocol-migrate": ["marker 2"],
      "capstone-incident-correlate": ["attempt, committed oraz delivered"],
      "capstone-incident-decide": ["Unknown do czasu sprawdzenia receipt"],
      "capstone-release-bind": ["zgodnym digest", "najwyżej 7 dni"],
      "capstone-release-decide": ["known supply chain", "znanego supply chain"],
    };
    expect(Object.keys(directAnswerMarkers)).toHaveLength(12);
    for (const [stepId, markers] of Object.entries(directAnswerMarkers)) {
      for (const [path, content] of Object.entries(starterFiles)) {
        for (const marker of markers) {
          expect(
            content,
            `${stepId} disclosed by starter ${path}`,
          ).not.toContain(marker);
        }
      }
    }
    const exposed = new Set(
      durableLogServicePackage.revealStepRefs.map((ref) => ref.stepId),
    );
    expect(exposed).not.toContain("capstone-domain-blank");
    expect(exposed).not.toContain("review-capstone-domain");
    expect(exposed).not.toContain("capstone-commit-blank");
    expect(exposed).not.toContain("review-capstone-commit");
  });

  it("zachowuje kontrakt manifestów i publicznego API core", () => {
    const solution = projectFiles(durableLogServicePackage, "solution");
    const root = solution["Cargo.toml"];
    const coreManifest = solution["crates/ingest-core/Cargo.toml"];
    const storeManifest = solution["crates/ingest-store/Cargo.toml"];
    const serviceManifest = solution["crates/ingest-service/Cargo.toml"];
    const core = solution["crates/ingest-core/src/lib.rs"];
    const domain = solution["crates/ingest-core/src/domain.rs"];
    const protocol = solution["crates/ingest-core/src/protocol.rs"];
    const publicApi = solution["crates/ingest-core/tests/public_api.rs"];
    const properties =
      solution["crates/ingest-core/tests/protocol_properties.rs"];
    const store = solution["crates/ingest-store/src/store.rs"];
    const transactions = solution["crates/ingest-store/tests/transactions.rs"];
    const migrations = solution["crates/ingest-store/tests/migrations.rs"];

    expect(solution["RELEASE.md"]).toContain("Ograniczenie wydania");
    expect(solution["RELEASE.md"]).not.toContain("Release limitation");
    expect(root).toContain('resolver = "3"');
    expect(root).toContain(
      'members = ["crates/ingest-core", "crates/ingest-store", "crates/ingest-service"]',
    );
    expect(root).toContain('rust-version = "1.85.0"');
    expect(coreManifest).toContain('name = "ingest-core"');
    expect(coreManifest).toContain("publish = false");
    expect(coreManifest).toContain('unsafe_code = "forbid"');
    expect(coreManifest).not.toContain("[dependencies]");
    expect(storeManifest).toContain(
      'rusqlite = { version = "=0.40.2", default-features = false, features = ["bundled"] }',
    );
    expect(serviceManifest).toContain(
      'tokio = { version = "=1.53.1", default-features = false, features = ["macros", "rt", "sync", "time", "net", "io-util", "io-std"] }',
    );
    expect(serviceManifest).toContain(
      'features = ["macros", "rt", "sync", "time", "net", "io-util", "io-std", "test-util"]',
    );
    expect(serviceManifest).toContain('unsafe_code = "forbid"');
    expect(core).toContain(
      "pub use domain::{Disposition, Event, Level, Receipt, ValidationError};",
    );
    expect(domain).toContain("pub fn new(");
    expect(domain).toContain("key: String");
    expect(domain).toContain("pub fn with_correlation(");
    expect(protocol).toContain(
      "pub fn decode_frame(bytes: &[u8]) -> Result<Event, ProtocolError>",
    );
    expect(protocol).toContain(
      "pub fn encode_v1(event: &Event) -> Result<Vec<u8>, ProtocolError>",
    );
    expect(protocol).toContain("pub fn encode_v2(event: &Event) -> Vec<u8>");
    expect(publicApi).toContain("multibyte_message_is_limited_by_utf8_bytes");
    expect(publicApi).toContain("correlation_sentinel_is_rejected");
    expect(publicApi).toContain(
      "frame_limit_is_measured_before_terminal_newline",
    );
    expect(properties).toContain("decode_v2_round_trips_bounded_values");
    expect(properties).toContain("bounded_utf8_messages_are_exhaustive_inputs");
    expect(store).toContain("pub fn open");
    expect(store).toContain("transaction_with_behavior");
    expect(store).toContain("TransactionBehavior::Immediate");
    expect(store).toContain("busy_timeout");
    expect(store).toContain("cfg(test)");
    expect(transactions).toContain("lock_contention_is_reported_as_busy");
    expect(transactions).toContain(
      "both_correlation_values_participate_in_conflict_checking",
    );
    expect(migrations).toContain(
      "incompatible_v1_migration_rolls_back_marker_and_rows",
    );
  });

  it("starter pokazuje jawny punkt rozpoczęcia pracy", () => {
    const starter = projectFiles(durableLogServicePackage, "starter");
    expect(starter["crates/ingest-core/src/domain.rs"]).toContain("todo!");
    expect(starter["crates/ingest-core/src/protocol.rs"]).toContain("todo!");
    expect(starter["crates/ingest-store/src/store.rs"]).toContain("todo!");
    expect(starter["crates/ingest-store/tests/transactions.rs"]).toContain(
      "#[ignore",
    );
    expect(starter["crates/ingest-store/tests/migrations.rs"]).toContain(
      "#[ignore",
    );
    expect(starter["README.md"]).toContain("po polsku");
  });

  it("nie udaje zaliczonych kontraktów dla późniejszych zadań", () => {
    const solution = projectFiles(durableLogServicePackage, "solution");
    for (const path of [
      "crates/ingest-service/tests/lifecycle.rs",
      "crates/ingest-service/tests/loopback.rs",
      "crates/ingest-service/tests/restart.rs",
      "crates/ingest-service/tests/process.rs",
    ]) {
      expect(solution[path]).not.toContain("assert!(true)");
      expect(solution[path]).not.toContain("#[ignore");
    }
    for (const path of [
      "crates/ingest-store/tests/transactions.rs",
      "crates/ingest-store/tests/migrations.rs",
    ]) {
      expect(solution[path]).not.toContain("#[ignore");
    }
  });

  it("publikuje nadzorowany kontrakt serwisu i klienta", () => {
    const solution = projectFiles(durableLogServicePackage, "solution");
    const config = solution["crates/ingest-service/src/config.rs"];
    const server = solution["crates/ingest-service/src/server.rs"];
    const worker = solution["crates/ingest-service/src/worker.rs"];
    const main = solution["crates/ingest-service/src/main.rs"];
    const client = solution["crates/ingest-service/src/bin/ingest-client.rs"];
    const telemetry = solution["crates/ingest-service/src/telemetry.rs"];

    expect(config).toContain("pub bind: std::net::SocketAddr");
    expect(config).toContain("pub frame_deadline: std::time::Duration");
    expect(config).toContain("pub drain_grace: std::time::Duration");
    expect(config).toContain("is_loopback");
    expect(server).toContain("pub async fn serve(");
    expect(server).toContain("ShutdownReport");
    expect(server).toContain("try_send");
    expect(server).toContain("timeout_at");
    expect(worker).toContain("spawn_blocking");
    expect(worker).toContain("blocking_recv");
    expect(server).toContain("READY");
    expect(main).toContain("4096");
    expect(main).not.toContain("read_to_end");
    expect(client).toContain("--addr");
    expect(client).toContain("parse::<u64>()");
    expect(client).toContain("response.len() + count > 128");
    expect(telemetry).toContain("event_kind");
    expect(worker).toContain("unique_insert");
    expect(solution["crates/ingest-service/tests/lifecycle.rs"]).toContain(
      "start_paused",
    );
    expect(solution["crates/ingest-service/tests/process.rs"]).toContain(
      "kill_reap",
    );
  });
});
