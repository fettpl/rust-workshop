import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  disjointRangesFamily,
  disjointRangesModel,
  disjointRangesPrimaryStepId,
  disjointRangesSteps,
  disjointRangesTests,
  disjointRangesEquivalent,
  disjointRangesMutants,
  disjointRangesSolution,
  disjointRangesStarter,
} from "./unsafe-miri-disjoint-ranges";

const compileAndRun = (source: string, expectedStatus: number) => {
  const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-disjoint-ranges-"));
  try {
    const file = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(file, appendHiddenTests(source, disjointRangesTests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = spawnSync(binary, ["--test-threads=1"], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(executed.error).toBeUndefined();
    expect(executed.signal).toBeNull();
    expect(executed.status, executed.stderr).toBe(expectedStatus);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

it("publishes the model and exactly two ordered range steps", () => {
  expect(disjointRangesSteps.map((step) => step.id)).toEqual([
    "disjoint-regions-range-model",
    disjointRangesPrimaryStepId,
  ]);
  expect(disjointRangesSteps[0]).toMatchObject({
    evidenceKind: "exposure",
    evidenceGate: false,
  });
  expect(disjointRangesSteps[0].evidence?.codingTaskId).toBeUndefined();
  expect(disjointRangesSteps[1]).toMatchObject({
    kind: "apply",
    evidenceKind: "transfer",
    evidenceGate: true,
  });
  expect(disjointRangesSteps[1].evidence?.version).toBe(2);
  expect(disjointRangesSteps[1].evidence?.conceptIds).toEqual([
    "unsafe-miri-disjoint-regions-contract",
  ]);
  expect(disjointRangesSteps[1].evidence?.codingTaskId).toBe(
    disjointRangesFamily,
  );
  expect(disjointRangesModel).toContain("0..2");
  expect(disjointRangesModel).toContain("2..4");
  expect(disjointRangesModel).toContain("Overlap");
});

it("states the complete range contract and avoids source-spelling requirements", () => {
  const prompt = disjointRangesSteps[1].prompt;
  expect(prompt).toMatch(/Range<usize>/);
  expect(prompt).toMatch(/FirstInvalid/);
  expect(prompt).toMatch(/SecondInvalid/);
  expect(prompt).toMatch(/Overlap/);
  expect(prompt).toMatch(/half|półotwart/i);
  expect(prompt).toMatch(/pust/i);
  expect(prompt).toMatch(/kolejności wywołania|caller order/i);
  expect(prompt).toMatch(/unsafe|source spelling|konkretnej strategii/i);
  expect(disjointRangesStarter).not.toContain("unsafe");
});

it("accepts the canonical and an independent safe equivalent through the full matrix", () => {
  compileAndRun(disjointRangesSolution, 0);
  compileAndRun(disjointRangesEquivalent, 0);
});

it.each(Object.entries(disjointRangesMutants))(
  "rejects the named semantic mutant %s",
  (_name, source) => {
  compileAndRun(source, 101);
  },
);
