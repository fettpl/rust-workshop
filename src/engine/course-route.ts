import type { CourseModule, Lesson } from "@/domain/types";

export const CORE_MODULE_IDS = [
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
] as const;

export const EXTENSION_GROUPS = [
  {
    id: "language-ownership-abstraction",
    title: "Język, ownership i abstrakcja",
    moduleIds: [
      "borrowed-callbacks",
      "gat-lending-iterators",
      "boxed-values",
      "shared-ownership",
      "async-lending-contracts",
    ],
  },
  {
    id: "concurrency-services",
    title: "Współbieżność i usługi",
    moduleIds: [
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
    ],
  },
  {
    id: "libraries-cargo-api",
    title: "Biblioteki, Cargo i API",
    moduleIds: [
      "public-api-workspaces",
      "cargo-dependency-lifecycle",
      "dependency-assurance",
      "api-release-matrix",
      "macros-as-api",
    ],
  },
  {
    id: "testing-performance-safety",
    title: "Testowanie, wydajność i bezpieczeństwo",
    moduleIds: [
      "mini-grep",
      "property-contracts",
      "fuzz-evidence-lifecycle",
      "performance-evidence",
      "profile-evidence",
      "unsafe-ffi-contracts",
      "unsafe-miri-contracts",
      "unsafe-borrowed-memory-soundness",
    ],
  },
] as const;

export type CourseMapMode = "core" | "extensions" | "all";

export const COURSE_MAP_MODES: readonly {
  id: CourseMapMode;
  label: string;
  description: string;
}[] = [
  {
    id: "core",
    label: "Podstawy",
    description:
      "Core17: początkujący rdzeń do Log Analyzera. Oryginalny zakres obejmuje też Mini grep, wątki z Arc/Mutex i własny projekt końcowy.",
  },
  {
    id: "extensions",
    label: "Rozszerzenia",
    description:
      "Dalsze moduły według problemów. Oryginalna kontynuacja: Mini grep oraz Box → Rc/Weak → wątki → kanały → Arc/Mutex; pozostałe specjalizacje wybierasz.",
  },
  {
    id: "all",
    label: "Cały kurs",
    description: "Wszystkie moduły w pełnej kolejności katalogu.",
  },
];

const coreIds = new Set<string>(CORE_MODULE_IDS);
const extensionIds = new Set<string>(
  EXTENSION_GROUPS.flatMap((group) => group.moduleIds),
);

export function normalizeMapPreference(value: unknown): CourseMapMode {
  return value === "extensions" || value === "all" || value === "core"
    ? value
    : "core";
}

export function mapModeForModule(moduleId: string): CourseMapMode {
  return coreIds.has(moduleId)
    ? "core"
    : extensionIds.has(moduleId)
      ? "extensions"
      : "all";
}

export function recommendedModuleIds(moduleId: string): string[] {
  const group = EXTENSION_GROUPS.find((item) =>
    (item.moduleIds as readonly string[]).includes(moduleId),
  );
  return group
    ? group.moduleIds.filter((candidate) => candidate !== moduleId).slice(0, 3)
    : [];
}

export function modulesForMode<T extends Pick<CourseModule, "id">>(
  mode: CourseMapMode,
  catalog: readonly T[],
): T[] {
  if (mode === "all") return [...catalog];
  const ids =
    mode === "core"
      ? CORE_MODULE_IDS
      : EXTENSION_GROUPS.flatMap((group) => group.moduleIds);
  const byId = new Map(catalog.map((candidate) => [candidate.id, candidate]));
  return ids.flatMap((id) => {
    const candidate = byId.get(id);
    return candidate ? [candidate] : [];
  });
}

export function nextLessonForNavigation(
  lessonId: string,
  catalog: readonly Lesson[],
  moduleCatalog: readonly Pick<CourseModule, "id" | "lessonIds">[],
): Lesson | null {
  const currentLesson = catalog.find((lesson) => lesson.id === lessonId);
  if (!currentLesson) return null;
  const currentModule = moduleCatalog.find(
    (module) => module.id === currentLesson.moduleId,
  );
  if (!currentModule) return null;
  const currentIndex = currentModule.lessonIds.indexOf(lessonId);
  if (currentIndex < 0) return null;
  const inModule = catalog.find(
    (lesson) => lesson.id === currentModule.lessonIds[currentIndex + 1],
  );
  if (inModule) return inModule;
  if (!coreIds.has(currentModule.id)) return null;
  const routeIndex = CORE_MODULE_IDS.indexOf(
    currentModule.id as (typeof CORE_MODULE_IDS)[number],
  );
  const nextModuleId = CORE_MODULE_IDS[routeIndex + 1];
  if (!nextModuleId) return null;
  const nextModule = moduleCatalog.find((module) => module.id === nextModuleId);
  const nextLessonId = nextModule?.lessonIds[0];
  return nextLessonId
    ? (catalog.find((lesson) => lesson.id === nextLessonId) ?? null)
    : null;
}
