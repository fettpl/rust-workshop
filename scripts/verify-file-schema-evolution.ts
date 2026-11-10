/** Fixed authored package verification. Importing this module executes no commands. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { unzipSync } from "fflate";
import { fileSchemaEvolutionPackage } from "../src/content/projects/file-schema-evolution/package";
import {
  fileSchemaCompilerProbes,
  fileSchemaNativeEquivalents,
  fileSchemaNativeTests,
  fileSchemaSemanticMutations,
} from "../src/content/projects/file-schema-evolution/fixtures";
import {
  authorizationArchiveSnapshot,
  assertAuthorizationArchiveSnapshot,
} from "./verify-authorization";
import { buildProjectArchive, projectArchiveFiles } from "./project-archive";
import {
  fileSchemaPackageLockCommand,
  generateFileSchemaPackageLock,
} from "./file-schema-package-commands";

type Mode = "stable" | "msrv";
type Options = { mode: Mode; outputDir?: string };
type Variant = "starter" | "solution";
type Target = "compatibility" | "upgrade";
type Tool = "cargo" | "rustc" | "rustdoc" | "rustup";
type Binding = { path: string; bytes: number; mode: number; sha256: string };
type Profile = {
  schema: string;
  mode: Mode;
  toolchain: string;
  executables: Record<Tool, Binding>;
  versionContains: Record<Tool, string>;
};
type Outcome = {
  status: number | null;
  signal: string | null;
  error: { code: string | null; message: string } | null;
  timedOut: boolean;
  closed: boolean;
  stdout: string;
  stderr: string;
};
type Site = {
  sourceFile: string;
  line: number;
  column: number;
  sourceLine: string;
  sourceSha256: string;
};
type Patch = {
  sourceFile: string;
  before: string;
  after: string;
  sourceSha256: string;
  patchedSourceSha256: string;
};
type Inputs = Record<string, Binding>;
type Fixture = {
  label: string;
  variant: Variant;
  root: string;
  target: string;
  inputs: Inputs;
  archive: Binding;
  lock?: NonNullable<ReturnType<typeof generateFileSchemaPackageLock>>;
};

const tools = ["cargo", "rustc", "rustdoc", "rustup"] as const;
const digest = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const modeToolchain = (mode: Mode) => (mode === "msrv" ? "1.85.0" : "stable");
const recordObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function absolute(path: string): string {
  assert(
    isAbsolute(path) && resolve(path) === path,
    "expected canonical absolute path",
  );
  return path;
}
function canonicalDirectory(path: string): string {
  absolute(path);
  assert(
    lstatSync(path).isDirectory() && realpathSync(path) === path,
    `expected canonical directory: ${path}`,
  );
  return path;
}
function binding(path: string, executable = false): Binding {
  absolute(path);
  const st = lstatSync(path);
  assert(
    st.isFile() && !st.isSymbolicLink() && realpathSync(path) === path,
    `expected canonical regular file: ${path}`,
  );
  assert(
    !executable || (st.mode & 0o111) !== 0,
    `expected executable: ${path}`,
  );
  const bytes = readFileSync(path);
  return {
    path,
    bytes: bytes.length,
    mode: st.mode & 0o7777,
    sha256: digest(bytes),
  };
}
function mkdirOrCheck(path: string): void {
  try {
    mkdirSync(path, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  canonicalDirectory(path);
}

export function parseFileSchemaOptions(argv: readonly string[]): Options {
  const seen = new Set<string>();
  const options: Options = { mode: "stable" };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    assert(
      flag === "--mode" || flag === "--output-dir",
      "only --mode and --output-dir are accepted",
    );
    assert(
      !seen.has(flag) && value && !value.startsWith("--"),
      "duplicate or missing flag value",
    );
    seen.add(flag);
    if (flag === "--mode") {
      assert(
        value === "stable" || value === "msrv",
        "mode must be stable or msrv",
      );
      options.mode = value;
    } else options.outputDir = absolute(value);
  }
  return options;
}

export function claimFileSchemaRunRoot(
  repository: string,
  options: Options,
): string {
  assert(options.mode === "stable" || options.mode === "msrv", "invalid mode");
  assert(
    Object.keys(options).every((key) => key === "mode" || key === "outputDir"),
    "unexpected verifier option",
  );
  let base = canonicalDirectory(repository);
  for (const name of ["test-results", "file-schema-evolution", options.mode]) {
    base = join(base, name);
    mkdirOrCheck(base);
  }
  if (options.outputDir === undefined)
    return canonicalDirectory(mkdtempSync(join(base, "run-")));
  const requested = absolute(options.outputDir);
  assert(
    dirname(requested) === base &&
      /^run-[A-Za-z0-9][A-Za-z0-9._-]*$/.test(basename(requested)),
    "output must be a direct run-* child of the selected mode directory",
  );
  mkdirSync(requested, { mode: 0o700 });
  return canonicalDirectory(requested);
}

export function validateFileSchemaProfile(mode: Mode, value: unknown): Profile {
  assert(
    recordObject(value) &&
      value.schema === "initialized-prefix-toolchain-qualification-v1",
    "qualified toolchain profile required",
  );
  assert(
    value.mode === mode && value.toolchain === modeToolchain(mode),
    "qualified profile mode/toolchain mismatch",
  );
  assert(
    recordObject(value.executables) && recordObject(value.versionContains),
    "profile tool facts required",
  );
  assert.deepEqual(Object.keys(value.executables).sort(), [...tools].sort());
  assert.deepEqual(
    Object.keys(value.versionContains).sort(),
    [...tools].sort(),
  );
  for (const name of tools) {
    const tool = value.executables[name];
    assert(
      recordObject(tool) && typeof tool.path === "string",
      `missing ${name} binding`,
    );
    absolute(tool.path);
    assert(
      typeof tool.bytes === "number" &&
        Number.isSafeInteger(tool.bytes) &&
        tool.bytes > 0,
    );
    assert(
      typeof tool.mode === "number" &&
        Number.isInteger(tool.mode) &&
        (tool.mode & 0o111) !== 0,
    );
    assert(
      typeof tool.sha256 === "string" && /^[a-f0-9]{64}$/.test(tool.sha256),
    );
    assert(
      typeof value.versionContains[name] === "string" &&
        value.versionContains[name].length > 0,
    );
  }
  return value as Profile;
}

export function assertFileSchemaArchiveSnapshot(
  snapshot: Record<string, string>,
): void {
  assert.equal(
    assertAuthorizationArchiveSnapshot(snapshot),
    "post-file-schema-generation",
    "complete canonical 32-archive snapshot required",
  );
}

export function fileSchemaCargoArgs(
  operation: "lock" | "compile-all" | "all" | "compile-target" | "named",
  packageRoot: string,
  release: boolean,
  target?: Target,
  testName?: string,
): string[] {
  absolute(packageRoot);
  if (operation === "lock") {
    assert(
      !release && target === undefined && testName === undefined,
      "lock recipe has no test flags",
    );
    return fileSchemaPackageLockCommand(
      fileSchemaEvolutionPackage.id,
      packageRoot,
    );
  }
  const args = [
    "test",
    "--offline",
    "--locked",
    "--manifest-path",
    join(packageRoot, "Cargo.toml"),
  ];
  if (release) args.push("--release");
  if (operation === "all" || operation === "compile-all") {
    assert(
      target === undefined && testName === undefined,
      "full suite has no target selector",
    );
    return [...args, operation === "all" ? "--no-fail-fast" : "--no-run"];
  }
  assert(
    operation === "named" || operation === "compile-target",
    "unknown Cargo recipe",
  );
  assert(
    target === "compatibility" || target === "upgrade",
    "unknown authored target",
  );
  assert(
    testName &&
      fileSchemaSemanticMutations.some(
        (item) => item.target === target && item.expectedTest === testName,
      ),
    "unknown authored target test",
  );
  args.push("--test", target);
  if (operation === "compile-target") return [...args, "--no-run"];
  return [...args, testName, "--", "--exact", "--nocapture"];
}

function completed(outcome: Outcome, status: number): void {
  assert(
    outcome.closed &&
      outcome.signal === null &&
      outcome.error === null &&
      !outcome.timedOut,
    "command did not close normally",
  );
  assert.equal(
    outcome.status,
    status,
    `unexpected command status\n${outcome.stdout}\n${outcome.stderr}`,
  );
}
function testRows(output: string, state: "ok" | "FAILED"): string[] {
  return [
    ...output.matchAll(new RegExp(`^test (\\S+) \\.\\.\\. ${state}$`, "gm")),
  ]
    .map((match) => match[1])
    .sort();
}
function testCounts(output: string, allowFiltered: boolean) {
  const rows = [
    ...output.matchAll(
      /^test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out;/gm,
    ),
  ];
  assert(
    rows.length > 0 &&
      rows.every(
        (row) =>
          (row[1] === "ok") === (row[3] === "0") &&
          row[4] === "0" &&
          row[5] === "0" &&
          (allowFiltered || row[6] === "0"),
      ),
    "missing result accounting or ignored/filtered tests",
  );
  assert(!/^test .* \.\.\. ignored/m.test(output), "ignored native test");
  return rows.reduce(
    (sum, row) => ({
      passed: sum.passed + Number(row[2]),
      failed: sum.failed + Number(row[3]),
    }),
    { passed: 0, failed: 0 },
  );
}

export function assertFileSchemaPositive(outcome: Outcome): void {
  completed(outcome, 0);
  assert.deepEqual(
    testRows(outcome.stdout, "ok"),
    [...fileSchemaNativeTests].sort(),
    "exact fourteen authored tests must pass",
  );
  assert.deepEqual(testCounts(outcome.stdout, false), {
    passed: 14,
    failed: 0,
  });
  assert.equal(testRows(outcome.stdout, "FAILED").length, 0);
}

function namedOutcome(outcome: Outcome, name: string, success: boolean): void {
  completed(outcome, success ? 0 : 101);
  assert.deepEqual(
    testRows(outcome.stdout, success ? "ok" : "FAILED"),
    [name],
    "exact named test required",
  );
  assert.equal(testRows(outcome.stdout, success ? "FAILED" : "ok").length, 0);
  assert.deepEqual(testCounts(outcome.stdout, true), {
    passed: success ? 1 : 0,
    failed: success ? 0 : 1,
  });
}
function panicAt(
  output: string,
  name: string,
  source: string,
  line: number,
  column: number,
  message: RegExp,
): void {
  const match = output.match(
    new RegExp(
      `^thread '${escape(name)}'(?: \\(\\d+\\))? panicked at ${escape(source)}:${line}:${column}:\\r?\\n([^\\r\\n]+)`,
      "m",
    ),
  );
  assert(
    match && message.test(match[1]),
    `expected panic for ${name} at ${source}:${line}:${column}`,
  );
}
export function assertFileSchemaNamedRejection(
  compile: Outcome,
  outcome: Outcome,
  name: string,
  site: Site,
): void {
  completed(compile, 0);
  namedOutcome(outcome, name, false);
  const output = `${outcome.stdout}\n${outcome.stderr}`;
  assert(
    !/could not compile|error\[E\d+\]/.test(output),
    "compiler failure is not a semantic assertion",
  );
  assert(
    /^assert(?:_eq|_ne)?!\(/.test(site.sourceLine),
    "archived site must be an assertion",
  );
  panicAt(
    output,
    name,
    site.sourceFile,
    site.line,
    site.column,
    /^assertion (?:`.*` )?failed(?::|$)/,
  );
}

function snapshot(root: string): Inputs {
  canonicalDirectory(root);
  const result: Inputs = {};
  function walk(directory: string) {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const st = lstatSync(path);
      if (st.isDirectory()) {
        canonicalDirectory(path);
        walk(path);
      } else result[path.slice(root.length + 1)] = binding(path);
    }
  }
  walk(root);
  return result;
}
function noAncestorCargoConfig(cwd: string): void {
  for (
    let directory = canonicalDirectory(cwd);
    ;
    directory = dirname(directory)
  ) {
    for (const name of ["config", "config.toml"]) {
      assert.throws(
        () => lstatSync(join(directory, ".cargo", name)),
        { code: "ENOENT" },
        "unadmitted Cargo ancestor configuration",
      );
    }
    if (directory === dirname(directory)) break;
  }
}
function replacePinned(fixture: Fixture, patch: Patch) {
  assert(/^src\/(?:model|codec|upgrade)\.rs$/.test(patch.sourceFile));
  const original = fixture.inputs[patch.sourceFile];
  assert(
    original && original.sha256 === patch.sourceSha256,
    "mutation source pin differs",
  );
  const text = readFileSync(original.path, "utf8");
  assert.equal(
    text.split(patch.before).length,
    2,
    "exactly one mutation anchor required",
  );
  const patched = text.replace(patch.before, patch.after);
  assert.equal(
    digest(patched),
    patch.patchedSourceSha256,
    "mutation result pin differs",
  );
  writeFileSync(original.path, patched);
  fixture.inputs = {
    ...fixture.inputs,
    [patch.sourceFile]: binding(original.path),
  };
  assert.deepEqual(snapshot(fixture.root), fixture.inputs);
}

const starterPasses = [
  "future_and_corrupt_files_are_read_only",
  "missing_source_is_not_created",
  "upgrade::tests::rename_error_cleans_owned_stage",
].sort();
function assertStarter(outcome: Outcome, starterModel: string): void {
  completed(outcome, 101);
  const fails = fileSchemaNativeTests
    .filter((name) => !starterPasses.includes(name))
    .sort();
  assert.deepEqual(testRows(outcome.stdout, "ok"), starterPasses);
  assert.deepEqual(testRows(outcome.stdout, "FAILED"), fails);
  assert.deepEqual(testCounts(outcome.stdout, false), {
    passed: 3,
    failed: 11,
  });
  const lines = starterModel.split("\n");
  const line = lines.findIndex(
    (text) => text.trim() === 'todo!("implement normalization")',
  );
  assert(line >= 0);
  for (const name of fails)
    panicAt(
      `${outcome.stdout}\n${outcome.stderr}`,
      name,
      "src/model.rs",
      line + 1,
      lines[line].indexOf("todo!") + 1,
      /^not yet implemented: implement normalization$/,
    );
}

const privateSpans = {
  "todo-private-fields": [
    { line: 5, column: 9, symbol: "entries", stableEnd: 16, msrvEnd: 28 },
    { line: 6, column: 9, symbol: "next_id", stableEnd: 16, msrvEnd: 35 },
  ],
  "entry-private-id": [
    { line: 7, column: 11, symbol: "id", stableEnd: 13, msrvEnd: 13 },
  ],
  "prepared-upgrade-private-bytes": [
    { line: 5, column: 9, symbol: "original", stableEnd: 17, msrvEnd: 29 },
    { line: 6, column: 9, symbol: "replacement", stableEnd: 20, msrvEnd: 32 },
  ],
} as const;
type CompilerDiagnostic = {
  level: string;
  message: string;
  code: { code: string } | null;
  spans: Array<{
    is_primary: boolean;
    file_name: string;
    line_start: number;
    line_end: number;
    column_start: number;
    column_end: number;
    text: Array<{ text: string }>;
  }>;
};

export function assertFileSchemaPrivateDiagnostic(
  outcome: Outcome,
  mode: Mode,
  probe: (typeof fileSchemaCompilerProbes)[number],
  sourcePath: string,
  sourceText: string,
): void {
  completed(outcome, 1);
  const lines = sourceText.split("\n");
  assert.equal(
    digest(sourceText),
    probe.forbiddenSha256,
    "private client source pin differs",
  );
  assert.equal(
    lines[probe.diagnostic.line - 1]?.trim(),
    probe.diagnostic.sourceLine,
  );
  const expected = privateSpans[probe.id];
  const errors = outcome.stderr
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line) as CompilerDiagnostic)
    .filter((item) => item.level === "error");
  const diagnosticCount = mode === "stable" ? 1 : expected.length;
  assert.equal(
    errors.length,
    diagnosticCount + 1,
    "exact private-field diagnostic grouping",
  );
  const summary = errors.pop()!;
  assert.equal(summary.code, null);
  assert.deepEqual(summary.spans, []);
  assert.equal(
    summary.message,
    diagnosticCount === 1
      ? "aborting due to 1 previous error"
      : "aborting due to 2 previous errors",
  );
  const spans = errors.flatMap((error) => {
    assert.equal(
      error.code?.code,
      probe.diagnostic.code,
      "wrong compiler error",
    );
    const primary = error.spans.filter((span) => span.is_primary);
    assert.equal(
      primary.length,
      mode === "stable" ? expected.length : 1,
      "wrong primary span count",
    );
    return primary;
  });
  for (const item of expected) {
    const matches = spans.filter(
      (span) =>
        span.file_name === sourcePath &&
        span.line_start === item.line &&
        span.line_end === item.line &&
        span.column_start === item.column &&
        span.column_end ===
          (mode === "stable" ? item.stableEnd : item.msrvEnd) &&
        span.text.length === 1 &&
        span.text[0].text === lines[item.line - 1] &&
        span.text[0].text.slice(
          item.column - 1,
          item.column - 1 + item.symbol.length,
        ) === item.symbol,
    );
    assert.equal(matches.length, 1, "wrong authored private-field span");
  }
}

export function runFileSchemaVerification(options: Options): void {
  const repository = fileURLToPath(new URL("..", import.meta.url)).replace(
    /\/$/,
    "",
  );
  assert.equal(
    process.cwd(),
    repository,
    "run from the canonical repository root",
  );
  const runRoot = claimFileSchemaRunRoot(repository, options);
  const receipt = join(runRoot, "receipt.json");
  const commands: Array<Record<string, unknown>> = [];
  const fixtures: Array<Record<string, unknown>> = [];
  const report: Record<string, unknown> = {
    schema: "rust-workshop.file-schema-evolution.v1",
    status: "running",
    mode: options.mode,
    runRoot,
    error: null,
    commands,
    fixtures,
    semantic: [],
    equivalents: [],
    privacy: [],
  };
  const save = (flag = "w") =>
    writeFileSync(receipt, JSON.stringify(report, null, 2) + "\n", {
      flag,
      mode: 0o600,
    });
  save("wx");
  function child(
    executable: Binding,
    argv: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    timeout: number,
    fixture?: Fixture,
    inputFiles: Binding[] = [],
    lockTransition = false,
  ): Outcome {
    canonicalDirectory(cwd);
    assert.deepEqual(binding(executable.path, true), executable);
    const before = fixture ? snapshot(fixture.root) : null;
    if (fixture) {
      noAncestorCargoConfig(cwd);
      assert.deepEqual(before, fixture.inputs);
      fixture.lock?.assertUnchanged();
      assert.deepEqual(binding(fixture.archive.path), fixture.archive);
    }
    for (const file of inputFiles) assert.deepEqual(binding(file.path), file);
    const startedAt = new Date().toISOString();
    const raw = spawnSync(executable.path, argv, {
      cwd,
      env,
      encoding: "utf8",
      timeout,
      maxBuffer: 8 * 1024 * 1024,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const error = raw.error
      ? {
          code: (raw.error as NodeJS.ErrnoException).code ?? null,
          message: raw.error.message,
        }
      : null;
    const outcome: Outcome = {
      status: raw.status,
      signal: raw.signal,
      error,
      timedOut: error?.code === "ETIMEDOUT",
      closed: raw.pid > 0 && (raw.status !== null || raw.signal !== null),
      stdout: raw.stdout ?? "",
      stderr: raw.stderr ?? "",
    };
    const row: Record<string, unknown> = {
      executable,
      argv,
      cwd,
      env,
      timeoutMs: timeout,
      startedAt,
      finishedAt: new Date().toISOString(),
      pid: raw.pid ?? null,
      inheritedProcessGroup: true,
      ...outcome,
      fixture: fixture?.label ?? null,
      inputArchive: fixture?.archive ?? null,
      inputsBefore: before,
      linkedInputs: inputFiles,
      inputsAfter: null,
      inputValidationError: null,
    };
    commands.push(row);
    try {
      assert.deepEqual(binding(executable.path, true), executable);
      for (const file of inputFiles) assert.deepEqual(binding(file.path), file);
      if (fixture) {
        assert.deepEqual(binding(fixture.archive.path), fixture.archive);
        const after = snapshot(fixture.root);
        row.inputsAfter = after;
        if (lockTransition && outcome.status === 0 && outcome.error === null) {
          const { "Cargo.lock": lock, ...source } = after;
          assert(
            lock && lock.bytes > 0,
            "successful generation must add exactly Cargo.lock",
          );
          assert.deepEqual(source, before);
        } else assert.deepEqual(after, before);
        fixture.lock?.assertUnchanged();
      }
    } catch (error) {
      row.inputValidationError = String(error);
      throw error;
    } finally {
      save();
    }
    return outcome;
  }

  const readArchiveRoot = () => {
    const root = realpathSync(join(repository, "public/projects"));
    assert(
      [
        join(repository, "public/projects"),
        join(dirname(repository), "runtime/public/projects"),
      ].includes(root),
      "unexpected public archive root",
    );
    return root;
  };
  try {
    const archiveRoot = readArchiveRoot();
    const beforeArchives = authorizationArchiveSnapshot(repository);
    assertFileSchemaArchiveSnapshot(beforeArchives);
    report.beforeArchives = beforeArchives;
    report.fixtureSource = binding(
      join(
        repository,
        "src/content/projects/file-schema-evolution/fixtures.ts",
      ),
    );
    for (const name of [
      "archives",
      "fixtures",
      "targets",
      "clients",
      "home",
      "cargo-home",
      "tmp",
    ])
      mkdirSync(join(runRoot, name), { mode: 0o700 });
    const cargoHome = join(runRoot, "cargo-home");
    writeFileSync(join(cargoHome, "config.toml"), "[net]\noffline = true\n", {
      flag: "wx",
      mode: 0o600,
    });
    report.offlineCargoConfig = binding(join(cargoHome, "config.toml"));
    const home = realpathSync(homedir());
    const rustupHome = canonicalDirectory(
      resolve(process.env.RUSTUP_HOME ?? join(home, ".rustup")),
    );
    const profileRoot =
      process.env.RUST_WORKSHOP_AUTHORIZATION_QUALIFICATION_ROOT;
    let expected: Profile | undefined;
    if (profileRoot !== undefined) {
      const path = join(
        canonicalDirectory(profileRoot),
        `${options.mode}.json`,
      );
      report.qualificationProfile = binding(path);
      expected = validateFileSchemaProfile(
        options.mode,
        JSON.parse(readFileSync(path, "utf8")),
      );
      for (const name of tools)
        assert.deepEqual(
          binding(expected.executables[name].path, true),
          expected.executables[name],
        );
    } else {
      assert.equal(
        process.env.GITHUB_ACTIONS,
        "true",
        "local verification requires a current qualified profile",
      );
      report.qualificationProfile = null;
    }
    const rustup =
      expected?.executables.rustup ??
      binding(
        realpathSync(
          join(process.env.CARGO_HOME ?? join(home, ".cargo"), "bin/rustup"),
        ),
        true,
      );
    const toolchain = modeToolchain(options.mode);
    const identityEnv = {
      NODE_ENV: "production" as const,
      HOME: home,
      PATH: `${dirname(rustup.path)}:/usr/bin:/bin`,
      RUSTUP_HOME: rustupHome,
      RUSTUP_AUTO_INSTALL: "0",
      CARGO_NET_OFFLINE: "true",
      CARGO_HOME: cargoHome,
      TMPDIR: join(runRoot, "tmp"),
      CARGO_TERM_COLOR: "never",
    };
    const identities = {} as Record<Tool, Binding & { version: string }>;
    const rustupVersion = child(
      rustup,
      ["--version"],
      runRoot,
      identityEnv,
      30_000,
    );
    completed(rustupVersion, 0);
    identities.rustup = { ...rustup, version: rustupVersion.stdout.trim() };
    for (const name of ["cargo", "rustc", "rustdoc"] as const) {
      const located = child(
        rustup,
        ["which", "--toolchain", toolchain, name],
        runRoot,
        identityEnv,
        30_000,
      );
      completed(located, 0);
      const tool = binding(located.stdout.trim(), true);
      const relativeTool = tool.path.slice(
        join(rustupHome, "toolchains").length + 1,
      );
      assert(
        tool.path.startsWith(join(rustupHome, "toolchains") + "/") &&
          new RegExp(`^${escape(toolchain)}(?:-[^/]+)?/bin/${name}$`).test(
            relativeTool,
          ),
        "tool outside selected installed Rustup profile",
      );
      if (expected) assert.deepEqual(tool, expected.executables[name]);
      const version = child(
        tool,
        ["--version", "--verbose"],
        runRoot,
        identityEnv,
        30_000,
      );
      completed(version, 0);
      if (options.mode === "msrv")
        assert.match(version.stdout, /(?:^|\n)release: 1\.85\.0(?:\n|$)/);
      identities[name] = { ...tool, version: version.stdout.trim() };
    }
    if (expected)
      for (const name of tools)
        assert.equal(identities[name].version, expected.versionContains[name]);
    report.toolchain = identities;
    const {
      path: cargoPath,
      bytes: cargoBytes,
      mode: cargoMode,
      sha256: cargoSha256,
    } = identities.cargo;
    const cargo = {
      path: cargoPath,
      bytes: cargoBytes,
      mode: cargoMode,
      sha256: cargoSha256,
    };
    const {
      path: rustcPath,
      bytes: rustcBytes,
      mode: rustcMode,
      sha256: rustcSha256,
    } = identities.rustc;
    const rustc = {
      path: rustcPath,
      bytes: rustcBytes,
      mode: rustcMode,
      sha256: rustcSha256,
    };
    const childEnv = (target: string) => ({
      NODE_ENV: "production" as const,
      HOME: join(runRoot, "home"),
      PATH: `${dirname(cargo.path)}:/usr/bin:/bin`,
      CARGO_HOME: cargoHome,
      CARGO_NET_OFFLINE: "true",
      CARGO_TARGET_DIR: target,
      RUSTC: rustc.path,
      RUSTDOC: identities.rustdoc.path,
      RUSTUP_HOME: rustupHome,
      RUSTUP_AUTO_INSTALL: "0",
      TMPDIR: join(runRoot, "tmp"),
      CARGO_TERM_COLOR: "never",
    });

    const archives = {} as Record<
      Variant,
      { file: Binding; files: Record<string, string>; bytes: Buffer }
    >;
    for (const variant of ["starter", "solution"] as const) {
      const path = join(
        archiveRoot,
        fileSchemaEvolutionPackage.id,
        `${variant}.zip`,
      );
      const expectedBytes = Buffer.from(
        buildProjectArchive(fileSchemaEvolutionPackage, variant, {
          repositoryRoot: repository,
        }),
      );
      const actual = readFileSync(binding(path).path);
      assert(
        actual.equals(expectedBytes),
        "public archive differs from authored bytes",
      );
      const saved = join(runRoot, "archives", `${variant}.zip`);
      writeFileSync(saved, actual, { flag: "wx", mode: 0o600 });
      const files = projectArchiveFiles(fileSchemaEvolutionPackage, variant, {
        repositoryRoot: repository,
      });
      assert.equal(Object.keys(files).length, 13);
      assert(!Object.hasOwn(files, "Cargo.lock"));
      archives[variant] = { file: binding(saved), files, bytes: actual };
    }
    report.archives = Object.fromEntries(
      Object.entries(archives).map(([variant, value]) => [
        variant,
        {
          file: value.file,
          members: Object.fromEntries(
            Object.entries(value.files).map(([path, content]) => [
              path,
              { bytes: Buffer.byteLength(content), sha256: digest(content) },
            ]),
          ),
        },
      ]),
    );
    function cargoRun(
      fixture: Fixture,
      args: string[],
      lockTransition = false,
    ) {
      return child(
        cargo,
        args,
        fixture.root,
        childEnv(fixture.target),
        180_000,
        fixture,
        [],
        lockTransition,
      );
    }
    function materialize(label: string, variant: Variant): Fixture {
      assert(/^[A-Za-z0-9-]+$/.test(label));
      const archive = archives[variant];
      assert.deepEqual(binding(archive.file.path), archive.file);
      const root = join(runRoot, "fixtures", label);
      const target = join(runRoot, "targets", label);
      mkdirSync(root, { mode: 0o700 });
      mkdirSync(target, { mode: 0o700 });
      const entries = unzipSync(archive.bytes);
      const prefix = `${fileSchemaEvolutionPackage.id}/`;
      assert.deepEqual(
        Object.keys(entries).sort(),
        Object.keys(archive.files)
          .map((path) => prefix + path)
          .sort(),
      );
      for (const [path, text] of Object.entries(archive.files)) {
        const bytes = Buffer.from(entries[prefix + path]);
        assert(bytes.equals(Buffer.from(text)), "archive member bytes differ");
        const destination = join(root, path);
        mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
        writeFileSync(destination, bytes, { flag: "wx", mode: 0o600 });
      }
      const fixture: Fixture = {
        label,
        variant,
        root,
        target,
        inputs: snapshot(root),
        archive: archive.file,
      };
      const row: Record<string, unknown> = {
        label,
        variant,
        root,
        target,
        archive: archive.file,
        sourceBeforeLock: fixture.inputs,
        generatedLock: null,
      };
      fixtures.push(row);
      fixture.lock = generateFileSchemaPackageLock(
        fileSchemaEvolutionPackage.id,
        root,
        (argv) => {
          const outcome = cargoRun(fixture, argv, true);
          completed(outcome, 0);
          return true;
        },
      );
      assert(fixture.lock);
      row.generatedLock = fixture.lock.binding;
      fixture.inputs = snapshot(root);
      save();
      return fixture;
    }

    const semantic = report.semantic as unknown[];
    const equivalents = report.equivalents as unknown[];
    const positives: Array<Record<string, unknown>> = [];
    report.positives = positives;
    assert.equal(fileSchemaSemanticMutations.length, 15);
    assert.deepEqual(
      fileSchemaSemanticMutations.map((item) => item.id),
      Array.from(
        { length: 15 },
        (_, i) => `M${String(i + 1).padStart(2, "0")}`,
      ),
    );
    assert.equal(fileSchemaNativeEquivalents.length, 2);
    for (const release of [false, true]) {
      const profile = release ? "release" : "debug";
      const starter = materialize(`starter-${profile}`, "starter");
      completed(
        cargoRun(
          starter,
          fileSchemaCargoArgs("compile-all", starter.root, release),
        ),
        0,
      );
      const starterResult = cargoRun(
        starter,
        fileSchemaCargoArgs("all", starter.root, release),
      );
      assertStarter(starterResult, archives.starter.files["src/model.rs"]);
      positives.push({
        fixture: starter.label,
        outcome: "expected-unfinished",
        passed: 3,
        failed: 11,
        command: commands.length - 1,
      });
      const canonical = materialize(`canonical-${profile}`, "solution");
      assertFileSchemaPositive(
        cargoRun(
          canonical,
          fileSchemaCargoArgs("all", canonical.root, release),
        ),
      );
      positives.push({
        fixture: canonical.label,
        outcome: "passed",
        passed: 14,
        command: commands.length - 1,
      });
      for (const equivalent of fileSchemaNativeEquivalents) {
        const fixture = materialize(
          `equivalent-${equivalent.id}-${profile}`,
          "solution",
        );
        replacePinned(fixture, equivalent);
        assertFileSchemaPositive(
          cargoRun(fixture, fileSchemaCargoArgs("all", fixture.root, release)),
        );
        equivalents.push({
          id: equivalent.id,
          profile,
          fixture: fixture.label,
          patch: equivalent,
          command: commands.length - 1,
        });
      }
      for (const mutation of fileSchemaSemanticMutations) {
        const fixture = materialize(
          `mutant-${mutation.id}-${profile}`,
          "solution",
        );
        replacePinned(fixture, mutation);
        const site = mutation.assertion;
        assert.equal(fixture.inputs[site.sourceFile].sha256, site.sourceSha256);
        assert.equal(
          readFileSync(fixture.inputs[site.sourceFile].path, "utf8")
            .split("\n")
            [site.line - 1]?.trim(),
          site.sourceLine,
        );
        const compile = cargoRun(
          fixture,
          fileSchemaCargoArgs(
            "compile-target",
            fixture.root,
            release,
            mutation.target,
            mutation.expectedTest,
          ),
        );
        const compileIndex = commands.length - 1;
        completed(compile, 0);
        const rejection = cargoRun(
          fixture,
          fileSchemaCargoArgs(
            "named",
            fixture.root,
            release,
            mutation.target,
            mutation.expectedTest,
          ),
        );
        const rejectedIndex = commands.length - 1;
        assertFileSchemaNamedRejection(
          compile,
          rejection,
          mutation.expectedTest,
          site,
        );
        const restored = materialize(
          `restored-${mutation.id}-${profile}`,
          "solution",
        );
        assert.equal(
          restored.inputs[mutation.sourceFile].sha256,
          mutation.sourceSha256,
        );
        namedOutcome(
          cargoRun(
            restored,
            fileSchemaCargoArgs(
              "named",
              restored.root,
              release,
              mutation.target,
              mutation.expectedTest,
            ),
          ),
          mutation.expectedTest,
          true,
        );
        semantic.push({
          id: mutation.id,
          profile,
          fixture: fixture.label,
          restoredFixture: restored.label,
          patch: mutation,
          compile: compileIndex,
          rejected: rejectedIndex,
          restored: commands.length - 1,
        });
        save();
      }
    }

    const privacy = report.privacy as unknown[];
    assert.equal(fileSchemaCompilerProbes.length, 3);
    for (const probe of fileSchemaCompilerProbes) {
      function library(label: string, relaxation?: Patch) {
        const fixture = materialize(label, "solution");
        if (relaxation) replacePinned(fixture, relaxation);
        const output = join(fixture.target, "libfile_schema_evolution.rlib");
        completed(
          child(
            rustc,
            [
              "--edition=2024",
              "--crate-type=rlib",
              "--crate-name=file_schema_evolution",
              fixture.inputs["src/lib.rs"].path,
              "-o",
              output,
              "--error-format=json",
            ],
            fixture.root,
            childEnv(fixture.target),
            60_000,
            fixture,
          ),
          0,
        );
        return { fixture, rlib: binding(output), command: commands.length - 1 };
      }
      function client(
        label: string,
        built: ReturnType<typeof library>,
        text: string,
        sha256: string,
      ) {
        const source = join(runRoot, "clients", `${probe.id}-${label}.rs`);
        assert.equal(digest(text), sha256);
        writeFileSync(source, text, { flag: "wx", mode: 0o600 });
        const input = binding(source);
        const output = join(built.fixture.target, `${label}-client`);
        const outcome = child(
          rustc,
          [
            "--edition=2024",
            "--crate-name=file_schema_privacy_client",
            source,
            "--extern",
            `file_schema_evolution=${built.rlib.path}`,
            "-o",
            output,
            "--error-format=json",
          ],
          built.fixture.root,
          childEnv(built.fixture.target),
          60_000,
          built.fixture,
          [input, built.rlib],
        );
        const binary = outcome.status === 0 ? binding(output, true) : null;
        if (binary === null)
          assert.throws(
            () => lstatSync(output),
            { code: "ENOENT" },
            "rejected compiler client created an output",
          );
        return { outcome, input, binary, command: commands.length - 1 };
      }
      const canonical = library(`privacy-${probe.id}-canonical`);
      const forbidden = client(
        "forbidden",
        canonical,
        probe.forbiddenSource,
        probe.forbiddenSha256,
      );
      assertFileSchemaPrivateDiagnostic(
        forbidden.outcome,
        options.mode,
        probe,
        forbidden.input.path,
        readFileSync(forbidden.input.path, "utf8"),
      );
      const accessor = client(
        "accessor",
        canonical,
        probe.accessorSource,
        probe.accessorSha256,
      );
      completed(accessor.outcome, 0);
      const relaxed = library(`privacy-${probe.id}-relaxed`, probe.relaxation);
      const positive = client(
        "relaxed",
        relaxed,
        probe.forbiddenSource,
        probe.forbiddenSha256,
      );
      completed(positive.outcome, 0);
      const restored = library(`privacy-${probe.id}-restored`);
      const rejectedAgain = client(
        "restored",
        restored,
        probe.forbiddenSource,
        probe.forbiddenSha256,
      );
      assertFileSchemaPrivateDiagnostic(
        rejectedAgain.outcome,
        options.mode,
        probe,
        rejectedAgain.input.path,
        readFileSync(rejectedAgain.input.path, "utf8"),
      );
      privacy.push({
        id: probe.id,
        canonical: {
          fixture: canonical.fixture.label,
          rlib: canonical.rlib,
          command: canonical.command,
        },
        relaxed: {
          fixture: relaxed.fixture.label,
          rlib: relaxed.rlib,
          command: relaxed.command,
        },
        restored: {
          fixture: restored.fixture.label,
          rlib: restored.rlib,
          command: restored.command,
        },
        forbidden: forbidden.command,
        accessor: accessor.command,
        relaxedPositive: positive.command,
        compiledClients: {
          accessor: accessor.binary,
          relaxed: positive.binary,
        },
        restoredRejection: rejectedAgain.command,
        diagnostic: probe.diagnostic,
        relaxation: probe.relaxation,
      });
      save();
    }
    assert.equal(readArchiveRoot(), archiveRoot);
    const afterArchives = authorizationArchiveSnapshot(repository);
    report.afterArchives = afterArchives;
    assertFileSchemaArchiveSnapshot(afterArchives);
    assert.deepEqual(
      afterArchives,
      beforeArchives,
      "public archive snapshot changed",
    );
    assert.deepEqual(
      binding((report.fixtureSource as Binding).path),
      report.fixtureSource,
    );
    if (report.qualificationProfile)
      assert.deepEqual(
        binding((report.qualificationProfile as Binding).path),
        report.qualificationProfile,
      );
    report.status = "verified-authored-fixtures-awaiting-outer-custody";
    save();
    console.log(
      JSON.stringify({
        mode: options.mode,
        receipt,
        nativePositiveTests: 14,
        semanticRuns: semantic.length,
        equivalents: equivalents.length,
        privacyCategories: privacy.length,
        status: report.status,
      }),
    );
  } catch (error) {
    report.status = "failed";
    report.error =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error);
    if (report.beforeArchives) {
      try {
        readArchiveRoot();
        report.afterArchives = authorizationArchiveSnapshot(repository);
      } catch (archiveError) {
        report.afterArchiveError = String(archiveError);
      }
    }
    save();
    throw error;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  runFileSchemaVerification(parseFileSchemaOptions(process.argv.slice(2)));
}
