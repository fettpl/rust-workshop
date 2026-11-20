import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  mutSlotWithMutEquivalent,
  mutSlotWithMutFamily,
  mutSlotWithMutModel,
  mutSlotWithMutMutant,
  mutSlotWithMutPrimaryStepId,
  mutSlotWithMutSolution,
  mutSlotWithMutStarter,
  mutSlotWithMutSteps,
  mutSlotWithMutTests,
} from "./unsafe-miri-mut-slot-with-mut";

const compile = (source: string, directory: string, test = true) => {
  const file = join(directory, "fixture.rs");
  const binary = join(directory, "fixture");
  writeFileSync(file, source);
  return spawnSync(
    process.env.RUSTC_FOR_MUT_SLOT_WITH_MUT_TESTS ?? "rustc",
    ["--edition=2024", ...(test ? ["--test"] : []), file, "-o", binary],
    { cwd: directory, encoding: "utf8", timeout: 60_000 },
  );
};

const run = (directory: string) =>
  spawnSync(join(directory, "fixture"), ["--test-threads=1"], {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
  });

it("publishes the appended model, primary family, and focused callback contract", () => {
  expect(mutSlotWithMutSteps.map((step) => step.id)).toEqual([
    "mut-slot-with-mut-model",
    mutSlotWithMutPrimaryStepId,
  ]);
  expect(mutSlotWithMutPrimaryStepId).toBe("mut-slot-with-mut-transfer");
  expect(mutSlotWithMutFamily).toBe("unsafe-miri/mut-slot-with-mut-v1");
  expect(mutSlotWithMutModel).toContain(
    "for<'short> FnOnce(&'short mut T) -> R",
  );
  expect(mutSlotWithMutSteps[0].prompt).toContain(
    "Callback odwiedza lokalne pożyczki",
  );
  expect(mutSlotWithMutStarter).toContain("TODO");
  expect(mutSlotWithMutSolution).toContain("f(&mut *self.value)");
  expect(mutSlotWithMutSolution).toContain("FnOnce");
  expect(mutSlotWithMutEquivalent).toContain("for<'short>");
  expect(mutSlotWithMutMutant).toContain("panic!");
  expect(mutSlotWithMutTests.match(/#\[test\]/g)).toHaveLength(7);
});

it("keeps the model exposure-only while the primary owns the transfer contract", () => {
  const [model, primary] = mutSlotWithMutSteps;

  expect(model.kind).toBe("run");
  expect(model.evidenceKind).toBe("exposure");
  expect(model.evidenceGate).not.toBe(true);
  expect(model.evidence).toBeUndefined();
  expect(model.code).not.toMatch(/\bfn\s+with_mut\s*</);

  expect(primary.id).toBe(mutSlotWithMutPrimaryStepId);
  expect(primary.kind).toBe("apply");
  expect(primary.evidenceKind).toBe("transfer");
  expect(primary.evidenceGate).toBe(true);
  expect(primary.code).toBe(mutSlotWithMutStarter);
  expect(primary.solution).toBe(mutSlotWithMutSolution);
  expect(primary.evaluator).toEqual({
    kind: "tests",
    tests: mutSlotWithMutTests,
  });
});

it("accepts canonical and equivalent implementations through the real rustc harness", () => {
  for (const source of [mutSlotWithMutSolution, mutSlotWithMutEquivalent]) {
    const directory = mkdtempSync(join(tmpdir(), "mut-slot-with-mut-green-"));
    try {
      const compiled = compile(
        appendHiddenTests(source, mutSlotWithMutTests),
        directory,
      );
      expect(compiled.status, compiled.stderr).toBe(0);
      const executed = run(directory);
      expect(executed.status, `${executed.stdout}\n${executed.stderr}`).toBe(0);
      expect(executed.stdout).toContain("7 passed");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

it("shows starter and semantic mutant failures in named positive behavior", () => {
  for (const source of [mutSlotWithMutStarter, mutSlotWithMutMutant]) {
    const directory = mkdtempSync(join(tmpdir(), "mut-slot-with-mut-red-"));
    try {
      const compiled = compile(
        appendHiddenTests(source, mutSlotWithMutTests),
        directory,
      );
      expect(compiled.status, compiled.stderr).toBe(0);
      const executed = run(directory);
      expect(executed.status).toBe(101);
      expect(executed.stdout).toMatch(
        /with_mut_mutates_non_copy_string_and_reuses_parent|with_mut_panic_propagates_without_rollback_promise/,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

it("rejects callback-loan escape and inner lifetime shortening while accepting scoped clients", () => {
  const directory = mkdtempSync(join(tmpdir(), "mut-slot-with-mut-lifetimes-"));
  try {
    const escape = `${mutSlotWithMutSolution}
fn main() {
    let mut value = String::from("owned");
    let mut slot = MutSlot::new(&mut value);
    let mut escaped = None;
    slot.with_mut(|value| escaped = Some(value));
    println!("{}", escaped.is_some());
}
`;
    const escaped = compile(escape, directory, false);
    expect(escaped.status).not.toBe(0);
    expect(escaped.stderr).toContain(
      "borrowed data escapes outside of closure",
    );

    const inner = `${mutSlotWithMutSolution}
fn main() {
    let mut stored: &'static str = "long";
    let mut slot = MutSlot::new(&mut stored);
    let short_owner = String::from("short");
    slot.with_mut(|value| *value = short_owner.as_str());
}
`;
    const innerResult = compile(inner, directory, false);
    expect(innerResult.status).not.toBe(0);
    expect(innerResult.stderr).toMatch(
      /borrowed value does not live long enough|lifetime may not live long enough/,
    );

    const scoped = `${mutSlotWithMutSolution}
fn main() {
    let owner = String::from("zewnętrzny");
    let mut value = String::from("wartość");
    let mut slot = MutSlot::new(&mut value);
    let result = slot.with_mut(|_| owner.as_str());
    assert_eq!(result, "zewnętrzny");
    slot.with_mut(|value| value.push('!'));
    assert_eq!(value, "wartość!");
}
`;
    const scopedResult = compile(scoped, directory, false);
    expect(scopedResult.status, scopedResult.stderr).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
