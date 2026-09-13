/** Executes only the fixed, repository-authored Number Guessing+ archive. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { unzipSync } from "fflate";
import { numberGuessingPackage } from "../src/content/projects/number-guessing";
import { buildProjectArchive } from "./project-archive";
import { verifyGuessingMutants } from "./guessing-mutants";

const args = process.argv.slice(2);
assert(
  args.every((arg) => arg === "--fetch" || arg === "--msrv") &&
    new Set(args).size === args.length,
  "Only --fetch and --msrv are supported; code, paths and dependency overrides are not accepted.",
);
const env = { ...process.env };
let cargo = "cargo";
if (args.includes("--msrv")) {
  const paths: Record<string, string> = {};
  for (const tool of ["cargo", "rustc", "rustdoc"]) {
    const result = spawnSync(
      "rustup",
      ["which", "--toolchain", "1.85.0", tool],
      {
        encoding: "utf8",
        timeout: 10_000,
      },
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
const root = mkdtempSync(join(tmpdir(), "rust-workshop-authored-guessing-"));
try {
  for (const variant of ["starter", "solution"] as const) {
    const bytes = buildProjectArchive(numberGuessingPackage, variant);
    const served = readFileSync(
      join("public/projects", numberGuessingPackage.id, `${variant}.zip`),
    );
    assert(
      served.equals(Buffer.from(bytes)),
      `Stale ${variant} archive; run content:packages first`,
    );
    const directory = join(root, variant, numberGuessingPackage.id);
    for (const [path, contents] of Object.entries(unzipSync(bytes))) {
      const target = join(root, variant, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    const lockPath = join(directory, "Cargo.lock");
    const lock = readFileSync(lockPath, "utf8");
    function command(commandArgs: string[], unfinished = false) {
      const result = spawnSync(cargo, commandArgs, {
        cwd: directory,
        env,
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 4 * 1024 * 1024,
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null, result.stderr);
      const output = result.stdout + result.stderr;
      if (unfinished) {
        assert.notEqual(
          result.status,
          0,
          `Starter unexpectedly passed\n${output}`,
        );
        assert.match(output, /test result: FAILED/);
        assert.match(output, /not yet implemented/);
      } else {
        assert.equal(result.status, 0, output);
        if (commandArgs[0] === "test")
          assert.match(output, /test result: ok\. [1-9]\d* passed/);
      }
      assert.equal(
        readFileSync(lockPath, "utf8"),
        lock,
        "Verification changed the locked dependency graph",
      );
      console.log(
        `ok ${variant}: cargo ${commandArgs.join(" ")}${unfinished ? " (intended TODO failure)" : ""}`,
      );
    }
    if (args.includes("--fetch")) command(["fetch", "--locked"]);
    command(["fmt", "--all", "--", "--check"]);
    command(["check", "--all-targets", "--offline", "--locked"]);
    command(["test", "--offline", "--locked"], variant === "starter");
    if (variant === "solution")
      command([
        "clippy",
        "--all-targets",
        "--offline",
        "--locked",
        "--",
        "-D",
        "warnings",
      ]);
    if (variant === "solution") verifyGuessingMutants(directory, cargo, env);
  }
  console.log(
    `Number Guessing+ archive verified${args.includes("--msrv") ? " on exact Rust 1.85.0" : ""}.`,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
