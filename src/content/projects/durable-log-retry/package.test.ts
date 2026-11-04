import { describe, expect, it } from "vitest";
import {
  projectFiles,
  revealProjectPackageVariant,
  validateProjectPackage,
} from "../../../domain/project-package";
import { createInitialState, stepKey } from "../../../persistence/state";
import { recordEvidence } from "../../../engine/learning";
import { lessons } from "../../course";
import {
  durableLogRetryPackage,
  durableLogRetryPrimaryStepRefs,
  durableLogRetryProject,
} from "../durable-log-retry";
import { durableLogServicePackage } from "../durable-log-service/archive";

const oldFiles = durableLogServicePackage.files.map((file) => ({ ...file }));
const oldRevealRefs = durableLogServicePackage.revealStepRefs.map((ref) => ({ ...ref }));

describe("durable-log-retry authored package", () => {
  it("is valid, immutable, and preserves the 40-file durable reference", () => {
    expect(validateProjectPackage(durableLogRetryPackage)).toEqual([]);
    expect(durableLogRetryProject.id).toBe("durable-log-retry");
    expect(durableLogRetryPackage.id).toBe("durable-log-retry-workspace");
    expect(durableLogRetryPackage.workspaceMembers).toEqual(
      durableLogServicePackage.workspaceMembers,
    );
    expect(durableLogServicePackage.files).toEqual(oldFiles);
    const inherited = new Map(oldFiles.map((file) => [file.path, file]));
    const starter = projectFiles(durableLogRetryPackage, "starter");
    const solution = projectFiles(durableLogRetryPackage, "solution");
    for (const [path, file] of inherited) {
      expect(starter[path], `starter/${path}`).toBe(file.solution ?? file.starter);
      expect(solution[path], `solution/${path}`).toBe(file.solution ?? file.starter);
    }
    expect(durableLogRetryPackage.files).toHaveLength(44);
    expect(Object.keys(starter).filter((path) => !inherited.has(path))).toEqual([
      "crates/ingest-service/src/retry_client.rs",
      "crates/ingest-service/src/bin/ingest-retry-client.rs",
      "crates/ingest-service/tests/retry_client.rs",
      "RETRY-LAB.md",
    ]);
  });

  it("keeps old help refs in both variants and exposes four distinct new primary refs", () => {
    expect(durableLogRetryPackage.starterRevealStepRefs).toEqual(oldRevealRefs);
    expect(durableLogRetryPackage.revealStepRefs.slice(0, oldRevealRefs.length)).toEqual(
      oldRevealRefs,
    );
    expect(durableLogRetryPrimaryStepRefs).toHaveLength(4);
    expect(new Set(durableLogRetryPrimaryStepRefs.map((ref) => `${ref.lessonId}:${ref.stepId}`)).size).toBe(4);
    expect(durableLogRetryPackage.revealStepRefs.slice(oldRevealRefs.length)).toEqual(
      durableLogRetryPrimaryStepRefs,
    );
  });

  it("records inherited reference help without mutating independent learner history", () => {
    const legacyOnly = {
      ...durableLogRetryPackage,
      revealStepRefs: oldRevealRefs,
      starterRevealStepRefs: oldRevealRefs,
    };
    const firstRef = oldRevealRefs[0];
    const lesson = lessons.find((candidate) => candidate.id === firstRef.lessonId)!;
    const state = createInitialState();
    const key = stepKey(firstRef.lessonId, firstRef.stepId);
    state.steps[key] = {
      ...(state.steps[key] ?? {
        answer: "unfinished",
        hints: 1,
        revealed: false,
        completed: true,
        attempts: [],
        rubricChecks: [],
        traceIndex: 0,
      }),
      code: "independent draft",
      completed: true,
    };
    const priorIndependent = recordEvidence(state, {
      id: "durable-log-retry/prior-independent",
      lessonId: lesson.id,
      stepId: "session-blank",
      conceptIds: [...lesson.conceptIds],
      kind: "assessment",
      evaluator: "tests",
      gate: true,
      passed: true,
      hints: 0,
      revealed: false,
      at: 987654,
      evidenceVersion: 1,
    });
    const before = JSON.stringify(priorIndependent);
    const next = revealProjectPackageVariant(priorIndependent, legacyOnly, lessons, "starter", 1234);
    expect(JSON.stringify(priorIndependent)).toBe(before);
    expect(next.steps[key]).toMatchObject({ code: "independent draft", completed: true, revealed: true });
    expect(next.events[0]).toEqual(priorIndependent.events[0]);
    expect(next.events.slice(1).every((event) => event.kind === "exposure" && event.revealed)).toBe(true);
    expect(next.events).toHaveLength(oldRevealRefs.length + 1);
    expect(lesson.id).toBe(firstRef.lessonId);
  });

  it("reveals the new retry family as help without manufacturing independent credit", () => {
    const next = revealProjectPackageVariant(
      createInitialState(),
      durableLogRetryPackage,
      lessons,
      "solution",
      2222,
    );
    for (const ref of durableLogRetryPrimaryStepRefs) {
      expect(next.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed).toBe(true);
    }
    expect(next.events.every((event) => event.kind === "exposure" && event.revealed)).toBe(true);
    expect(next.events.some((event) => event.kind !== "exposure")).toBe(false);
    expect(next.events.some((event) => event.kind === "exposure" && event.revealed === false)).toBe(false);
  });

  it("keeps the new starter bounded while the solution supplies the authored policy", () => {
    const starter = projectFiles(durableLogRetryPackage, "starter");
    const solution = projectFiles(durableLogRetryPackage, "solution");
    expect(starter["crates/ingest-service/src/retry_client.rs"]).toContain("TODO");
    expect(starter["crates/ingest-service/src/retry_client.rs"]).not.toContain("struct RetryClient");
    expect(solution["crates/ingest-service/src/retry_client.rs"]).toContain("struct RetryClient");
    expect(solution["crates/ingest-service/src/retry_client.rs"]).toContain("Unknown");
    expect(starter["RETRY-LAB.md"]).toContain("[uzupełnij]");
    expect(solution["RETRY-LAB.md"]).toContain("QUEUE_FULL");
  });

  it("discloses inherited assistance and license boundaries in both variants", () => {
    const starter = projectFiles(durableLogRetryPackage, "starter");
    const solution = projectFiles(durableLogRetryPackage, "solution");
    for (const variant of [starter, solution]) {
      expect(variant["RETRY-LAB.md"]).toContain("Pochodzenie i zakres licencji");
      expect(variant["RETRY-LAB.md"]).toContain("40 odziedziczonych plików");
      expect(variant["RETRY-LAB.md"]).toContain("MIT OR Apache-2.0");
      expect(variant["RETRY-LAB.md"]).toContain("MIT");
      expect(variant["RETRY-LAB.md"]).toContain("CC BY 4.0");
    }
    expect(durableLogRetryPackage.instructions.join(" ")).toContain("pobranie nie oznacza ukończenia");
  });
});
