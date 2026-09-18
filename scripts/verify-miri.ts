/** Verifies the repository-authored pure-Rust Miri safety package only. */
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { unzipSync } from "fflate";
import { miriSafetyPackage } from "../src/content/projects/miri-safety";
import { buildProjectArchive } from "./project-archive";

const MIRI_TOOLCHAIN = "nightly-2026-08-08";
const args = process.argv.slice(2);
assert(
  args.every(
    (argument) =>
      argument === "--fetch" ||
      argument === "--stable" ||
      argument === "--msrv",
  ) &&
    new Set(args).size === args.length,
  "Only --fetch, --stable and --msrv are supported; code, paths, dependency overrides and arbitrary toolchains are not accepted.",
);

const fetchDependencies = args.includes("--fetch");
const useStable = args.includes("--stable");
const useMsrv = args.includes("--msrv");
assert(
  !(useStable && useMsrv),
  "Choose at most one safe-package compiler mode: --stable or --msrv.",
);
const env = { ...process.env };
const miriEnv = { ...process.env };
let cargo = "cargo";
let rustc = "rustc";
let miriCargoExecutable = "cargo";

function resolveRustupToolchain(toolchain: string, expectedVersion: RegExp) {
  const paths: Record<string, string> = {};
  for (const tool of ["cargo", "rustc", "rustdoc"]) {
    const located = spawnSync(
      "rustup",
      ["which", "--toolchain", toolchain, tool],
      { encoding: "utf8", timeout: 10_000 },
    );
    assert.equal(located.status, 0, located.stderr);
    paths[tool] = located.stdout.trim();
    const version = spawnSync(paths[tool], ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(version.status, 0, version.stderr ?? "");
    assert(expectedVersion.test(version.stdout), version.stdout);
    console.log(version.stdout.trim());
  }
  return paths;
}

const safeToolchain = useMsrv ? "1.85.0" : "stable";
const safeVersion = useMsrv
  ? /^\w+ 1\.85\.0 /
  : /^(?:cargo|rustc|rustdoc) \d+\.\d+\.\d+ /;
const safePaths = resolveRustupToolchain(safeToolchain, safeVersion);
cargo = safePaths.cargo;
rustc = safePaths.rustc;
env.RUSTC = safePaths.rustc;
env.RUSTDOC = safePaths.rustdoc;
env.RUSTUP_TOOLCHAIN = safeToolchain;
env.PATH = `${dirname(cargo)}${delimiter}${env.PATH ?? ""}`;

delete miriEnv.RUSTC;
delete miriEnv.RUSTDOC;
delete miriEnv.RUSTUP_TOOLCHAIN;

function miriCargo(...commandArgs: string[]) {
  return commandArgs;
}

function command(
  executable: string,
  commandArgs: string[],
  cwd: string,
  timeout = 120_000,
  commandEnv = env,
) {
  return spawnSync(executable, commandArgs, {
    cwd,
    env: commandEnv,
    encoding: "utf8",
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
}

function run(
  executable: string,
  commandArgs: string[],
  cwd: string,
  timeout = 120_000,
  commandEnv = env,
) {
  const result = command(executable, commandArgs, cwd, timeout, commandEnv);
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  assert.equal(
    result.status,
    0,
    `${executable} ${commandArgs.join(" ")} failed${result.error ? `: ${result.error.message}` : ""}`,
  );
  console.log(`ok ${executable} ${commandArgs.join(" ")}`);
  return result;
}

function extractArchive(bytes: Uint8Array, directory: string) {
  for (const [path, contents] of Object.entries(unzipSync(bytes))) {
    const target = join(
      directory,
      path.slice(`${miriSafetyPackage.id}/`.length),
    );
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

function verifyMiriToolchain() {
  const located = spawnSync(
    "rustup",
    ["which", "--toolchain", MIRI_TOOLCHAIN, "cargo"],
    { encoding: "utf8", timeout: 10_000 },
  );
  assert.equal(located.status, 0, located.stderr);
  miriCargoExecutable = located.stdout.trim();
  miriEnv.PATH = `${dirname(miriCargoExecutable)}${delimiter}${miriEnv.PATH ?? ""}`;
  miriEnv.RUSTUP_TOOLCHAIN = MIRI_TOOLCHAIN;
  const version = command(
    miriCargoExecutable,
    miriCargo("miri", "--version"),
    process.cwd(),
    30_000,
    miriEnv,
  );
  assert.equal(
    version.status,
    0,
    `${MIRI_TOOLCHAIN} with cargo-miri is required:\n${version.stderr ?? ""}`,
  );
  console.log(`${MIRI_TOOLCHAIN}: ${version.stdout.trim()}`);
}

function expectMutantRejected(directory: string) {
  const sourcePath = join(directory, "src", "lib.rs");
  const source = readFileSync(sourcePath, "utf8");
  const mutant = source.replace(
    "input.split_at_mut_checked(at)",
    "input.split_at_mut_checked(at.saturating_sub(1))",
  );
  assert.notEqual(mutant, source, "split-boundary mutant did not change source");
  writeFileSync(sourcePath, mutant);
  try {
    const result = command(
      cargo,
      [
        "test",
        "--offline",
        "--locked",
        "--test",
        "mutation_contract",
        "split_regions_boundary_mutant_is_rejected",
        "--",
        "--exact",
        "--test-threads=1",
      ],
      directory,
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.signal, null, "a signal is not mutant rejection");
    assert.equal(
      result.status,
      101,
      `mutant did not fail normally:\n${output}`,
    );
    assert(
      output.includes("split_regions_boundary_mutant_is_rejected ... FAILED"),
      `mutant did not report the named test failure:\n${output}`,
    );
    assert(output.includes("test result: FAILED"), output);
    console.log("ok controlled split-boundary mutant rejected");
  } finally {
    writeFileSync(sourcePath, source);
  }
}

function compileFixture(
  sourcePath: string,
  outputPath: string,
  directory: string,
) {
  const result = command(
    rustc,
    [
      "--edition=2024",
      "--crate-type",
      "bin",
      "--emit=metadata",
      sourcePath,
      "-o",
      outputPath,
    ],
    directory,
    60_000,
  );
  assert.equal(
    result.status,
    0,
    `fixture failed to compile for diagnostics: ${sourcePath}\n${result.stderr ?? ""}`,
  );
  assert(
    existsSync(outputPath),
    `rustc did not emit fixture metadata: ${outputPath}`,
  );
  console.log(`ok compiled fixture metadata ${sourcePath}`);
}

function expectMiriUndefinedBehavior(
  fixturesDirectory: string,
  targetDirectory: string,
  binary: string,
) {
  const result = command(
    miriCargoExecutable,
    miriCargo(
      "miri",
      "run",
      "--manifest-path",
      join(fixturesDirectory, "Cargo.toml"),
      "--target-dir",
      targetDirectory,
      "--bin",
      binary,
    ),
    fixturesDirectory,
    180_000,
    miriEnv,
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const diagnostics = {
    "ub-out-of-bounds": {
      source: "ub_out_of_bounds.rs",
      pattern: /out[- ]of[- ]bounds|out[- ]of[- ]bounds memory access/i,
    },
    "ub-use-after-free": {
      source: "ub_use_after_free.rs",
      pattern: /dangling|deallocated|freed allocation|use[- ]after[- ]free/i,
    },
    "ub-aliasing": {
      source: "ub_aliasing.rs",
      pattern: /retag|borrow stack|shared.*permission|write access/i,
    },
  }[binary as "ub-out-of-bounds" | "ub-use-after-free" | "ub-aliasing"];
  assert(diagnostics, `No diagnostic matcher is defined for ${binary}`);
  assert.equal(
    result.error,
    undefined,
    `Miri command failed to start for ${binary}: ${result.error?.message ?? "unknown error"}`,
  );
  assert.equal(
    result.status,
    1,
    `Miri did not return normal UB rejection status for ${binary}: ${result.status}\n${output}`,
  );
  assert.equal(
    result.signal,
    null,
    `Miri was terminated by a signal for ${binary}`,
  );
  assert(
    output.includes(diagnostics.source),
    `Miri did not attribute ${binary} to ${diagnostics.source}:\n${output}`,
  );
  assert(
    /undefined behavior/i.test(output),
    `Miri did not report an explicit Undefined Behavior marker for ${binary}:\n${output}`,
  );
  assert(
    diagnostics.pattern.test(output),
    `Miri did not report the expected ${binary} diagnostic:\n${output}`,
  );
  console.log(`ok Miri rejected ${binary} without native execution`);
}

const root = mkdtempSync(join(tmpdir(), "rust-workshop-miri-safety-"));

try {
  verifyMiriToolchain();
  const solution = buildProjectArchive(miriSafetyPackage, "solution");
  const starter = buildProjectArchive(miriSafetyPackage, "starter");
  for (const [variant, bytes] of [
    ["starter", starter],
    ["solution", solution],
  ] as const) {
    const servedPath = join(
      process.cwd(),
      "public",
      "projects",
      miriSafetyPackage.id,
      `${variant}.zip`,
    );
    assert(
      existsSync(servedPath),
      `Missing served ${variant} archive: ${servedPath}; run content:packages after registering the project`,
    );
    assert(
      readFileSync(servedPath).equals(Buffer.from(bytes)),
      `Stale Miri Safety ${variant} archive; run content:packages first`,
    );
  }

  const packageRoot = join(root, miriSafetyPackage.id);
  extractArchive(solution, packageRoot);
  const fixturesDirectory = join(packageRoot, "fixtures");
  const miriTarget = join(root, "miri-target");

  if (fetchDependencies) {
    run(cargo, ["fetch", "--locked"], packageRoot);
  }
  run(cargo, ["fmt", "--all", "--", "--check"], packageRoot);
  run(cargo, ["check", "--all-targets", "--offline", "--locked"], packageRoot);
  run(cargo, ["test", "--all-targets", "--offline", "--locked"], packageRoot);
  run(
    cargo,
    [
      "clippy",
      "--all-targets",
      "--offline",
      "--locked",
      "--",
      "-D",
      "warnings",
    ],
    packageRoot,
  );
  expectMutantRejected(packageRoot);

  for (const fixture of [
    "ub_out_of_bounds",
    "ub_use_after_free",
    "ub_aliasing",
  ]) {
    compileFixture(
      join(fixturesDirectory, `${fixture}.rs`),
      join(root, `${fixture}.rmeta`),
      fixturesDirectory,
    );
  }

  run(
    miriCargoExecutable,
    miriCargo(
      "miri",
      "test",
      "--manifest-path",
      join(packageRoot, "Cargo.toml"),
      "--locked",
      "--offline",
      "--target-dir",
      miriTarget,
    ),
    packageRoot,
    180_000,
    miriEnv,
  );
  for (const binary of [
    "ub-out-of-bounds",
    "ub-use-after-free",
    "ub-aliasing",
  ]) {
    expectMiriUndefinedBehavior(fixturesDirectory, miriTarget, binary);
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
