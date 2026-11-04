import { describe, expect, it } from "vitest";
import { modules, lessons } from "@/content/course";
import {
  CORE_MODULE_IDS,
  EXTENSION_GROUPS,
  mapModeForModule,
  modulesForMode,
  nextLessonForNavigation,
  normalizeMapPreference,
  recommendedModuleIds,
} from "./course-route";

describe("course route", () => {
  it("covers the current 50-module catalog once, with the exact core order", () => {
    const core = CORE_MODULE_IDS as readonly string[];
    const extensionGroups = EXTENSION_GROUPS.flatMap(
      (group) => group.moduleIds,
    );
    const all = [...core, ...extensionGroups];

    expect(core).toEqual([
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
    expect(EXTENSION_GROUPS.map((group) => group.moduleIds)).toEqual([
      [
        "borrowed-callbacks",
        "gat-lending-iterators",
        "boxed-values",
        "shared-ownership",
        "async-lending-contracts",
      ],
      [
        "threads",
        "channels",
        "synchronized-state",
        "atomic-state",
        "memory-ordering",
        "async-foundations",
        "tokio-runtime-tasks",
        "tokio-flow-control",
        "tokio-io-streams",
        "tokio-blocking-work",
        "tokio-network-service",
        "service-operations",
        "capstone-integration",
        "service-client-retry",
        "service-authorization",
      ],
      [
        "public-api-workspaces",
        "cargo-dependency-lifecycle",
        "dependency-assurance",
        "api-release-matrix",
        "macros-as-api",
      ],
      [
        "mini-grep",
        "property-contracts",
        "fuzz-evidence-lifecycle",
        "performance-evidence",
        "profile-evidence",
        "unsafe-ffi-contracts",
        "unsafe-miri-contracts",
        "unsafe-borrowed-memory-soundness",
      ],
    ]);
    expect(all).toHaveLength(50);
    expect(new Set(all).size).toBe(50);
    expect(modules.map((module) => module.id).sort()).toEqual([...all].sort());
  });

  it("filters modes without changing authored catalog order", () => {
    expect(modulesForMode("core", modules).map((module) => module.id)).toEqual(
      CORE_MODULE_IDS,
    );
    expect(modulesForMode("extensions", modules)).toHaveLength(33);
    expect(modulesForMode("all", modules)).toEqual(modules);
    expect(mapModeForModule("shared-ownership")).toBe("extensions");
    expect(mapModeForModule("log-analyzer")).toBe("core");
    expect(recommendedModuleIds("shared-ownership")).toEqual([
      "borrowed-callbacks",
      "gat-lending-iterators",
      "boxed-values",
    ]);
  });

  it("falls back only the optional map preference", () => {
    expect(normalizeMapPreference(undefined)).toBe("core");
    expect(normalizeMapPreference("unknown-import-value")).toBe("core");
    expect(normalizeMapPreference("extensions")).toBe("extensions");
  });

  it("keeps core navigation in route order and stops at Log Analyzer", () => {
    const firstCoreLesson = lessons.find(
      (lesson) => lesson.moduleId === "rust-foundations",
    )!;
    const firstFoundationsModule = modules.find(
      (module) => module.id === "rust-foundations",
    )!;
    const lastFoundationsLesson = lessons.find(
      (lesson) => lesson.id === firstFoundationsModule.lessonIds.at(-1),
    )!;
    const next = nextLessonForNavigation(
      lastFoundationsLesson.id,
      lessons,
      modules,
    );
    expect(next?.moduleId).toBe("loops-control");
    expect(
      nextLessonForNavigation(
        lessons.find(
          (lesson) =>
            lesson.moduleId === "log-analyzer" &&
            lesson.id ===
              modules
                .find((module) => module.id === "log-analyzer")!
                .lessonIds.at(-1),
        )!.id,
        lessons,
        modules,
      ),
    ).toBeNull();
    expect(
      nextLessonForNavigation(firstCoreLesson.id, lessons, modules)?.moduleId,
    ).toBe("rust-foundations");
  });

  it("keeps extension navigation within its authored module", () => {
    const sharedModule = modules.find(
      (item) => item.id === "shared-ownership",
    )!;
    const first = lessons.find(
      (lesson) => lesson.id === sharedModule.lessonIds[0],
    )!;
    const last = lessons.find(
      (lesson) => lesson.id === sharedModule.lessonIds.at(-1),
    )!;
    expect(nextLessonForNavigation(first.id, lessons, modules)?.moduleId).toBe(
      sharedModule.id,
    );
    expect(nextLessonForNavigation(last.id, lessons, modules)).toBeNull();
  });
});
