/** Verifies the fixed async lending extension of the Tokio service archive. */
import assert from "node:assert/strict";
import {
  verifySendHandoffBehavior,
  verifySendHandoffBoundaries,
  verifySendHandoffConsumerBounds,
  verifySendHandoffTokio,
} from "../src/content/async-lending-send-native";
import {
  verifyCancelTransferBehavior,
  verifyCancelTransferBoundaries,
} from "../src/content/async-lending-cancel-native";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { strFromU8, unzipSync } from "fflate";
import { projectFiles } from "../src/domain/project-package";
import { asyncLendingBoundaryFixtures } from "../src/content/async-lending-fixtures";
import { buildProjectArchive } from "./project-archive";
import { tokioServicePackage } from "../src/content/projects/tokio-service";

const args = process.argv.slice(2);
assert(
  args.every((arg) => arg === "--fetch" || arg === "--msrv") &&
    new Set(args).size === args.length,
  "Only --fetch and --msrv are supported.",
);
const msrv = args.includes("--msrv");
const fetchDependencies = args.includes("--fetch");
const root = mkdtempSync(join(tmpdir(), "async-lending-verify-"));
const evidence = {
  archive: {} as Record<string, string>,
  toolchain: "",
  sendHandoffEvidence: "",
  cancelTransferEvidence: "",
  fixtures: [] as { id: string; passed: boolean; detail: string }[],
};

function tool(name: string): string {
  if (!msrv) return name;
  const located = spawnSync(
    "rustup",
    ["which", "--toolchain", "1.85.0", name],
    { encoding: "utf8", timeout: 10_000 },
  );
  assert.equal(located.status, 0, located.stderr);
  return located.stdout.trim();
}
const cargo = tool("cargo");
const rustc = tool("rustc");
const env = {
  ...process.env,
  CARGO_TARGET_DIR: join(root, "cargo-target"),
  ...(msrv
    ? {
        RUSTC: rustc,
        PATH: `${dirname(cargo)}${delimiter}${process.env.PATH ?? ""}`,
      }
    : {}),
};
const rustVersion = spawnSync(rustc, ["--version"], { encoding: "utf8" });
assert.equal(rustVersion.status, 0, rustVersion.stderr);
assert(
  msrv
    ? rustVersion.stdout.startsWith("rustc 1.85.0 ")
    : !rustVersion.stdout.includes("nightly"),
  rustVersion.stdout,
);
evidence.toolchain = rustVersion.stdout.trim();

for (const required of [
  "src/lending.rs",
  "src/report_source.rs",
  "examples/borrowed_batch.rs",
  "tests/lending_contract.rs",
  "ASYNC-LENDING.md",
])
  assert(
    tokioServicePackage.files.some((file) => file.path === required),
    required,
  );
const lendingSource = tokioServicePackage.files.find(
  (file) => file.path === "src/lending.rs",
)!;
const lendingSolutionSource = lendingSource.solution ?? "";
assert(lendingSolutionSource.includes("MAX_PACKET_BYTES: usize = 4096"));
assert(lendingSolutionSource.includes("MAX_PACKET_RECORDS: usize = 32"));
assert(lendingSolutionSource.includes("pending_once"));

function hash(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
for (const variant of ["starter", "solution"] as const) {
  const expected = buildProjectArchive(tokioServicePackage, variant);
  const served = join(
    process.cwd(),
    "public",
    "projects",
    tokioServicePackage.id,
    `${variant}.zip`,
  );
  assert(existsSync(served), `Missing served ${variant} archive`);
  const bytes = readFileSync(served);
  assert(
    bytes.equals(Buffer.from(expected)),
    `Stale async lending ${variant} archive`,
  );
  evidence.archive[variant] = hash(expected);
}

function extract(variant: "starter" | "solution") {
  const directory = join(root, variant);
  mkdirSync(directory, { recursive: true });
  const files = unzipSync(buildProjectArchive(tokioServicePackage, variant));
  const expected = projectFiles(tokioServicePackage, variant);
  for (const [path, contents] of Object.entries(files)) {
    const relative = path.slice(`${tokioServicePackage.id}/`.length);
    assert.equal(strFromU8(contents), expected[relative], relative);
    const target = join(directory, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  return directory;
}
function run(
  directory: string,
  command: string,
  commandArgs: string[],
  timeout = 180_000,
) {
  const result = spawnSync(command, commandArgs, {
    cwd: directory,
    env,
    encoding: "utf8",
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}
function assertCompleted(result: ReturnType<typeof spawnSync>, id: string) {
  assert.equal(result.error, undefined, `${id} process error`);
  assert.equal(result.signal, null, `${id} terminated by ${result.signal}`);
  assert.notEqual(
    result.status,
    null,
    `${id} timed out without an exit status`,
  );
}
function check(id: string, passed: boolean, detail: string) {
  evidence.fixtures.push({ id, passed, detail });
  console.log(`${passed ? "ok" : "FAIL"} ${id}: ${detail}`);
}

type Mutation = {
  id: string;
  path: string;
  expectedFailure: string;
  expectedAssertion: string;
  apply(source: string): string;
};

const mutations: Mutation[] = [
  {
    id: "mutant-early-commit",
    path: "src/lending.rs",
    expectedFailure: "callback_error_does_not_commit_the_packet_and_stops",
    expectedAssertion: "left: 2\n right: 1",
    apply(source) {
      return source
        .replace(
          "let result = visit(packet.bytes()).await;",
          "let bytes = packet.bytes().to_vec();\n        let _ = packet.commit();\n        let result = visit(&bytes).await;",
        )
        .replace(
          "let _ = packet.commit();\n                report.committed += 1;",
          "report.committed += 1;",
        );
    },
  },
  {
    id: "mutant-skipped-callback",
    path: "src/lending.rs",
    expectedFailure: "callback_error_does_not_commit_the_packet_and_stops",
    expectedAssertion: "left: []",
    apply(source) {
      return source.replace(
        "let result = visit(packet.bytes()).await;",
        "let result: Result<(), E> = Ok(());",
      );
    },
  },
  {
    id: "mutant-continue-after-error",
    path: "src/lending.rs",
    expectedFailure: "callback_error_does_not_commit_the_packet_and_stops",
    expectedAssertion: "left: [97, 98, 99]",
    apply(source) {
      return source.replace(
        `Err(error) => {
                return Err(VisitError {
                    error,
                    visited: report.visited,
                    committed: report.committed,
                });
            }`,
        `Err(error) => {
                let _ = error;
                let _ = packet.commit();
                report.committed += 1;
                continue;
            }`,
      );
    },
  },
  {
    id: "mutant-extra-poll-after-ready",
    path: "src/lending.rs",
    expectedFailure: "consumer_does_not_repoll_callback_after_ready",
    expectedAssertion: "`async fn` resumed after completion",
    apply(source) {
      return source.replace(
        "let result = visit(packet.bytes()).await;",
        "let result = {\n            let mut callback = Box::pin(visit(packet.bytes()));\n            let result = callback.as_mut().await;\n            let _ = callback.as_mut().await;\n            result\n        };",
      );
    },
  },
  {
    id: "mutant-lost-item-after-pending",
    path: "src/lending.rs",
    expectedFailure: "receive_controls_pending_and_ready_without_losing_bytes",
    expectedAssertion: "future.as_mut().poll(&mut cx).is_pending()",
    apply(source) {
      return source.replace(
        "return Poll::Pending;",
        "return Poll::Ready(None);",
      );
    },
  },
  {
    id: "mutant-eager-adapter",
    path: "src/report_source.rs",
    expectedFailure: "boxed_adapter_keeps_a_local_provider_lifetime",
    expectedAssertion: "left: 1\n right: 0",
    apply(source) {
      return source.replace(
        "Self {\n            provider: Box::new(provider),\n        }",
        "let mut provider = Box::new(provider);\n        let _ = provider.next_boxed();\n        Self { provider }",
      );
    },
  },
];

function applyMutation(directory: string, mutation: Mutation) {
  const file = join(directory, mutation.path);
  const source = readFileSync(file, "utf8");
  const mutated = mutation.apply(source);
  assert.notEqual(mutated, source, `${mutation.id} did not change source`);
  writeFileSync(file, mutated);
}

function verifyMutation(mutation: Mutation) {
  const mutant = extract("solution");
  applyMutation(mutant, mutation);
  const compiled = run(mutant, cargo, [
    "test",
    "--offline",
    "--locked",
    "--test",
    "lending_contract",
    "--no-run",
  ]);
  assertCompleted(compiled, `${mutation.id}/compile`);
  check(
    `${mutation.id}/compile`,
    compiled.status === 0,
    compiled.status === 0 ? "compiled" : `${compiled.stderr}`.slice(-1200),
  );
  assert.equal(compiled.status, 0, `${mutation.id} must compile`);
  const executed = run(
    mutant,
    cargo,
    [
      "test",
      "--offline",
      "--locked",
      "--test",
      "lending_contract",
      "--",
      "--exact",
      mutation.expectedFailure,
      "--nocapture",
    ],
    15_000,
  );
  assertCompleted(executed, `${mutation.id}/test`);
  const output = `${executed.stdout}\n${executed.stderr}`;
  const failedAsIntended =
    executed.status === 101 &&
    output.includes(`test ${mutation.expectedFailure} ... FAILED`) &&
    output.includes(mutation.expectedAssertion);
  check(
    `${mutation.id}/test`,
    failedAsIntended,
    failedAsIntended
      ? "compiled mutant failed its intended contract assertion"
      : output.slice(-1200),
  );
  assert(
    failedAsIntended,
    `${mutation.id} did not fail its intended assertion`,
  );
  rmSync(mutant, { recursive: true, force: true });
}

function verifyBoundaryFixtures() {
  for (const fixture of asyncLendingBoundaryFixtures) {
    const file = join(root, `${fixture.id}.rs`);
    writeFileSync(file, fixture.source);
    const result = run(root, rustc, ["--edition=2024", file]);
    assertCompleted(result, `fixture/${fixture.id}`);
    const output = `${result.stdout}\n${result.stderr}`;
    const passed =
      fixture.mode === "pass"
        ? result.status === 0
        : result.status !== 0 && output.includes(fixture.diagnostic!);
    check(
      `fixture/${fixture.id}`,
      passed,
      passed ? `${fixture.mode} boundary passed` : output.slice(-1200),
    );
    assert(passed, `boundary fixture ${fixture.id} failed`);
  }
}

try {
  const solution = extract("solution");
  if (fetchDependencies) {
    const fetched = run(solution, cargo, ["fetch", "--locked"]);
    assertCompleted(fetched, "solution/fetch");
    assert.equal(fetched.status, 0, "fixed dependency fetch failed");
    const fixedProfile = fileURLToPath(
      new URL("./fixtures/tokio-runtime-1.53.1/", import.meta.url),
    );
    const fixedLockPath = join(fixedProfile, "Cargo.lock");
    const fixedLock = readFileSync(fixedLockPath);
    const fixedFetched = run(root, cargo, [
      "fetch",
      "--locked",
      "--manifest-path",
      join(fixedProfile, "Cargo.toml"),
    ]);
    assertCompleted(fixedFetched, "fixed-profile/fetch");
    assert(
      fixedLock.equals(readFileSync(fixedLockPath)),
      "fixed Tokio profile Cargo.lock changed during fetch",
    );
    assert.equal(fixedFetched.status, 0, "fixed Tokio profile fetch failed");
  }
  const sourceEvidenceBase = process.env.M11_NATIVE_EVIDENCE_DIR
    ? resolve(process.env.M11_NATIVE_EVIDENCE_DIR)
    : join(process.cwd(), "test-results", "async-lending");
  mkdirSync(sourceEvidenceBase, { recursive: true });
  const sourceEvidence = mkdtempSync(
    join(sourceEvidenceBase, `${msrv ? "msrv" : "stable"}-send-handoff-`),
  );
  evidence.sendHandoffEvidence = sourceEvidence;
  for (const [id, verify] of [
    [
      "behavior",
      () =>
        verifySendHandoffBehavior(join(sourceEvidence, "behavior"), rustc, env),
    ],
    [
      "boundaries",
      () =>
        verifySendHandoffBoundaries(
          join(sourceEvidence, "boundaries"),
          rustc,
          env,
        ),
    ],
    [
      "consumer-bounds",
      () =>
        verifySendHandoffConsumerBounds(
          join(sourceEvidence, "consumer-bounds"),
          rustc,
          env,
        ),
    ],
    [
      "tokio",
      () =>
        verifySendHandoffTokio(
          join(sourceEvidence, "tokio"),
          cargo,
          rustc,
          env,
        ),
    ],
  ] as const) {
    try {
      const proofs = verify();
      check(
        `send-handoff/${id}`,
        true,
        `${proofs.length} source-bound proofs; durable commands in ${sourceEvidence}`,
      );
    } catch (error) {
      check(
        `send-handoff/${id}`,
        false,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
  const cancelEvidence = mkdtempSync(
    join(sourceEvidenceBase, `${msrv ? "msrv" : "stable"}-cancel-transfer-`),
  );
  evidence.cancelTransferEvidence = cancelEvidence;
  for (const [id, verify] of [
    ["behavior", () => verifyCancelTransferBehavior(join(cancelEvidence, "behavior"), rustc)],
    ["boundaries", () => verifyCancelTransferBoundaries(join(cancelEvidence, "boundaries"), rustc)],
  ] as const) {
    const proofs = verify();
    check(
      `cancel-transfer/${id}`,
      true,
      `${proofs.length} source-bound proofs; durable commands in ${cancelEvidence}`,
    );
  }
  for (const commandArgs of [
    ["fmt", "--all", "--", "--check"],
    ["check", "--offline", "--locked", "--all-targets"],
    ["test", "--offline", "--locked", "--lib", "--test", "lending_contract"],
    [
      "clippy",
      "--offline",
      "--locked",
      "--all-targets",
      "--",
      "-D",
      "warnings",
    ],
    ["run", "--offline", "--locked", "--example", "borrowed_batch"],
  ]) {
    const result = run(solution, cargo, commandArgs);
    assertCompleted(result, `solution/${commandArgs[0]}`);
    check(
      `solution/${commandArgs[0]}`,
      result.status === 0,
      result.status === 0
        ? "passed"
        : `${result.stdout}\n${result.stderr}`.slice(-1200),
    );
    assert.equal(result.status, 0, `cargo ${commandArgs.join(" ")} failed`);
  }
  const starter = extract("starter");
  const rejected = run(starter, cargo, [
    "test",
    "--offline",
    "--locked",
    "--test",
    "lending_contract",
    "--no-fail-fast",
  ]);
  assertCompleted(rejected, "starter-rejection");
  assert(
    `${rejected.stdout}\n${rejected.stderr}`.includes("take one owned report"),
    "starter rejection did not come from the lending report contract",
  );
  assert(
    `${rejected.stdout}\n${rejected.stderr}`.includes(
      "owned_future_can_cross_tokio_spawn",
    ),
    "starter rejection did not execute the lending-specific contract test",
  );
  check(
    "starter-rejection",
    rejected.status !== 0,
    rejected.status !== 0
      ? "starter rejected by authored todo! contracts"
      : "starter unexpectedly passed",
  );
  assert.equal(rejected.status, 101, "starter failed for an unrelated status");
  assert.notEqual(rejected.status, 0, "starter unexpectedly passed");
  verifyBoundaryFixtures();
  for (const mutation of mutations) verifyMutation(mutation);
} finally {
  const output = join(process.cwd(), "test-results", "async-lending");
  mkdirSync(output, { recursive: true });
  writeFileSync(
    join(output, `${msrv ? "msrv" : "stable"}.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  rmSync(root, { recursive: true, force: true });
}
if (evidence.fixtures.some((fixture) => !fixture.passed)) process.exitCode = 1;
