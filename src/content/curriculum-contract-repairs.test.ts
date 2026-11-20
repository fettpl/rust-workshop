import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { LessonStep } from "../domain/types";
import { appendHiddenTests } from "../runner";
import { genericsLessons } from "./generics";
import { closuresLessons } from "./closures";
import { boxedValuesLessons } from "./boxed-values";
import { sharedOwnershipLessons } from "./shared-ownership";
import { propertyFoundationLessons } from "./property-foundations";
import { guessingIoLessons } from "./guessing-io";

const all = [
  ...genericsLessons,
  ...closuresLessons,
  ...boxedValuesLessons,
  ...sharedOwnershipLessons,
  ...propertyFoundationLessons,
  ...guessingIoLessons,
];
function step(id: string): LessonStep {
  const found = all
    .flatMap((lesson) => lesson.steps)
    .find((item) => item.id === id);
  if (!found) throw new Error(`Missing step ${id}`);
  return found;
}
function rust(source: string, tests?: string) {
  const directory = mkdtempSync(join(tmpdir(), "curriculum-contract-"));
  try {
    const path = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(path, tests ? appendHiddenTests(source, tests) : source);
    const compile = spawnSync(
      "rustc",
      ["--edition=2024", ...(tests ? ["--test"] : []), path, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    expect(compile.error).toBeUndefined();
    if (compile.status !== 0)
      return {
        compiled: false,
        status: compile.status,
        stdout: "",
        stderr: compile.stderr,
      };
    const result = spawnSync(binary, tests ? ["--test-threads=1"] : [], {
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(result.error).toBeUndefined();
    return {
      compiled: true,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it.each([
  ["values-discover", "values-debug", "E0308"],
  ["impl-discover", "impl-debug", "E0507"],
  ["bounds-discover", "bounds-debug", "E0369"],
  ["capture-mut-call", "capture-gate", "E0596"],
])(
  "%s observes a diagnostic and directs the learner to a separate editable repair",
  (id, repairId, error) => {
    const observation = step(id);
    const repair = step(repairId);
    expect(observation.kind).toBe("observe");
    expect(observation.prompt).toContain(repairId);
    expect(observation.evaluator).toEqual({
      kind: "expected-error",
      code: error,
    });
    const broken = rust(observation.code!);
    expect(broken.compiled).toBe(false);
    expect(broken.stderr).toContain(error);
    expect(repair.kind).toBe("debug");
    expect(repair.evaluator?.kind).toBe("tests");
    if (repair.evaluator?.kind !== "tests")
      throw new Error("Expected repair tests");
    const fixed = rust(repair.solution!, repair.evaluator.tests);
    expect(fixed.compiled, fixed.stderr).toBe(true);
    expect(fixed.status, fixed.stdout + fixed.stderr).toBe(0);
  },
  60_000,
);

it("the read-only valid-only generator is accepted with two records and has a separate repair", () => {
  const observation = step("property-generated-inputs-observe");
  expect(observation.evaluator).toEqual({
    kind: "exact-output",
    expected: "wygenerowano: 2 rekordy\n",
  });
  expect(rust(observation.code!).stdout).toBe("wygenerowano: 2 rekordy\n");
  expect(rust(observation.solution!).stdout).toBe("wygenerowano: 2 rekordy\n");
  const repair = step("property-generated-inputs-repair");
  expect(repair.kind).toBe("debug");
  expect(repair.evidenceGate).toBe(false);
  if (repair.evaluator?.kind !== "tests")
    throw new Error("Expected generator repair tests");
  expect(rust(repair.solution!, repair.evaluator.tests).status).toBe(0);
  const lossy = rust(repair.code!, repair.evaluator.tests);
  expect(lossy.compiled, lossy.stderr).toBe(true);
  expect(lossy.status).toBe(101);
});

it("the displayed classifier distinguishes empty, zero, and non-ASCII timestamps", () => {
  const source = step("property-generated-inputs-run").code!;
  const result = rust(
    source,
    `#[test]
fn timestamp_domain() {
    assert_eq!(classify_record(" INFO ok"), "malformed");
    assert_eq!(classify_record("0 INFO ok"), "valid");
    assert_eq!(classify_record("١ INFO ok"), "malformed");
}`,
  );
  expect(result.compiled, result.stderr).toBe(true);
  expect(result.status, result.stdout).toBe(0);
});

it("release_one increments both zero and an existing counter exactly once", () => {
  const release = step("drop-release-gate");
  expect(release.prompt).toContain("o jeden");
  const tests = `#[test]
fn release_is_relative_to_the_initial_state() {
    for initial in [0, 10] {
        let counter = Cell::new(initial);
        assert_eq!(release_one(&counter), initial + 1);
        assert_eq!(counter.get(), initial + 1);
    }
}`;
  expect(rust(release.solution!, tests).status).toBe(0);
  expect(
    rust(release.solution!.replace("released.get()\n}", "1\n}"), tests).status,
  ).toBe(101);
});

it("the Weak blank declares the mutable link representation required by its harness", () => {
  const task = step("weak-inspect-blank");
  expect(task.prompt).toContain("RefCell<Weak<Node>>");
  expect(task.prompt).toContain("&Rc<Node>");
  if (task.evaluator?.kind !== "tests") throw new Error("Expected Weak tests");
  expect(rust(task.solution!, task.evaluator.tests).status).toBe(0);
});

it("notice reception normalizes CRLF while preserving a lone CR at EOF", () => {
  const task = step("guess-session-io-blank");
  const tests = String.raw`use std::io::Cursor;
#[test]
fn line_endings_follow_the_transport_contract() {
    for (input, expected) in [
        (b"alarm\n".as_slice(), Some("alarm")),
        (b"alarm\r\n".as_slice(), Some("alarm")),
        (b"alarm\r".as_slice(), Some("alarm\r")),
        (b"alarm".as_slice(), Some("alarm")),
        (b"".as_slice(), None),
    ] {
        let mut reader = Cursor::new(input);
        let mut output = Vec::new();
        assert_eq!(receive_notice(&mut reader, &mut output).unwrap().as_deref(), expected);
    }
}`;
  const result = rust(task.solution!, tests);
  expect(result.compiled, result.stderr).toBe(true);
  expect(result.status, result.stdout).toBe(0);
});
