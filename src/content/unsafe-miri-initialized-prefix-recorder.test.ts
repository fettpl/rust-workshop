import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import type { PrefixCommandRecord } from "./unsafe-miri-initialized-prefix-proof";
import { isInitializedPrefixVersionStderrAccepted } from "./unsafe-miri-initialized-prefix-recorder";

const recorderSource = readFileSync(
  fileURLToPath(
    new URL("./unsafe-miri-initialized-prefix-recorder.ts", import.meta.url),
  ),
  "utf8",
);

const preparedControlTestNames = [
  "recorder-control-normal-exit",
  "recorder-control-nonzero-exit",
  "recorder-control-spawn-error",
  "recorder-control-real-spawn-error",
  "recorder-control-partial-timeout",
  "recorder-control-output-limit",
  "recorder-control-repeated-overflow",
  "recorder-control-exact-boundary",
  "recorder-control-parent-exit-late-pipe",
  "recorder-control-descendant-trailing-pipe-timer-cleanup",
  "recorder-control-post-return-owned-descendant-cleanup",
  "recorder-control-owned-descendant-liveness-settlement",
] as const;

const controlsAuthorized =
  process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED === "1";

function controlFileRef(path: string) {
  const bytes = readFileSync(path);
  return {
    path,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function boundedFixturePid(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 2 ||
    value > 2_147_483_647 ||
    value === process.pid
  )
    throw new Error(`invalid owned fixture PID: ${String(value)}`);
  return value;
}

async function expectAbsentBySignal0(pid: number): Promise<void> {
  const deadline = Date.now() + 500;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(
    `owned fixture PID remained live after recorder return: ${pid}`,
  );
}

function expectDurablePacket(recorded: {
  recorded: { record: PrefixCommandRecord; ref: { path: string } };
  attempt: string;
}): void {
  const record = recorded.recorded.record;
  const commandDirectory = dirname(recorded.recorded.ref.path);
  expect(
    JSON.parse(readFileSync(join(commandDirectory, "status.json"), "utf8")),
  ).toEqual(record.outcome);
  expect(controlFileRef(record.stdout.path)).toEqual(record.stdout);
  expect(controlFileRef(record.stderr.path)).toEqual(record.stderr);
  expect(readFileSync(record.stdout.path)).toEqual(
    readFileSync(join(commandDirectory, "raw/stdout.bin")),
  );
  expect(readFileSync(record.stderr.path)).toEqual(
    readFileSync(join(commandDirectory, "raw/stderr.bin")),
  );
}

async function runControl(
  id: (typeof preparedControlTestNames)[number],
  argv: readonly string[],
  options: {
    timeoutMs?: number;
    maxBytesPerStream?: number;
    missingExecutable?: boolean;
    realSpawnError?: boolean;
  } = {},
) {
  if (!controlsAuthorized) {
    expect(controlsAuthorized).toBe(false);
    return undefined;
  }
  const { createInitializedPrefixAttempt, recordInitializedPrefixCommand } =
    await import("./unsafe-miri-initialized-prefix-recorder");
  const evidenceDirectory = mkdtempSync(
    join(tmpdir(), "initialized-prefix-controls-"),
  );
  const attempt = createInitializedPrefixAttempt({
    mode: "stable",
    evidenceDirectory,
  });
  const fixture = join(attempt, "controls", `${id}.fixture`);
  writeFileSync(fixture, `${id}\n`, { flag: "wx" });
  let executable = controlFileRef(process.execPath);
  if (options.missingExecutable) {
    executable = {
      ...executable,
      path: join(attempt, "controls", "missing-executable"),
    };
  } else if (options.realSpawnError) {
    const nonExecutable = join(attempt, "controls", "non-executable-fixture");
    writeFileSync(nonExecutable, "fixed non-executable fixture\n", {
      flag: "wx",
    });
    chmodSync(nonExecutable, 0o644);
    executable = controlFileRef(nonExecutable);
  }
  const recorded = await recordInitializedPrefixCommand(attempt, {
    id,
    recipeId: id,
    mode: "stable",
    operation: "client-positive",
    executable,
    argv,
    cwd: attempt,
    env: {
      HOME: join(attempt, "private-home"),
      CARGO_HOME: join(attempt, "private-cargo"),
      CARGO_TARGET_DIR: join(attempt, "private-target"),
      TMPDIR: join(attempt, "private-tmp"),
      PATH: process.env.PATH ?? "",
      ...(controlsAuthorized
        ? { RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED: "1" }
        : {}),
    },
    inputs: [controlFileRef(fixture)],
    externalInputs: [],
    timeoutMs: options.timeoutMs,
    maxBytesPerStream: options.maxBytesPerStream,
  });
  writeFileSync(
    join(attempt, "control-manifest.json"),
    `${JSON.stringify({ schema: "initialized-prefix-control-manifest-v1", id, attempt, evidenceDirectory, record: recorded.ref }, null, 2)}\n`,
    { flag: "wx" },
  );
  return { recorded, attempt, evidenceDirectory };
}

async function runUnqualifiedSidecarAdmissionRegression() {
  if (!controlsAuthorized) {
    expect(controlsAuthorized).toBe(false);
    return undefined;
  }
  const { createInitializedPrefixAttempt, recordInitializedPrefixCommand } =
    await import("./unsafe-miri-initialized-prefix-recorder");
  const evidenceDirectory = mkdtempSync(
    join(tmpdir(), "initialized-prefix-sidecar-regression-"),
  );
  const attempt = createInitializedPrefixAttempt({
    mode: "stable",
    evidenceDirectory,
  });
  const qualifiedDirectory = join(attempt, "controls", "qualified");
  mkdirSync(qualifiedDirectory);
  const sourcePath = join(attempt, "controls", "unqualified.rs");
  const configPath = join(attempt, "controls", "config.toml");
  const qualifiedRustcPath = join(qualifiedDirectory, "rustc");
  const unqualifiedRustcPath = join(attempt, "controls", "rustc");
  const outputPath = join(attempt, "controls", "generated-output");
  writeFileSync(sourcePath, "fn main() {}\n", { flag: "wx" });
  writeFileSync(configPath, "[net]\noffline = true\n", { flag: "wx" });
  writeFileSync(qualifiedRustcPath, "qualified inert rustc\n", { flag: "wx" });
  writeFileSync(unqualifiedRustcPath, "unqualified inert rustc\n", {
    flag: "wx",
  });
  writeFileSync(outputPath, "generated inert output\n", { flag: "wx" });
  const env = {
    HOME: join(attempt, "private-home"),
    CARGO_HOME: join(attempt, "private-cargo"),
    CARGO_TARGET_DIR: join(attempt, "private-target"),
    TMPDIR: join(attempt, "private-tmp"),
    PATH: process.env.PATH ?? "",
    RUSTUP_TOOLCHAIN: "stable",
    RUSTC: qualifiedRustcPath,
    RUSTDOC: qualifiedRustcPath,
    CARGO_NET_OFFLINE: "true",
  };
  const source = controlFileRef(sourcePath);
  const config = controlFileRef(configPath);
  const qualifiedRustc = controlFileRef(qualifiedRustcPath);
  const unqualifiedRustc = controlFileRef(unqualifiedRustcPath);
  const output = controlFileRef(outputPath);
  const bindingPath = join(attempt, "controls", "binding.json");
  writeFileSync(
    bindingPath,
    `${JSON.stringify(
      {
        mode: "stable",
        name: "stable",
        executables: { rustc: qualifiedRustc },
        config,
        env,
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  const binding = controlFileRef(bindingPath);
  const rawDirectory = join(attempt, "controls", "producer-raw");
  mkdirSync(rawDirectory);
  const stdoutPath = join(rawDirectory, "stdout.bin");
  const stderrPath = join(rawDirectory, "stderr.bin");
  writeFileSync(stdoutPath, Buffer.alloc(0), { flag: "wx" });
  writeFileSync(stderrPath, Buffer.alloc(0), { flag: "wx" });
  const producerRecordPath = join(
    attempt,
    "commands",
    "unqualified-producer",
    "record.json",
  );
  mkdirSync(join(attempt, "commands", "unqualified-producer"));
  mkdirSync(join(attempt, "commands", "unqualified-producer", "raw"));
  const producerSpec = {
    id: "unqualified-producer",
    recipeId: "unqualified-producer",
    mode: "stable" as const,
    operation: "compile" as const,
    executable: unqualifiedRustc,
    argv: ["--edition=2024", sourcePath, "-o", outputPath],
    cwd: attempt,
    env,
    inputs: [source, config, binding],
    externalInputs: [],
    toolchainBinding: binding,
  };
  const producerRecord = {
    schema: "initialized-prefix-command-v1" as const,
    spec: producerSpec,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    outcome: {
      exitCode: 0,
      signal: null,
      spawnError: null,
      timedOut: false,
      outputLimit: false,
      drainTimedOut: false,
    },
    stdout: controlFileRef(stdoutPath),
    stderr: controlFileRef(stderrPath),
    before: [],
    after: [],
    guard: { ok: true, reasons: [] },
  };
  writeFileSync(
    producerRecordPath,
    `${JSON.stringify(producerRecord, null, 2)}\n`,
    { flag: "wx" },
  );
  const command = controlFileRef(producerRecordPath);
  const sidecarPath = join(
    attempt,
    "commands",
    "unqualified-producer",
    "compiled-output.json",
  );
  writeFileSync(
    sidecarPath,
    `${JSON.stringify(
      {
        schema: "initialized-prefix-compiled-output-v1",
        command,
        source,
        output,
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  const sidecar = controlFileRef(sidecarPath);
  const recorded = await recordInitializedPrefixCommand(attempt, {
    id: "unqualified-sidecar-target",
    recipeId: "unqualified-sidecar-target",
    mode: "stable",
    operation: "client-positive",
    executable: output,
    argv: [],
    cwd: attempt,
    env,
    inputs: [source, config, binding, sidecar],
    externalInputs: [],
    toolchainBinding: binding,
  });
  return { recorded, attempt };
}

it("keeps the initialized-prefix recorder API and shared types on the Node seam", () => {
  expect(recorderSource).toMatch(
    /import type \{[\s\S]*PrefixCommandSpec[\s\S]*PrefixToolchainBinding[\s\S]*\} from ["']\.\/unsafe-miri-initialized-prefix-proof["'];/,
  );
  expect(recorderSource).toMatch(
    /export function createInitializedPrefixAttempt\(options:\s*\{\s*mode:\s*PrefixMode;\s*evidenceDirectory\?:\s*string;?\s*\}\):\s*string/,
  );
  expect(recorderSource).toMatch(
    /export async function qualifyInitializedPrefixToolchain\(options:\s*\{\s*mode:\s*PrefixMode;\s*attemptDirectory:\s*string;?\s*\}\):\s*Promise<PrefixToolchainBinding>/,
  );
  expect(recorderSource).toMatch(
    /export async function recordInitializedPrefixCommand\(\s*attemptDirectory:\s*string,\s*spec:\s*PrefixCommandSpec,?\s*\):\s*Promise<PrefixRecordedCommand>/,
  );
  expect(recorderSource).not.toMatch(/from ["']\.\/(?:course|content)["']/);
  expect(recorderSource).not.toMatch(
    /verifyInitializedPrefixNative|classifyInitializedPrefix/,
  );
});

it("declares bounded durable command capture and explicit root authorization for controls", () => {
  expect(recorderSource).toMatch(/MAX_COMMAND_TIMEOUT_MS\s*=\s*180_000/);
  expect(recorderSource).toMatch(/MAX_STREAM_BYTES\s*=\s*4 \* 1024 \* 1024/);
  expect(recorderSource).toMatch(
    /RUST_WORKSHOP_INITIALIZED_PREFIX_ARTIFACT_DIR/,
  );
  expect(recorderSource).toMatch(
    /RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED/,
  );
  expect(recorderSource).toMatch(/beforeSpawn|before/);
  expect(recorderSource).toMatch(/after/);
  expect(recorderSource).toMatch(/stdout\.bin/);
  expect(recorderSource).toMatch(/stderr\.bin/);
  expect(recorderSource).toMatch(/record\.json/);
  expect(recorderSource).toMatch(/initialized-prefix-input-hash-v1/);
  expect(recorderSource).toMatch(/consumedConfig/);
  expect(recorderSource).toMatch(/sysrootInputs/);
  expect(recorderSource).toMatch(/createGroup|detached|kill/);
  expect(recorderSource).toMatch(/drainTimedOut/);
  expect(recorderSource).toMatch(/terminationRequested/);
  expect(recorderSource).toMatch(/clearTimers/);
  expect(recorderSource).toMatch(/destroyPipes/);
  expect(recorderSource).toMatch(/rejected-before-spawn/);
  expect(recorderSource).toMatch(/assertWritableEvidencePath/);
  expect(recorderSource).toMatch(/archive-metadata-mismatch-after/);
  expect(recorderSource).toMatch(
    /initialized-prefix-toolchain-qualification-v1/,
  );
  expect(recorderSource).toMatch(/after-recorded-children/);
  expect(recorderSource).toMatch(/compiled-output\.json/);
  expect(recorderSource).toMatch(/initialized-prefix-compiled-output-v1/);
  expect(recorderSource).toMatch(/full version stdout/);
  expect(recorderSource).toMatch(/owned-descendant-liveness-settlement/);
  expect(recorderSource).toMatch(/owned-descendant-owner/);
  expect(recorderSource).toMatch(/phase:'live'/);
  expect(recorderSource).toMatch(/phase:'settled'/);
  expect(recorderSource).toMatch(/qualifiedRustc/);
  expect(recorderSource).toMatch(/isInitializedPrefixVersionStderrAccepted/);
});

it("qualifies fixed tool, config, and sysroot identities without setup or network fallback", () => {
  expect(recorderSource).toMatch(/rustup/);
  expect(recorderSource).toMatch(/cargo-miri/);
  expect(recorderSource).toMatch(/MIRI_SYSROOT/);
  expect(recorderSource).toMatch(/RUSTUP_HOME/);
  expect(recorderSource).toMatch(/1\.85\.0/);
  expect(recorderSource).toMatch(/2026-08-08/);
  expect(recorderSource).toMatch(/--offline/);
  expect(recorderSource).toMatch(/--locked/);
  expect(recorderSource).toMatch(/initialized-prefix-sysroot-v1/);
  expect(recorderSource).toMatch(/complete !== true/);
  expect(recorderSource).toMatch(/RUSTC/);
  expect(recorderSource).toMatch(/RUSTDOC/);
  expect(recorderSource).toMatch(/RUSTUP_TOOLCHAIN/);
  expect(recorderSource).toMatch(/client-negative/);
  expect(recorderSource).toMatch(/client-positive/);
  expect(recorderSource).toMatch(/rejectEffectiveCargoConfig/);
  expect(recorderSource).toMatch(/complete root tree/);
  expect(recorderSource).not.toMatch(
    /rustup\s+(?:toolchain\s+)?(?:install|update|set\s+default)/,
  );
  expect(recorderSource).toMatch(/throw new Error/);
  expect(recorderSource).not.toMatch(/spawn\(["'](?:curl|wget|rustup)["']/);
});

it("accepts the retained stable, MSRV, and pinned-nightly rustup stderr", () => {
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "rustup",
      "info: This is the version for the rustup toolchain manager, not the rustc compiler.\ninfo: the currently active `rustc` version is `rustc 1.99.0 (b940084d7 2026-09-28) (Homebrew)`\n",
    ),
  ).toBe(true);
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "rustup",
      "info: This is the version for the rustup toolchain manager, not the rustc compiler.\ninfo: the currently active `rustc` version is `rustc 1.85.0 (4d91de4e4 2025-02-17)`\n",
    ),
  ).toBe(true);
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "rustup",
      "info: This is the version for the rustup toolchain manager, not the rustc compiler.\ninfo: the currently active `rustc` version is `rustc 1.99.0-nightly (1a98b1e13 2026-08-07)`\n",
    ),
  ).toBe(true);
});

it("keeps version stderr admission bounded to the two known rustup info lines", () => {
  expect(isInitializedPrefixVersionStderrAccepted("rustup", "")).toBe(true);
  expect(isInitializedPrefixVersionStderrAccepted("cargo", "")).toBe(true);
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "cargo",
      "info: This is the version for the rustup toolchain manager, not the rustc compiler.\n",
    ),
  ).toBe(false);
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "rustup",
      "info: This is the version for the rustup toolchain manager, not the rustc compiler.\ninfo: the currently active `rustc` version is `rustc 1.99.0-nightly (1a98b1e13 2026-08-07)`\ninfo: unexpected third line\n",
    ),
  ).toBe(false);
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "rustup",
      "info: syncing channel updates for 'stable-aarch64-apple-darwin'\n",
    ),
  ).toBe(false);
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "rustup",
      "info: the currently active `rustc` version is `rustc 1.99.0-beta (hash 2026-08-07)`\n",
    ),
  ).toBe(false);
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "rustup",
      "info: the currently active `rustc` version is `rustc 1.99.0-dev (hash 2026-08-07)`\n",
    ),
  ).toBe(false);
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "rustup",
      "info: the currently active `rustc` version is `rustc 1.99.0 arbitrary suffix`\n",
    ),
  ).toBe(false);
  expect(
    isInitializedPrefixVersionStderrAccepted(
      "rustup",
      "info: the currently active `rustc` version is `rustc unknown`\n",
    ),
  ).toBe(false);
});

it("keeps harmless recorder controls prepared behind the root authorization gate", () => {
  expect(preparedControlTestNames).toEqual([
    "recorder-control-normal-exit",
    "recorder-control-nonzero-exit",
    "recorder-control-spawn-error",
    "recorder-control-real-spawn-error",
    "recorder-control-partial-timeout",
    "recorder-control-output-limit",
    "recorder-control-repeated-overflow",
    "recorder-control-exact-boundary",
    "recorder-control-parent-exit-late-pipe",
    "recorder-control-descendant-trailing-pipe-timer-cleanup",
    "recorder-control-post-return-owned-descendant-cleanup",
    "recorder-control-owned-descendant-liveness-settlement",
  ]);
  expect(recorderSource).toMatch(
    /RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED/,
  );
  expect(recorderSource).toMatch(/Root must independently authorize/);
});

it("recorder-regression-unqualified-sidecar-admission", async () => {
  const result = await runUnqualifiedSidecarAdmissionRegression();
  if (!result) return;
  expect(result.recorded.record.outcome.spawnError).toMatch(
    /compiled-output-sidecar-admission-failed/,
  );
  expect(result.recorded.record.outcome.exitCode).toBeNull();
  expect(result.recorded.record.guard.ok).toBe(false);
  expect(result.recorded.record.guard.reasons).toContain(
    "compiled-output-sidecar-admission-failed",
  );
});

it("recorder-control-normal-exit", async () => {
  const result = await runControl("recorder-control-normal-exit", [
    "-e",
    "process.stdout.write('normal')",
  ]);
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.exitCode).toBe(0);
  expect(result.recorded.record.outcome.spawnError).toBeNull();
  expect(result.recorded.record.stdout.bytes).toBe(6);
  expect(readFileSync(result.recorded.record.stdout.path)).toEqual(
    Buffer.from("normal"),
  );
  expect(result.recorded.record.guard.ok).toBe(true);
});

it("recorder-control-nonzero-exit", async () => {
  const result = await runControl("recorder-control-nonzero-exit", [
    "-e",
    "process.stderr.write('nonzero'); process.exit(7)",
  ]);
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.exitCode).toBe(7);
  expect(result.recorded.record.outcome.spawnError).toBeNull();
  expect(result.recorded.record.stderr.bytes).toBe(7);
  expect(readFileSync(result.recorded.record.stderr.path)).toEqual(
    Buffer.from("nonzero"),
  );
});

it("recorder-control-spawn-error", async () => {
  const result = await runControl(
    "recorder-control-spawn-error",
    ["-e", "process.exit(0)"],
    { missingExecutable: true },
  );
  if (!result) return;
  expectDurablePacket(result);
  const missing = result.recorded.record;
  expect(missing.outcome.spawnError).toMatch(/missing-executable/);
  expect(missing.outcome.exitCode).toBeNull();
});

it("recorder-control-real-spawn-error", async () => {
  const result = await runControl(
    "recorder-control-real-spawn-error",
    ["-e", "process.exit(0)"],
    { realSpawnError: true },
  );
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.spawnError).toMatch(
    /EACCES|permission|spawn/i,
  );
  expect(result.recorded.record.outcome.exitCode).toBeNull();
});

it("recorder-control-partial-timeout", async () => {
  const result = await runControl(
    "recorder-control-partial-timeout",
    ["-e", "process.stdout.write('partial'); setInterval(() => {}, 1000)"],
    { timeoutMs: 100 },
  );
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.timedOut).toBe(true);
  expect(result.recorded.record.outcome.spawnError).toBeNull();
  expect(result.recorded.record.stdout.bytes).toBeGreaterThan(0);
  expect(readFileSync(result.recorded.record.stdout.path)).toEqual(
    Buffer.from("partial"),
  );
});

it("recorder-control-output-limit", async () => {
  const result = await runControl(
    "recorder-control-output-limit",
    ["-e", "process.stdout.write('x'.repeat(8192))"],
    { maxBytesPerStream: 64 },
  );
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.outputLimit).toBe(true);
  expect(result.recorded.record.stdout.bytes).toBe(64);
  expect(readFileSync(result.recorded.record.stdout.path)).toEqual(
    Buffer.from("x".repeat(64)),
  );
});

it("recorder-control-repeated-overflow", async () => {
  const result = await runControl(
    "recorder-control-repeated-overflow",
    [
      "-e",
      "process.stdout.write('x'.repeat(8192)); setInterval(() => process.stdout.write('y'.repeat(8192)), 1)",
    ],
    { maxBytesPerStream: 64 },
  );
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.outputLimit).toBe(true);
  expect(readFileSync(result.recorded.record.stdout.path)).toEqual(
    Buffer.from("x".repeat(64)),
  );
});

it("recorder-control-exact-boundary", async () => {
  const result = await runControl(
    "recorder-control-exact-boundary",
    ["-e", "process.stdout.write('x'.repeat(64))"],
    { maxBytesPerStream: 64 },
  );
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.outputLimit).toBe(false);
  expect(result.recorded.record.stdout.bytes).toBe(64);
  expect(readFileSync(result.recorded.record.stdout.path)).toEqual(
    Buffer.from("x".repeat(64)),
  );
});

it("recorder-control-parent-exit-late-pipe", async () => {
  const result = await runControl(
    "recorder-control-parent-exit-late-pipe",
    [
      "-e",
      "require('node:child_process').spawn(process.execPath, ['-e', \"setTimeout(() => process.stdout.write('late'), 50)\"], { stdio: ['ignore', 'inherit', 'inherit'] }); process.exit(0)",
    ],
    { timeoutMs: 1_000 },
  );
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.drainTimedOut).toBe(false);
  expect(readFileSync(result.recorded.record.stdout.path)).toEqual(
    Buffer.from("late"),
  );
});

it("recorder-control-descendant-trailing-pipe-timer-cleanup", async () => {
  const result = await runControl(
    "recorder-control-descendant-trailing-pipe-timer-cleanup",
    [
      "-e",
      "require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' }); process.exit(0)",
    ],
    { timeoutMs: 5_000 },
  );
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.drainTimedOut).toBe(true);
});

it("recorder-control-post-return-owned-descendant-cleanup", async () => {
  const result = await runControl(
    "recorder-control-post-return-owned-descendant-cleanup",
    [
      "-e",
      "require('node:child_process').spawn(process.execPath, ['-e', \"setTimeout(() => process.stdout.write('owned'), 25)\"], { stdio: 'inherit' }); process.exit(0)",
    ],
  );
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.drainTimedOut).toBe(false);
  expect(readFileSync(result.recorded.record.stdout.path)).toEqual(
    Buffer.from("owned"),
  );
});

it("recorder-control-owned-descendant-liveness-settlement", async () => {
  const result = await runControl(
    "recorder-control-owned-descendant-liveness-settlement",
    [
      "-e",
      "const fs=require('node:fs'); const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e',\"const fs=require('node:fs'); const p=process.cwd()+'/controls/owned-descendant-liveness.json'; const signal0=(pid)=>{try{process.kill(pid,0);return true}catch{return false}}; const liveSignal0=signal0(process.pid); fs.writeFileSync(p, JSON.stringify({schema:'initialized-prefix-owned-descendant-liveness-v1',pid:process.pid,phase:'live',signal0:liveSignal0})); if(process.send) process.send({phase:'live',pid:process.pid,signal0:liveSignal0}); process.on('SIGTERM', () => { fs.writeFileSync(process.cwd()+'/controls/owned-descendant-settlement.json', JSON.stringify({schema:'initialized-prefix-owned-descendant-settlement-v1',pid:process.pid,phase:'settled',signal:'SIGTERM'})); process.exit(0); }); setInterval(() => {}, 1000)\"],{stdio:['ignore','inherit','inherit','ipc']}); child.on('message',(message)=>{if(message&&message.phase==='live'&&message.pid===child.pid){const ownerLiveSignal0=(()=>{try{process.kill(process.pid,0);return true}catch{return false}})(); const descendantLiveSignal0=(()=>{try{process.kill(child.pid,0);return true}catch{return false}})(); fs.writeFileSync(process.cwd()+'/controls/owned-descendant-owner.json', JSON.stringify({schema:'initialized-prefix-owned-descendant-owner-v1',owner:process.pid,descendant:child.pid,ownerLiveSignal0,descendantLiveSignal0,groupInference:{measured:false,owner:'detached-direct-top-level-spawn',descendant:'inherited-child-group'}})); process.exit(0)}}); setInterval(() => {}, 1000)",
    ],
    { timeoutMs: 100 },
  );
  if (!result) return;
  expectDurablePacket(result);
  expect(result.recorded.record.outcome.timedOut).toBe(true);
  expect(result.recorded.record.outcome.spawnError).toBeNull();
  const owner = JSON.parse(
    readFileSync(
      join(result.attempt, "controls/owned-descendant-owner.json"),
      "utf8",
    ),
  ) as {
    schema?: unknown;
    owner?: unknown;
    descendant?: unknown;
    ownerLiveSignal0?: unknown;
    descendantLiveSignal0?: unknown;
    groupInference?: {
      measured?: unknown;
      owner?: unknown;
      descendant?: unknown;
    };
  };
  expect(owner.schema).toBe("initialized-prefix-owned-descendant-owner-v1");
  const ownerPid = boundedFixturePid(owner.owner);
  const descendantPid = boundedFixturePid(owner.descendant);
  expect(owner.ownerLiveSignal0).toBe(true);
  expect(owner.descendantLiveSignal0).toBe(true);
  expect(owner.groupInference).toEqual({
    measured: false,
    owner: "detached-direct-top-level-spawn",
    descendant: "inherited-child-group",
  });
  const livePath = join(
    result.attempt,
    "controls/owned-descendant-liveness.json",
  );
  const settlementPath = join(
    result.attempt,
    "controls/owned-descendant-settlement.json",
  );
  const live = JSON.parse(readFileSync(livePath, "utf8")) as {
    schema?: unknown;
    pid?: unknown;
    phase?: unknown;
    signal0?: unknown;
  };
  const settlement = JSON.parse(readFileSync(settlementPath, "utf8")) as {
    schema?: unknown;
    pid?: unknown;
    phase?: unknown;
    signal?: unknown;
  };
  expect(live).toEqual({
    schema: "initialized-prefix-owned-descendant-liveness-v1",
    pid: descendantPid,
    phase: "live",
    signal0: true,
  });
  expect(settlement).toEqual({
    schema: "initialized-prefix-owned-descendant-settlement-v1",
    pid: descendantPid,
    phase: "settled",
    signal: "SIGTERM",
  });
  await expectAbsentBySignal0(ownerPid);
  await expectAbsentBySignal0(descendantPid);
  const ownerBytes = readFileSync(
    join(result.attempt, "controls/owned-descendant-owner.json"),
  );
  const liveBytes = readFileSync(livePath);
  const settlementBytes = readFileSync(settlementPath);
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(
    readFileSync(join(result.attempt, "controls/owned-descendant-owner.json")),
  ).toEqual(ownerBytes);
  expect(readFileSync(livePath)).toEqual(liveBytes);
  expect(readFileSync(settlementPath)).toEqual(settlementBytes);
});
