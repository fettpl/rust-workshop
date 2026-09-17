/** Only fixed repository-authored TOML is passed to Cargo; no paths or source arguments. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { lessons, reviewExercises } from "../src/content/course";
import { frameProtocolPackage } from "../src/content/projects/frame-protocol";
import {
  checkManifestContract,
  manifestSyntaxIssues,
} from "../src/engine/manifest-contract";
import { manifestSyntaxCorpus } from "./manifest-corpus";
import type { LessonStep } from "../src/domain/types";

const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => arg !== "--msrv"))
  throw new Error(
    "Only --msrv is supported; paths, code and toolchains are not accepted.",
  );
const msrv = args.includes("--msrv");
const binary = msrv ? "rustup" : "cargo";
const prefix = msrv ? ["run", "1.85.0", "cargo"] : [];
const root = mkdtempSync(join(tmpdir(), "rust-workshop-authored-manifests-"));

function put(directory: string, path: string, content: string) {
  const target = join(directory, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function metadata(directory: string, manifest = "Cargo.toml") {
  const result = spawnSync(
    binary,
    [
      ...prefix,
      "metadata",
      "--offline",
      "--no-deps",
      "--format-version",
      "1",
      "--manifest-path",
      manifest,
    ],
    {
      cwd: directory,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  assert.ifError(result.error);
  assert.equal(
    result.signal,
    null,
    "Cargo was terminated before reporting a manifest result",
  );
  return result;
}

function memberContext(directory: string, member: string, library?: string) {
  const members = [member, ...(library ? [library] : [])];
  put(
    directory,
    "Cargo.toml",
    `[workspace]\nmembers = ${JSON.stringify(members.map((name) => `crates/${name}`))}\nresolver="3"\n
[workspace.package]
version="1.0.0"
edition="2024"
rust-version="1.85.0"
description="A fixed authored manifest verification workspace."
license="MIT OR Apache-2.0"
repository="https://github.com/fettpl/rustcrushcourse"
readme="README.md"
publish=false
[workspace.dependencies]
serde={version="1.0.229",default-features=false}
`,
  );
  put(directory, "README.md", "Authored fixture.\n");
  put(
    directory,
    `crates/${member}/src/lib.rs`,
    "// Fixed empty target for metadata inspection.\n",
  );
  if (library) {
    put(
      directory,
      `crates/${library}/Cargo.toml`,
      `[package]\nname="${library}"\nversion="1.0.0"\nedition="2024"\n[features]\ndefault=[]\ndiagnostics=[]\nformat=[]\njson=[]\n`,
    );
    put(
      directory,
      `crates/${library}/src/lib.rs`,
      "// Fixed dependency target.\n",
    );
  }
}

function verifyFeatureObservation() {
  const observation = lessons
    .find((lesson) => lesson.id === "cargo-resolver-feature-unification")
    ?.steps.find(
      (step) => step.id === "cargo-resolver-feature-unification-observe",
    );
  assert(observation?.code, "The taught feature observation must be present");
  assert.deepEqual(manifestSyntaxIssues(observation.code), []);
  const directory = join(root, "feature-observation");
  put(directory, "Cargo.toml", observation.code);
  put(
    directory,
    "src/lib.rs",
    "// Fixed authored feature observation target.\n",
  );
  // Seed the real Cargo-generated closure; Cargo updates only the fixture's own package.
  const lock = frameProtocolPackage.files.find(
    (file) => file.path === "Cargo.lock",
  );
  assert(lock);
  put(directory, "Cargo.lock", lock.solution ?? lock.starter);
  const run = (arguments_: string[]) => {
    const result = spawnSync(binary, [...prefix, ...arguments_], {
      cwd: directory,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  run(["generate-lockfile", "--offline"]);
  const normal = run([
    "tree",
    "-e",
    "features,no-dev",
    "--offline",
    "--locked",
  ]);
  const withDev = run(["tree", "-e", "features", "--offline", "--locked"]);
  assert.match(normal, /serde feature "alloc"/);
  assert.doesNotMatch(normal, /serde feature "(?:default|std|derive)"/);
  for (const feature of ["alloc", "default", "std", "derive"])
    assert(
      withDev.includes(`serde feature "${feature}"`),
      `Missing dev-union feature ${feature}`,
    );
  console.log(
    "ok authored feature observation: normal alloc; dev union adds default/std/derive",
  );
}

function authoredContext(directory: string, step: LessonStep): string {
  switch (step.id) {
    case "cargo-dependency-contract-gate":
    case "cargo-lock-msrv-policy-gate":
    case "cargo-package-rehearsal-gate":
    case "cargo-resolver-feature-unification-gate": {
      for (const file of frameProtocolPackage.files)
        put(directory, file.path, file.solution ?? file.starter);
      return step.id === "cargo-resolver-feature-unification-gate"
        ? "crates/frame-protocol/Cargo.toml"
        : "Cargo.toml";
    }
    case "cargo-resolver-feature-unification-blank":
      memberContext(directory, "packet-cli", "packet-lib");
      return "crates/packet-cli/Cargo.toml";
    case "cargo-resolver-feature-unification-review":
      memberContext(directory, "telemetry-cli", "telemetry-lib");
      return "crates/telemetry-cli/Cargo.toml";
    case "cargo-lock-msrv-policy-blank":
      memberContext(directory, "release-lib");
      return "crates/release-lib/Cargo.toml";
    case "cargo-dependency-contract-blank":
    case "cargo-dependency-contract-review":
    case "cargo-lock-msrv-policy-review":
    case "cargo-package-rehearsal-blank":
    case "cargo-package-rehearsal-review":
      put(
        directory,
        "src/lib.rs",
        "// Fixed empty target for metadata inspection.\n",
      );
      put(directory, "README.md", "Authored fixture.\n");
      return "Cargo.toml";
    default:
      throw new Error(
        `No fixed Cargo context for authored exercise ${step.id}`,
      );
  }
}

try {
  const version = spawnSync(binary, [...prefix, "--version"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.ifError(version.error);
  assert.equal(version.status, 0, version.stderr);
  if (msrv) assert.match(version.stdout, /^cargo 1\.85\.0 /);
  const cargoMinor = Number(version.stdout.match(/^cargo 1\.(\d+)\./)?.[1]);
  assert(Number.isInteger(cargoMinor), "Expected a recognized Cargo version");
  console.log(version.stdout.trim());
  for (const probe of manifestSyntaxCorpus) {
    assert.equal(
      manifestSyntaxIssues(probe.source).length === 0,
      probe.accepted,
      `JS syntax ${probe.id}`,
    );
    const directory = join(root, probe.id);
    put(directory, "Cargo.toml", probe.source);
    put(directory, "src/lib.rs", "// Fixed syntax probe.\n");
    const result = metadata(directory);
    // Cargo 1.94 added TOML 1.1. Our supported floor and browser grammar stay 1.0.
    const cargoAccepted =
      probe.accepted || ("toml11" in probe && cargoMinor >= 94);
    assert.equal(
      result.status === 0,
      cargoAccepted,
      `${probe.id}: ${result.stderr}`,
    );
    if (!cargoAccepted)
      assert.match(result.stderr, /(?:invalid|expected|duplicate|escape)/i);
    console.log(
      `ok syntax ${probe.id}: browser ${probe.accepted ? "accepts" : "rejects"}, Cargo ${cargoAccepted ? "accepts" : "rejects"}`,
    );
  }
  const tasks = [
    ...lessons.flatMap((lesson) => lesson.steps),
    ...Object.values(reviewExercises),
  ].filter((step) => step.evaluator?.kind === "manifest-contract");
  assert.equal(
    tasks.length,
    12,
    "All eight lesson gates and four retrieval contracts must be verified",
  );
  for (const step of tasks) {
    assert(step.evaluator?.kind === "manifest-contract");
    assert(step.solution);
    assert.equal(
      checkManifestContract(step.solution, step.evaluator.contract).passed,
      true,
      `${step.id} solution`,
    );
    if (step.code !== undefined) {
      assert.deepEqual(
        manifestSyntaxIssues(step.code),
        [],
        `${step.id} starter syntax`,
      );
      assert.equal(
        checkManifestContract(step.code, step.evaluator.contract).passed,
        false,
        `${step.id} starter must fail`,
      );
    }
    const directory = join(root, step.id);
    const path = authoredContext(directory, step);
    put(directory, path, step.solution);
    const result = metadata(directory, path);
    assert.equal(result.status, 0, `${step.id}: ${result.stderr}`);
    assert(
      JSON.parse(result.stdout).packages.length > 0,
      "Cargo must inspect a real authored target",
    );
    console.log(`ok authored manifest ${step.id}`);
  }
  verifyFeatureObservation();
  console.log(
    `${manifestSyntaxCorpus.length} syntax probes and ${tasks.length} authored declaration contexts verified.`,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
