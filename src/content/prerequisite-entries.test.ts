import { describe, expect, it } from "vitest";
import {
  CORE_MODULE_IDS,
  EXTENSION_GROUPS,
  modulesForMode,
} from "@/engine/course-route";
import { modules, lessons, concepts } from "./course";
import {
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
    for (const prerequisite of graph.get(current) ?? []) {
      if (result.has(prerequisite)) continue;
      result.add(prerequisite);
      visit(prerequisite);
    }
  };
  visit(id);
  return result;
}

function expectAcyclic(graph: Map<string, readonly string[]>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of graph.get(id) ?? []) visit(prerequisite);
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

      for (const prerequisite of [
        ...spec.modulePrerequisites,
        ...spec.lessonPrerequisites,
        ...spec.conceptPrerequisites,
      ]) {
        expect(
          moduleMap.has(prerequisite) ||
            lessonMap.has(prerequisite) ||
            conceptMap.has(prerequisite),
        ).toBe(true);
      }
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

  it("preserves the Core17/Extensions31 catalog and an existing advanced resume", () => {
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
    state.routePreference = "extensions";
    state.resume = {
      view: "lesson",
      lessonId: "future-laziness",
      stepIndex: 3,
      panel: "code",
      focus: true,
    };
    const restored = importState(exportState(state));
    expect(restored.routePreference).toBe("extensions");
    expect(restored.resume).toEqual(state.resume);
    expect(restored.schemaVersion).toBe(3);
  });
});
