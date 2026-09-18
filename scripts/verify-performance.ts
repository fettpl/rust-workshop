/** Verifies only the repository-authored Log Analyzer performance archive. */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  projectFiles,
  validateProjectPackage,
} from "../src/domain/project-package";
import { logAnalyzerPackage } from "../src/content/projects/log-analyzer";

const args = process.argv.slice(2);
assert(
  args.every((argument) => argument === "--fetch" || argument === "--msrv") &&
    new Set(args).size === args.length,
  "Only --fetch and --msrv are supported; code, paths and dependency overrides are not accepted.",
);

const useMsrv = args.includes("--msrv");
const env = { ...process.env };
let cargo = "cargo";

if (useMsrv) {
  const paths: Record<string, string> = {};
  for (const tool of ["cargo", "rustc", "rustdoc"]) {
    const result = spawnSync(
      "rustup",
      ["which", "--toolchain", "1.85.0", tool],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    paths[tool] = result.stdout.trim();
    const version = spawnSync(paths[tool], ["--version"], {
      encoding: "utf8",
    });
    assert.equal(version.status, 0, version.stderr);
    assert(
      version.stdout.startsWith(`${tool} 1.85.0 `),
      `${tool} is not Rust 1.85.0: ${version.stdout}`,
    );
    console.log(version.stdout.trim());
  }
  cargo = paths.cargo;
  env.RUSTC = paths.rustc;
  env.RUSTDOC = paths.rustdoc;
  env.PATH = `${dirname(cargo)}${delimiter}${env.PATH ?? ""}`;
} else {
  const version = spawnSync("rustc", ["--version"], { encoding: "utf8" });
  assert.equal(version.status, 0, version.stderr);
  assert(
    !version.stdout.includes("nightly"),
    `stable rustc required: ${version.stdout}`,
  );
  console.log(version.stdout.trim());
}

const root = mkdtempSync(join(tmpdir(), "rust-workshop-log-performance-"));

function writeArchive(directory: string) {
  for (const [path, contents] of Object.entries(
    projectFiles(logAnalyzerPackage, "solution"),
  )) {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

function run(command: string, commandArgs: string[]) {
  const result = spawnSync(command === "cargo" ? cargo : command, commandArgs, {
    cwd: root,
    env,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.error || result.status !== 0)
    throw new Error(`${command} ${commandArgs.join(" ")} failed:\n${output}`);
  console.log(`ok ${command} ${commandArgs.join(" ")}`);
  return output;
}

try {
  assert.deepEqual(validateProjectPackage(logAnalyzerPackage), []);
  assert.equal(logAnalyzerPackage.id, "log-analyzer-workshop");
  const files = projectFiles(logAnalyzerPackage, "solution");
  assert(files["benches/log_analyzer.rs"].includes("criterion_main!"));
  assert(
    files["tests/performance_contract.rs"].includes(
      "baseline_and_candidate_have_the_same_result_shape",
    ),
  );
  writeArchive(root);

  if (args.includes("--fetch")) run("cargo", ["fetch", "--locked"]);

  const offline = ["--offline", "--locked"];
  run("cargo", ["fmt", "--all", "--", "--check"]);
  run("cargo", ["check", ...offline, "--all-targets"]);
  run("cargo", ["test", ...offline, "--test", "performance_contract"]);
  run("cargo", ["bench", ...offline, "--bench", "log_analyzer", "--no-run"]);
  run("cargo", ["bench", ...offline, "--bench", "log_analyzer"]);
} finally {
  rmSync(root, { recursive: true, force: true });
}
