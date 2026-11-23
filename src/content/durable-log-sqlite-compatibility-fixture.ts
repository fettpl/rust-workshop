import type { ProjectPackage } from "../domain/types";

/** Reconstructs the previous Durable Log packages only for historical tests. */
const securityChangelog = `## Aktualizacja zabezpieczeń SQLite

- Zaktualizowano rusqlite do 0.41.1 i dołączone SQLite do 3.54.1.
- Podniesiono minimalną wersję Rust do 1.89.0.

`;

const sqliteVersionTest = `
#[test]
fn bundled_sqlite_has_current_security_baseline() {
    assert!(rusqlite::version_number() >= 3_054_000);
}
`;

function previousFile(path: string, content: string): string {
  switch (path) {
    case "Cargo.lock":
      return content
        .replace(
          'name = "rusqlite"\nversion = "0.41.1"',
          'name = "rusqlite"\nversion = "0.40.2"',
        )
        .replace(
          'name = "libsqlite3-sys"\nversion = "0.39.1"',
          'name = "libsqlite3-sys"\nversion = "0.38.2"',
        )
        .replace(
          "da9bba6f3506135e120a6586df05be18b48d18896600646a4bec8f993d91a594",
          "23f2a97da3e3873c73cb2a2e71b35c40ff95e0b1eefa8d72d8499a6928c3b5b3",
        )
        .replace(
          "14a5f01b87b92705d07b433c06f96cbc764637d81a0bffb5734ce17cf0f9a2b3",
          "f1d20bef17f513b9b3004532233187769cd072d790971f4e4da0e346eb6401e8",
        );
    case "Cargo.toml":
    case "crates/ingest-core/Cargo.toml":
    case "crates/ingest-store/Cargo.toml":
    case "crates/ingest-service/Cargo.toml":
    case "README.md":
    case "RELEASE.md":
      return content.replaceAll("1.89.0", "1.85.0").replace("0.41.1", "0.40.2");
    case "CHANGELOG.md":
      return content.replace(securityChangelog, "");
    case "crates/ingest-core/src/domain.rs":
      return content.replace(
        `        if correlation
            .as_deref()
            .is_some_and(|value| value == "-" || !valid_identifier(value))
        {
            return Err(ValidationError::Correlation);
        }`,
        `        if let Some(value) = &correlation {
            if value == "-" || !valid_identifier(value) {
                return Err(ValidationError::Correlation);
            }
        }`,
      );
    case "crates/ingest-service/src/worker.rs":
      return content.replace(
        `            if let (false, Some(hooks)) = (paused, &hooks) {
                hooks.worker_started.notify_one();
                hooks
                    .release_worker
                    .wait_bounded(std::time::Duration::from_secs(1));
                paused = true;
            }`,
        `            if !paused {
                if let Some(hooks) = &hooks {
                    hooks.worker_started.notify_one();
                    hooks
                        .release_worker
                        .wait_bounded(std::time::Duration::from_secs(1));
                    paused = true;
                }
            }`,
      );
    case "crates/ingest-service/tests/process.rs":
      return content.replace(
        `        if Store::open(path, 4).is_ok_and(|store| store.count().unwrap_or(0) >= expected) {
            return;
        }`,
        `        if let Ok(store) = Store::open(path, 4) {
            if store.count().unwrap_or(0) >= expected {
                return;
            }
        }`,
      );
    case "crates/ingest-store/tests/transactions.rs":
      return content.replace(sqliteVersionTest, "");
    default:
      return content;
  }
}

function previousPackage(value: unknown): ProjectPackage {
  // The registry projector calls this only after matching the entire package.
  const project = value as ProjectPackage;
  const files = project.files.map((file) => {
    const starter = previousFile(file.path, file.starter);
    const solution =
      file.solution === undefined
        ? undefined
        : previousFile(file.path, file.solution);
    if (starter === file.starter && solution === file.solution) return file;
    return solution === undefined
      ? { ...file, starter }
      : { ...file, starter, solution };
  });
  return {
    ...project,
    instructions: project.instructions.map((instruction) =>
      instruction.replace("Rust 1.89.0", "Rust 1.85.0"),
    ),
    files,
  };
}

const packageBindings = [
  {
    selector: "durable-log-service",
    beforeSha256:
      "f6a1c41753b056af5977a7c11e1c46a8ab4eab1e1bff302e972760f611da0a2c",
    successorSha256:
      "de76420add2aa469e7d475a9601f2eeb34a0e229dba94d71a0e5537ddd483a76",
  },
  {
    selector: "durable-log-retry",
    beforeSha256:
      "87be0482bea8a64f71e29d42be850bc96f35eba475fe9d03b25391069804a245",
    successorSha256:
      "b3f11ebd388485b2858a25a01fcc68d152e774682a236828535f4c385d9a5e5a",
  },
];

const sourceBindings = [
  {
    path: ["title"],
    before: "rusqlite 0.40.2: Transaction",
    beforeSha256:
      "d576e5433c12f15d63da0d3eb42ef1fff52d5579a8273ccca6669367127ba82d",
    successorSha256:
      "da35d3058f732aa360db76f716ac56eb55b7a5cc27d3ffe0813c0e0add1f8cb9",
  },
  {
    path: ["url"],
    before: "https://docs.rs/rusqlite/0.40.2/rusqlite/struct.Transaction.html",
    beforeSha256:
      "3431835de7642f6abc8e50a061c8a52f79b8dac67a8b762796db43fe0fa10c27",
    successorSha256:
      "5373e17e109ad52b60330ad86d3ae24822a0c7bed24381f263d9562bca56f9e2",
  },
  {
    path: ["reviewedAt"],
    before: "2026-09-18",
    beforeSha256:
      "1c81a2ca8e37cb855b15cf3d3722b5f95eb1a72330f79fb43b0cab107ba89846",
    successorSha256:
      "860cc931f2746b53b7ef28ab1cbfbfb3340695f47990c74420cbd95368a5e60c",
  },
];

export const durableLogSqliteRestorations = [
  ...packageBindings.map((binding) => ({
    ...binding,
    registry: "projects",
    path: ["package"],
    before: previousPackage,
  })),
  ...sourceBindings.map((binding) => ({
    ...binding,
    registry: "sources",
    selector: "capstone-rusqlite-transactions",
  })),
];
