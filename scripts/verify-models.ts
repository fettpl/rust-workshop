/** Executes only the reviewed, repository-authored Loom lab. No input code or paths. */
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { concurrencyLabPackage } from "../src/content/projects/concurrency-lab";
import { projectFiles } from "../src/domain/project-package";
import { buildProjectArchive } from "./project-archive";
import { verifyModelResult, type ModelExpectation } from "./model-result";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--fetch") || args.length > 1) {
  throw new Error(
    "Only --fetch is supported; arbitrary paths and code are not accepted.",
  );
}
const root = mkdtempSync(join(tmpdir(), "rust-workshop-authored-models-"));
function cargo(commandArgs: string[], expectation?: ModelExpectation) {
  const result = spawnSync("cargo", commandArgs, {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 3 * 1024 * 1024,
  });
  const passed = expectation
    ? verifyModelResult(result, expectation)
    : !result.error && result.status === 0;
  console.log(`${passed ? "ok" : "FAIL"} cargo ${commandArgs.join(" ")}`);
  if (expectation) console.log(result.stdout + result.stderr);
  if (!passed)
    throw new Error(result.error?.message ?? result.stdout + result.stderr);
}
try {
  const archive = buildProjectArchive(concurrencyLabPackage, "solution");
  const served = readFileSync(
    join(
      process.cwd(),
      "public",
      "projects",
      concurrencyLabPackage.id,
      "solution.zip",
    ),
  );
  if (!served.equals(Buffer.from(archive)))
    throw new Error("Stale downloadable Loom archive");
  for (const [path, content] of Object.entries(
    projectFiles(concurrencyLabPackage, "solution"),
  )) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  if (args.includes("--fetch")) cargo(["fetch", "--locked"]);
  cargo(["test", "--offline", "--locked"], { passed: 5 });
  cargo(
    [
      "test",
      "--offline",
      "--locked",
      "--features",
      "model",
      "--test",
      "models",
    ],
    { passed: 2 },
  );
  cargo([
    "clippy",
    "--offline",
    "--locked",
    "--all-targets",
    "--all-features",
    "--",
    "-D",
    "warnings",
  ]);
  for (const [name, invariant] of [
    ["separate_load_store_loses_an_update", "LOST_UPDATE_INVARIANT"],
    ["relaxed_publication_can_read_stale_payload", "PUBLICATION_INVARIANT"],
  ] as const) {
    cargo(
      [
        "test",
        "--offline",
        "--locked",
        "--features",
        "model",
        "--test",
        "counterexamples",
        name,
        "--",
        "--ignored",
        "--exact",
      ],
      { invariant },
    );
  }
  const libraryPath = join(root, "src/lib.rs");
  const original = readFileSync(libraryPath, "utf8");
  const mutant = original.replace(
    "self.0.ready.store(true, Ordering::Release)",
    "self.0.ready.store(true, Ordering::Relaxed)",
  );
  if (mutant === original)
    throw new Error("Publication mutation did not modify the authored source");
  writeFileSync(libraryPath, mutant);
  try {
    // Same public API and same model test: the missing publication edge must be detected.
    cargo(
      [
        "test",
        "--offline",
        "--locked",
        "--features",
        "model",
        "--test",
        "models",
        "observed_publication_always_contains_its_payload",
        "--",
        "--exact",
      ],
      { invariant: "PUBLICATION_INVARIANT" },
    );
  } finally {
    writeFileSync(libraryPath, original);
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
