import { expect, it } from "vitest";
import { lessons, modules, reviewExercises } from "./course";
import { createInitialState, stepKey } from "../persistence/state";
import { moduleGate, recordEvidence } from "../engine/learning";

const lessonIds = [
  "service-trust-admission",
  "service-correlated-telemetry",
  "service-readiness-drain",
  "service-incident-diagnosis",
];

it("connects Service Operations to eight gates, blank pages, and retrievals", () => {
  const stage = modules.find((entry) => entry.id === "service-operations");
  expect(stage).toBeDefined();
  expect(stage!.prerequisites).toEqual(["tokio-network-service"]);
  expect(stage!.lessonIds).toEqual(lessonIds);
  expect(stage!.gateCriteria).toHaveLength(8);

  const moduleLessons = lessons.filter((lesson) =>
    lessonIds.includes(lesson.id),
  );
  expect(moduleLessons).toHaveLength(4);
  expect(
    moduleLessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evidenceGate),
    ),
  ).toHaveLength(8);

  for (const lesson of moduleLessons) {
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(
      1,
    );
    expect(
      lesson.steps.filter(
        (step) => step.kind === "recall" && step.evaluator?.kind === "tests",
      ),
    ).toHaveLength(1);
    expect(lesson.steps.filter((step) => step.evidenceGate)).toHaveLength(2);
    expect(
      lesson.steps
        .filter((step) => step.evidenceGate)
        .every((step) => step.evaluator?.kind === "tests"),
    ).toBe(true);
    expect(reviewExercises[lesson.conceptIds[0]]?.evaluator?.kind).toBe(
      "tests",
    );
  }

  let state = createInitialState();
  expect(moduleGate(state, lessons, stage!)).toMatchObject({ passed: false });
  for (const criterion of stage!.gateCriteria!) {
    const primary = criterion.taskRefs[0];
    const lesson = lessons.find((entry) => entry.id === primary.lessonId)!;
    const step = lesson.steps.find((entry) => entry.id === primary.stepId)!;
    expect(step.evidenceGate).toBe(true);
    state = recordEvidence(state, {
      id: `service-operations/${primary.lessonId}/${primary.stepId}`,
      conceptIds: lesson.conceptIds,
      lessonId: primary.lessonId,
      stepId: primary.stepId,
      kind: step.evidenceKind,
      passed: true,
      hints: 0,
      revealed: false,
      gate: true,
      evaluator: "tests",
      at: state.updatedAt + 1,
    });
  }
  expect(moduleGate(state, lessons, stage!)).toMatchObject({ passed: true });

  expect(
    stage!.gateCriteria!.every((criterion) => criterion.taskRefs.length >= 2),
  ).toBe(true);
  const refs = stage!.gateCriteria!.flatMap((criterion) =>
    criterion.taskRefs.map((ref) => `${ref.lessonId}/${ref.stepId}`),
  );
  expect(refs).toHaveLength(16);
  expect(new Set(refs).size).toBe(16);

  for (const lesson of moduleLessons) {
    const blank = lesson.steps.find((step) => step.kind === "blank")!;
    expect(blank.code).toBeUndefined();
    expect(blank.solution).toBeTruthy();
    expect(blank.evaluator?.kind).toBe("tests");
    const retrieval = lesson.steps.find(
      (step) => step.kind === "recall" && step.evaluator?.kind === "tests",
    )!;
    if (retrieval.evaluator?.kind === "tests") {
      expect(retrieval.evaluator.tests).not.toMatch(
        /Instant|SystemTime|elapsed|sleep|rand/i,
      );
    }
    expect(stepKey(blank.id ? lesson.id : "", blank.id)).toBe(
      `${lesson.id}:${blank.id}`,
    );
  }
});

it("keeps the learner-facing contracts explicit in the blank prompts", () => {
  const prompts = Object.fromEntries(
    moduleLessonsForTests().map((lesson) => [
      lesson.id,
      lesson.steps.find((step) => step.kind === "blank")!.prompt,
    ]),
  );
  expect(prompts["service-trust-admission"]).toMatch(/fn admit/);
  expect(prompts["service-trust-admission"]).toMatch(/trusted|zaufan/i);
  expect(prompts["service-correlated-telemetry"]).toMatch(
    /select_telemetry|correlation/i,
  );
  expect(prompts["service-readiness-drain"]).toMatch(
    /ServiceState|readiness|drain/i,
  );
  expect(prompts["service-incident-diagnosis"]).toMatch(
    /InsufficientEvidence|insufficient evidence|niewystarczaj/i,
  );
});

it("states exact field, variant, trait, and rejection contracts in every blank prompt", () => {
  const prompts = Object.fromEntries(
    moduleLessonsForTests().map((lesson) => [
      lesson.id,
      lesson.steps.find((step) => step.kind === "blank")!.prompt,
    ]),
  );

  expect(prompts["service-trust-admission"]).toContain(
    "struct Policy { max_cost: u32, require_proof: bool }",
  );
  expect(prompts["service-trust-admission"]).toContain(
    "enum Admission { Accepted, Rejected(&'static str) }",
  );
  for (const literal of ['"untrusted"', '"proof"', '"budget"']) {
    expect(prompts["service-trust-admission"]).toContain(literal);
  }
  expect(prompts["service-trust-admission"]).toMatch(
    /derive\(Debug, PartialEq, Eq, Clone, Copy\).*Policy/s,
  );

  expect(prompts["service-correlated-telemetry"]).toContain(
    "source: &'static str, correlation_id: u64, kind: &'static str",
  );
  expect(prompts["service-correlated-telemetry"]).toContain(
    "fn select_telemetry<'a>(events: &'a [Event], allowlist: &[&str], correlation_id: u64) -> Vec<&'a Event>",
  );

  expect(prompts["service-readiness-drain"]).toContain(
    "enum Phase { Starting, Ready, Draining, Stopped }",
  );
  expect(prompts["service-readiness-drain"]).toContain(
    "enum Event { MarkReady, Accept, Complete, BeginDrain }",
  );
  expect(prompts["service-readiness-drain"]).toContain(
    "struct ServiceState { phase: Phase, accepted: usize, completed: usize }",
  );

  expect(prompts["service-incident-diagnosis"]).toContain(
    "struct Evidence { readiness: Option<bool>, accepted: Option<usize>, completed: Option<usize>, telemetry_events: Option<usize> }",
  );
  expect(prompts["service-incident-diagnosis"]).toContain(
    "enum Diagnosis { Healthy, AdmissionBlocked, WorkStuck, TelemetryGap, InsufficientEvidence }",
  );
  expect(prompts["service-incident-diagnosis"]).toContain(
    "fn diagnose(evidence: Evidence) -> Diagnosis",
  );
});

function moduleLessonsForTests() {
  return lessons.filter((lesson) => lessonIds.includes(lesson.id));
}
