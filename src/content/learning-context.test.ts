import { describe, expect, it } from "vitest";
import { concepts, lessons, projects } from "./course";
import {
  recordCourseEvidence,
  revealCourseProjectPackageVariant,
} from "./learning-context";
import type { EvidenceEvent, ProjectPackage } from "@/domain/types";
import { createInitialState, stepKey } from "@/persistence/state";

const rustEvent = (overrides: Partial<EvidenceEvent> = {}): EvidenceEvent => ({
  id: "course-rust",
  conceptIds: ["ownership"],
  lessonId: "memory",
  stepId: "gate",
  kind: "fix",
  passed: true,
  hints: 0,
  revealed: false,
  at: 1_000,
  ...overrides,
});

describe("course learning context", () => {
  it("uses authored policy and does not let a manifest evaluator prove a Rust concept", () => {
    const state = recordCourseEvidence(
      createInitialState(),
      rustEvent({ id: "wrong-artifact", evaluator: "manifest-contract" }),
    );
    expect(state.events).toHaveLength(1);
    expect(state.mastery.ownership?.level ?? "new").toBe("new");
  });

  it("keeps package reveal semantics behind the course facade", () => {
    const project: ProjectPackage = {
      id: "context-package",
      title: "Pakiet",
      description: "Pakiet testowy",
      instructions: ["cargo test"],
      revealStepRefs: [
        { lessonId: "todo-session-project", stepId: "session-debug" },
      ],
      starterRevealStepRefs: [
        { lessonId: "todo-session-project", stepId: "session-blank" },
      ],
      files: [
        {
          path: "Cargo.toml",
          starter: '[package]\nname = "context-package"\nversion = "0.1.0"\n',
        },
        { path: "src/lib.rs", starter: "pub fn run() {}" },
      ],
    };
    const starter = revealCourseProjectPackageVariant(
      createInitialState(),
      project,
      lessons,
      "starter",
      2_000,
    );
    expect(
      starter.steps[stepKey("todo-session-project", "session-blank")],
    ).toMatchObject({
      revealed: true,
    });
    expect(
      starter.steps[stepKey("todo-session-project", "session-debug")],
    ).toBeUndefined();
    const solution = revealCourseProjectPackageVariant(
      starter,
      project,
      lessons,
      "solution",
      3_000,
    );
    expect(solution.events).toHaveLength(2);
  });

  it("has authored manifest concepts once the Cargo curriculum is registered", () => {
    const manifestConcepts = concepts.filter(
      (concept) => concept.evidenceArtifact === "manifest",
    );
    expect(manifestConcepts.length).toBeGreaterThan(0);
    const concept = manifestConcepts[0];
    const event = rustEvent({
      id: "manifest-wrong-artifact",
      conceptIds: [concept.id],
      evaluator: "tests",
    });
    const state = recordCourseEvidence(createInitialState(), event);
    expect(state.mastery[concept.id]?.level ?? "new").toBe("new");
  });

  it("keeps manifest retention after later authored exposure", () => {
    const concept = concepts.find(
      (candidate) => candidate.evidenceArtifact === "manifest",
    );
    expect(concept).toBeDefined();
    const conceptId = concept!.id;
    const makeEvent = (id: string, at: number): EvidenceEvent => ({
      id,
      conceptIds: [conceptId],
      lessonId: "cargo-dependency-contract",
      stepId: id,
      kind:
        id === "recall"
          ? "recall"
          : id === "second"
            ? "assessment"
            : "transfer",
      passed: true,
      hints: 0,
      revealed: false,
      at,
      delayed: id === "recall" ? true : undefined,
      evaluator: "manifest-contract",
    });
    let state = recordCourseEvidence(
      createInitialState(),
      makeEvent("first", 1_000),
    );
    state = recordCourseEvidence(state, makeEvent("second", 2_000));
    state = recordCourseEvidence(
      state,
      makeEvent("recall", 2_000 + 24 * 60 * 60 * 1000 + 1),
    );
    expect(state.mastery[conceptId]?.level).toBe("retained");
    state = recordLaterExposure(state, conceptId);
    expect(state.mastery[conceptId]?.level).toBe("retained");
  });

  it("exposes Frame starter refs while leaving each independent blank available", () => {
    const frame = projects.find((project) => project.id === "frame-protocol");
    expect(frame?.package?.starterRevealStepRefs).toHaveLength(4);
    const state = revealCourseProjectPackageVariant(
      createInitialState(),
      frame!.package!,
      lessons,
      "starter",
      1_000,
    );
    expect(state.events).toHaveLength(4);
    expect(
      state.events.every(
        (event) => event.kind === "exposure" && event.revealed,
      ),
    ).toBe(true);
    expect(
      state.steps[
        stepKey("cargo-dependency-contract", "cargo-dependency-contract-blank")
      ],
    ).toBeUndefined();
  });
});

function recordLaterExposure(
  state: ReturnType<typeof createInitialState>,
  conceptId: string,
) {
  return recordCourseEvidence(state, {
    id: "later-exposure",
    conceptIds: [conceptId],
    lessonId: "cargo-dependency-contract",
    stepId: "later-exposure",
    kind: "exposure",
    passed: true,
    hints: 0,
    revealed: true,
    at: 2_000 + 24 * 60 * 60 * 1000 + 2,
  });
}
