import { describe, expect, it } from "vitest";
import {
  CORE_MODULE_IDS,
  EXTENSION_GROUPS,
  modulesForMode,
} from "@/engine/course-route";
import { modules, lessons, concepts } from "./course";
import {
  createStepProgress,
  exportState,
  importState,
  createInitialState,
} from "../persistence/state";

const entrySpecs = [
  {
    moduleId: "public-api-workspaces",
    lessonId: "api-validated-construction",
    conceptId: "api-validated-construction",
    modulePrerequisites: ["testing-quality", "traits", "modules-cargo"],
    lessonPrerequisites: [
      "testing-quality-workflow",
      "checked-conversions",
      "cargo-package-integration",
    ],
    conceptPrerequisites: [
      "testing-quality-workflow",
      "checked-conversion-errors",
      "visibility-boundaries",
    ],
    removedTopics: [
      "tokio-network-service",
      "tokio-admission-lifecycle",
      "tokio-admission-permit-lifetime",
    ],
  },
  {
    moduleId: "mini-grep",
    lessonId: "grep-context-selection",
    conceptId: "grep-context-selection",
    modulePrerequisites: ["log-analyzer"],
    lessonPrerequisites: ["log-analyzer-project"],
    conceptPrerequisites: ["log-deterministic-report"],
    removedTopics: ["public-api-workspaces", "api-compatible-surface"],
  },
  {
    moduleId: "service-operations",
    lessonId: "service-trust-admission",
    conceptId: "service-operations-bounded-admission",
    modulePrerequisites: ["tokio-network-service"],
    lessonPrerequisites: ["tokio-admission-lifecycle"],
    conceptPrerequisites: ["tokio-admission-permit-lifetime"],
    removedTopics: ["unsafe-ffi-contracts", "unsafe-ffi-owned-handle"],
  },
  {
    moduleId: "async-foundations",
    lessonId: "future-laziness",
    conceptId: "future-laziness",
    modulePrerequisites: ["shared-ownership", "closures"],
    lessonPrerequisites: ["weak-links", "closure-contracts"],
    conceptPrerequisites: ["weak-links", "callable-contracts"],
    removedTopics: ["memory-ordering", "loom-evidence"],
  },
] as const;

function transitivePrerequisites(
  id: string,
  graph: Map<string, readonly string[]>,
): Set<string> {
  const result = new Set<string>();
  const visit = (current: string) => {
    for (const prerequisite of graph.get(current)!) {
      if (result.has(prerequisite)) continue;
      result.add(prerequisite);
      visit(prerequisite);
    }
  };
  visit(id);
  return result;
}

function expectKnownGraphTargets(
  graph: Map<string, readonly string[]>,
  graphName: string,
) {
  for (const [id, prerequisites] of graph) {
    for (const prerequisite of prerequisites) {
      expect(
        graph.has(prerequisite),
        `${graphName} edge ${id} -> ${prerequisite} must target its namespace`,
      ).toBe(true);
    }
  }
}

function expectAcyclic(graph: Map<string, readonly string[]>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of graph.get(id)!) visit(prerequisite);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of graph.keys()) visit(id);
}

describe("extension entry prerequisite graph", () => {
  it("uses real capability prerequisites at all three graph levels", () => {
    const moduleMap = new Map(modules.map((module) => [module.id, module]));
    const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const conceptMap = new Map(
      concepts.map((concept) => [concept.id, concept]),
    );

    for (const spec of entrySpecs) {
      expect(moduleMap.get(spec.moduleId)?.prerequisites).toEqual(
        spec.modulePrerequisites,
      );
      expect(lessonMap.get(spec.lessonId)?.prerequisites).toEqual(
        spec.lessonPrerequisites,
      );
      expect(conceptMap.get(spec.conceptId)?.prerequisites).toEqual(
        spec.conceptPrerequisites,
      );

      for (const prerequisite of spec.modulePrerequisites)
        expect(moduleMap.has(prerequisite)).toBe(true);
      for (const prerequisite of spec.lessonPrerequisites)
        expect(lessonMap.has(prerequisite)).toBe(true);
      for (const prerequisite of spec.conceptPrerequisites)
        expect(conceptMap.has(prerequisite)).toBe(true);
    }
  });

  it("keeps all three graphs acyclic and removes each accidental topic transitively", () => {
    const moduleGraph = new Map(
      modules.map((module) => [module.id, module.prerequisites] as const),
    );
    const lessonGraph = new Map(
      lessons.map((lesson) => [lesson.id, lesson.prerequisites] as const),
    );
    const conceptGraph = new Map(
      concepts.map((concept) => [concept.id, concept.prerequisites] as const),
    );

    expectKnownGraphTargets(moduleGraph, "module");
    expectKnownGraphTargets(lessonGraph, "lesson");
    expectKnownGraphTargets(conceptGraph, "concept");
    expectAcyclic(moduleGraph);
    expectAcyclic(lessonGraph);
    expectAcyclic(conceptGraph);

    for (const spec of entrySpecs) {
      const reachable = new Set([
        ...transitivePrerequisites(spec.moduleId, moduleGraph),
        ...transitivePrerequisites(spec.lessonId, lessonGraph),
        ...transitivePrerequisites(spec.conceptId, conceptGraph),
      ]);
      for (const removedTopic of spec.removedTopics)
        expect(
          reachable.has(removedTopic),
          `${spec.moduleId} -> ${removedTopic}`,
        ).toBe(false);
    }
  });

  it("preserves the Core17/Extensions31 catalog and a historical advanced resume", () => {
    expect(CORE_MODULE_IDS).toEqual([
      "rust-foundations",
      "loops-control",
      "ownership",
      "data-modeling",
      "collections",
      "error-handling",
      "todo-project",
      "modules-cargo",
      "todo-io",
      "generics",
      "traits",
      "lifetimes",
      "closures",
      "iterators",
      "testing-quality",
      "number-guessing-plus",
      "log-analyzer",
    ]);
    expect(modulesForMode("core", modules)).toHaveLength(17);
    expect(modulesForMode("extensions", modules)).toHaveLength(31);
    expect(
      new Set(EXTENSION_GROUPS.flatMap((group) => group.moduleIds)),
    ).toHaveLength(31);

    const state = createInitialState();
    const resumeLesson = lessons.find(
      (lesson) => lesson.id === "future-laziness",
    );
    expect(resumeLesson).toBeDefined();
    const resumeStep = resumeLesson!.steps[3];
    expect(resumeStep.id).toBe("future-laziness-deferred-gate");
    state.resume = {
      view: "lesson",
      lessonId: "future-laziness",
      stepIndex: 3,
      panel: "code",
      focus: true,
    };
    state.steps["future-laziness:future-laziness-deferred-gate"] = {
      ...createStepProgress(resumeStep.code),
      answer: "Przeniosę efekt do body future.",
      hints: 1,
      revealed: true,
      attempts: [
        {
          at: 42,
          code: "fn deferred_note() {}",
          passed: false,
          feedback: "Efekt nadal zachodzi za wcześnie.",
        },
      ],
      rubricChecks: ["future-laziness"],
      traceIndex: 1,
    };
    state.events = [
      {
        id: "future-laziness-historical-evidence",
        conceptIds: ["future-laziness"],
        lessonId: "future-laziness",
        stepId: resumeStep.id,
        kind: "fix",
        passed: true,
        hints: 1,
        revealed: true,
        at: 43,
        evaluator: "tests",
      },
    ];
    state.mastery = {
      "future-laziness": {
        level: "practiced",
        reason: "fix",
        updatedAt: 44,
      },
    };
    state.review = [
      {
        conceptId: "future-laziness",
        dueAt: 100,
        intervalDays: 2,
        attempts: 1,
        reason: "fix",
        lastReviewedAt: 45,
      },
    ];
    state.notes.future = "Zachować kolejność obserwacji poll.";
    state.bookmarks = ["future-laziness:future-laziness-deferred-gate"];
    state.ratings = [{ conceptId: "future-laziness", rating: "good", at: 46 }];
    state.reviewSession = {
      conceptId: "future-laziness",
      mode: "card",
      sessionId: "historical-future-session",
      startedAt: 47,
      wasDue: true,
    };

    expect(resumeLesson!.steps[state.resume.stepIndex].id).toBe(resumeStep.id);
    const exported = JSON.parse(exportState(state)) as {
      state: Record<string, unknown>;
    };
    delete exported.state.routePreference;
    const restored = importState(JSON.stringify(exported));
    expect(restored.routePreference).toBe("core");
    expect(restored.resume).toEqual(state.resume);
    expect(
      restored.steps["future-laziness:future-laziness-deferred-gate"],
    ).toEqual(state.steps["future-laziness:future-laziness-deferred-gate"]);
    expect(restored.events).toEqual(state.events);
    expect(restored.mastery).toEqual(state.mastery);
    expect(restored.review).toEqual(state.review);
    expect(restored.notes).toEqual(state.notes);
    expect(restored.bookmarks).toEqual(state.bookmarks);
    expect(restored.ratings).toEqual(state.ratings);
    expect(restored.reviewSession).toEqual(state.reviewSession);
    expect(restored.schemaVersion).toBe(3);
  });
});
