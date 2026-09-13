/** Executes only the reviewed Mini grep archive and one fixed mutant, never learner code. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { miniGrepPackage } from "../src/content/projects/mini-grep";
import { projectFiles } from "../src/domain/project-package";
import { buildProjectArchive } from "./project-archive";
import { verifyFuzzResult, type FuzzExpectation } from "./fuzz-result";

const args = process.argv.slice(2);
assert(
  args.length <= 1 && args.every((arg) => arg === "--fetch"),
  "Only --fetch is accepted, never code or paths",
);
const toolchain = "nightly-2026-08-08";
const root = mkdtempSync(join(tmpdir(), "rust-workshop-authored-fuzz-"));
// Keep each run's corpus and crash artifact, including failures, for diagnosis.
const reports = join(process.cwd(), "test-results/mini-grep-fuzz");
mkdirSync(reports, { recursive: true });
const report = mkdtempSync(join(reports, "run-"));
let env = { ...process.env };

function run(
  name: string,
  binary: string,
  commandArgs: string[],
  expectation?: FuzzExpectation,
  timeout = 60_000,
) {
  const result = spawnSync(binary, commandArgs, {
    cwd: root,
    env,
    encoding: "utf8",
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  writeFileSync(
    join(report, `${name}.log`),
    `${binary} ${commandArgs.join(" ")}\n${output}\nstatus=${result.status}; signal=${result.signal}; error=${result.error?.message ?? "none"}\n`,
  );
  const passed = expectation
    ? verifyFuzzResult(
        { ...result, stdout: result.stdout ?? "", stderr: result.stderr ?? "" },
        expectation,
      )
    : !result.error && !result.signal && result.status === 0;
  console.log(`${passed ? "ok" : "FAIL"} ${name}`);
  if (!passed)
    throw new Error(
      `${name}: ${result.error?.message ?? output}\nReports: ${report}`,
    );
  return output;
}

try {
  const served = readFileSync(
    join(process.cwd(), "public/projects", miniGrepPackage.id, "solution.zip"),
  );
  assert.deepEqual(
    served,
    Buffer.from(buildProjectArchive(miniGrepPackage, "solution")),
    "Fuzz must verify the exact downloadable archive",
  );
  for (const [path, content] of Object.entries(
    projectFiles(miniGrepPackage, "solution"),
  )) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  const lockFiles = ["Cargo.lock", "fuzz/Cargo.lock"];
  const locks = lockFiles.map((path) => readFileSync(join(root, path), "utf8"));
  const compiler = run("resolve-rustc", "rustup", [
    "which",
    "--toolchain",
    toolchain,
    "rustc",
  ]).trim();
  const cargo = run("resolve-cargo", "rustup", [
    "which",
    "--toolchain",
    toolchain,
    "cargo",
  ]).trim();
  const rustdoc = run("resolve-rustdoc", "rustup", [
    "which",
    "--toolchain",
    toolchain,
    "rustdoc",
  ]).trim();
  // cargo-fuzz spawns bare cargo/rustc; rustup run alone can still select a
  // non-proxy Homebrew compiler. Pin the entire child process chain explicitly.
  env = {
    ...env,
    PATH: `${dirname(cargo)}${process.platform === "win32" ? ";" : ":"}${env.PATH ?? ""}`,
    RUSTC: compiler,
    RUSTDOC: rustdoc,
    RUSTFLAGS: "",
  };
  delete env.CARGO_ENCODED_RUSTFLAGS;
  const version = run("compiler-version", compiler, ["-vV"]);
  assert(
    version.includes("nightly"),
    "A nightly compiler is required for instrumentation",
  );
  const host = version.match(/^host: (\S+)$/m)?.[1];
  assert(host, "Compiler must report its native target");
  assert.match(
    run("cargo-fuzz-version", "cargo-fuzz", ["--version"]),
    /^cargo-fuzz 0\.13\.2\s*$/,
  );
  if (args.includes("--fetch"))
    run("fetch", cargo, [
      "fetch",
      "--manifest-path",
      "fuzz/Cargo.toml",
      "--locked",
    ]);
  env.CARGO_NET_OFFLINE = "true";
  run("oracle-build", compiler, [
    "--edition",
    "2024",
    "--test",
    "fuzz/oracle.rs",
    "-o",
    join(root, "oracle-tests"),
  ]);
  assert.match(
    run("oracle-test", join(root, "oracle-tests"), []),
    /test result: ok\. 3 passed/,
  );
  run("fuzz-format", cargo, [
    "fmt",
    "--manifest-path",
    "fuzz/Cargo.toml",
    "--",
    "--check",
  ]);
  const target = join(root, "fuzz/target");
  const binary = join(target, host, "release", "selection");
  const build = (name: string) =>
    run(
      name,
      "cargo-fuzz",
      ["fuzz", "build", "selection", "--target", host, "--target-dir", target],
      undefined,
      180_000,
    );
  const corpus = join(root, "fuzz/corpus/selection");
  const artifacts = join(root, "fuzz/artifacts/selection");
  mkdirSync(artifacts, { recursive: true });
  const limits = [
    "-seed=20260913",
    "-runs=20000",
    "-max_len=4096",
    "-max_total_time=30",
    "-timeout=3",
    "-rss_limit_mb=1024",
    `-artifact_prefix=${artifacts}/`,
  ];
  build("reference-build");
  run("reference-campaign", binary, [corpus, ...limits], {
    kind: "campaign",
    minimumRuns: 1000,
  });
  const searchPath = join(root, "src/search.rs");
  const original = readFileSync(searchPath, "utf8");
  const needle = "if !line.contains(query.as_str()) {";
  assert.equal(
    original.split(needle).length,
    2,
    "Fixed mutation must match exactly once",
  );
  try {
    writeFileSync(
      searchPath,
      original.replace(needle, "if !line.starts_with(query.as_str()) {"),
    );
    build("mutant-build");
    const result = spawnSync(binary, [corpus, ...limits], {
      cwd: root,
      env,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    writeFileSync(
      join(report, "mutant-campaign.log"),
      `${result.stdout ?? ""}${result.stderr ?? ""}\nstatus=${result.status}; signal=${result.signal}; error=${result.error?.message ?? "none"}\n`,
    );
    const crashes = readdirSync(artifacts).filter(
      (name) =>
        name.startsWith("crash-") &&
        readFileSync(join(artifacts, name)).length > 0,
    );
    assert(
      verifyFuzzResult(
        { ...result, stdout: result.stdout ?? "", stderr: result.stderr ?? "" },
        { kind: "counterexample", artifactWritten: crashes.length > 0 },
      ),
      `Intended mutation was not detected; see ${report}`,
    );
    console.log(
      "ok fixed substring-to-prefix mutant rejected by oracle with saved input",
    );
  } finally {
    writeFileSync(searchPath, original);
  }
  build("restored-build");
  for (const crash of readdirSync(artifacts).filter((name) =>
    name.startsWith("crash-"),
  ))
    run(`replay-${crash}`, binary, [join(artifacts, crash), ...limits], {
      kind: "replay",
    });
  lockFiles.forEach((path, index) =>
    assert.equal(
      readFileSync(join(root, path), "utf8"),
      locks[index],
      `Verification rewrote ${path}`,
    ),
  );
  console.log(
    `Mini grep fuzz passed: instrumented campaign, controlled counterexample and restored replay. Reports: ${report}`,
  );
} finally {
  for (const directory of ["corpus", "artifacts"]) {
    const source = join(root, "fuzz", directory);
    try {
      cpSync(source, join(report, directory), { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  rmSync(root, { recursive: true, force: true });
}
