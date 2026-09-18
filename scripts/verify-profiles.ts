/** Verifies authored profile contracts and, when requested, fresh Valgrind output. */
import assert from "node:assert/strict";
import {
  existsSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { unzipSync } from "fflate";
import { projectFiles } from "../src/domain/project-package";
import { logAnalyzerPackage } from "../src/content/projects/log-analyzer";
import { buildProjectArchive } from "./project-archive";

const args = process.argv.slice(2);
const profileArgument = args.find((argument) =>
  argument.startsWith("--profile="),
);
const profileArguments = args.filter((argument) =>
  argument.startsWith("--profile="),
);
const profile = profileArgument?.slice("--profile=".length);
assert(
  args.every(
    (argument) =>
      argument === "--fetch" ||
      argument === "--msrv" ||
      argument === "--profile=callgrind" ||
      argument === "--profile=dhat",
  ) && new Set(args).size === args.length,
  "Only --fetch, --msrv and one supported --profile mode are accepted",
);
assert(
  profileArguments.length <= 1,
  "Pass at most one --profile mode",
);
assert(
  !profileArgument || profile === "callgrind" || profile === "dhat",
  "Profile mode must be callgrind or dhat",
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

assert.equal(logAnalyzerPackage.id, "log-analyzer-workshop");
const solutionFiles = projectFiles(logAnalyzerPackage, "solution");
const manifest = JSON.parse(solutionFiles["PROFILE-MANIFEST.json"]);
assert.equal(manifest.schema, "rust-workshop.profile.v1");
assert.equal(manifest.package, logAnalyzerPackage.id);
assert.equal(manifest.workload.id, "fixed-512-info-records");
assert.equal(manifest.allocation_model.status, "unverified-source-assumption");
assert.equal(manifest.allocation_model.runtime_observed, false);
assert.equal(manifest.allocation_model.verification_status, "open");
assert.equal(manifest.allocation_model.source_model_buffer_capacity_bytes, 4096);
assert.equal(manifest.allocation_model.source_model_retained_record_bytes, 0);
assert.equal(manifest.provenance.fixture_policy.includes("generated"), true);
assert.equal(manifest.profile_boundary.kind, "whole-test-process");
assert.equal(manifest.profile_boundary.attributes_parser_exclusively, false);
assert.equal(manifest.comparison.metric, "summary equality only");
assert.equal(manifest.comparison.same_workload, true);

const root = mkdtempSync(
  join(tmpdir(), "rust-workshop-log-analyzer-profiles-"),
);

function extractArchive(bytes: Uint8Array, directory: string) {
  for (const [path, contents] of Object.entries(unzipSync(bytes))) {
    const target = join(
      directory,
      path.slice(`${logAnalyzerPackage.id}/`.length),
    );
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

function run(directory: string, command: string, commandArgs: string[]) {
  const result = spawnSync(command, commandArgs, {
    cwd: directory,
    env,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  assert.equal(
    result.status,
    0,
    `${command} ${commandArgs.join(" ")} failed${result.error ? `: ${result.error.message}` : ""}`,
  );
  console.log(`ok ${command} ${commandArgs.join(" ")}`);
  return result;
}

function rejectSourceModelMutant(directory: string) {
  const sourcePath = join(directory, "tests", "source_model_contract.rs");
  const source = readFileSync(sourcePath, "utf8");
  const mutant = source.replace(
    "source_model_buffer_capacity_bytes: MAX_LINE_BYTES",
    "source_model_buffer_capacity_bytes: setup_bytes",
  );
  assert.notEqual(
    mutant,
    source,
    "source model mutation did not change authored source",
  );
  writeFileSync(sourcePath, mutant);
  try {
    const result = spawnSync(
      cargo,
      [
        "test",
        "--offline",
        "--locked",
        "--test",
        "source_model_contract",
        "fixed_workload_matches_explicit_source_model_without_runtime_counter",
        "--",
        "--exact",
      ],
      {
        cwd: directory,
        env,
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    assert.equal(result.error, undefined, "mutant command failed to start");
    assert.equal(result.signal, null, "a signal is not mutant rejection");
    assert.equal(
      result.status,
      101,
      `source model mutant did not terminate as a failing Rust test:\n${output}`,
    );
    assert(
      output.includes(
        "fixed_workload_matches_explicit_source_model_without_runtime_counter ... FAILED",
      ),
      "source model mutant did not report the named authored test failure",
    );
    assert(
      output.includes("test result: FAILED"),
      "source model mutant did not report a normal Rust test failure",
    );
    console.log("ok controlled source model mutant rejected");
  } finally {
    writeFileSync(sourcePath, source);
  }
}

function locateTestBinary(directory: string) {
  const deps = join(directory, "target", "debug", "deps");
  const binary = readdirSync(deps)
    .filter((name) => name.startsWith("source_model_contract-"))
    .map((name) => join(deps, name))
    .filter((path) => statSync(path).isFile() && !path.endsWith(".d"))
    .find((path) => {
      try {
        return (statSync(path).mode & 0o111) !== 0;
      } catch {
        return false;
      }
    });
  assert(
    binary,
    "Cargo did not produce the authored source model test binary",
  );
  return binary;
}

function runExternalProfile(directory: string, binary: string) {
  assert(profile, "profile mode is required");
  const tool = "valgrind";
  const version = spawnSync(tool, ["--version"], { encoding: "utf8" });
  assert.equal(
    version.status,
    0,
    `${tool} is required for --profile=${profile}; refusing to accept stale fixtures`,
  );
  console.log(version.stdout.trim());
  const outputPrefix = `${profile}.out.%p`;
  const toolArgs =
    profile === "callgrind"
      ? [
          "--tool=callgrind",
          "--error-exitcode=99",
          `--callgrind-out-file=${outputPrefix}`,
        ]
      : [
          "--tool=dhat",
          "--error-exitcode=99",
          `--dhat-out-file=${outputPrefix}`,
        ];
  run(directory, tool, [
    ...toolArgs,
    binary,
    "fixed_workload_matches_explicit_source_model_without_runtime_counter",
    "--exact",
  ]);
  const outputs = readdirSync(directory).filter((name) =>
    name.startsWith(`${profile}.out.`),
  );
  assert(
    outputs.length === 1 &&
      readFileSync(join(directory, outputs[0])).length > 0,
    `--profile=${profile} did not produce a fresh non-empty ${profile} report`,
  );
  const artifactDirectory = env.PROFILE_OUTPUT_DIR;
  if (artifactDirectory) {
    mkdirSync(artifactDirectory, { recursive: true });
    copyFileSync(
      join(directory, outputs[0]),
      join(artifactDirectory, `${profile}-${outputs[0]}`),
    );
  }
  console.log(`ok fresh ${profile} report: ${outputs[0]}`);
}

try {
  for (const variant of ["starter", "solution"] as const) {
    const expected = buildProjectArchive(logAnalyzerPackage, variant);
    const servedPath = join(
      process.cwd(),
      "public",
      "projects",
      logAnalyzerPackage.id,
      `${variant}.zip`,
    );
    assert(
      existsSync(servedPath),
      `Missing served ${variant} archive: ${servedPath}`,
    );
    assert(
      readFileSync(servedPath).equals(Buffer.from(expected)),
      `Stale Log Analyzer ${variant} archive; run content:packages first`,
    );
  }

  const packageRoot = join(root, logAnalyzerPackage.id);
  mkdirSync(packageRoot, { recursive: true });
  extractArchive(
    buildProjectArchive(logAnalyzerPackage, "solution"),
    packageRoot,
  );
  if (fetchDependencies) run(packageRoot, cargo, ["fetch", "--locked"]);
  const offline = ["--offline", "--locked"];
  run(packageRoot, cargo, ["fmt", "--all", "--", "--check"]);
  run(packageRoot, cargo, ["check", ...offline, "--all-targets"]);
  run(packageRoot, cargo, [
    "test",
    ...offline,
    "--all-targets",
    "--no-fail-fast",
  ]);
  run(packageRoot, cargo, [
    "clippy",
    ...offline,
    "--all-targets",
    "--",
    "-D",
    "warnings",
  ]);
  run(packageRoot, cargo, [
    "test",
    ...offline,
    "--test",
    "source_model_contract",
    "--no-run",
  ]);
  rejectSourceModelMutant(packageRoot);

  if (profile) {
    run(packageRoot, cargo, [
      "test",
      ...offline,
      "--test",
      "source_model_contract",
      "--no-run",
    ]);
    runExternalProfile(packageRoot, locateTestBinary(packageRoot));
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
