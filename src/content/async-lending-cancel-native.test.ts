import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cancelNativeDirectory,
  discardCancelNativeDirectory,
  verifyCancelTransferBehavior,
  verifyCancelTransferBoundaries,
} from "./async-lending-cancel-native";
import { cancelTransferStep } from "./async-lending-cancel-transfer";
import { appendHiddenTests } from "../runner";

it("executes Vec, HashMap and BTreeMap representations and rejects the 24 semantic mutants", () => {
  const toolchains = ["rustc"];
  const located = spawnSync("rustup", ["which", "--toolchain", "1.85.0", "rustc"], { encoding: "utf8", timeout: 10_000 });
  if (located.status === 0) toolchains.push(located.stdout.trim());
  for (const rustc of toolchains) {
    const directory = cancelNativeDirectory(`cancel-transfer-behavior-${rustc === "rustc" ? "current" : "msrv"}-`);
    try {
      expect(verifyCancelTransferBehavior(directory, rustc)).toHaveLength(31);
    } finally {
      discardCancelNativeDirectory(directory);
    }
  }
}, 240_000);

it("classifies live borrow, local lifetime, auto-trait and P/Q strengthening boundaries", () => {
  const toolchains = ["rustc"];
  const located = spawnSync("rustup", ["which", "--toolchain", "1.85.0", "rustc"], { encoding: "utf8", timeout: 10_000 });
  if (located.status === 0) toolchains.push(located.stdout.trim());
  for (const rustc of toolchains) {
    const directory = cancelNativeDirectory(`cancel-transfer-boundaries-${rustc === "rustc" ? "stable" : "msrv"}-`);
    try {
      expect(verifyCancelTransferBoundaries(directory, rustc)).toHaveLength(30);
    } finally {
      discardCancelNativeDirectory(directory);
    }
  }
}, 240_000);

it("keeps the starter incomplete while the approved solution passes", () => {
  const directory = cancelNativeDirectory("cancel-transfer-starter-");
  try {
    const file = join(directory, "starter.rs");
    const binary = join(directory, "starter");
    const tests = cancelTransferStep.evaluator?.kind === "tests" ? cancelTransferStep.evaluator.tests : "";
    writeFileSync(file, appendHiddenTests(cancelTransferStep.code ?? "", tests));
    const compiled = spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary], { cwd: directory, encoding: "utf8", timeout: 60_000 });
    expect(compiled.status).toBe(0);
    const executed = spawnSync(binary, ["--test-threads=1"], { cwd: directory, encoding: "utf8", timeout: 8_000 });
    expect(executed.status).toBe(101);
    expect(`${executed.stdout}\n${executed.stderr}`).toContain("submit state machine is the learner's task");
  } finally {
    discardCancelNativeDirectory(directory);
  }
}, 60_000);
