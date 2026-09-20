import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { unzipSync } from "fflate";
import { projectFiles } from "../src/domain/project-package";
import { logAnalyzerPackage } from "../src/content/projects/log-analyzer";
import {
  allocationModes,
  allocationWorkloads,
  assertAllocationReport,
  type AllocationReport,
} from "../src/content/allocation-verification";
import { buildProjectArchive } from "./project-archive";

const args = process.argv.slice(2);
assert(args.every((arg) => arg === "--fetch" || arg === "--msrv") && new Set(args).size === args.length, "Only --fetch and --msrv are accepted");
const useMsrv = args.includes("--msrv");
const env = { ...process.env };
const selectedToolchain = useMsrv ? "1.85.0" : "stable";
const tools: Record<string, string> = {};
for (const tool of ["cargo", "rustc", "rustdoc"]) {
  const located = spawnSync("rustup", ["which", "--toolchain", selectedToolchain, tool], { encoding: "utf8", timeout: 10_000 });
  if (located.status === 0 && located.stdout.trim()) {
    tools[tool] = located.stdout.trim();
    continue;
  }
  assert.equal(selectedToolchain, "stable", located.stderr);
  const homebrewCandidate = `/opt/homebrew/bin/${tool}`;
  const usrLocalCandidate = `/usr/local/bin/${tool}`;
  const candidate = [homebrewCandidate, usrLocalCandidate].find((path) => existsSync(path));
  assert(candidate, `stable ${tool} is not installed through rustup and no explicit Homebrew path exists`);
  tools[tool] = candidate;
}
const cargo = tools.cargo;
env.RUSTC = tools.rustc;
env.RUSTDOC = tools.rustdoc;
env.PATH = `${dirname(cargo)}${delimiter}${env.PATH ?? ""}`;
const toolchainCommand = env.RUSTC ?? "rustc";
const rustcVersion = spawnSync(toolchainCommand, ["-vV"], {
  env,
  encoding: "utf8",
  timeout: 10_000,
});
assert.equal(rustcVersion.status, 0, rustcVersion.stderr);
const rustcMetadata = Object.fromEntries(
  rustcVersion.stdout
    .trim()
    .split("\n")
    .map((line) => {
      const separator = line.indexOf(": ");
      return [line.slice(0, separator), line.slice(separator + 2)];
    }),
);
const target = rustcMetadata.host;
assert(typeof target === "string" && target.length > 0, "rustc -vV did not report host target");
const expectedRustRelease = useMsrv ? "1.85.0" : rustcMetadata.release;
if (useMsrv) assert.equal(rustcMetadata.release, expectedRustRelease);
env.ALLOCATION_TOOLCHAIN = selectedToolchain;
env.ALLOCATION_TARGET = target;
env.ALLOCATION_PROFILE = "debug";

const solution = projectFiles(logAnalyzerPackage, "solution");
const manifest = JSON.parse(solution["ALLOCATION-MANIFEST.json"]) as {
  schema: string; package: string; workloads: string[]; source_hashes: Record<string, string>;
};
assert.equal(manifest.schema, "rust-workshop.allocation.v1");
assert.equal(manifest.package, logAnalyzerPackage.id);
assert.deepEqual(manifest.workloads, allocationWorkloads);

const archiveSha = createHash("sha256").update(buildProjectArchive(logAnalyzerPackage, "solution")).digest("hex");
for (const path of ["examples/allocation_probe.rs", "examples/support/allocation_counter.rs", "tests/allocation_counter_contract.rs"]) {
  const expected = createHash("sha256").update(solution[path]).digest("hex");
  assert.equal(manifest.source_hashes[path], `sha256:${expected}`, `source hash mismatch: ${path}`);
}

const root = mkdtempSync(join(tmpdir(), "rust-workshop-log-analyzer-allocations-"));
function extractArchive(bytes: Uint8Array, directory: string) {
  for (const [path, contents] of Object.entries(unzipSync(bytes))) {
    const target = join(directory, path.slice(`${logAnalyzerPackage.id}/`.length));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}
function run(command: string, commandArgs: string[]) {
  const result = spawnSync(command, commandArgs, { cwd: packageRoot, env, encoding: "utf8", timeout: 180_000, maxBuffer: 4 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? ""); process.stderr.write(result.stderr ?? "");
  assert.equal(result.error, undefined, `${command} ${commandArgs.join(" ")} failed to start`);
  assert.equal(result.status, 0, `${command} ${commandArgs.join(" ")} failed`);
  return result;
}

const packageRoot = join(root, logAnalyzerPackage.id);
mkdirSync(packageRoot, { recursive: true });
try {
  for (const variant of ["starter", "solution"] as const) {
    const expected = Buffer.from(buildProjectArchive(logAnalyzerPackage, variant));
    const servedPath = join(process.cwd(), "public", "projects", logAnalyzerPackage.id, `${variant}.zip`);
    assert(existsSync(servedPath), `Missing served ${variant} archive; run content:packages first`);
    assert(readFileSync(servedPath).equals(expected), `Stale served ${variant} archive; run content:packages first`);
  }
  extractArchive(buildProjectArchive(logAnalyzerPackage, "solution"), packageRoot);
  if (args.includes("--fetch")) run(cargo, ["fetch", "--locked"]);
  const offline = ["--offline", "--locked"];
  run(cargo, ["fmt", "--all", "--", "--check"]);
  run(cargo, ["check", ...offline, "--all-targets"]);
  run(cargo, ["test", ...offline, "--all-targets", "--no-fail-fast"]);
  run(cargo, ["clippy", ...offline, "--all-targets", "--", "-D", "warnings"]);
  run(cargo, ["build", ...offline, "--example", "allocation_probe"]);
  const binary = join(packageRoot, "target", "debug", "examples", process.platform === "win32" ? "allocation_probe.exe" : "allocation_probe");
  assert(statSync(binary).isFile(), `missing allocation probe binary: ${binary}`);
  const results: Record<string, Record<string, AllocationReport>> = {};
  for (const workload of manifest.workloads) {
    const modes: Record<string, AllocationReport> = {};
    for (const mode of allocationModes) {
      const child = spawnSync(binary, [mode, workload], { cwd: packageRoot, env, encoding: "utf8", timeout: 30_000 });
      assert.equal(child.status, 0, `${mode}/${workload} failed: ${child.stderr}`);
      const lines = child.stdout.trim().split("\n");
      assert.equal(lines.length, 1, `${mode}/${workload} emitted non-JSON output`);
      const report: unknown = JSON.parse(lines[0]);
      assertAllocationReport(report, { mode, workload, toolchain: selectedToolchain, target });
      modes[mode] = report;
    }
    assert.deepEqual(modes.baseline.summary, modes.candidate.summary, `${workload} baseline/candidate changed Summary`);
    assert.deepEqual(modes.baseline.summary, modes.mutant.summary, `${workload} baseline/mutant changed Summary`);
    assert.equal(modes.baseline.result, modes.candidate.result, `${workload} changed result status`);
    assert.equal(modes.baseline.error_kind, modes.candidate.error_kind, `${workload} changed error shape`);
    assert.equal(modes.baseline.result, modes.mutant.result, `${workload} mutant changed result status`);
    assert.equal(modes.baseline.error_kind, modes.mutant.error_kind, `${workload} mutant changed error shape`);
    results[workload] = modes;
  }
  const observedMutant = manifest.workloads.some((workload) => {
    const modes = results[workload];
    return Number(modes.mutant.alloc_calls) + Number(modes.mutant.alloc_zeroed_calls) > Number(modes.baseline.alloc_calls) + Number(modes.baseline.alloc_zeroed_calls);
  });
  assert(observedMutant, "materialization mutant did not change observed allocator calls");
  const outputDirectory = join(process.cwd(), "test-results", "allocations", useMsrv ? "msrv" : "stable");
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "report.json"), JSON.stringify({ schema: "rust-workshop.allocation-report.v1", archive_sha256: archiveSha, toolchain: selectedToolchain, rustc_version: rustcMetadata.release, target, build_profile: "debug", workloads: results, limits: { single_process: true, single_threaded: true, universal_threshold: false } }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, archive_sha256: archiveSha, toolchain: selectedToolchain, rustc_version: rustcMetadata.release, target, workloads: manifest.workloads }, null, 2));
} finally {
  rmSync(root, { recursive: true, force: true });
}
