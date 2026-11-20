/** Maintainer-only execution of fixed authored Send handoff sources. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { appendHiddenTests } from "../runner";
import { cargoExecutable, testCounts } from "../../scripts/cargo-observation";
import {
  sendTransferStep,
  sendTransferEquivalent,
  sendTransferManual,
  sendTransferMutants,
  sendTransferBoundaries,
  sendTransferTokioTests,
} from "./async-lending-send-transfer";

const hash = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");
type NativeEnvironment = NodeJS.ProcessEnv;
export const sendNativeCandidates = [
  { id: "canonical", source: sendTransferStep.solution! },
  { id: "iterator", source: sendTransferEquivalent },
  { id: "manual-future", source: sendTransferManual },
] as const;
export function sendNativeDirectory(prefix: string) {
  const configured = process.env.M11_NATIVE_EVIDENCE_DIR;
  const root = configured ? resolve(configured) : tmpdir();
  mkdirSync(root, { recursive: true });
  return mkdtempSync(join(root, prefix));
}
export function discardSendNativeDirectory(directory: string) {
  if (!process.env.M11_NATIVE_EVIDENCE_DIR)
    rmSync(directory, { recursive: true, force: true });
}
function executable(command: string, cwd: string, env: NativeEnvironment) {
  const candidates = command.includes("/")
    ? [resolve(cwd, command)]
    : (env.PATH ?? "/usr/bin:/bin")
        .split(":")
        .map((part) => resolve(cwd, part || ".", command));
  const path = candidates.find((candidate) => {
    try {
      return (
        statSync(candidate).isFile() &&
        accessSync(candidate, constants.X_OK) === undefined
      );
    } catch {
      return false;
    }
  });
  assert(path, `Executable not found: ${command}`);
  return path;
}
function command(
  directory: string,
  program: string,
  args: string[],
  env: NativeEnvironment,
  timeout = 60_000,
) {
  const actual = executable(program, directory, env);
  const startedAt = new Date().toISOString();
  const result = spawnSync(actual, args, {
    cwd: directory,
    env,
    encoding: "utf8",
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
  const record = mkdtempSync(join(directory, "command-"));
  const sourceHashes = Object.fromEntries(
    readdirSync(directory)
      .filter(
        (name) =>
          name.endsWith(".rs") ||
          name === "Cargo.toml" ||
          name === "Cargo.lock",
      )
      .map((name) => [
        join(directory, name),
        hash(readFileSync(join(directory, name))),
      ]),
  );
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  writeFileSync(join(record, "stdout.txt"), stdout);
  writeFileSync(join(record, "stderr.txt"), stderr);
  writeFileSync(
    join(record, "command.json"),
    JSON.stringify(
      {
        argv: [actual, ...args],
        requestedArgv: [program, ...args],
        cwd: directory,
        startedAt,
        finishedAt: new Date().toISOString(),
        executablePath: actual,
        executableSha256: hash(readFileSync(actual)),
        sourceHashes,
        PATH: env.PATH,
        RUSTC: env.RUSTC,
        status: result.status,
        signal: result.signal,
        error: result.error?.message,
        stdoutSha256: hash(stdout),
        stderrSha256: hash(stderr),
      },
      null,
      2,
    ) + "\n",
  );
  assert.equal(
    result.error,
    undefined,
    `${program} process error: ${result.error?.message}`,
  );
  assert.equal(result.signal, null, `${program} signal ${result.signal}`);
  assert.notEqual(result.status, null, `${program} has no ordinary exit`);
  return result;
}
function version(directory: string, rustc: string, env: NativeEnvironment) {
  const result = command(directory, rustc, ["--version", "--verbose"], env);
  assert.equal(result.status, 0, result.stderr);
  writeFileSync(join(directory, "toolchain.txt"), result.stdout);
}
function compile(
  directory: string,
  id: string,
  source: string,
  rustc: string,
  env: NativeEnvironment,
) {
  const file = join(directory, `${id}.rs`);
  const binary = join(directory, id);
  writeFileSync(file, source);
  const result = command(
    directory,
    rustc,
    ["--edition=2024", "--test", "--error-format=json", file, "-o", binary],
    env,
  );
  return { file, binary, result, sourceSha256: hash(source) };
}
function exact(
  directory: string,
  binary: string,
  name: string,
  passed: boolean,
  env: NativeEnvironment,
) {
  const result = command(
    directory,
    binary,
    ["--exact", name, "--test-threads=1", "--nocapture"],
    env,
    8_000,
  );
  assert.equal(result.status, passed ? 0 : 101, result.stdout + result.stderr);
  assert.deepEqual(
    testCounts(result.stdout),
    passed ? { passed: 1, failed: 0 } : { passed: 0, failed: 1 },
  );
  assert.deepEqual(
    result.stdout
      .split("\n")
      .filter(
        (line) => line.startsWith("test ") && !line.startsWith("test result:"),
      ),
    [`test ${name} ... ${passed ? "ok" : "FAILED"}`],
  );
  if (!passed)
    assert.match(result.stdout + result.stderr, /assertion|panicked at/);
}

export function verifySendHandoffBehavior(
  directory: string,
  rustc = "rustc",
  env: NativeEnvironment = process.env,
) {
  mkdirSync(directory, { recursive: true });
  version(directory, rustc, env);
  assert.equal(sendTransferStep.evaluator?.kind, "tests");
  const tests = sendTransferStep.evaluator.tests;
  const summaries: { id: string; sourceSha256: string; tests: number }[] = [];
  let canonical = "";
  for (const candidate of sendNativeCandidates) {
    const built = compile(
      directory,
      candidate.id,
      appendHiddenTests(candidate.source, tests),
      rustc,
      env,
    );
    assert.equal(built.result.status, 0, built.result.stderr);
    const run = command(
      directory,
      built.binary,
      ["--test-threads=1"],
      env,
      8_000,
    );
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.deepEqual(testCounts(run.stdout), { passed: 7, failed: 0 });
    summaries.push({
      id: candidate.id,
      sourceSha256: built.sourceSha256,
      tests: 7,
    });
    if (candidate.id === "canonical") canonical = built.binary;
  }
  for (const mutant of sendTransferMutants) {
    const built = compile(
      directory,
      mutant.id,
      appendHiddenTests(mutant.source, tests),
      rustc,
      env,
    );
    assert.equal(
      built.result.status,
      0,
      `${mutant.id} must compile the full public harness: ${built.result.stderr}`,
    );
    exact(directory, built.binary, mutant.testName, false, env);
    exact(directory, canonical, mutant.testName, true, env);
    summaries.push({
      id: mutant.id,
      sourceSha256: built.sourceSha256,
      tests: 1,
    });
  }
  const starter = compile(
    directory,
    "starter",
    appendHiddenTests(sendTransferStep.code!, tests),
    rustc,
    env,
  );
  assert.equal(starter.result.status, 0, starter.result.stderr);
  exact(
    directory,
    starter.binary,
    "__rust_workshop_hidden_tests::preparation_is_synchronous_and_exactly_once",
    false,
    env,
  );
  writeFileSync(
    join(directory, "summary.json"),
    JSON.stringify(summaries, null, 2) + "\n",
  );
  return summaries;
}

type Diagnostic = {
  level: string;
  message: string;
  code: { code: string } | null;
  spans: {
    file_name: string;
    is_primary: boolean;
    line_start: number;
    text: { text: string }[];
  }[];
};
export function verifySendHandoffBoundaries(
  directory: string,
  rustc = "rustc",
  env: NativeEnvironment = process.env,
) {
  mkdirSync(directory, { recursive: true });
  version(directory, rustc, env);
  const summaries = [];
  for (const candidate of sendNativeCandidates) {
    for (const boundary of sendTransferBoundaries) {
      const prefix = `${candidate.id}-${boundary.id}`;
      const source = candidate.source + boundary.failSuffix;
      const failed = compile(directory, prefix + "-fail", source, rustc, env);
      assert.equal(failed.result.status, 1, failed.result.stderr);
      const diagnostics: Diagnostic[] = failed.result.stderr
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const sourceLines = candidate.source.split("\n").length;
      const intended = diagnostics.find(
        (diagnostic) =>
          diagnostic.level === "error" &&
          diagnostic.message.includes(boundary.diagnosticMessage) &&
          (boundary.diagnosticCodes.length === 0 ||
            (diagnostic.code &&
              boundary.diagnosticCodes.includes(diagnostic.code.code))) &&
          diagnostic.spans.some(
            (span) =>
              span.is_primary &&
              span.file_name === failed.file &&
              span.line_start >= sourceLines &&
              span.text.some((line) =>
                line.text.includes(boundary.primaryMarker),
              ),
          ),
      );
      assert(
        intended,
        `${prefix}: intended diagnostic primary span missing: ${failed.result.stderr}`,
      );
      const passed = compile(
        directory,
        prefix + "-pass",
        candidate.source + boundary.passSuffix,
        rustc,
        env,
      );
      assert.equal(passed.result.status, 0, passed.result.stderr);
      exact(directory, passed.binary, boundary.passTestName, true, env);
      summaries.push({
        id: prefix,
        failSourceSha256: failed.sourceSha256,
        passSourceSha256: passed.sourceSha256,
        diagnosticCode: intended.code?.code ?? null,
        diagnosticMessage: intended.message,
        primarySpans: intended.spans.filter((span) => span.is_primary),
      });
    }
  }
  writeFileSync(
    join(directory, "summary.json"),
    JSON.stringify(summaries, null, 2) + "\n",
  );
  return summaries;
}

export function verifySendHandoffTokio(
  directory: string,
  cargo = "cargo",
  rustc = "rustc",
  env: NativeEnvironment = process.env,
) {
  mkdirSync(directory, { recursive: true });
  version(directory, rustc, env);
  const profile = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../scripts/fixtures/tokio-runtime-1.54.1",
  );
  const target = join(directory, "target");
  const summaries = [];
  for (const candidate of sendNativeCandidates) {
    const work = join(directory, candidate.id);
    mkdirSync(join(work, "src"), { recursive: true });
    for (const file of ["Cargo.toml", "Cargo.lock", "src/main.rs"])
      copyFileSync(join(profile, file), join(work, file));
    const source = appendHiddenTests(candidate.source, sendTransferTokioTests);
    writeFileSync(join(work, "src/lib.rs"), source);
    // Keep source snapshot beside command metadata as well as the Cargo input.
    writeFileSync(join(work, "authored-source.rs"), source);
    const originalLock = readFileSync(join(work, "Cargo.lock"));
    const selectedEnv = {
      ...env,
      RUSTC: executable(rustc, work, env),
      CARGO_TARGET_DIR: target,
    };
    const built = command(
      work,
      cargo,
      [
        "test",
        "--offline",
        "--locked",
        "--no-run",
        "--lib",
        "--message-format=json",
      ],
      selectedEnv,
    );
    assert.equal(built.status, 0, built.stdout + built.stderr);
    const binary = cargoExecutable(
      built.stdout,
      "rust_workshop_tokio_fixtures",
    );
    assert(
      binary &&
        resolve(binary).startsWith(resolve(target) + sep) &&
        existsSync(binary),
      "Cargo must emit the fixed profile test binary inside private target",
    );
    exact(
      work,
      binary,
      "__rust_workshop_hidden_tests::prepared_handoff_crosses_real_tokio_spawn_after_pending",
      true,
      selectedEnv,
    );
    assert(
      originalLock.equals(readFileSync(join(work, "Cargo.lock"))),
      "locked profile changed",
    );
    summaries.push({
      id: candidate.id,
      sourceSha256: hash(source),
      profileManifestSha256: hash(readFileSync(join(profile, "Cargo.toml"))),
      profileLockSha256: hash(originalLock),
    });
  }
  writeFileSync(
    join(directory, "summary.json"),
    JSON.stringify(summaries, null, 2) + "\n",
  );
  return summaries;
}

/** Proves that the public clients genuinely forbid extra Clone/Unpin bounds. */
export function verifySendHandoffConsumerBounds(
  directory: string,
  rustc = "rustc",
  env: NativeEnvironment = process.env,
) {
  mkdirSync(directory, { recursive: true });
  version(directory, rustc, env);
  assert.equal(sendTransferStep.evaluator?.kind, "tests");
  const summaries = [];
  for (const [id, original, strengthened, requiredType] of [
    [
      "nonclone-formatter",
      "F: FnMut(&str) -> String,",
      "F: FnMut(&str) -> String + Clone,",
      "NonClone",
    ],
    [
      "pinned-pause",
      "P: std::future::Future<Output = ()> + Send + 'static",
      "P: std::future::Future<Output = ()> + Send + 'static + Unpin",
      "PhantomPinned",
    ],
  ]) {
    const changed = sendTransferStep.solution!.replace(original, strengthened);
    assert.notEqual(changed, sendTransferStep.solution);
    const built = compile(
      directory,
      id,
      appendHiddenTests(changed, sendTransferStep.evaluator.tests),
      rustc,
      env,
    );
    assert.equal(built.result.status, 1, built.result.stderr);
    const diagnostics: Diagnostic[] = built.result.stderr
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const intended = diagnostics.find(
      (diagnostic) =>
        diagnostic.level === "error" &&
        diagnostic.code?.code === "E0277" &&
        diagnostic.message.includes(requiredType) &&
        diagnostic.spans.some(
          (span) =>
            span.is_primary &&
            span.file_name === built.file &&
            span.line_start > changed.split("\n").length,
        ),
    );
    assert(
      intended,
      `${id}: exact consumer bound was not rejected: ${built.result.stderr}`,
    );
    summaries.push({
      id,
      sourceSha256: built.sourceSha256,
      diagnostic: intended,
    });
  }
  writeFileSync(
    join(directory, "summary.json"),
    JSON.stringify(summaries, null, 2) + "\n",
  );
  return summaries;
}
