/** Verifies only the repository-authored Property Contracts Cargo archive. */
import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { buildProjectArchive } from "./project-archive";
import { projectFiles } from "../src/domain/project-package";
import { propertyContractsPackage } from "../src/content/projects/property-contracts";

const args = process.argv.slice(2);
assert(
  args.every((argument) => argument === "--fetch" || argument === "--msrv") &&
    new Set(args).size === args.length,
  "Only --fetch and --msrv are supported; code, paths and dependency overrides are not accepted.",
);
const fetchDependencies = args.includes("--fetch");
const env = { ...process.env };
let cargo = "cargo";
if (args.includes("--msrv")) {
  const paths: Record<string, string> = {};
  for (const tool of ["cargo", "rustc", "rustdoc"]) {
    const result = spawnSync(
      "rustup",
      ["which", "--toolchain", "1.85.0", tool],
      { encoding: "utf8", timeout: 10_000 },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    paths[tool] = result.stdout.trim();
    const version = spawnSync(paths[tool], ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.ifError(version.error);
    assert.equal(version.status, 0, version.stderr);
    assert(version.stdout.startsWith(`${tool} 1.85.0 `), version.stdout);
    console.log(version.stdout.trim());
  }
  cargo = paths.cargo;
  env.RUSTC = paths.rustc;
  env.RUSTDOC = paths.rustdoc;
  env.PATH = `${dirname(cargo)}${delimiter}${env.PATH ?? ""}`;
}
const root = mkdtempSync(join(tmpdir(), "rust-workshop-property-contracts-"));

function writeArchive(directory: string, variant: "starter" | "solution") {
  for (const [path, contents] of Object.entries(
    projectFiles(propertyContractsPackage, variant),
  )) {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

function run(directory: string, command: string, commandArgs: string[]) {
  const result = spawnSync(command === "cargo" ? cargo : command, commandArgs, {
    cwd: directory,
    env,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    ...result,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function expectSuccess(
  directory: string,
  command: string,
  commandArgs: string[],
) {
  const result = run(directory, command, commandArgs);
  if (result.error || result.status !== 0)
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed:\n${result.output}`,
    );
  console.log(`ok ${command} ${commandArgs.join(" ")}`);
}

function expectUnfinishedStarter(directory: string) {
  const result = run(directory, "cargo", [
    "test",
    "--locked",
    "--offline",
    "--no-fail-fast",
  ]);
  if (
    result.error ||
    result.status === 0 ||
    !result.output.includes("not yet implemented")
  )
    throw new Error(
      `starter unexpectedly passed or failed for another reason:\n${result.output}`,
    );
  console.log("ok starter rejects unfinished contract");
}

function expectMutantRejected(directory: string) {
  const result = run(directory, "cargo", [
    "test",
    "--locked",
    "--offline",
    "--test",
    "property_contracts",
    "summary_preserves_malformed_count_when_filtering",
  ]);
  if (
    result.error ||
    result.status === 0 ||
    !result.output.includes("test result: FAILED")
  )
    throw new Error(`controlled mutant was not rejected:\n${result.output}`);
  console.log("ok controlled malformed-filter mutant rejected");
}

function expectParserMutantRejected(directory: string) {
  const result = run(directory, "cargo", [
    "test",
    "--locked",
    "--offline",
    "--test",
    "property_contracts",
    "parser_uses_trimmed_message_contract",
  ]);
  if (
    result.error ||
    result.status === 0 ||
    !result.output.includes("test result: FAILED")
  )
    throw new Error(
      `controlled parser mutant was not rejected:\n${result.output}`,
    );
  console.log("ok controlled whitespace-parser mutant rejected");
}

try {
  const solution = join(root, "solution");
  const starter = join(root, "starter");
  const mutant = join(root, "mutant");
  const parserMutant = join(root, "parser-mutant");
  const archiveBytes = buildProjectArchive(
    propertyContractsPackage,
    "solution",
  );
  const servedBytes = readFileSync(
    join(
      process.cwd(),
      "public",
      "projects",
      propertyContractsPackage.id,
      "solution.zip",
    ),
  );
  assert(
    servedBytes.equals(Buffer.from(archiveBytes)),
    "Stale solution archive; run content:packages first",
  );
  writeArchive(solution, "solution");
  writeArchive(starter, "starter");

  if (fetchDependencies)
    expectSuccess(solution, "cargo", ["fetch", "--locked"]);
  const cargoOffline = ["--locked", "--offline"];
  expectSuccess(solution, "cargo", ["fmt", "--all", "--", "--check"]);
  expectSuccess(solution, "cargo", ["test", ...cargoOffline]);
  expectSuccess(solution, "cargo", [
    "test",
    "replay_saved_regression",
    ...cargoOffline,
  ]);
  expectSuccess(solution, "cargo", [
    "clippy",
    "--all-targets",
    ...cargoOffline,
    "--",
    "-D",
    "warnings",
  ]);

  expectUnfinishedStarter(starter);

  cpSync(solution, mutant, { recursive: true });
  writeFileSync(
    join(mutant, "src/lib.rs"),
    readFileSync(join(solution, "mutants/ignore-malformed-filter.rs")),
  );
  expectMutantRejected(mutant);

  cpSync(solution, parserMutant, { recursive: true });
  writeFileSync(
    join(parserMutant, "src/lib.rs"),
    readFileSync(join(solution, "mutants/keep-whitespace-message.rs")),
  );
  expectParserMutantRejected(parserMutant);
} finally {
  rmSync(root, { recursive: true, force: true });
}
