import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { LessonStep } from "../domain/types";
import { appendHiddenTests } from "../runner";
import { publicApiValueLessons } from "./public-api-values";
import {
  publicApiEvolutionLessons,
  publicApiEvolutionReviewExercises,
} from "./public-api-evolution";
import {
  dependencyAssuranceLessons,
  dependencyAssuranceReviewExercises,
} from "./dependency-assurance";

// Only repository-authored, safe fixtures are compiled; no learner/imported inputs.
const tasks = [
  ...publicApiValueLessons.flatMap((lesson) => lesson.steps),
  ...publicApiEvolutionLessons.flatMap((lesson) => lesson.steps),
  ...Object.values(publicApiEvolutionReviewExercises),
  ...dependencyAssuranceLessons.flatMap((lesson) => lesson.steps),
  ...Object.values(dependencyAssuranceReviewExercises),
];
function task(id: string): LessonStep {
  const found = tasks.find((step) => step.id === id);
  if (!found?.solution || found.evaluator?.kind !== "tests")
    throw new Error(`Missing authored task ${id}`);
  return found;
}
function check(
  step: LessonStep,
  source: string,
  expected: "pass" | "assertion" | "sized",
) {
  if (step.evaluator?.kind !== "tests") throw new Error("Expected Rust tests");
  const directory = mkdtempSync(join(tmpdir(), "professional-contract-"));
  try {
    const input = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(input, appendHiddenTests(source, step.evaluator.tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", input, "-o", binary],
      {
        encoding: "utf8",
        timeout: 60_000,
      },
    );
    expect(compiled.error, step.id).toBeUndefined();
    expect(compiled.signal, step.id).toBeNull();
    if (expected === "sized") {
      expect(compiled.status, compiled.stderr).not.toBe(0);
      expect(compiled.stderr).toContain("E0277");
      return;
    }
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = spawnSync(binary, ["--test-threads=1"], {
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(executed.error, step.id).toBeUndefined();
    expect(executed.signal, step.id).toBeNull();
    const output = executed.stdout + executed.stderr;
    expect(executed.status, `${step.id}: ${output}`).toBe(
      expected === "pass" ? 0 : 101,
    );
    if (expected === "assertion") expect(output).toContain("assertion");
    expect(output).toMatch(
      /test result: (ok|FAILED)\. \d+ passed; \d+ failed; 0 ignored;/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
function changed(source: string, before: string, after: string) {
  expect(source).toContain(before);
  const result = source.replace(before, after);
  expect(result).not.toBe(source);
  return result;
}

it.each([
  ["declared byte limit", "MAX_BYTES: usize = 16", "MAX_BYTES: usize = 32"],
  [
    "ASCII alphabet",
    "character.is_ascii_alphanumeric()",
    "character.is_alphanumeric()",
  ],
  [
    "inclusive maximum",
    "actual > Self::MAX_BYTES",
    "actual >= Self::MAX_BYTES",
  ],
])(
  "ApiKey independent practice enforces %s",
  (_label, before, after) => {
    const step = task("api-validated-construction-blank");
    check(step, step.solution!, "pass");
    check(step, changed(step.solution!, before, after), "assertion");
  },
  60_000,
);

it.each([
  ["api-trait-compatibility-gate", "T: Meter + ?Sized", "T: Meter"],
  ["api-trait-compatibility-blank", "T: Pulse + ?Sized", "T: Pulse"],
  ["review-api-trait-compatibility", "T: Alarm + ?Sized", "T: Alarm"],
])(
  "%s actually instantiates its generic consumer with dyn",
  (id, before, after) => {
    const step = task(id);
    check(step, step.solution!, "pass");
    // Isolate the generic boundary: dyn_units itself can dispatch directly.
    const base = step.solution!.replace(
      "read_units(meter)\n}",
      "meter.units()\n}",
    );
    check(step, changed(base, before, after), "sized");
  },
  60_000,
);

it.each([
  [
    "api-trait-compatibility-blank",
    "self.current() > 100",
    "self.current() >= 100",
  ],
  ["api-trait-compatibility-blank", "source.current() <= limit", "true"],
  ["review-api-trait-compatibility", "if self.active()", "if true"],
  ["review-api-trait-compatibility", "alarm.active()\n}", "true\n}"],
])(
  "%s tests both predicate directions (%s)",
  (id, before, after) => {
    const step = task(id);
    check(step, step.solution!, "pass");
    check(step, changed(step.solution!, before, after), "assertion");
  },
  60_000,
);

it.each([
  ["dependency-graph-diagnosis-blank", " || other.source != edge.source"],
  ["dependency-graph-diagnosis-recall", " || other.source != item.source"],
  [
    "dependency-graph-diagnosis-review",
    " || other.source != dependency.source",
  ],
])(
  "%s detects a source conflict independently of version",
  (id, comparison) => {
    const step = task(id);
    check(step, step.solution!, "pass");
    check(step, changed(step.solution!, comparison, ""), "assertion");
  },
  60_000,
);

it.each([
  [
    "dependency-advisory-exceptions-gate",
    "exception",
    ["id", "package", "owner", "scope", "reason"],
  ],
  [
    "dependency-advisory-exceptions-blank",
    "exception",
    ["advisory", "package", "owner", "scope", "reason"],
  ],
  [
    "dependency-advisory-exceptions-recall",
    "waiver",
    ["advisory", "owner", "scope", "reason"],
  ],
  [
    "dependency-advisory-exceptions-review",
    "record",
    ["advisory", "package", "owner", "reason"],
  ],
] as const)(
  "%s requires every exception field",
  (id, variable, fields) => {
    const step = task(id);
    check(step, step.solution!, "pass");
    for (const field of fields) {
      check(
        step,
        changed(step.solution!, `!${variable}.${field}.is_empty()`, "true"),
        "assertion",
      );
    }
  },
  60_000,
);

it.each([
  [
    "dependency-release-dossier-gate",
    "dossier",
    ["manifest", "lock", "audit", "artifact", "config"],
    "!dossier.publish",
  ],
  [
    "dependency-release-dossier-blank",
    "dossier",
    ["manifest", "lockfile", "policy", "archive", "config"],
    "!dossier.publish",
  ],
  [
    "dependency-release-dossier-recall",
    "bundle",
    ["artifact", "config"],
    "!bundle.publish",
  ],
  [
    "dependency-release-dossier-review",
    "proof",
    ["manifest", "lock", "audit", "artifact", "config"],
    "!proof.publish",
  ],
] as const)(
  "%s keeps every dossier prerequisite",
  (id, variable, fields, publishing) => {
    const step = task(id);
    check(step, step.solution!, "pass");
    for (const field of fields) {
      check(
        step,
        changed(step.solution!, `!${variable}.${field}.is_empty()`, "true"),
        "assertion",
      );
    }
    check(
      step,
      changed(step.solution!, `${variable}.consumer`, "true"),
      "assertion",
    );
    check(step, changed(step.solution!, publishing, "true"), "assertion");
  },
  60_000,
);
