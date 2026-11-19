import { describe, expect, it } from "vitest";
import { capstoneIntegrationAssessmentFixtures } from "./capstone-integration-assessment-fixtures";
import {
  capstoneIntegrationCompetencies,
  capstoneIntegrationConcepts,
  capstoneIntegrationLessons,
  capstoneIntegrationModule,
  capstoneIntegrationReviewExercises,
  capstoneIntegrationSources,
} from "./capstone-integration";
import { capstoneMaintenanceModuleExtension } from "./capstone-maintenance-lesson";
import { lessons, modules, projects } from "./course";
import { createInitialState } from "../persistence/state";
import { moduleGate, recordEvidence } from "../engine/learning";

const lessonIds = [
  "capstone-domain-boundary",
  "capstone-idempotent-commit",
  "capstone-bounded-lifecycle",
  "capstone-protocol-evolution",
  "capstone-incident-recovery",
  "capstone-release-evidence",
];

const gateIds = [
  "capstone-domain-validate",
  "capstone-domain-errors",
  "capstone-commit-replay",
  "capstone-commit-atomicity",
  "capstone-lifecycle-admit",
  "capstone-lifecycle-settle",
  "capstone-protocol-decode",
  "capstone-protocol-migrate",
  "capstone-incident-correlate",
  "capstone-incident-decide",
  "capstone-release-bind",
  "capstone-release-decide",
];

const blankIds = [
  "capstone-domain-blank",
  "capstone-commit-blank",
  "capstone-lifecycle-blank",
  "capstone-protocol-blank",
  "capstone-incident-blank",
  "capstone-release-blank",
];

const recallIds = [
  "capstone-domain-recall",
  "capstone-commit-recall",
  "capstone-lifecycle-recall",
  "capstone-protocol-recall",
  "capstone-incident-recall",
  "capstone-release-recall",
];

type AuthoredInstructionCard = {
  title: string;
  summary?: string;
  points: string[];
  followUp?: AuthoredInstructionCard;
};

function learnerInstructionOf(
  project: unknown,
): AuthoredInstructionCard | undefined {
  return (project as { learnerInstruction?: AuthoredInstructionCard })
    .learnerInstruction;
}

function authoredInstructionText(card: AuthoredInstructionCard): string {
  return [card.title, card.summary ?? "", ...card.points].join("\n");
}

describe("Capstone: trwały serwis logów", () => {
  it("publishes the bounded per-stream K change card without changing capstone gates", () => {
    const project = projects.find(
      (candidate) => candidate.id === "durable-log-service",
    );
    expect(project).toBeDefined();
    const instruction = learnerInstructionOf(project);
    expect(instruction).toBeDefined();
    const body = authoredInstructionText(instruction!);

    for (const marker of ["K=1", "K=2", "idempot", "konflikt", "transakcj"]) {
      expect(body).toContain(marker);
    }
    expect(body).toMatch(/restart|uruchomien/);
    expect(body).toMatch(/storage|magazyn/i);
    expect(body).toMatch(/strumień|strumieni/);
    expect(body).toMatch(/nowe|nowy.*ID|identyfikator/);
    expect(body).toMatch(/wiersz|zapis/);
    expect(body).toMatch(/potwierd|acknowledg|sukces/);
    expect(body).toMatch(/pojemn|capacity/i);
    expect(body).toMatch(/współbież|jednoproces|concurr/i);
    expect(body).toMatch(/uzasadn|decyzj.*gran|miejsce/);

    expect(project!.lessonIds).toEqual([
      ...lessonIds,
      "capstone-maintenance-recovery",
    ]);
    expect(project!.reviewConceptIds).toEqual(
      lessonIds.map((id) => `${id}-contract`),
    );
    expect(project!.package?.id).toBe("durable-log-service-workspace");
    expect(project!.adversarialLessonId).toBe("capstone-release-evidence");
    expect(project!.adversarialInject).toContain(
      "Po utracie odpowiedzi klient ponawia to samo żądanie, a raport wydania może dotyczyć innego digestu.",
    );
    expect(
      capstoneIntegrationLessons.flatMap((lesson) =>
        lesson.steps.filter((step) => step.evidenceGate),
      ),
    ).toHaveLength(12);
  });

  it("stages local source review and a disclosed lower/raise-K follow-up", () => {
    const project = projects.find(
      (candidate) => candidate.id === "durable-log-service",
    )!;
    const instruction = learnerInstructionOf(project)!;
    expect(authoredInstructionText(instruction)).toContain("CHANGE-REVIEW.md");
    expect(authoredInstructionText(instruction)).toContain("przeglądu");
    expect(instruction.followUp).toBeDefined();
    const followUp = authoredInstructionText(instruction.followUp!);
    for (const requirement of [
      "K=2",
      "K=1",
      "K=3",
      "rekordy",
      "receipt",
      "wcześniej",
      "samoocen",
      "przegląd",
      "klient–serwis",
    ]) {
      expect(followUp).toContain(requirement);
    }
    expect(followUp).toContain("znana zmiana wymagania");
    expect(followUp).toContain("nie przyznaje");
    expect(project.package?.starterRevealStepRefs).toEqual([]);
    expect(project.package?.revealStepRefs.map((ref) => ref.stepId)).toEqual(
      gateIds,
    );
  });

  it("publikuje dokładnie sześć lekcji, pojęć, kompetencji i źródeł", () => {
    expect(capstoneIntegrationLessons.map((lesson) => lesson.id)).toEqual(
      lessonIds,
    );
    expect(capstoneIntegrationConcepts.map((concept) => concept.id)).toEqual(
      lessonIds.map((id) => `${id}-contract`),
    );
    expect(
      capstoneIntegrationCompetencies.map((competency) => competency.id),
    ).toEqual(lessonIds.map((id) => `${id}-competency`));
    expect(capstoneIntegrationSources.map((source) => source.id)).toEqual([
      "capstone-sqlite-transactions",
      "capstone-sqlite-wal",
      "capstone-sqlite-pragmas",
      "capstone-rusqlite-transactions",
      "capstone-tokio-mpsc",
      "capstone-tokio-blocking",
      "capstone-cargo-semver",
      "capstone-rust-errors",
    ]);
  });

  it("ma dwanaście bramek, sześć prawdziwych blanków i sześć niezależnych reviews", () => {
    const steps = capstoneIntegrationLessons.flatMap((lesson) => lesson.steps);
    expect(
      steps.filter((step) => step.evidenceGate).map((step) => step.id),
    ).toEqual(gateIds);
    expect(
      steps.filter((step) => step.kind === "blank").map((step) => step.id),
    ).toEqual(blankIds);
    expect(Object.keys(capstoneIntegrationReviewExercises).sort()).toEqual(
      lessonIds.map((id) => `${id}-contract`).sort(),
    );
    for (const step of steps.filter((candidate) =>
      blankIds.includes(candidate.id),
    )) {
      expect(step.code, step.id).toBeUndefined();
      expect(step.evaluator?.kind, step.id).toBe("rubric");
      expect(step.prompt, step.id).not.toMatch(/fn\s+\w+\s*\(/);
    }
  });

  it("rejestruje moduł i projekt dopiero z kompletnymi odwołaniami", () => {
    expect(capstoneIntegrationModule.lessonIds).toEqual(lessonIds);
    expect(capstoneIntegrationModule.gateCriteria).toHaveLength(12);
    expect(
      capstoneIntegrationModule.gateCriteria?.flatMap(
        (criterion) => criterion.taskRefs,
      ),
    ).toHaveLength(24);
    expect(
      capstoneIntegrationModule.gateCriteria?.every(
        (criterion) => criterion.taskRefs.length === 2,
      ),
    ).toBe(true);
    expect(capstoneIntegrationModule.assessmentId).toBe(
      "capstone-release-blank",
    );
    expect(modules).toContainEqual(capstoneMaintenanceModuleExtension);
    const project = projects.find(
      (candidate) => candidate.id === "durable-log-service",
    );
    expect(project?.lessonIds).toEqual([
      ...lessonIds,
      "capstone-maintenance-recovery",
    ]);
    expect(project?.reviewConceptIds).toEqual(
      lessonIds.map((id) => `${id}-contract`),
    );
    expect(project?.package?.id).toBe("durable-log-service-workspace");
  });

  it("pokazuje, że samo ukończenie, reveal i blanki nie dają bramki", () => {
    const initial = createInitialState();
    let state = initial;
    let at = 1;
    for (const lesson of capstoneIntegrationLessons) {
      for (const step of lesson.steps.filter(
        (candidate) =>
          !capstoneIntegrationModule.gateCriteria!.some((criterion) =>
            criterion.taskRefs.some(
              (ref) =>
                ref.lessonId === lesson.id && ref.stepId === candidate.id,
            ),
          ) && candidate.kind !== "blank",
      )) {
        state = recordEvidence(state, {
          id: `completion/${step.id}`,
          lessonId: lesson.id,
          stepId: step.id,
          conceptIds: lesson.conceptIds,
          kind: step.evidenceKind,
          evaluator: step.evaluator?.kind,
          passed: true,
          hints: 0,
          revealed: false,
          at: at++,
        });
      }
    }
    expect(
      moduleGate(state, capstoneIntegrationLessons, capstoneIntegrationModule)
        .passed,
    ).toBe(false);
    let revealedIndex = 0;
    for (const lesson of capstoneIntegrationLessons) {
      for (const step of lesson.steps.filter(
        (candidate) => candidate.evidenceGate,
      )) {
        state = recordEvidence(state, {
          id: `revealed/${step.id}`,
          lessonId: lesson.id,
          stepId: step.id,
          conceptIds: lesson.conceptIds,
          kind: step.evidenceKind,
          evaluator: step.evaluator?.kind,
          passed: true,
          hints: 0,
          revealed: true,
          gate: true,
          at: 100 + revealedIndex++,
        });
      }
    }
    expect(
      moduleGate(state, capstoneIntegrationLessons, capstoneIntegrationModule)
        .passed,
    ).toBe(false);
    for (const lesson of capstoneIntegrationLessons) {
      const blank = lesson.steps.find((step) => step.kind === "blank")!;
      state = recordEvidence(state, {
        id: `blank/${blank.id}`,
        lessonId: lesson.id,
        stepId: blank.id,
        conceptIds: lesson.conceptIds,
        kind: "assessment",
        evaluator: "rubric",
        passed: true,
        hints: 0,
        revealed: false,
        at: 200 + state.events.length,
      });
    }
    expect(
      moduleGate(state, capstoneIntegrationLessons, capstoneIntegrationModule)
        .passed,
    ).toBe(false);
    for (const lesson of capstoneIntegrationLessons) {
      const level = state.mastery[lesson.conceptIds[0]]?.level;
      expect(["understood", "retained"]).not.toContain(level);
    }
  });

  it("rejestruje sześć niezależnych reviews i rozróżnia je od blanków", () => {
    let state = createInitialState();
    let at = 10;
    for (const lesson of capstoneIntegrationLessons) {
      const gates = lesson.steps.filter((step) => step.evidenceGate);
      for (const gate of gates) {
        state = recordEvidence(state, {
          id: `independent-gate/${gate.id}`,
          lessonId: lesson.id,
          stepId: gate.id,
          conceptIds: lesson.conceptIds,
          kind: gate.evidenceKind,
          evaluator: "tests",
          passed: true,
          hints: 0,
          revealed: false,
          gate: true,
          at: at++,
        });
      }
      const review = capstoneIntegrationReviewExercises[lesson.conceptIds[0]];
      expect(review, lesson.conceptIds[0]).toBeDefined();
      state = recordEvidence(state, {
        id: `registered-review/${review.id}`,
        lessonId: "review",
        stepId: review.id,
        conceptIds: lesson.conceptIds,
        kind: "transfer",
        evaluator: "tests",
        passed: true,
        hints: 0,
        revealed: false,
        at: at++,
      });
    }
    expect(
      state.events.filter((event) => event.id.startsWith("registered-review/")),
    ).toHaveLength(6);
    expect(
      capstoneIntegrationLessons.every(
        (lesson) => state.mastery[lesson.conceptIds[0]]?.level === "understood",
      ),
    ).toBe(true);
  });

  it("dopuszcza dwanaście niezależnych bramek i opóźnione przypomnienie", () => {
    let state = createInitialState();
    for (const [index, lesson] of capstoneIntegrationLessons.entries()) {
      for (const step of lesson.steps.filter(
        (candidate) => candidate.evidenceGate,
      )) {
        state = recordEvidence(state, {
          id: `gate/${step.id}`,
          lessonId: lesson.id,
          stepId: step.id,
          conceptIds: lesson.conceptIds,
          kind: step.evidenceKind,
          evaluator: "tests",
          passed: true,
          hints: 0,
          revealed: false,
          gate: true,
          at: index * 10 + state.events.length + 1,
        });
      }
    }
    expect(
      moduleGate(state, capstoneIntegrationLessons, capstoneIntegrationModule)
        .passed,
    ).toBe(true);
    const concept = capstoneIntegrationConcepts[0];
    const registeredReview = capstoneIntegrationReviewExercises[concept.id]!;
    expect(registeredReview).toBeDefined();
    state = recordEvidence(state, {
      id: "delayed/registered-review",
      lessonId: "review",
      stepId: registeredReview.id,
      conceptIds: [concept.id],
      kind: "recall",
      evaluator: "tests",
      passed: true,
      hints: 0,
      revealed: false,
      delayed: true,
      at: 1000 + 25 * 60 * 60 * 1000,
    });
    expect(state.mastery[concept.id]?.level).toBe("retained");
  });

  it("utrzymuje 35 dokładnych kontraktów bez blanków", () => {
    const testedIds = [
      ...capstoneIntegrationLessons.flatMap((lesson) =>
        lesson.steps
          .filter((step) => step.evaluator?.kind === "tests")
          .map((step) => step.id),
      ),
      ...Object.values(capstoneIntegrationReviewExercises).map(
        (step) => step.id,
      ),
    ];
    expect(testedIds).toHaveLength(35);
    expect(
      capstoneIntegrationAssessmentFixtures.map((fixture) => fixture.id).sort(),
    ).toEqual(testedIds.sort());
    expect(capstoneIntegrationAssessmentFixtures).toHaveLength(35);
    expect(
      capstoneIntegrationAssessmentFixtures.every(
        (fixture) => fixture.equivalent && fixture.mutant,
      ),
    ).toBe(true);
    expect(
      capstoneIntegrationAssessmentFixtures.some((fixture) =>
        blankIds.includes(fixture.id),
      ),
    ).toBe(false);
  });
});
