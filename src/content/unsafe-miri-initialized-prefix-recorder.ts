import {
  accessSync,
  constants as fsConstants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  delimiter,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { spawn } from "node:child_process";
import type {
  PrefixArchivedInput,
  PrefixCommandRecord,
  PrefixCommandSpec,
  PrefixFileRef,
  PrefixMode,
  PrefixOutcome,
  PrefixRecordedCommand,
  PrefixToolchainBinding,
} from "./unsafe-miri-initialized-prefix-proof";

const MAX_COMMAND_TIMEOUT_MS = 180_000;
const MAX_STREAM_BYTES = 4 * 1024 * 1024;
const PIPE_DRAIN_TIMEOUT_MS = 2_000;
const TERM_GRACE_MS = 1_000;
const EXACT_MS_RV = "1.85.0";
const PINNED_NIGHTLY = "nightly-2026-08-08";
const CARGO_OFFLINE_FLAGS = ["--offline", "--locked"] as const;
const TARGET_OPERATIONS = new Set<PrefixCommandSpec["operation"]>([
  "compile",
  "tests-full",
  "tests-named",
  "miri-positive",
  "miri-ub",
  "miri-sound",
  "client-negative",
  "client-positive",
]);
const BOOTSTRAP_OPERATIONS = new Set<PrefixCommandSpec["operation"]>([
  "tool-locate",
  "tool-version",
]);
const KNOWN_OPERATIONS = new Set<PrefixCommandSpec["operation"]>([
  ...TARGET_OPERATIONS,
  ...BOOTSTRAP_OPERATIONS,
]);
const CONTROL_AUTHORIZATION_ENV =
  "RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED";
const CONTROL_IDS = new Set([
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
const ATTEMPT_SCHEMA = "initialized-prefix-attempt-v1";
const COMPILED_OUTPUT_SCHEMA = "initialized-prefix-compiled-output-v1";
const TOOLCHAIN_QUALIFICATION_ENV =
  "RUST_WORKSHOP_INITIALIZED_PREFIX_TOOLCHAIN_QUALIFICATION";
const ALLOWED_ENV_KEYS = new Set([
  "CARGO_BUILD_TARGET",
  "CARGO_HOME",
  "CARGO_NET_OFFLINE",
  "CARGO_TARGET_DIR",
  "HOME",
  "MIRI_SYSROOT",
  "PATH",
  "RUSTFLAGS",
  "RUSTC",
  "RUSTDOC",
  "RUSTUP_TOOLCHAIN",
  "RUSTUP_HOME",
  "TMPDIR",
  CONTROL_AUTHORIZATION_ENV,
  TOOLCHAIN_QUALIFICATION_ENV,
]);

type CaptureState = {
  stdout: Buffer;
  stderr: Buffer;
  outcome: PrefixOutcome;
};

function assertMode(mode: PrefixMode): void {
  if (mode !== "stable" && mode !== "msrv" && mode !== "miri") {
    throw new Error(`unsupported initialized-prefix mode: ${String(mode)}`);
  }
}

function assertAbsolutePath(path: string, label: string): string {
  const absolute = resolve(path);
  if (!isAbsolute(path)) {
    throw new Error(`${label} must be an absolute path: ${path}`);
  }
  return absolute;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function fileRef(path: string): PrefixFileRef {
  const absolute = assertAbsolutePath(path, "file path");
  const bytes = readFileSync(absolute);
  return { path: absolute, bytes: bytes.byteLength, sha256: sha256(bytes) };
}

function fileRefOrThrow(path: string, label: string): PrefixFileRef {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`${label} is missing: ${path}`);
  }
  return fileRef(path);
}

function assertWritableEvidencePath(root: string, candidate: string): void {
  const rootAbsolute = resolve(root);
  const rootReal = realpathSync(rootAbsolute);
  const target = resolve(candidate);
  if (!pathWithin(rootAbsolute, target))
    throw new Error(`evidence write escapes attempt root: ${target}`);
  let parent = dirname(target);
  while (!existsSync(parent)) {
    const next = dirname(parent);
    if (next === parent) break;
    parent = next;
  }
  if (!pathWithin(rootReal, realpathSync(parent)))
    throw new Error(`evidence parent escapes attempt root: ${parent}`);
  if (existsSync(target) && lstatSync(target).isSymbolicLink())
    throw new Error(`evidence write target is a symlink: ${target}`);
}

function writeExclusive(
  path: string,
  value: Uint8Array | string,
  evidenceRoot?: string,
): void {
  if (evidenceRoot) assertWritableEvidencePath(evidenceRoot, path);
  writeFileSync(path, value, { flag: "wx" });
}

function writeJson(path: string, value: unknown, evidenceRoot?: string): void {
  writeExclusive(path, `${JSON.stringify(value, null, 2)}\n`, evidenceRoot);
}

function sanitizeId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) {
    throw new Error(`unsafe command identifier: ${value}`);
  }
  return value;
}

function attemptBase(options: { evidenceDirectory?: string }): string {
  const configured =
    options.evidenceDirectory ??
    process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_ARTIFACT_DIR ??
    join(tmpdir(), "rust-workshop-initialized-prefix");
  const base = resolve(configured);
  mkdirSync(base, { recursive: true });
  return base;
}

export function createInitializedPrefixAttempt(options: {
  mode: PrefixMode;
  evidenceDirectory?: string;
}): string {
  assertMode(options.mode);
  const attempt = mkdtempSync(
    join(attemptBase(options), `attempt-${options.mode}-`),
  );
  for (const directory of [
    "commands",
    "artifacts",
    "toolchain",
    "controls",
    "private-home",
    "private-cargo",
    "private-target",
    "private-tmp",
  ]) {
    mkdirSync(join(attempt, directory), { recursive: false });
  }
  writeJson(
    join(attempt, "attempt.json"),
    {
      schema: ATTEMPT_SCHEMA,
      mode: options.mode,
      createdAt: new Date().toISOString(),
      controls: {
        authorizationEnv:
          "RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED",
        authorized: false,
        note: "Root must independently authorize harmless recorder child controls.",
      },
    },
    attempt,
  );
  return attempt;
}

function safeEnvironment(
  environment: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(environment)) {
    if (
      !ALLOWED_ENV_KEYS.has(key) ||
      /secret|token|password|private[_-]?key|aws/i.test(key)
    ) {
      throw new Error(
        `environment key is not allowed in durable evidence: ${key}`,
      );
    }
    result[key] = value;
  }
  return result;
}

function ensureAttempt(attemptDirectory: string): string {
  const attempt = assertAbsolutePath(attemptDirectory, "attempt directory");
  if (!existsSync(join(attempt, "attempt.json"))) {
    throw new Error(`not an initialized-prefix attempt: ${attempt}`);
  }
  return attempt;
}

function attemptMode(attempt: string): PrefixMode {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(join(attempt, "attempt.json"), "utf8"));
  } catch (error) {
    throw new Error(
      `invalid initialized-prefix attempt metadata: ${String(error)}`,
    );
  }
  if (
    !value ||
    typeof value !== "object" ||
    (value as { schema?: unknown }).schema !== ATTEMPT_SCHEMA
  )
    throw new Error("initialized-prefix attempt schema is invalid");
  const mode = (value as { mode?: unknown }).mode;
  assertMode(mode as PrefixMode);
  return mode as PrefixMode;
}

function pathWithin(root: string, candidate: string): boolean {
  const relativePath = relative(resolve(root), resolve(candidate));
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
}

function canonicalPathWithin(root: string, candidate: string): boolean {
  const rootReal = realpathSync(resolve(root));
  let existing = resolve(candidate);
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) return false;
    existing = parent;
  }
  return pathWithin(rootReal, realpathSync(existing));
}

const CONTROL_ARGV: ReadonlyMap<string, readonly string[]> = new Map([
  ["recorder-control-normal-exit", ["-e", "process.stdout.write('normal')"]],
  [
    "recorder-control-nonzero-exit",
    ["-e", "process.stderr.write('nonzero'); process.exit(7)"],
  ],
  ["recorder-control-spawn-error", ["-e", "process.exit(0)"]],
  ["recorder-control-real-spawn-error", ["-e", "process.exit(0)"]],
  [
    "recorder-control-partial-timeout",
    ["-e", "process.stdout.write('partial'); setInterval(() => {}, 1000)"],
  ],
  [
    "recorder-control-output-limit",
    ["-e", "process.stdout.write('x'.repeat(8192))"],
  ],
  [
    "recorder-control-repeated-overflow",
    [
      "-e",
      "process.stdout.write('x'.repeat(8192)); setInterval(() => process.stdout.write('y'.repeat(8192)), 1)",
    ],
  ],
  [
    "recorder-control-exact-boundary",
    ["-e", "process.stdout.write('x'.repeat(64))"],
  ],
  [
    "recorder-control-parent-exit-late-pipe",
    [
      "-e",
      "require('node:child_process').spawn(process.execPath, ['-e', \"setTimeout(() => process.stdout.write('late'), 50)\"], { stdio: ['ignore', 'inherit', 'inherit'] }); process.exit(0)",
    ],
  ],
  [
    "recorder-control-descendant-trailing-pipe-timer-cleanup",
    [
      "-e",
      "require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' }); process.exit(0)",
    ],
  ],
  [
    "recorder-control-post-return-owned-descendant-cleanup",
    [
      "-e",
      "require('node:child_process').spawn(process.execPath, ['-e', \"setTimeout(() => process.stdout.write('owned'), 25)\"], { stdio: 'inherit' }); process.exit(0)",
    ],
  ],
  [
    "recorder-control-owned-descendant-liveness-settlement",
    [
      "-e",
      "const fs=require('node:fs'); const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e',\"const fs=require('node:fs'); const p=process.cwd()+'/controls/owned-descendant-liveness.json'; const signal0=(pid)=>{try{process.kill(pid,0);return true}catch{return false}}; const liveSignal0=signal0(process.pid); fs.writeFileSync(p, JSON.stringify({schema:'initialized-prefix-owned-descendant-liveness-v1',pid:process.pid,phase:'live',signal0:liveSignal0})); if(process.send) process.send({phase:'live',pid:process.pid,signal0:liveSignal0}); process.on('SIGTERM', () => { fs.writeFileSync(process.cwd()+'/controls/owned-descendant-settlement.json', JSON.stringify({schema:'initialized-prefix-owned-descendant-settlement-v1',pid:process.pid,phase:'settled',signal:'SIGTERM'})); process.exit(0); }); setInterval(() => {}, 1000)\"],{stdio:['ignore','inherit','inherit','ipc']}); child.on('message',(message)=>{if(message&&message.phase==='live'&&message.pid===child.pid){const ownerLiveSignal0=(()=>{try{process.kill(process.pid,0);return true}catch{return false}})(); const descendantLiveSignal0=(()=>{try{process.kill(child.pid,0);return true}catch{return false}})(); fs.writeFileSync(process.cwd()+'/controls/owned-descendant-owner.json', JSON.stringify({schema:'initialized-prefix-owned-descendant-owner-v1',owner:process.pid,descendant:child.pid,ownerLiveSignal0,descendantLiveSignal0,groupInference:{measured:false,owner:'detached-direct-top-level-spawn',descendant:'inherited-child-group'}})); process.exit(0)}}); setInterval(() => {}, 1000)",
    ],
  ],
]);

function isAuthorizedControlSpec(
  attempt: string,
  spec: PrefixCommandSpec,
): boolean {
  if (
    spec.operation !== "client-positive" ||
    !CONTROL_IDS.has(spec.id) ||
    spec.recipeId !== spec.id ||
    spec.mode !== attemptMode(attempt) ||
    spec.env[CONTROL_AUTHORIZATION_ENV] !== "1" ||
    (spec.executable.path !== process.execPath &&
      spec.id !== "recorder-control-real-spawn-error")
  )
    return false;
  const expectedArgv = CONTROL_ARGV.get(spec.id);
  if (!expectedArgv || expectedArgv.length !== spec.argv.length) return false;
  if (expectedArgv.some((value, index) => value !== spec.argv[index]))
    return false;
  if (
    !canonicalPathWithin(attempt, spec.cwd) ||
    resolve(spec.cwd) !== resolve(attempt)
  )
    return false;
  if (spec.inputs.length !== 1 || spec.externalInputs.length !== 0)
    return false;
  const fixture = spec.inputs[0];
  if (
    !fixture ||
    resolve(fixture.path) !== join(attempt, "controls", `${spec.id}.fixture`)
  )
    return false;
  try {
    if (lstatSync(fixture.path).isSymbolicLink()) return false;
    const actual = fileRef(fixture.path);
    if (actual.bytes !== fixture.bytes || actual.sha256 !== fixture.sha256)
      return false;
  } catch {
    return false;
  }
  if (spec.id === "recorder-control-real-spawn-error") {
    try {
      const actual = fileRef(spec.executable.path);
      return (
        resolve(spec.executable.path) ===
          join(attempt, "controls", "non-executable-fixture") &&
        actual.bytes === spec.executable.bytes &&
        actual.sha256 === spec.executable.sha256 &&
        !lstatSync(spec.executable.path).isSymbolicLink() &&
        (statSync(spec.executable.path).mode & 0o111) === 0
      );
    } catch {
      return false;
    }
  }
  return true;
}

function validatePrivateEnvironment(
  attempt: string,
  env: Readonly<Record<string, string>>,
): string[] {
  const reasons: string[] = [];
  for (const key of [
    "HOME",
    "CARGO_HOME",
    "CARGO_TARGET_DIR",
    "TMPDIR",
  ] as const) {
    const value = env[key];
    if (!value || !canonicalPathWithin(attempt, value))
      reasons.push(`env-${key}-outside-attempt`);
  }
  for (const key of [
    "HOME",
    "CARGO_HOME",
    "CARGO_TARGET_DIR",
    "TMPDIR",
  ] as const) {
    const value = env[key];
    try {
      if (value && existsSync(value) && lstatSync(value).isSymbolicLink())
        reasons.push(`env-${key}-symlink`);
    } catch {
      reasons.push(`env-${key}-unreadable`);
    }
  }
  return reasons;
}

function validateTargetToolClosure(
  attempt: string,
  spec: PrefixCommandSpec,
  reasons: string[],
): void {
  const bindingRef = spec.toolchainBinding;
  if (!bindingRef) {
    reasons.push("missing-toolchain-binding");
    return;
  }
  try {
    const actualBindingRef = fileRef(bindingRef.path);
    if (
      actualBindingRef.bytes !== bindingRef.bytes ||
      actualBindingRef.sha256 !== bindingRef.sha256
    ) {
      reasons.push("toolchain-binding-hash-mismatch");
      return;
    }
    const binding = JSON.parse(readFileSync(bindingRef.path, "utf8")) as {
      executables?: Record<string, PrefixFileRef>;
      config?: PrefixFileRef;
      env?: Readonly<Record<string, string>>;
    };
    const executableMatches = Object.values(binding.executables ?? {}).some(
      (candidate) =>
        candidate.path === spec.executable.path &&
        candidate.bytes === spec.executable.bytes &&
        candidate.sha256 === spec.executable.sha256,
    );
    if (
      !executableMatches &&
      !validateCompiledOutputAdmission(attempt, spec, binding, reasons)
    )
      reasons.push("executable-not-in-toolchain-binding");
    const config = binding.config;
    if (
      !config ||
      !spec.inputs.some(
        (input) =>
          input.path === config.path &&
          input.bytes === config.bytes &&
          input.sha256 === config.sha256,
      )
    )
      reasons.push("consumed-config-not-archived-input");
    for (const key of ["RUSTUP_TOOLCHAIN", "RUSTC", "RUSTDOC"] as const) {
      if (!binding.env || spec.env[key] !== binding.env[key])
        reasons.push(`toolchain-env-mismatch:${key}`);
    }
    const specEnvKeys = Object.keys(spec.env).sort();
    const bindingEnvKeys = Object.keys(binding.env ?? {}).sort();
    if (JSON.stringify(specEnvKeys) !== JSON.stringify(bindingEnvKeys))
      reasons.push("toolchain-env-key-set-mismatch");
    else if (
      binding.env &&
      specEnvKeys.some((key) => spec.env[key] !== binding.env?.[key])
    )
      reasons.push("toolchain-env-value-mismatch");
  } catch (error) {
    reasons.push(
      `toolchain-binding-unreadable:${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function compileOutputPath(spec: PrefixCommandSpec): string | undefined {
  if (spec.operation !== "compile" && spec.operation !== "client-positive")
    return undefined;
  const executableName = basename(spec.executable.path).replace(/\.exe$/i, "");
  if (executableName !== "rustc") return undefined;
  for (let index = 0; index < spec.argv.length; index += 1) {
    const argument = spec.argv[index];
    if (argument === "-o") {
      const value = spec.argv[index + 1];
      if (value) return resolve(spec.cwd, value);
    }
    if (argument.startsWith("-o="))
      return resolve(spec.cwd, argument.slice(argument.indexOf("=") + 1));
  }
  return undefined;
}

function authoredCompileSource(
  spec: PrefixCommandSpec,
): PrefixFileRef | undefined {
  const candidates = spec.inputs.filter((input) => {
    if (!/\.rs$/i.test(input.path)) return false;
    const relativePath = relative(spec.cwd, input.path);
    return spec.argv.some(
      (argument) => argument === input.path || argument === relativePath,
    );
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}

function exactFileRef(value: unknown): value is PrefixFileRef {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as PrefixFileRef).path === "string" &&
    Number.isSafeInteger((value as PrefixFileRef).bytes) &&
    typeof (value as PrefixFileRef).sha256 === "string"
  );
}

function sameFileRef(
  left: PrefixFileRef | undefined,
  right: PrefixFileRef | undefined,
): boolean {
  return (
    !!left &&
    !!right &&
    left.path === right.path &&
    left.bytes === right.bytes &&
    left.sha256 === right.sha256
  );
}

function sameEnvironment(
  left: Readonly<Record<string, string>> | undefined,
  right: Readonly<Record<string, string>> | undefined,
): boolean {
  if (!left || !right) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    JSON.stringify(leftKeys) === JSON.stringify(rightKeys) &&
    leftKeys.every((key) => left[key] === right[key])
  );
}

function validateCompiledOutputAdmission(
  attempt: string,
  spec: PrefixCommandSpec,
  binding: {
    executables?: Record<string, PrefixFileRef>;
    config?: PrefixFileRef;
    env?: Readonly<Record<string, string>>;
  },
  reasons: string[],
): boolean {
  const targetExecutable = spec.executable;
  const targetBinding = spec.toolchainBinding;
  let admitted = false;
  let commandDirectories: string[] = [];
  try {
    commandDirectories = readdirSync(join(attempt, "commands"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(attempt, "commands", entry.name));
  } catch {
    reasons.push("compiled-output-command-inventory-unreadable");
    return false;
  }
  for (const commandDirectory of commandDirectories) {
    const sidecarPath = join(commandDirectory, "compiled-output.json");
    if (!existsSync(sidecarPath)) continue;
    try {
      if (lstatSync(sidecarPath).isSymbolicLink()) continue;
      const sidecarRef = fileRef(sidecarPath);
      const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as {
        schema?: unknown;
        command?: unknown;
        source?: unknown;
        output?: unknown;
      };
      if (
        sidecar.schema !== COMPILED_OUTPUT_SCHEMA ||
        !exactFileRef(sidecar.command) ||
        !exactFileRef(sidecar.source) ||
        !exactFileRef(sidecar.output)
      )
        continue;
      if (
        sidecar.command.path !== join(commandDirectory, "record.json") ||
        !pathWithin(attempt, sidecar.command.path) ||
        !spec.inputs
          .concat(spec.externalInputs)
          .some(
            (input) =>
              input.path === sidecarRef.path &&
              input.bytes === sidecarRef.bytes &&
              input.sha256 === sidecarRef.sha256,
          )
      )
        continue;
      const commandRecordRef = fileRef(sidecar.command.path);
      if (
        commandRecordRef.bytes !== sidecar.command.bytes ||
        commandRecordRef.sha256 !== sidecar.command.sha256
      )
        continue;
      const commandRecord = JSON.parse(
        readFileSync(sidecar.command.path, "utf8"),
      ) as {
        schema?: unknown;
        spec?: PrefixCommandSpec;
        outcome?: PrefixOutcome;
        guard?: { ok?: unknown };
      };
      const compileSpec = commandRecord.spec;
      const outputPath = compileSpec && compileOutputPath(compileSpec);
      const qualifiedRustc = binding.executables?.rustc;
      const compileExecutable = compileSpec
        ? fileRef(compileSpec.executable.path)
        : undefined;
      if (
        commandRecord.schema !== "initialized-prefix-command-v1" ||
        !compileSpec ||
        !commandRecord.guard?.ok ||
        commandRecord.outcome?.exitCode !== 0 ||
        commandRecord.outcome.signal !== null ||
        commandRecord.outcome.spawnError !== null ||
        commandRecord.outcome.timedOut ||
        commandRecord.outcome.outputLimit ||
        commandRecord.outcome.drainTimedOut ||
        !outputPath ||
        resolve(outputPath) !== resolve(sidecar.output.path) ||
        !sameFileRef(compileSpec.executable, qualifiedRustc) ||
        !sameFileRef(compileExecutable, qualifiedRustc) ||
        compileSpec.mode !== spec.mode ||
        compileSpec.cwd !== spec.cwd ||
        !sameFileRef(compileSpec.toolchainBinding, spec.toolchainBinding) ||
        !sameEnvironment(compileSpec.env, binding.env) ||
        !sameEnvironment(compileSpec.env, spec.env) ||
        !targetBinding ||
        !compileSpec.inputs.some((input) => sameFileRef(input, targetBinding))
      )
        continue;
      const source = authoredCompileSource(compileSpec);
      if (
        !source ||
        source.path !== sidecar.source.path ||
        source.bytes !== sidecar.source.bytes ||
        source.sha256 !== sidecar.source.sha256 ||
        !spec.inputs.some(
          (input) =>
            input.path === source.path &&
            input.bytes === source.bytes &&
            input.sha256 === source.sha256,
        )
      )
        continue;
      if (
        !binding.config ||
        !compileSpec.inputs.some(
          (input) =>
            input.path === binding.config?.path &&
            input.bytes === binding.config?.bytes &&
            input.sha256 === binding.config?.sha256,
        ) ||
        !spec.inputs.some(
          (input) =>
            input.path === binding.config?.path &&
            input.bytes === binding.config?.bytes &&
            input.sha256 === binding.config?.sha256,
        )
      )
        continue;
      const actualOutput = fileRefOrThrow(
        sidecar.output.path,
        "compiled output",
      );
      if (
        actualOutput.bytes !== sidecar.output.bytes ||
        actualOutput.sha256 !== sidecar.output.sha256 ||
        lstatSync(actualOutput.path).isSymbolicLink() ||
        !canonicalPathWithin(attempt, actualOutput.path)
      )
        continue;
      if (
        targetExecutable.path !== actualOutput.path ||
        targetExecutable.bytes !== actualOutput.bytes ||
        targetExecutable.sha256 !== actualOutput.sha256
      )
        continue;
      admitted = true;
      break;
    } catch {
      // A malformed sidecar is not an admission; continue checking retained entries.
    }
  }
  if (!admitted) reasons.push("compiled-output-sidecar-admission-failed");
  return admitted;
}

function validateCommandSpec(
  attempt: string,
  mode: PrefixMode,
  spec: PrefixCommandSpec,
): {
  spec?: PrefixCommandSpec;
  reasons: string[];
} {
  const reasons: string[] = [];
  const authorizedControl = isAuthorizedControlSpec(attempt, spec);
  const isTarget = TARGET_OPERATIONS.has(spec.operation) && !authorizedControl;
  if (!KNOWN_OPERATIONS.has(spec.operation)) reasons.push("unknown-operation");
  if (spec.mode !== mode) reasons.push("spec-mode-mismatch");
  if (BOOTSTRAP_OPERATIONS.has(spec.operation) && spec.toolchainBinding)
    reasons.push("bootstrap-command-has-toolchain-binding");
  const timeoutMs = spec.timeoutMs ?? MAX_COMMAND_TIMEOUT_MS;
  const maxBytesPerStream = spec.maxBytesPerStream ?? MAX_STREAM_BYTES;
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > MAX_COMMAND_TIMEOUT_MS
  )
    reasons.push("invalid-timeout-bound");
  if (
    !Number.isSafeInteger(maxBytesPerStream) ||
    maxBytesPerStream < 1 ||
    maxBytesPerStream > MAX_STREAM_BYTES
  )
    reasons.push("invalid-stream-bound");
  try {
    if (
      !isAbsolute(spec.cwd) ||
      !existsSync(spec.cwd) ||
      !statSync(spec.cwd).isDirectory() ||
      !canonicalPathWithin(attempt, spec.cwd) ||
      resolve(spec.cwd) !== resolve(attempt)
    )
      reasons.push("invalid-cwd");
  } catch {
    reasons.push("invalid-cwd");
  }
  let executableIsFile = false;
  try {
    executableIsFile =
      isAbsolute(spec.executable.path) &&
      existsSync(spec.executable.path) &&
      statSync(spec.executable.path).isFile();
  } catch {
    executableIsFile = false;
  }
  if (!executableIsFile) {
    reasons.push("missing-executable");
  } else {
    try {
      const actualExecutable = fileRef(spec.executable.path);
      if (
        actualExecutable.bytes !== spec.executable.bytes ||
        actualExecutable.sha256 !== spec.executable.sha256
      )
        reasons.push("executable-hash-mismatch");
    } catch {
      reasons.push("unreadable-executable");
    }
  }
  for (const source of [...spec.inputs, ...spec.externalInputs]) {
    if (!isAbsolute(source.path)) reasons.push(`relative-input:${source.path}`);
  }
  try {
    const env = safeEnvironment(spec.env);
    reasons.push(...validatePrivateEnvironment(attempt, env));
    if (isTarget) {
      for (const key of ["RUSTUP_TOOLCHAIN", "RUSTC", "RUSTDOC"] as const)
        if (!env[key]) reasons.push(`missing-${key}`);
    }
  } catch (error) {
    reasons.push(
      `unsafe-environment:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    requireOfflineLocked(spec);
  } catch (error) {
    reasons.push(
      `recipe-policy:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (isTarget) {
    if (!spec.toolchainBinding) reasons.push("missing-toolchain-binding");
    else if (
      !spec.inputs.some(
        (input) =>
          input.path === spec.toolchainBinding?.path &&
          input.sha256 === spec.toolchainBinding.sha256 &&
          input.bytes === spec.toolchainBinding.bytes,
      )
    )
      reasons.push("toolchain-binding-not-archived-input");
    validateTargetToolClosure(attempt, spec, reasons);
    if (spec.env.CARGO_NET_OFFLINE !== "true")
      reasons.push("target-not-offline");
    const executableName = basename(spec.executable.path).replace(
      /\.exe$/i,
      "",
    );
    if (
      (executableName === "cargo" || executableName === "cargo-miri") &&
      !spec.inputs.some((input) => /(?:^|[/\\])Cargo\.lock$/i.test(input.path))
    )
      reasons.push("cargo-lock-not-archived-input");
  }
  return reasons.length > 0
    ? { reasons }
    : {
        reasons,
        spec: {
          ...spec,
          timeoutMs,
          maxBytesPerStream,
          env: safeEnvironment(spec.env),
        },
      };
}

function receiptSpec(spec: PrefixCommandSpec): PrefixCommandSpec {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(spec.env ?? {}))
    env[key] =
      ALLOWED_ENV_KEYS.has(key) &&
      !/secret|token|password|private[_-]?key|aws/i.test(key)
        ? value
        : "<redacted>";
  return { ...spec, env };
}

function rejectedCommandReceipt(
  attempt: string,
  spec: PrefixCommandSpec,
  reasons: readonly string[],
): PrefixRecordedCommand {
  const commandDirectory = mkdtempSync(join(attempt, "commands", "rejected-"));
  const rawDirectory = join(commandDirectory, "raw");
  mkdirSync(rawDirectory);
  const now = new Date().toISOString();
  const rejectionKind = reasons.some((reason) =>
    reason.startsWith("setup-failure-"),
  )
    ? "setup-failure-before-spawn"
    : "rejected-before-spawn";
  const outcome: PrefixOutcome = {
    exitCode: null,
    signal: null,
    spawnError: `${rejectionKind}:${reasons.join(";")}`,
    timedOut: false,
    outputLimit: false,
    drainTimedOut: false,
  };
  writeExclusive(join(rawDirectory, "stdout.bin"), Buffer.alloc(0), attempt);
  writeExclusive(join(rawDirectory, "stderr.bin"), Buffer.alloc(0), attempt);
  writeJson(join(commandDirectory, "status.json"), outcome, attempt);
  const record: PrefixCommandRecord = {
    schema: "initialized-prefix-command-v1",
    spec: receiptSpec(spec),
    startedAt: now,
    finishedAt: new Date().toISOString(),
    outcome,
    stdout: fileRef(join(rawDirectory, "stdout.bin")),
    stderr: fileRef(join(rawDirectory, "stderr.bin")),
    before: [],
    after: [],
    guard: { ok: false, reasons },
  };
  const recordPath = join(commandDirectory, "record.json");
  writeJson(recordPath, record, attempt);
  return { record, ref: fileRef(recordPath) };
}

function archiveOne(
  source: PrefixFileRef,
  destination: string,
  evidenceRoot: string,
  reasons: string[],
): PrefixArchivedInput | undefined {
  let inputPath = source.path;
  try {
    inputPath = assertAbsolutePath(source.path, "input");
    if (!existsSync(inputPath)) {
      reasons.push(`missing-before:${inputPath}`);
      return undefined;
    }
    if (!statSync(inputPath).isFile()) {
      reasons.push(`input-not-file:${inputPath}`);
      return undefined;
    }
    const actual = fileRef(inputPath);
    if (actual.bytes !== source.bytes || actual.sha256 !== source.sha256) {
      reasons.push(`input-mismatch-before:${inputPath}`);
    }
    const label = `${
      basename(inputPath)
        .replaceAll(/[^A-Za-z0-9._-]/g, "_")
        .slice(0, 64) || "input"
    }-${sha256(Buffer.from(inputPath)).slice(0, 12)}`;
    const archivePath = join(
      destination,
      `${sanitizeId(label)}-${actual.sha256}.bin`,
    );
    assertWritableEvidencePath(evidenceRoot, archivePath);
    copyFileSync(inputPath, archivePath, fsConstants.COPYFILE_EXCL);
    const archived = fileRef(archivePath);
    if (archived.bytes !== actual.bytes || archived.sha256 !== actual.sha256)
      reasons.push(`archive-mismatch-before:${inputPath}`);
    return { input: actual, archive: archived };
  } catch (error) {
    reasons.push(
      `archive-before-failure:${inputPath}:${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function archiveMetadata(
  source: PrefixFileRef,
  destination: string,
  evidenceRoot: string,
  kind: "executable" | "external-input",
  reasons: string[],
): PrefixArchivedInput | undefined {
  let inputPath = source.path;
  try {
    inputPath = assertAbsolutePath(source.path, "external input");
    if (!existsSync(inputPath)) {
      reasons.push(`missing-before:${inputPath}`);
      return undefined;
    }
    if (!statSync(inputPath).isFile()) {
      reasons.push(`input-not-file:${inputPath}`);
      return undefined;
    }
    const actual = fileRef(inputPath);
    if (actual.bytes !== source.bytes || actual.sha256 !== source.sha256) {
      reasons.push(`input-mismatch-before:${inputPath}`);
    }
    const label = `${
      basename(inputPath)
        .replaceAll(/[^A-Za-z0-9._-]/g, "_")
        .slice(0, 64) || "input"
    }-${sha256(Buffer.from(inputPath)).slice(0, 12)}`;
    const archivePath = join(
      destination,
      `${sanitizeId(`${kind}-${label}`)}-${actual.sha256}.json`,
    );
    assertWritableEvidencePath(evidenceRoot, archivePath);
    writeJson(
      archivePath,
      {
        schema: "initialized-prefix-input-hash-v1",
        kind,
        input: actual,
      },
      evidenceRoot,
    );
    return { input: actual, archive: fileRef(archivePath) };
  } catch (error) {
    reasons.push(
      `archive-before-failure:${inputPath}:${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function archiveAfter(
  before: readonly PrefixArchivedInput[],
  destination: string,
  evidenceRoot: string,
  metadataKinds: ReadonlyMap<string, "executable" | "external-input">,
  reasons: string[],
): PrefixArchivedInput[] {
  const after: PrefixArchivedInput[] = [];
  for (const archived of before) {
    const inputPath = archived.input.path;
    try {
      if (!existsSync(inputPath)) {
        reasons.push(`missing-after:${inputPath}`);
        continue;
      }
      if (!statSync(inputPath).isFile()) {
        reasons.push(`after-not-file:${inputPath}`);
        continue;
      }
      const actual = fileRef(inputPath);
      if (
        actual.bytes !== archived.input.bytes ||
        actual.sha256 !== archived.input.sha256
      ) {
        reasons.push(`input-mismatch-after:${inputPath}`);
      }
      const label = `${
        basename(inputPath)
          .replaceAll(/[^A-Za-z0-9._-]/g, "_")
          .slice(0, 64) || "input"
      }-${sha256(Buffer.from(inputPath)).slice(0, 12)}`;
      const metadataKind = metadataKinds.get(inputPath);
      const archivePath = join(
        destination,
        `${sanitizeId(`${metadataKind ? metadataKind : "input"}-${label}`)}-${actual.sha256}.${metadataKind ? "json" : "bin"}`,
      );
      assertWritableEvidencePath(evidenceRoot, archivePath);
      if (metadataKind) {
        writeJson(
          archivePath,
          {
            schema: "initialized-prefix-input-hash-v1",
            kind: metadataKind,
            input: actual,
          },
          evidenceRoot,
        );
      } else {
        copyFileSync(inputPath, archivePath, fsConstants.COPYFILE_EXCL);
      }
      const archivedArchive = fileRef(archivePath);
      if (metadataKind) {
        let metadata: unknown;
        try {
          metadata = JSON.parse(readFileSync(archivePath, "utf8"));
        } catch {
          reasons.push(`archive-metadata-invalid-after:${inputPath}`);
          metadata = undefined;
        }
        const metadataRecord = metadata as
          | {
              schema?: unknown;
              kind?: unknown;
              input?: PrefixFileRef;
            }
          | undefined;
        if (
          metadataRecord?.schema !== "initialized-prefix-input-hash-v1" ||
          metadataRecord.kind !== metadataKind ||
          !metadataRecord.input ||
          metadataRecord.input.path !== actual.path ||
          metadataRecord.input.bytes !== actual.bytes ||
          metadataRecord.input.sha256 !== actual.sha256
        )
          reasons.push(`archive-metadata-mismatch-after:${inputPath}`);
      } else if (
        archivedArchive.bytes !== actual.bytes ||
        archivedArchive.sha256 !== actual.sha256
      ) {
        reasons.push(`archive-mismatch-after:${inputPath}`);
      }
      after.push({ input: actual, archive: archivedArchive });
    } catch (error) {
      reasons.push(
        `archive-after-failure:${inputPath}:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return after;
}

function writeCompiledOutputSidecar(
  attempt: string,
  commandDirectory: string,
  recordPath: string,
  record: PrefixCommandRecord,
): void {
  const outputPath = compileOutputPath(record.spec);
  if (!outputPath) return;
  const sidecarPath = join(commandDirectory, "compiled-output.json");
  try {
    if (
      !record.guard.ok ||
      record.outcome.exitCode !== 0 ||
      record.outcome.signal !== null ||
      record.outcome.spawnError !== null ||
      record.outcome.timedOut ||
      record.outcome.outputLimit ||
      record.outcome.drainTimedOut ||
      !canonicalPathWithin(attempt, outputPath) ||
      !existsSync(outputPath) ||
      !statSync(outputPath).isFile() ||
      lstatSync(outputPath).isSymbolicLink()
    )
      throw new Error("compile did not produce a confined successful output");
    const source = authoredCompileSource(record.spec);
    if (!source)
      throw new Error("compile source input is not uniquely authored");
    const command = fileRef(recordPath);
    const output = fileRef(outputPath);
    if (resolve(output.path) !== resolve(outputPath))
      throw new Error("compiled output path was not canonical");
    writeJson(
      sidecarPath,
      {
        schema: COMPILED_OUTPUT_SCHEMA,
        command,
        source,
        output,
      },
      attempt,
    );
  } catch (error) {
    const rejectionPath = join(
      commandDirectory,
      "compiled-output-rejection.json",
    );
    if (!existsSync(rejectionPath)) {
      writeJson(
        rejectionPath,
        {
          schema: "initialized-prefix-compiled-output-rejection-v1",
          command: fileRef(recordPath),
          reason: error instanceof Error ? error.message : String(error),
        },
        attempt,
      );
    }
  }
}

function requireOfflineLocked(spec: PrefixCommandSpec): void {
  const executableName = basename(spec.executable.path).replace(/\.exe$/i, "");
  if (executableName !== "cargo" && executableName !== "cargo-miri") return;
  if (
    ![
      "compile",
      "tests-full",
      "tests-named",
      "miri-positive",
      "miri-ub",
      "miri-sound",
    ].includes(spec.operation)
  )
    return;
  for (const flag of CARGO_OFFLINE_FLAGS) {
    if (!spec.argv.includes(flag))
      throw new Error(`fixed Cargo recipe is missing ${flag}`);
  }
}

function killGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // The process may have exited between the close and the group kill.
    }
  }
}

async function runBounded(
  spec: PrefixCommandSpec,
  maxBytes: number,
  timeoutMs: number,
): Promise<CaptureState> {
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let outputLimit = false;
  let timedOut = false;
  let spawnError: string | null = null;
  let exitCode: number | null = null;
  let signal: string | null = null;
  let settled = false;
  let childPid: number | undefined;
  let child: ReturnType<typeof spawn> | undefined;
  let terminationRequested = false;
  let killTimer: NodeJS.Timeout | undefined;
  let timeoutTimer: NodeJS.Timeout | undefined;
  let drainTimer: NodeJS.Timeout | undefined;

  const capture = (target: Buffer[], data: Buffer, current: number): number => {
    if (current >= maxBytes) {
      outputLimit = true;
      return current;
    }
    const available = Math.max(0, maxBytes - current);
    const accepted = data.subarray(0, available);
    if (accepted.byteLength > 0) target.push(accepted);
    if (data.byteLength > accepted.byteLength) outputLimit = true;
    return current + Math.min(data.byteLength, available);
  };

  return await new Promise<CaptureState>((resolvePromise) => {
    let stdoutEnded = false;
    let stderrEnded = false;
    let parentClosed = false;
    const clearTimers = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      if (drainTimer) clearTimeout(drainTimer);
      timeoutTimer = undefined;
      killTimer = undefined;
      drainTimer = undefined;
    };
    const destroyPipes = () => {
      child?.stdout?.destroy();
      child?.stderr?.destroy();
    };
    const requestTermination = () => {
      if (terminationRequested || childPid === undefined) return;
      terminationRequested = true;
      killGroup(childPid, "SIGTERM");
      killTimer = setTimeout(() => {
        if (childPid !== undefined) killGroup(childPid, "SIGKILL");
      }, TERM_GRACE_MS);
    };
    const resolveResult = (drainTimedOut: boolean) => {
      if (settled) return;
      if (drainTimedOut && childPid !== undefined) {
        terminationRequested = true;
        killGroup(childPid, "SIGTERM");
        killGroup(childPid, "SIGKILL");
      }
      settled = true;
      clearTimers();
      destroyPipes();
      resolvePromise({
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        outcome: {
          exitCode,
          signal,
          spawnError,
          timedOut,
          outputLimit,
          drainTimedOut,
        },
      });
    };
    const scheduleDrainTimeout = () => {
      if (drainTimer || settled) return;
      drainTimer = setTimeout(() => {
        resolveResult(true);
      }, PIPE_DRAIN_TIMEOUT_MS);
    };
    const finish = () => {
      if (settled || !parentClosed || !stdoutEnded || !stderrEnded) return;
      resolveResult(false);
    };
    try {
      const spawned = spawn(spec.executable.path, [...spec.argv], {
        cwd: spec.cwd,
        env: { ...spec.env } as NodeJS.ProcessEnv,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child = spawned;
      childPid = spawned.pid;
    } catch (error) {
      spawnError = error instanceof Error ? error.message : String(error);
      parentClosed = true;
      stdoutEnded = true;
      stderrEnded = true;
      finish();
      return;
    }
    const spawned = child;
    if (!spawned) {
      spawnError = "spawn returned no child handle";
      parentClosed = true;
      stdoutEnded = true;
      stderrEnded = true;
      finish();
      return;
    }
    spawned.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes = capture(stdout, chunk, stdoutBytes);
      if (outputLimit) requestTermination();
    });
    spawned.stderr?.on("data", (chunk: Buffer) => {
      stderrBytes = capture(stderr, chunk, stderrBytes);
      if (outputLimit) requestTermination();
    });
    spawned.stdout?.once("end", () => {
      stdoutEnded = true;
      finish();
    });
    spawned.stderr?.once("end", () => {
      stderrEnded = true;
      finish();
    });
    spawned.once("error", (error) => {
      spawnError = error.message;
      parentClosed = true;
      scheduleDrainTimeout();
      if (!spawned.stdout) stdoutEnded = true;
      if (!spawned.stderr) stderrEnded = true;
      finish();
    });
    spawned.once("exit", (code, childSignal) => {
      exitCode = code;
      signal = childSignal;
      parentClosed = true;
      scheduleDrainTimeout();
      finish();
    });
    spawned.once("close", (code, childSignal) => {
      exitCode = code;
      signal = childSignal;
      parentClosed = true;
      scheduleDrainTimeout();
      finish();
    });
    timeoutTimer = setTimeout(() => {
      if (settled || childPid === undefined) return;
      timedOut = true;
      requestTermination();
    }, timeoutMs);
  });
}

export async function recordInitializedPrefixCommand(
  attemptDirectory: string,
  spec: PrefixCommandSpec,
): Promise<PrefixRecordedCommand> {
  const attempt = ensureAttempt(attemptDirectory);
  const mode = attemptMode(attempt);
  const validation = validateCommandSpec(attempt, mode, spec);
  if (!validation.spec)
    return rejectedCommandReceipt(attempt, spec, validation.reasons);
  const normalizedSpec = validation.spec;
  const timeoutMs = normalizedSpec.timeoutMs!;
  const maxBytes = normalizedSpec.maxBytesPerStream!;
  let commandId: string;
  try {
    commandId = sanitizeId(spec.id);
  } catch {
    return rejectedCommandReceipt(attempt, spec, ["unsafe-command-id"]);
  }
  const commandDirectory = join(attempt, "commands", commandId);
  const beforeDirectory = join(commandDirectory, "before");
  const afterDirectory = join(commandDirectory, "after");
  const rawDirectory = join(commandDirectory, "raw");
  try {
    assertWritableEvidencePath(attempt, commandDirectory);
    mkdirSync(commandDirectory, { recursive: false });
    mkdirSync(beforeDirectory);
    mkdirSync(afterDirectory);
    mkdirSync(rawDirectory);
  } catch (error) {
    return rejectedCommandReceipt(attempt, spec, [
      `setup-failure-before-spawn:${error instanceof Error ? error.message : String(error)}`,
    ]);
  }
  const guardReasons: string[] = [];
  const startedAt = new Date().toISOString();
  const sourceKinds = new Map<string, "raw" | "metadata">();
  const sourceByPath = new Map<string, PrefixFileRef>();
  const candidates: readonly {
    source: PrefixFileRef;
    kind: "raw" | "metadata";
  }[] = [
    { source: normalizedSpec.executable, kind: "metadata" },
    ...normalizedSpec.inputs.map((source) => ({
      source,
      kind: "raw" as const,
    })),
    ...normalizedSpec.externalInputs.map((source) => ({
      source,
      kind: "metadata" as const,
    })),
  ];
  for (const { source, kind } of candidates) {
    const canonicalPath = resolve(source.path);
    const existing = sourceByPath.get(canonicalPath);
    const existingKind = sourceKinds.get(canonicalPath);
    if (existing) {
      if (existing.bytes !== source.bytes || existing.sha256 !== source.sha256)
        guardReasons.push(`duplicate-input-hash-mismatch:${canonicalPath}`);
      if (existingKind !== kind)
        guardReasons.push(`input-kind-overlap:${canonicalPath}`);
      continue;
    }
    sourceByPath.set(canonicalPath, source);
    sourceKinds.set(canonicalPath, kind);
  }
  const sources = [...sourceByPath.entries()].map(([path, source]) => ({
    path,
    source,
    kind: sourceKinds.get(path)!,
  }));
  const metadataKinds = new Map<string, "executable" | "external-input">([
    [resolve(normalizedSpec.executable.path), "executable"],
    ...normalizedSpec.externalInputs.map(
      (source) => [resolve(source.path), "external-input"] as const,
    ),
  ]);
  const before: PrefixArchivedInput[] = [];
  for (const { source, path, kind } of sources) {
    const archived =
      kind === "metadata"
        ? archiveMetadata(
            source,
            beforeDirectory,
            attempt,
            source.path === normalizedSpec.executable.path
              ? "executable"
              : "external-input",
            guardReasons,
          )
        : archiveOne(source, beforeDirectory, attempt, guardReasons);
    if (archived) before.push(archived);
  }

  const capture =
    before.length === sources.length && guardReasons.length === 0
      ? await runBounded(normalizedSpec, maxBytes, timeoutMs)
      : {
          stdout: Buffer.alloc(0),
          stderr: Buffer.alloc(0),
          outcome: {
            exitCode: null,
            signal: null,
            spawnError: "input archive failed before spawn",
            timedOut: false,
            outputLimit: false,
            drainTimedOut: false,
          } satisfies PrefixOutcome,
        };
  writeExclusive(join(rawDirectory, "stdout.bin"), capture.stdout, attempt);
  writeExclusive(join(rawDirectory, "stderr.bin"), capture.stderr, attempt);
  writeJson(join(commandDirectory, "status.json"), capture.outcome, attempt);
  const after = archiveAfter(
    before,
    afterDirectory,
    attempt,
    metadataKinds,
    guardReasons,
  );
  if (capture.outcome.spawnError)
    guardReasons.push(`spawn:${capture.outcome.spawnError}`);
  if (capture.outcome.timedOut) guardReasons.push("timed-out");
  if (capture.outcome.outputLimit) guardReasons.push("output-limit");
  if (capture.outcome.drainTimedOut) guardReasons.push("pipe-drain-timeout");
  const record: PrefixCommandRecord = {
    schema: "initialized-prefix-command-v1",
    spec: normalizedSpec,
    startedAt,
    finishedAt: new Date().toISOString(),
    outcome: capture.outcome,
    stdout: fileRef(join(rawDirectory, "stdout.bin")),
    stderr: fileRef(join(rawDirectory, "stderr.bin")),
    before,
    after,
    guard: { ok: guardReasons.length === 0, reasons: guardReasons },
  };
  const recordPath = join(commandDirectory, "record.json");
  writeJson(recordPath, record, attempt);
  writeCompiledOutputSidecar(attempt, commandDirectory, recordPath, record);
  return { record, ref: fileRef(recordPath) };
}

function resolveExecutable(name: string, pathValue: string): string {
  for (const entry of pathValue.split(delimiter)) {
    if (!entry) continue;
    const candidate = join(entry, name);
    if (existsSync(candidate)) {
      try {
        accessSync(candidate, fsConstants.X_OK);
        return realpathSync(candidate);
      } catch {
        // Continue through PATH; an inaccessible entry is not a usable identity.
      }
    }
  }
  throw new Error(`executable is absent from PATH: ${name}`);
}

function findRustupHome(): string {
  const candidates = [
    process.env.RUSTUP_HOME,
    process.env.HOME ? join(process.env.HOME, ".rustup") : undefined,
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate) && statSync(candidate).isDirectory())
      return realpathSync(candidate);
  }
  throw new Error(
    "an existing RUSTUP_HOME or original HOME/.rustup is required",
  );
}

type ToolchainQualification = {
  ref: PrefixFileRef;
  executables: Readonly<Record<string, PrefixFileRef>>;
  versionContains: Readonly<Record<string, string>>;
  nightlyDistributionDate?: string;
  compilerCommitDate?: string;
};

function readToolchainQualification(
  path: string,
  mode: PrefixMode,
  toolchain: string,
): ToolchainQualification {
  if (!isAbsolute(path))
    throw new Error("toolchain qualification must be absolute");
  const ref = fileRefOrThrow(path, "toolchain qualification");
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(ref.path, "utf8"));
  } catch (error) {
    throw new Error(`invalid toolchain qualification: ${String(error)}`);
  }
  if (!value || typeof value !== "object")
    throw new Error("toolchain qualification must be an object");
  const record = value as {
    schema?: unknown;
    mode?: unknown;
    toolchain?: unknown;
    executables?: unknown;
    versionContains?: unknown;
    nightlyDistributionDate?: unknown;
    compilerCommitDate?: unknown;
  };
  if (
    record.schema !== "initialized-prefix-toolchain-qualification-v1" ||
    record.mode !== mode ||
    record.toolchain !== toolchain ||
    !record.executables ||
    typeof record.executables !== "object" ||
    !record.versionContains ||
    typeof record.versionContains !== "object"
  )
    throw new Error(
      "toolchain qualification schema or selected identity is incomplete",
    );
  if (
    mode === "miri" &&
    (typeof record.nightlyDistributionDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.nightlyDistributionDate) ||
      typeof record.compilerCommitDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.compilerCommitDate))
  )
    throw new Error(
      "Miri qualification must retain distribution and compiler commit dates separately",
    );
  if (
    mode !== "miri" &&
    (record.nightlyDistributionDate !== undefined ||
      record.compilerCommitDate !== undefined)
  )
    throw new Error(
      "non-Miri qualification cannot contain nightly date metadata",
    );
  const executables: Record<string, PrefixFileRef> = {};
  for (const [name, candidate] of Object.entries(record.executables)) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      typeof (candidate as PrefixFileRef).path !== "string" ||
      typeof (candidate as PrefixFileRef).bytes !== "number" ||
      typeof (candidate as PrefixFileRef).sha256 !== "string"
    )
      throw new Error(
        `toolchain qualification executable is malformed: ${name}`,
      );
    executables[name] = candidate as PrefixFileRef;
  }
  const versionContains: Record<string, string> = {};
  for (const [name, expected] of Object.entries(record.versionContains)) {
    if (
      typeof expected !== "string" ||
      expected.trim().length === 0 ||
      expected !== expected.trim()
    )
      throw new Error(
        `toolchain qualification full stdout is malformed: ${name}`,
      );
    versionContains[name] = expected;
  }
  const requiredExecutables =
    mode === "miri"
      ? ["rustup", "rustc", "rustdoc", "cargo", "cargo-miri", "miri"]
      : ["rustup", "rustc", "rustdoc", "cargo"];
  for (const name of requiredExecutables) {
    if (!executables[name] || !versionContains[name])
      throw new Error(`toolchain qualification omits required tool: ${name}`);
  }
  if (
    mode === "miri" &&
    record.nightlyDistributionDate !== PINNED_NIGHTLY.slice("nightly-".length)
  )
    throw new Error(
      "Miri qualification must pin the distribution date and keep compiler date distinct",
    );
  return {
    ref,
    executables,
    versionContains,
    ...(typeof record.nightlyDistributionDate === "string"
      ? { nightlyDistributionDate: record.nightlyDistributionDate }
      : {}),
    ...(typeof record.compilerCommitDate === "string"
      ? { compilerCommitDate: record.compilerCommitDate }
      : {}),
  };
}

function validateToolchainQualification(
  qualification: ToolchainQualification,
  executables: Readonly<Record<string, PrefixFileRef>>,
  versions: Readonly<Record<string, PrefixRecordedCommand>>,
): void {
  for (const name of Object.keys(executables)) {
    if (!qualification.executables[name])
      throw new Error(
        `toolchain qualification omits selected executable: ${name}`,
      );
  }
  for (const [name, expected] of Object.entries(qualification.executables)) {
    const actual = executables[name];
    if (
      !actual ||
      actual.path !== expected.path ||
      actual.bytes !== expected.bytes ||
      actual.sha256 !== expected.sha256
    )
      throw new Error(
        `installed executable identity differs from qualification: ${name}`,
      );
  }
  if (
    JSON.stringify(Object.keys(qualification.executables).sort()) !==
    JSON.stringify(Object.keys(executables).sort())
  )
    throw new Error(
      "toolchain qualification executable set differs from selection",
    );
  for (const name of Object.keys(executables)) {
    if (!qualification.versionContains[name])
      throw new Error(`toolchain qualification omits version marker: ${name}`);
  }
  for (const [name, marker] of Object.entries(qualification.versionContains)) {
    const record = versions[`version-${name}`];
    if (!record) throw new Error(`missing qualified version receipt: ${name}`);
    const stdoutBytes = readFileSync(record.record.stdout.path);
    const stderrBytes = readFileSync(record.record.stderr.path);
    if (
      !sameFileRef(fileRef(record.record.stdout.path), record.record.stdout) ||
      !sameFileRef(fileRef(record.record.stderr.path), record.record.stderr)
    )
      throw new Error(`qualified version raw stream hash changed: ${name}`);
    const stdoutText = stdoutBytes.toString("utf8");
    const stderr = stderrBytes.toString("utf8");
    const stdout = stdoutText.trim();
    if (
      !Buffer.from(stdoutText, "utf8").equals(stdoutBytes) ||
      !Buffer.from(stderr, "utf8").equals(stderrBytes) ||
      record.record.outcome.exitCode !== 0 ||
      record.record.outcome.signal !== null ||
      record.record.outcome.spawnError !== null ||
      record.record.outcome.timedOut ||
      record.record.outcome.outputLimit ||
      record.record.outcome.drainTimedOut ||
      !isInitializedPrefixVersionStderrAccepted(name, stderr) ||
      stdout !== marker.trim()
    )
      throw new Error(
        `installed full version stdout differs from qualification: ${name}`,
      );
  }
}

export function isInitializedPrefixVersionStderrAccepted(
  name: string,
  stderr: string,
): boolean {
  if (stderr.length === 0) return true;
  if (name !== "rustup") return false;
  const lines = stderr.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0 || lines.length > 2) return false;
  return lines.every(
    (line) =>
      /^info: this is the version for the rustup toolchain manager, not the rustc compiler\.?$/i.test(
        line,
      ) ||
      /^info: the currently active `rustc` version is `?rustc \d+\.\d+\.\d+(?:-nightly)?(?:\s\([^()\r\n]+\))*`?$/i.test(
        line,
      ),
  );
}

function readSysrootManifest(
  manifestPath: string,
  sysrootRoot: string,
  toolchain: string,
): { manifest: PrefixFileRef; files: PrefixFileRef[] } {
  const manifest = fileRefOrThrow(manifestPath, "MIRI_SYSROOT manifest");
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(manifest.path, "utf8"));
  } catch (error) {
    throw new Error(
      `invalid MIRI_SYSROOT manifest: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!value || typeof value !== "object")
    throw new Error("MIRI_SYSROOT manifest must be an object");
  const manifestValue = value as {
    schema?: unknown;
    root?: unknown;
    toolchain?: unknown;
    complete?: unknown;
    files?: unknown;
  };
  if (
    manifestValue.schema !== "initialized-prefix-sysroot-v1" ||
    manifestValue.complete !== true ||
    manifestValue.toolchain !== toolchain ||
    !Array.isArray(manifestValue.files)
  )
    throw new Error(
      "MIRI_SYSROOT manifest is not a complete root-qualified selected-toolchain manifest",
    );
  const declaredRoot = (value as { root?: unknown }).root;
  if (
    typeof declaredRoot !== "string" ||
    realpathSync(resolve(declaredRoot)) !== realpathSync(resolve(sysrootRoot))
  ) {
    throw new Error("MIRI_SYSROOT manifest root does not match MIRI_SYSROOT");
  }
  const files: PrefixFileRef[] = [];
  const seen = new Set<string>();
  for (const entry of manifestValue.files) {
    if (!entry || typeof entry !== "object")
      throw new Error("MIRI_SYSROOT entries must be hashed objects");
    const declared = entry as {
      path?: unknown;
      bytes?: unknown;
      sha256?: unknown;
    };
    if (
      typeof declared.path !== "string" ||
      !isAbsolute(declared.path) ||
      typeof declared.bytes !== "number" ||
      !Number.isSafeInteger(declared.bytes) ||
      typeof declared.sha256 !== "string"
    )
      throw new Error(
        "MIRI_SYSROOT entries must contain absolute path, byte length, and sha256",
      );
    const absolute = resolve(declared.path);
    const rel = relative(realpathSync(resolve(sysrootRoot)), absolute);
    if (rel.startsWith("..") || isAbsolute(rel))
      throw new Error(`MIRI_SYSROOT entry escapes root: ${absolute}`);
    if (seen.has(absolute))
      throw new Error(`duplicate MIRI_SYSROOT entry: ${absolute}`);
    seen.add(absolute);
    if (lstatSync(absolute).isSymbolicLink())
      throw new Error(`symlink MIRI_SYSROOT entry: ${absolute}`);
    if (realpathSync(absolute) !== absolute)
      throw new Error(
        `realpath MIRI_SYSROOT entry escapes declared root: ${absolute}`,
      );
    const actual = fileRefOrThrow(absolute, "MIRI_SYSROOT entry");
    if (actual.bytes !== declared.bytes || actual.sha256 !== declared.sha256)
      throw new Error(`MIRI_SYSROOT hash mismatch: ${absolute}`);
    files.push(actual);
  }
  if (files.length === 0)
    throw new Error("MIRI_SYSROOT manifest has no entries");
  const declaredFiles = new Set(files.map((file) => file.path));
  const actualFiles: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory)) {
      const entryPath = join(directory, entry);
      const entryStat = lstatSync(entryPath);
      if (entryStat.isSymbolicLink())
        throw new Error(`symlink MIRI_SYSROOT entry: ${entryPath}`);
      if (entryStat.isDirectory()) visit(entryPath);
      else if (entryStat.isFile()) actualFiles.push(resolve(entryPath));
      else throw new Error(`unsupported MIRI_SYSROOT entry: ${entryPath}`);
    }
  };
  visit(realpathSync(resolve(sysrootRoot)));
  if (
    actualFiles.length !== declaredFiles.size ||
    actualFiles.some((entryPath) => !declaredFiles.has(entryPath))
  )
    throw new Error(
      "MIRI_SYSROOT manifest does not enumerate the complete root tree",
    );
  return { manifest, files };
}

function privateEnvironment(
  attempt: string,
  rustupHome: string,
  toolchain: string,
  rustc: string,
  rustdoc: string,
  toolDirectories: readonly string[],
  sysroot?: string,
): Readonly<Record<string, string>> {
  const pathValue = [...new Set([...toolDirectories, "/usr/bin", "/bin"])]
    .filter((entry) => entry.length > 0)
    .join(delimiter);
  const environment: Record<string, string> = {
    HOME: join(attempt, "private-home"),
    CARGO_HOME: join(attempt, "private-cargo"),
    CARGO_TARGET_DIR: join(attempt, "private-target"),
    TMPDIR: join(attempt, "private-tmp"),
    RUSTUP_HOME: rustupHome,
    RUSTUP_TOOLCHAIN: toolchain,
    RUSTC: rustc,
    RUSTDOC: rustdoc,
    PATH: pathValue,
    CARGO_NET_OFFLINE: "true",
  };
  if (sysroot) environment.MIRI_SYSROOT = sysroot;
  return safeEnvironment(environment);
}

function validateConsumedCargoConfig(config: PrefixFileRef): void {
  const text = readFileSync(config.path, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+#.*$/, "").trim());
  let section = "";
  let offline = false;
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      section = line.slice(1, -1).trim();
      if (section !== "net")
        throw new Error(`unsupported Cargo config section: ${section}`);
      continue;
    }
    if (section !== "net" || !/^offline\s*=\s*true$/.test(line))
      throw new Error("Cargo config contains an unsupported effective setting");
    if (offline) throw new Error("Cargo config repeats offline mode");
    offline = true;
  }
  if (!offline)
    throw new Error(
      "offline Cargo config must explicitly set [net] offline = true",
    );
}

function rejectEffectiveCargoConfig(
  attempt: string,
  cargoHome: string,
  config: PrefixFileRef,
): void {
  const explicit = realpathSync(config.path);
  let directory = realpathSync(attempt);
  while (true) {
    for (const candidate of [
      join(directory, "config.toml"),
      join(directory, "config"),
      join(directory, ".cargo", "config.toml"),
      join(directory, ".cargo", "config"),
    ]) {
      if (existsSync(candidate) && realpathSync(candidate) !== explicit)
        throw new Error(
          `ancestor Cargo config would be consumed: ${candidate}`,
        );
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  for (const candidate of [
    join(cargoHome, "config.toml"),
    join(cargoHome, "config"),
  ]) {
    if (existsSync(candidate) && realpathSync(candidate) !== explicit)
      throw new Error(`private CARGO_HOME has an unbound config: ${candidate}`);
  }
}

function requireSuccessful(record: PrefixRecordedCommand, label: string): void {
  if (
    !record.record.guard.ok ||
    record.record.outcome.exitCode !== 0 ||
    record.record.outcome.signal ||
    record.record.outcome.spawnError
  ) {
    throw new Error(
      `${label} did not complete successfully; raw record retained at ${record.ref.path}`,
    );
  }
}

function writeQualificationRejection(
  attempt: string,
  mode: PrefixMode,
  error: unknown,
  recordedIds: readonly string[],
): void {
  const directory = mkdtempSync(join(attempt, "toolchain", "rejected-"));
  const reason = error instanceof Error ? error.message : String(error);
  const outcome: PrefixOutcome = {
    exitCode: null,
    signal: null,
    spawnError: `qualification-rejected-${recordedIds.length === 0 ? "before-child" : "after-recorded-children"}:${reason}`,
    timedOut: false,
    outputLimit: false,
    drainTimedOut: false,
  };
  writeJson(join(directory, "status.json"), outcome, attempt);
  writeJson(
    join(directory, "rejection.json"),
    {
      schema: "initialized-prefix-toolchain-rejection-v1",
      mode,
      outcome,
      reason,
      phase:
        recordedIds.length === 0 ? "before-child" : "after-recorded-children",
      recordedIds,
      at: new Date().toISOString(),
    },
    attempt,
  );
}

export async function qualifyInitializedPrefixToolchain(options: {
  mode: PrefixMode;
  attemptDirectory: string;
}): Promise<PrefixToolchainBinding> {
  assertMode(options.mode);
  const attempt = ensureAttempt(options.attemptDirectory);
  const recordedQualificationIds: string[] = [];
  try {
    const rustupHome = findRustupHome();
    const pathValue = process.env.PATH;
    if (!pathValue)
      throw new Error("PATH is required for fixed tool qualification");
    const toolchain =
      options.mode === "miri"
        ? PINNED_NIGHTLY
        : options.mode === "msrv"
          ? EXACT_MS_RV
          : "stable";
    const configPath =
      process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_CARGO_CONFIG;
    if (!configPath)
      throw new Error("an explicit consumed Cargo config is required");
    const config = fileRefOrThrow(configPath, "offline Cargo config");
    validateConsumedCargoConfig(config);
    rejectEffectiveCargoConfig(attempt, join(attempt, "private-cargo"), config);
    const qualificationPath = process.env[TOOLCHAIN_QUALIFICATION_ENV];
    if (!qualificationPath)
      throw new Error("an explicit installed-tool qualification is required");
    const qualification = readToolchainQualification(
      qualificationPath,
      options.mode,
      toolchain,
    );
    const rustup = fileRefOrThrow(
      resolveExecutable("rustup", pathValue),
      "rustup",
    );
    const qualifiedRustup = qualification.executables.rustup;
    if (
      !qualifiedRustup ||
      rustup.path !== qualifiedRustup.path ||
      rustup.bytes !== qualifiedRustup.bytes ||
      rustup.sha256 !== qualifiedRustup.sha256
    )
      throw new Error("root-qualified rustup identity differs before lookup");
    const sysrootRoot =
      options.mode === "miri" ? process.env.MIRI_SYSROOT : undefined;
    let sysroot: PrefixToolchainBinding["sysroot"];
    if (options.mode === "miri") {
      if (
        !sysrootRoot ||
        !isAbsolute(sysrootRoot) ||
        !existsSync(sysrootRoot) ||
        !statSync(sysrootRoot).isDirectory()
      )
        throw new Error("MIRI_SYSROOT must be an existing absolute path");
      const canonicalSysrootRoot = realpathSync(sysrootRoot);
      const manifestPath =
        process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_SYSROOT_MANIFEST;
      if (!manifestPath)
        throw new Error("an explicit MIRI_SYSROOT manifest is required");
      const snapshot = readSysrootManifest(
        manifestPath,
        canonicalSysrootRoot,
        toolchain,
      );
      sysroot = {
        root: canonicalSysrootRoot,
        manifest: snapshot.manifest,
        files: snapshot.files,
      };
    }
    const preflightExecutables: Record<string, PrefixFileRef> = { rustup };
    const preflightNames = [
      "rustc",
      "rustdoc",
      "cargo",
      ...(options.mode === "miri" ? ["cargo-miri", "miri"] : []),
    ];
    for (const name of preflightNames) {
      const qualified = qualification.executables[name];
      const path =
        name === "cargo-miri" || name === "miri"
          ? join(dirname(preflightExecutables.rustc.path), name)
          : qualified.path;
      const selected = fileRefOrThrow(path, name);
      if (
        selected.path !== qualified.path ||
        selected.bytes !== qualified.bytes ||
        selected.sha256 !== qualified.sha256
      )
        throw new Error(
          `root-qualified ${name} identity differs during qualification preflight`,
        );
      preflightExecutables[name] = selected;
    }
    const env = privateEnvironment(
      attempt,
      rustupHome,
      toolchain,
      preflightExecutables.rustc.path,
      preflightExecutables.rustdoc.path,
      [
        dirname(preflightExecutables.rustc.path),
        ...(options.mode === "miri"
          ? [
              dirname(preflightExecutables["cargo-miri"].path),
              dirname(preflightExecutables.miri.path),
            ]
          : []),
        dirname(rustup.path),
      ],
      sysroot?.root,
    );
    const privateCargoConfig = join(env.CARGO_HOME, "config.toml");
    assertWritableEvidencePath(attempt, privateCargoConfig);
    copyFileSync(config.path, privateCargoConfig, fsConstants.COPYFILE_EXCL);
    const consumedConfig = fileRef(privateCargoConfig);
    const configInputs = [config, consumedConfig, qualification.ref] as const;
    const sysrootInputs = sysroot ? [sysroot.manifest, ...sysroot.files] : [];
    const versions: Record<string, PrefixRecordedCommand> = {};
    const executables: Record<string, PrefixFileRef> = { rustup };
    const lookup = async (name: string): Promise<string> => {
      const record = await recordInitializedPrefixCommand(attempt, {
        id: `lookup-${name}`,
        recipeId: `toolchain-${toolchain}-lookup-${name}`,
        mode: options.mode,
        operation: "tool-locate",
        executable: rustup,
        argv: ["which", "--toolchain", toolchain, name],
        cwd: attempt,
        env,
        inputs: configInputs,
        externalInputs: sysrootInputs,
        timeoutMs: 30_000,
        maxBytesPerStream: MAX_STREAM_BYTES,
      });
      versions[`lookup-${name}`] = record;
      recordedQualificationIds.push(record.record.spec.id);
      requireSuccessful(record, `rustup lookup ${name}`);
      const output = readFileSync(record.record.stdout.path, "utf8")
        .trim()
        .split(/\r?\n/)
        .at(-1);
      if (!output || !isAbsolute(output))
        throw new Error(`rustup lookup ${name} returned no absolute path`);
      return output;
    };
    for (const name of ["rustc", "rustdoc", "cargo"]) {
      const path = await lookup(name);
      const selected = fileRefOrThrow(path, name);
      const qualified = qualification.executables[name];
      if (
        !qualified ||
        selected.path !== qualified.path ||
        selected.bytes !== qualified.bytes ||
        selected.sha256 !== qualified.sha256
      )
        throw new Error(
          `root-qualified ${name} identity differs before version`,
        );
      executables[name] = selected;
    }
    const selectedToolchainBin = dirname(executables.rustc.path);
    if (options.mode === "miri") {
      const cargoMiriPath = join(selectedToolchainBin, "cargo-miri");
      const miriPath = join(selectedToolchainBin, "miri");
      const cargoMiri = fileRefOrThrow(cargoMiriPath, "cargo-miri");
      const miri = fileRefOrThrow(miriPath, "miri");
      for (const [name, selected] of [
        ["cargo-miri", cargoMiri],
        ["miri", miri],
      ] as const) {
        const qualified = qualification.executables[name];
        if (
          !qualified ||
          selected.path !== qualified.path ||
          selected.bytes !== qualified.bytes ||
          selected.sha256 !== qualified.sha256
        )
          throw new Error(
            `root-qualified ${name} identity differs before version`,
          );
        executables[name] = selected;
      }
    }
    const version = async (
      name: string,
      argv: readonly string[],
    ): Promise<void> => {
      const executable = executables[name];
      if (!executable) throw new Error(`missing qualified executable: ${name}`);
      const record = await recordInitializedPrefixCommand(attempt, {
        id: `version-${name}`,
        recipeId: `toolchain-${toolchain}-version-${name}`,
        mode: options.mode,
        operation: "tool-version",
        executable,
        argv,
        cwd: attempt,
        env,
        inputs: configInputs,
        externalInputs: sysrootInputs,
        timeoutMs: 30_000,
        maxBytesPerStream: MAX_STREAM_BYTES,
      });
      versions[`version-${name}`] = record;
      recordedQualificationIds.push(record.record.spec.id);
      requireSuccessful(record, `${name} version`);
    };
    await version("rustc", ["--version", "--verbose"]);
    await version("rustdoc", ["--version", "--verbose"]);
    await version("cargo", ["--version", "--verbose"]);
    await version("rustup", ["--version"]);
    if (options.mode === "miri") {
      await version("cargo-miri", ["miri", "--version"]);
      await version("miri", ["--version"]);
    }
    const rustcVersion = readFileSync(
      versions["version-rustc"].record.stdout.path,
      "utf8",
    );
    const rustdocVersion = readFileSync(
      versions["version-rustdoc"].record.stdout.path,
      "utf8",
    );
    const cargoVersion = readFileSync(
      versions["version-cargo"].record.stdout.path,
      "utf8",
    );
    if (options.mode === "msrv") {
      if (!/^rustc 1\.85\.0(?:\s|$)/m.test(rustcVersion))
        throw new Error(`MSRV rustc is not ${EXACT_MS_RV}`);
      if (!/^rustdoc 1\.85\.0(?:\s|$)/m.test(rustdocVersion))
        throw new Error(`MSRV rustdoc is not ${EXACT_MS_RV}`);
      if (!/^cargo 1\.85\.0(?:\s|$)/m.test(cargoVersion))
        throw new Error(`MSRV cargo is not ${EXACT_MS_RV}`);
    }
    if (options.mode === "stable") {
      for (const [name, prefix, output] of [
        ["rustc", "rustc", rustcVersion],
        ["rustdoc", "rustdoc", rustdocVersion],
        ["cargo", "cargo", cargoVersion],
      ] as const) {
        const firstReleaseLine = output.split(/\r?\n/u, 1)[0] ?? "";
        if (
          !new RegExp(`^${prefix} \\d+\\.\\d+\\.\\d+(?:\\s|$)`, "u").test(
            firstReleaseLine,
          )
        )
          throw new Error(
            `stable ${name} did not report a current stable release`,
          );
      }
    }
    if (options.mode === "miri") {
      const commitDate = /^commit-date:\s*(\d{4}-\d{2}-\d{2})\s*$/m.exec(
        rustcVersion,
      )?.[1];
      if (
        qualification.nightlyDistributionDate !==
          PINNED_NIGHTLY.slice("nightly-".length) ||
        !commitDate ||
        commitDate !== qualification.compilerCommitDate
      )
        throw new Error(
          "Miri compiler commit date does not match qualified rustc verbose output",
        );
    }
    validateToolchainQualification(qualification, executables, versions);
    const bindingWithoutRef = {
      mode: options.mode,
      name: toolchain,
      rustupHome,
      executables,
      versions,
      env,
      config: consumedConfig,
      ...(sysroot ? { sysroot } : {}),
    } satisfies Omit<PrefixToolchainBinding, "ref">;
    const bindingPath = join(attempt, "toolchain", `${options.mode}.json`);
    writeJson(bindingPath, bindingWithoutRef, attempt);
    const binding: PrefixToolchainBinding = {
      ...bindingWithoutRef,
      ref: fileRef(bindingPath),
    };
    return binding;
  } catch (error) {
    writeQualificationRejection(
      attempt,
      options.mode,
      error,
      recordedQualificationIds,
    );
    throw error;
  }
}
