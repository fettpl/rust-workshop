import { describe, expect, it } from "vitest";
import * as course from "./course";

const lessonIds = [
  "service-authorization-policy",
  "service-authorization-attenuation",
  "service-authorization-binding",
  "service-authorization-admission",
];
const concepts = [
  "service-scoped-authority",
  "service-bound-authorization-use",
];

describe("typed authorization content contract", () => {
  it("appends exactly four lessons, twenty-four steps, two concepts and four operation families", () => {
    const added = course.lessons.filter(
      (lesson) => lesson.moduleId === "service-authorization",
    );
    expect(added.map((lesson) => lesson.id)).toEqual(lessonIds);
    expect(added.flatMap((lesson) => lesson.steps)).toHaveLength(24);
    expect(course.concepts.slice(-2).map((item) => item.id)).toEqual(concepts);
    expect(added.map((lesson) => lesson.steps.map((step) => step.id))).toEqual(
      ["policy", "attenuation", "binding", "admission"].map((operation) =>
        ["predict", "model", "apply", "blank", "recall", "reflect"].map(
          (suffix) => `authorization-${operation}-${suffix}`,
        ),
      ),
    );
    expect(
      new Set(
        added.flatMap((lesson) =>
          lesson.steps
            .filter((step) => step.evidenceGate)
            .map((step) => step.evidence?.codingTaskId),
        ),
      ).size,
    ).toBe(4);
    expect(course.modules.at(-1)?.id).toBe("service-authorization");
    expect(course.projects.at(-1)?.id).toBe("service-authorization");
  });

  it("blank_and_ordinary_review_editors_are_empty_with_non_solution_scaffolds", () => {
    const added = course.lessons.filter(
      (lesson) => lesson.moduleId === "service-authorization",
    );
    expect(added).toHaveLength(4);
    const blanks = added.map((lesson) =>
      lesson.steps.find((step) => step.kind === "blank")!,
    );
    const reviews = concepts.map((id) => course.reviewExercises[id]);
    for (const step of [...blanks, ...reviews]) {
      expect(step).toBeDefined();
      expect(step.code).toBe("");
      expect(step.prompt).toContain('todo!("implement this operation")');
      expect(step.prompt).toContain("```rust");
      expect(step.prompt).not.toContain(step.solution);
    }
    for (const review of reviews) {
      expect(review.kind).toBe("recall");
      expect(review.evaluator?.kind).toBe("tests");
      expect(review.evidenceGate).not.toBe(true);
    }
  });
});

import { createHash } from "node:crypto";
import { serviceAuthorizationAssessmentFixtures as fixtures } from "./service-authorization-assessment-fixtures";
import { authorizationOperations } from "./service-authorization-contracts";
import { serviceAuthorizationPackage } from "./projects/service-authorization";
import { revealProjectPackageVariant } from "../domain/project-package";
import {
  assistanceForLessonStep,
  courseEvidencePolicy,
  courseEvidenceSummary,
  courseDelayedReviewEligibility,
  recordCourseEvidence,
} from "./learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { moduleGate } from "../engine/learning";
import type { EvidenceEvent, UserState } from "../domain/types";

const types = {
  policy:
    "PrincipalId TenantId ResourceId Principal Resource Action ActionSet Scope GrantSpec Request Denial Authority",
  attenuation:
    "PrincipalId TenantId ResourceId Action ActionSet Scope GrantSpec AttenuationError",
  binding:
    "PrincipalId TenantId ResourceId Principal Resource Action Request Denial Authority Authorized",
  admission:
    "PrincipalId TenantId ResourceId Principal Resource Action Request Authority Authorized Limits AdmissionState Accepted AdmissionRejection",
};
const functions = {
  policy: "new contains subset_of decide main",
  attenuation: "new contains subset_of attenuate main",
  binding: "fixture decide authorize principal request main",
  admission: "principal request admit main",
};
function sourceIssues(operation: keyof typeof types, source: string): string[] {
  const allowedTypes = types[operation].split(" ");
  const allowedFunctions = functions[operation].split(" ");
  return [
    ...Array.from(
      source.matchAll(/\b(?:struct|enum|type|trait)\s+([A-Za-z_]\w*)/g),
    )
      .filter((match) => !allowedTypes.includes(match[1]))
      .map((match) => `type:${match[1]}`),
    ...Array.from(source.matchAll(/\bfn\s+([A-Za-z_]\w*)/g))
      .filter((match) => !allowedFunctions.includes(match[1]))
      .map((match) => `fn:${match[1]}`),
    ...Array.from(source.matchAll(/\bimpl(?:\s*<[^>]*>)?\s+([A-Za-z_]\w*)/g))
      .filter((match) => !allowedTypes.includes(match[1]))
      .map((match) => `impl:${match[1]}`),
    ...(/\b(?:pub|mod|include|include_str|include_bytes)\b/.test(source)
      ? ["unapproved visibility/module/source inclusion"]
      : []),
  ];
}
function visibleSources() {
  return Object.entries(fixtures).flatMap(([id, data]) => {
    const step = id.startsWith("review-")
      ? Object.values(course.reviewExercises).find((step) => step.id === id)!
      : course.lessons
          .flatMap((lesson) => lesson.steps)
          .find((step) => step.id === id)!;
    return [
      data.canonical,
      data.equivalent,
      data.starter,
      data.promptScaffold,
      ...data.semanticMutants.map((mutant) => mutant.source),
      step.code ?? "",
      step.solution ?? "",
      ...Array.from(
        step.prompt.matchAll(/```(?:rust)?\n([\s\S]*?)```/g),
        (match) => match[1],
      ),
      ...(step.hints ?? []).flatMap((hint) =>
        Array.from(
          hint.matchAll(/```(?:rust)?\n([\s\S]*?)```/g),
          (match) => match[1],
        ),
      ),
    ].map((source) => ({ id, operation: data.operation, source }));
  });
}
it("every_displayed_source_obeys_its_operation_declaration_allowlist", () => {
  for (const { id, operation, source } of visibleSources())
    expect(sourceIssues(operation, source), id).toEqual([]);
  // Mutation controls prove the bounded scanner detects explicit cross-family disclosure.
  for (const operation of [
    "policy",
    "attenuation",
    "binding",
    "admission",
  ] as const) {
    expect(
      sourceIssues(
        operation,
        `${authorizationOperations[operation].starter}\nfn submit() {}`,
      ),
    ).not.toEqual([]);
    expect(
      sourceIssues(
        operation,
        `${authorizationOperations[operation].starter}\nstruct Service;`,
      ),
    ).not.toEqual([]);
  }
});
it("binding_dependency_is_exact_labeled_test_double", () => {
  const expected =
    "fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> {\n if principal == self.expected_principal && request == &self.expected_request { self.decision } else { Err(Denial::NoMatchingGrant) }\n}";
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  for (const { source } of visibleSources().filter(
    (record) => record.operation === "binding" && record.source,
  )) {
    const body = source.match(/fn decide\([^]*?\n\}/)?.[0];
    expect(body).toBe(expected);
    expect(digest(body!)).toBe(digest(expected));
    expect(source).toContain("Deterministyczny dubler testowy");
    expect(source).toContain(
      "expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>",
    );
  }
  for (const step of course.lessons
    .find((lesson) => lesson.id === lessonIds[2])!
    .steps.filter((step) => ["apply", "blank", "recall"].includes(step.kind)))
    expect(step.prompt).toContain("test double");
});
it("model_and_prediction_traces_do_not_embed_assessed_bodies", () => {
  for (const lesson of course.lessons.filter(
    (lesson) => lesson.moduleId === "service-authorization",
  )) {
    for (const step of lesson.steps.filter((step) =>
      ["predict", "observe", "assessment"].includes(step.kind),
    )) {
      expect(step.code).toBeUndefined();
      expect(step.solution).toBeUndefined();
      expect(step.prompt).not.toMatch(
        /\bfn\s+\w+|```|include_str!|String\.raw/,
      );
      expect(step.evidence?.codingTaskId).toBeUndefined();
      expect(step.evidenceGate).not.toBe(true);
    }
    expect(
      lesson.steps.find((step) => step.kind === "observe")!.prompt,
    ).toContain("| Wynik");
  }
});
function record(
  state: UserState,
  operation: number,
  suffix: string,
  at: number,
  overrides: Partial<EvidenceEvent> = {},
) {
  const lesson = course.lessons.find(
    (lesson) => lesson.id === lessonIds[operation],
  )!;
  const step = lesson.steps.find((step) => step.id.endsWith(`-${suffix}`))!;
  const event: EvidenceEvent = {
    id: `a11-${operation}-${suffix}-${at}`,
    lessonId: lesson.id,
    stepId: step.id,
    conceptIds: [...step.evidence!.conceptIds],
    evidenceVersion: 2,
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    gate: step.evidenceGate === true,
    at,
    ...assistanceForLessonStep(state, lesson, step),
    ...overrides,
  };
  return recordCourseEvidence(state, event);
}
it("same_family_aliases_and_ordinary_recall_cannot_supply_the_second_primary_operation", () => {
  let state = record(
    record(createInitialState(), 0, "apply", 1),
    0,
    "blank",
    2,
  );
  state = record(state, 0, "recall", 3);
  state = record(state, 1, "predict", 4);
  state = record(state, 1, "reflect", 5);
  const review = course.reviewExercises[concepts[0]];
  state = recordCourseEvidence(state, {
    id: "ordinary-review",
    lessonId: "review",
    stepId: `${review.id}:session-a`,
    conceptIds: [concepts[0]],
    evidenceVersion: 2,
    kind: "recall",
    evaluator: "tests",
    gate: false,
    passed: true,
    hints: 0,
    revealed: false,
    at: 6,
  });
  expect(courseEvidenceSummary(state, concepts[0]).qualifyingCodingTasks).toBe(
    1,
  );
  const stage = course.modules.find(
    (module) => module.id === "service-authorization",
  )!;
  expect(moduleGate(state, course.lessons, stage).passed).toBe(false);
  expect(
    moduleGate(state, course.lessons, stage).criteria.filter(
      (criterion) => criterion.passed,
    ),
  ).toHaveLength(1);
  state = record(state, 1, "apply", 7);
  expect(courseEvidenceSummary(state, concepts[0]).qualifyingCodingTasks).toBe(
    2,
  );
  state = record(record(state, 2, "apply", 8), 3, "apply", 9);
  expect(courseEvidenceSummary(state, concepts[1]).qualifyingCodingTasks).toBe(
    2,
  );
  expect(moduleGate(state, course.lessons, stage).passed).toBe(true);
});
it("package_solution_reveals_exact_eight_refs_and_starter_reveals_none", () => {
  const refs = ["policy", "attenuation", "binding", "admission"].flatMap(
    (operation) =>
      ["apply", "blank"].map((suffix) => ({
        lessonId: `service-authorization-${operation}`,
        stepId: `authorization-${operation}-${suffix}`,
      })),
  );
  expect(serviceAuthorizationPackage.revealStepRefs).toEqual(refs);
  expect(serviceAuthorizationPackage.starterRevealStepRefs).toEqual([]);
  const initial = createInitialState();
  const starter = revealProjectPackageVariant(
    initial,
    serviceAuthorizationPackage,
    course.lessons,
    "starter",
    20,
    courseEvidencePolicy,
  );
  expect(starter).toBe(initial);
  const solution = revealProjectPackageVariant(
    initial,
    serviceAuthorizationPackage,
    course.lessons,
    "solution",
    21,
    courseEvidencePolicy,
  );
  expect(solution.events).toHaveLength(8);
  let submitted = solution;
  for (const [index, lessonId] of lessonIds.entries()) {
    const lesson = course.lessons.find((lesson) => lesson.id === lessonId)!;
    for (const suffix of ["apply", "blank"]) {
      const step = lesson.steps.find((step) => step.id.endsWith(`-${suffix}`))!;
      expect(assistanceForLessonStep(solution, lesson, step).revealed).toBe(
        true,
      );
      submitted = record(submitted, index, suffix, 30 + index);
    }
  }
  for (const id of concepts)
    expect(courseEvidenceSummary(submitted, id).qualifyingCodingTasks).toBe(0);
  let alreadyClean = record(
    record(createInitialState(), 0, "apply", 1),
    1,
    "apply",
    2,
  );
  const oldEvents = alreadyClean.events;
  alreadyClean = revealProjectPackageVariant(
    alreadyClean,
    serviceAuthorizationPackage,
    course.lessons,
    "solution",
    50,
    courseEvidencePolicy,
  );
  expect(alreadyClean.events.slice(0, oldEvents.length)).toEqual(oldEvents);
  expect(
    courseEvidenceSummary(alreadyClean, concepts[0]).qualifyingCodingTasks,
  ).toBe(2);
});
it("local_help_propagates_only_to_the_same_family_and_assisted_passes_are_not_clean", () => {
  let state = createInitialState();
  const lesson = course.lessons.find((lesson) => lesson.id === lessonIds[3])!;
  const apply = lesson.steps[2];
  state.steps[stepKey(lesson.id, apply.id)] = {
    ...createStepProgress(apply.code),
    revealed: true,
    hints: 1,
  };
  expect(assistanceForLessonStep(state, lesson, lesson.steps[3])).toEqual({
    hints: 1,
    revealed: true,
  });
  const policy = course.lessons.find((lesson) => lesson.id === lessonIds[0])!;
  expect(assistanceForLessonStep(state, policy, policy.steps[2])).toEqual({
    hints: 0,
    revealed: false,
  });
  state = record(state, 3, "blank", 3);
  expect(courseEvidenceSummary(state, concepts[1]).qualifyingCodingTasks).toBe(
    0,
  );
});
it("delayed_eligibility_still_requires_strictly_more_than_twenty_four_quiet_hours", () => {
  const state = record(
    record(createInitialState(), 0, "apply", 1),
    1,
    "apply",
    2,
  );
  state.review = [
    {
      conceptId: concepts[0],
      dueAt: 2,
      intervalDays: 1,
      attempts: 0,
      reason: "test",
    },
  ];
  expect(
    courseDelayedReviewEligibility(state, concepts[0], 2 + 86_400_000),
  ).toBe(false);
  expect(
    courseDelayedReviewEligibility(state, concepts[0], 3 + 86_400_000),
  ).toBe(true);
});
it("historical_import_preserves_raw_evidence_resume_drafts_dates_and_no_new_families", () => {
  const historical = createInitialState();
  historical.resume = {
    view: "lesson",
    lessonId: "service-client-ambiguous-driver",
    stepIndex: 3,
    panel: "output",
    focus: true,
  };
  historical.routePreference = "extensions";
  historical.steps["service-client-ambiguous-driver:ambiguous-driver-blank"] = {
    ...createStepProgress("saved source"),
    hints: 2,
    revealed: true,
    attempts: [
      {
        at: 1700000000000,
        code: "saved source",
        passed: false,
        feedback: "unfinished",
      },
    ],
  };
  historical.notes["service-client-ambiguous-driver"] = "saved note";
  historical.events = [
    {
      id: "predecessor-assistance",
      lessonId: "service-client-ambiguous-driver",
      stepId: "ambiguous-driver-blank",
      conceptIds: ["service-client-ambiguity-contract"],
      evidenceVersion: 2,
      kind: "exposure",
      passed: true,
      hints: 2,
      revealed: true,
      at: 1700000000000,
    },
  ];
  const before = JSON.stringify(historical);
  const imported = importState(exportState(historical));
  expect(JSON.stringify(historical)).toBe(before);
  expect(imported.events).toEqual(historical.events);
  expect(imported.resume).toEqual(historical.resume);
  expect(imported.steps).toEqual(historical.steps);
  expect(imported.notes).toEqual(historical.notes);
  for (const id of concepts)
    expect(courseEvidenceSummary(imported, id).qualifyingCodingTasks).toBe(0);
});

it("keeps_exact_prerequisites_four_gate_alias_pairs_and_ordinary_review_identity", () => {
  const stage = course.modules.find(
    (module) => module.id === "service-authorization",
  )!;
  expect(stage.prerequisites).toEqual(["service-operations"]);
  expect(stage.lessonIds).toEqual(lessonIds);
  expect(stage.assessmentId).toBe("authorization-admission-blank");
  expect(stage.gateCriteria?.map((criterion) => criterion.id)).toEqual([
    "authorization-exact-scope-gate",
    "authorization-attenuation-gate",
    "authorization-request-binding-gate",
    "authorization-consuming-admission-gate",
  ]);
  for (const [index, operation] of [
    "policy",
    "attenuation",
    "binding",
    "admission",
  ].entries()) {
    const lesson = course.lessons.find(
      (lesson) => lesson.id === lessonIds[index],
    )!;
    expect(lesson.prerequisites).toEqual(
      index === 0
        ? ["service-trust-admission", "module-visibility"]
        : [lessonIds[index - 1]],
    );
    expect(stage.gateCriteria![index].taskRefs).toEqual(
      ["apply", "blank"].map((suffix) => ({
        lessonId: lessonIds[index],
        stepId: `authorization-${operation}-${suffix}`,
      })),
    );
    expect(stage.gateCriteria![index].requiredIndependentCodingTasks).toBe(1);
    expect(
      lesson.steps.filter((step) => step.evidenceGate).map((step) => step.kind),
    ).toEqual(["apply", "blank"]);
    expect(lesson.steps[2].evidence?.codingTaskId).toBe(
      lesson.steps[3].evidence?.codingTaskId,
    );
    expect(lesson.sourceIds).toEqual(
      index < 2
        ? ["service-operations-enums", "service-operations-testing"]
        : [
            "cargo-reference-visibility",
            "rust-book-ownership",
            "service-operations-testing",
          ],
    );
  }
  const addedConcepts = course.concepts.filter((concept) =>
    concepts.includes(concept.id),
  );
  expect(addedConcepts.map((concept) => concept.prerequisites)).toEqual([
    ["service-operations-bounded-admission", "visibility-boundaries"],
    ["service-scoped-authority"],
  ]);
  for (const concept of addedConcepts) {
    expect(concept.evidenceCalibration).toEqual({
      version: 2,
      minimumCodingTasks: 2,
    });
    expect(concept.evidenceArtifact).toBe("rust-code");
    const review = course.reviewExercises[concept.id];
    expect(course.reviewExerciseForId(review.id)).toBe(review);
    expect(course.delayedReviewExercises[concept.id]).toBeUndefined();
    expect(course.shortReviewExercises[concept.id]).toBeUndefined();
    expect(review.reviewPurpose).toBeUndefined();
  }
  const project = course.projects.find(
    (project) => project.id === "service-authorization",
  )!;
  expect(project.lessonIds).toEqual(lessonIds);
  expect(project.reviewConceptIds).toEqual(concepts);
  expect(project.package).toBe(serviceAuthorizationPackage);
  expect(project.lessonId).toBe(lessonIds[0]);
  expect(project.adversarialLessonId).toBe(lessonIds[3]);
});

import { evaluate } from "../engine/evaluate";
it("unavailable_runner_and_saved_drafts_do_not_create_independent_evidence", () => {
  let state = createInitialState();
  for (const [index, id] of lessonIds.entries()) {
    const lesson = course.lessons.find((lesson) => lesson.id === id)!;
    const step = lesson.steps[2];
    const result = {
      status: "infrastructure-error" as const,
      stdout: "",
      stderr: "runner unavailable",
      diagnostics: [],
      durationMs: 0,
    };
    const evaluation = evaluate(step.evaluator!, { code: step.code, result });
    expect(evaluation.passed).toBe(false);
    state.steps[stepKey(id, step.id)] = {
      ...createStepProgress(step.code),
      attempts: [
        {
          at: index + 1,
          code: step.code,
          passed: evaluation.passed,
          feedback: evaluation.feedback,
          result,
        },
      ],
    };
    state = record(state, index, "apply", 10 + index, {
      passed: evaluation.passed,
    });
  }
  for (const id of concepts)
    expect(courseEvidenceSummary(state, id).qualifyingCodingTasks).toBe(0);
});
