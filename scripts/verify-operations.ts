/** Verifies only the authored Service Operations solution archive. */
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { strFromU8, unzipSync } from "fflate";
import { projectFiles } from "../src/domain/project-package";
import { buildProjectArchive, projectArchiveFiles } from "./project-archive";
import { serviceOperationsPackage } from "../src/content/projects/service-operations";

const args = process.argv.slice(2);
assert(
  args.every((argument) => argument === "--fetch" || argument === "--msrv") &&
    new Set(args).size === args.length,
  "Only --fetch and --msrv are supported; code, paths and dependency overrides are not accepted.",
);

const useMsrv = args.includes("--msrv");
const fetchDependencies = args.includes("--fetch");
const env = { ...process.env };
let cargo = "cargo";

if (useMsrv) {
  const tools: Record<string, string> = {};
  for (const tool of ["cargo", "rustc", "rustdoc"]) {
    const located = spawnSync(
      "rustup",
      ["which", "--toolchain", "1.85.0", tool],
      { encoding: "utf8", timeout: 10_000 },
    );
    assert.equal(located.status, 0, located.stderr);
    tools[tool] = located.stdout.trim();
    const version = spawnSync(tools[tool], ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(version.status, 0, version.stderr);
    assert(version.stdout.startsWith(`${tool} 1.85.0 `), version.stdout);
    console.log(version.stdout.trim());
  }
  cargo = tools.cargo;
  env.RUSTC = tools.rustc;
  env.RUSTDOC = tools.rustdoc;
  env.PATH = `${dirname(cargo)}${delimiter}${env.PATH ?? ""}`;
} else {
  const version = spawnSync("rustc", ["--version"], { encoding: "utf8" });
  assert.equal(version.status, 0, version.stderr);
  assert(!version.stdout.includes("nightly"), version.stdout);
  console.log(version.stdout.trim());
}

assert.equal(serviceOperationsPackage.id, "service-operations-workshop");
for (const required of [
  "src/operations.rs",
  "tests/operations_contract.rs",
  "tests/operations_mutants.rs",
  "THREAT_MODEL.md",
  "RUNBOOK.md",
])
  assert(
    serviceOperationsPackage.files.some((file) => file.path === required),
    required,
  );

const archiveBytes = buildProjectArchive(serviceOperationsPackage, "solution");
for (const variant of ["starter", "solution"] as const) {
  const expected = buildProjectArchive(serviceOperationsPackage, variant);
  const servedPath = join(
    process.cwd(),
    "public",
    "projects",
    serviceOperationsPackage.id,
    `${variant}.zip`,
  );
  assert(
    existsSync(servedPath),
    `Missing served ${variant} archive: ${servedPath}`,
  );
  assert(
    readFileSync(servedPath).equals(Buffer.from(expected)),
    `Stale Service Operations ${variant} archive; run content:packages first`,
  );
}
const root = join(
  tmpdir(),
  `rust-workshop-${serviceOperationsPackage.id}-verify`,
);
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });

function extract(directory: string) {
  const files = unzipSync(archiveBytes);
  const expected = projectArchiveFiles(serviceOperationsPackage, "solution");
  const authored = projectFiles(serviceOperationsPackage, "solution");
  assert.deepEqual(
    Object.keys(files).sort(),
    Object.keys(expected)
      .map((path) => `${serviceOperationsPackage.id}/${path}`)
      .sort(),
  );
  for (const [path, contents] of Object.entries(files)) {
    const relative = path.slice(`${serviceOperationsPackage.id}/`.length);
    assert.equal(
      strFromU8(contents),
      expected[relative],
      `archive file mismatch: ${relative}`,
    );
    if (relative in authored)
      assert(!/\bunsafe\s+(?:fn|impl|trait|\{)/.test(authored[relative]), `unsafe source: ${relative}`);
    const target = join(directory, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

function execute(directory: string, commandArgs: string[]) {
  const result = spawnSync(cargo, commandArgs, {
    cwd: directory,
    env,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  return result;
}

function run(directory: string, commandArgs: string[]) {
  const result = execute(directory, commandArgs);
  assert.equal(result.status, 0, `cargo ${commandArgs.join(" ")} failed`);
  console.log(`ok cargo ${commandArgs.join(" ")}`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runMutant(
  name: string,
  mutate: (source: string) => string,
  test: string,
) {
  const directory = join(root, name);
  extract(directory);
  const sourcePath = join(directory, "src", "operations.rs");
  const source = readFileSync(sourcePath, "utf8");
  const mutated = mutate(source);
  assert.notEqual(
    mutated,
    source,
    `${name} mutation did not change authored source`,
  );
  writeFileSync(sourcePath, mutated);
  const result = execute(directory, [
    "test",
    "--offline",
    "--locked",
    "--test",
    "operations_contract",
    test,
    "--",
    "--exact",
  ]);
  assert.equal(
    typeof result.pid,
    "number",
    `${name} cargo test was not spawned`,
  );
  assert.equal(
    result.signal,
    null,
    `${name} cargo test was terminated by a signal`,
  );
  assert.equal(result.error, undefined, `${name} cargo test failed to execute`);
  assert.equal(
    typeof result.status,
    "number",
    `${name} cargo test timed out or did not exit`,
  );
  assert.notEqual(result.status, 0, `${name} mutant unexpectedly passed`);
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert.match(
    output,
    /running 1 test/,
    `${name} did not run exactly one contract test`,
  );
  assert.match(
    output,
    new RegExp(`test ${escapeRegExp(test)} \\.\\.\\. FAILED`),
    `${name} did not fail the expected test`,
  );
  console.log(`ok controlled ${name} mutant rejected`);
}

try {
  const solution = join(root, "solution");
  extract(solution);
  if (fetchDependencies) run(solution, ["fetch", "--locked"]);
  run(solution, ["fmt", "--all", "--", "--check"]);
  run(solution, ["check", "--offline", "--locked", "--all-targets"]);
  run(solution, ["test", "--offline", "--locked", "--no-fail-fast"]);
  run(solution, [
    "clippy",
    "--offline",
    "--locked",
    "--all-targets",
    "--",
    "-D",
    "warnings",
  ]);

  runMutant(
    "mutant-payload-leak",
    (source) =>
      source.replace(
        "outcome: input.outcome,",
        "outcome: Some(input.payload),",
      ),
    "telemetry_is_correlated_allowlisted_and_payload_free",
  );
  runMutant(
    "mutant-ignored-correlation",
    (source) => source.replace("&& event.correlation_id == correlation_id", ""),
    "telemetry_is_correlated_allowlisted_and_payload_free",
  );
  runMutant(
    "mutant-duplicate-terminal",
    (source) =>
      source.replace("if !self.completed.insert(request_id)", "if false"),
    "readiness_closes_before_drain_and_terminal_events_are_unique",
  );
  runMutant(
    "mutant-readiness-after-drain",
    (source) =>
      source.replace(
        "if self.phase != ServicePhase::Ready {\n            return Err(LifecycleError::AdmissionClosed);",
        "if self.phase == ServicePhase::Starting {\n            return Err(LifecycleError::AdmissionClosed);",
      ),
    "readiness_closes_before_drain_and_terminal_events_are_unique",
  );
  runMutant(
    "mutant-ignored-limits",
    (source) =>
      source.replace(
        "active >= policy.max_active",
        "active > policy.max_active",
      ),
    "bounded_admission_checks_trust_proof_and_limits",
  );
  runMutant(
    "mutant-timeout-misaccounting",
    (source) =>
      source.replace(
        'worker_state\n            .lock()\n            .await\n            .complete(7)\n            .expect("worker completes accepted request once");',
        "let _ = 7_u64;",
      ),
    "incident_drill_keeps_timeout_and_completion_accounting_distinct",
  );
  console.log(
    `Service Operations archive verified${useMsrv ? " on exact Rust 1.85.0" : ""}.`,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
