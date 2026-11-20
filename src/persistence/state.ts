import { z } from "zod";
import type {
  Attempt,
  Diagnostic,
  EvidenceEvent,
  MasteryRecord,
  ReviewItem,
  RunResult,
  StepProgress,
  UserState,
} from "@/domain/types";

export const MAX_IMPORT_BYTES = 20_000_000;
const DEFAULT_APP_VERSION = "0.1.0";

const masteryLevels = [
  "new",
  "exposed",
  "practiced",
  "understood",
  "retained",
] as const;
const evidenceKinds = [
  "exposure",
  "prediction",
  "fix",
  "trace",
  "transfer",
  "project",
  "assessment",
  "recall",
  "self-rating",
] as const;
const runStatuses = [
  "success",
  "compile-error",
  "runtime-error",
  "test-failure",
  "timeout",
  "infrastructure-error",
] as const;
const views = [
  "dashboard",
  "course",
  "lesson",
  "review",
  "project",
  "journal",
  "settings",
] as const;

const DiagnosticSchema = z.strictObject({
  code: z.string().optional(),
  message: z.string(),
  line: z.number().int().nonnegative().optional(),
  level: z.enum(["error", "warning", "note"]),
});
const RunResultSchema = z.strictObject({
  status: z.enum(runStatuses),
  stdout: z.string(),
  stderr: z.string(),
  diagnostics: z.array(DiagnosticSchema),
  durationMs: z.number().finite().nonnegative(),
  tests: z
    .strictObject({
      passed: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    })
    .optional(),
});
const AttemptSchema = z.strictObject({
  at: z.number().finite().nonnegative(),
  answer: z.string().optional(),
  code: z.string().optional(),
  result: RunResultSchema.optional(),
  passed: z.boolean(),
  feedback: z.string(),
});
const StepProgressSchema = z.strictObject({
  code: z.string().optional(),
  answer: z.string(),
  hints: z.number().int().nonnegative(),
  revealed: z.boolean(),
  completed: z.boolean(),
  attempts: z.array(AttemptSchema),
  rubricChecks: z.array(z.string()),
  traceIndex: z.number().int().nonnegative(),
});
const EvidenceEventSchema = z.strictObject({
  id: z.string().min(1),
  conceptIds: z.array(z.string()),
  lessonId: z.string(),
  stepId: z.string(),
  kind: z.enum(evidenceKinds),
  passed: z.boolean(),
  hints: z.number().int().nonnegative(),
  revealed: z.boolean(),
  at: z.number().finite().nonnegative(),
  evidenceVersion: z.number().int().positive().optional(),
  delayed: z.boolean().optional(),
  gate: z.boolean().optional(),
  evaluator: z
    .enum([
      "exact-output",
      "compilation",
      "expected-error",
      "tests",
      "answer",
      "choice",
      "ordering",
      "rubric",
      "manifest-contract",
    ])
    .optional(),
});
const MasteryRecordSchema = z.strictObject({
  level: z.enum(masteryLevels),
  reason: z.string(),
  updatedAt: z.number().finite().nonnegative(),
});
const ReviewItemSchema = z.strictObject({
  conceptId: z.string(),
  dueAt: z.number().finite().nonnegative(),
  intervalDays: z.number().finite().nonnegative(),
  attempts: z.number().int().nonnegative(),
  reason: z.string(),
  lastReviewedAt: z.number().finite().nonnegative().optional(),
});
const RatingSchema = z.strictObject({
  conceptId: z.string(),
  rating: z.enum(["again", "hard", "good", "easy"]),
  at: z.number().finite().nonnegative(),
});
// Older strict-v3 binaries do not read exerciseId and may reject this field;
// this additive contract makes no rollback compatibility claim.
const ReviewSessionSchema = z.strictObject({
  conceptId: z.string(),
  mode: z.enum(["card", "challenge"]),
  sessionId: z.string().min(1),
  startedAt: z.number().finite().nonnegative(),
  wasDue: z.boolean(),
  exerciseId: z.string().min(1).optional(),
  ratingCountAtStart: z.number().int().nonnegative().optional(),
});
const UserStateFields = {
  appVersion: z.string(),
  updatedAt: z.number().finite().nonnegative(),
  onboarding: z.strictObject({
    completed: z.boolean(),
    name: z.string(),
    minutes: z.number().int().positive(),
  }),
  diagnostic: z.strictObject({
    completed: z.boolean(),
    answers: z.record(z.string(), z.string()),
    score: z.number().finite(),
    recommendation: z.string(),
  }),
  routePreference: z.string().optional(),
  resume: z.strictObject({
    view: z.enum(views),
    lessonId: z.string(),
    stepIndex: z.number().int().nonnegative(),
    panel: z.enum(["lesson", "code", "output"]),
    focus: z.boolean(),
  }),
  steps: z.record(z.string(), StepProgressSchema),
  events: z.array(EvidenceEventSchema),
  mastery: z.record(z.string(), MasteryRecordSchema),
  review: z.array(ReviewItemSchema),
  reviewSession: ReviewSessionSchema.optional(),
  notes: z.record(z.string(), z.string()),
  bookmarks: z.array(z.string()),
  ratings: z.array(RatingSchema),
  settings: z.strictObject({
    theme: z.enum(["light", "dark"]),
    editorFontSize: z.number().int().min(8).max(40),
    accessibleEditor: z.boolean(),
  }),
};
const UserStateSchema = z.strictObject({
  schemaVersion: z.literal(3),
  ...UserStateFields,
});

// V2 is retained only as an input validator. Its onboarding background is
// intentionally discarded when the record is upgraded to the current shape.
const LegacyV2StateSchema = z.strictObject({
  schemaVersion: z.literal(2),
  ...UserStateFields,
  onboarding: z.strictObject({
    completed: z.boolean(),
    name: z.string(),
    background: z.enum(["java", "python", "both"]),
    minutes: z.number().int().positive(),
  }),
});

// V1 kept the same user-facing collections but did not persist the v2 resume panel/focus,
// editor font size, ratings, or optional evidence flags. This explicit shape is the migration contract.
const LegacyStepProgressSchema = z.strictObject({
  code: z.string().optional(),
  answer: z.string().optional(),
  hints: z.number().int().nonnegative().optional(),
  revealed: z.boolean().optional(),
  completed: z.boolean().optional(),
  attempts: z.array(AttemptSchema).optional(),
  rubricChecks: z.array(z.string()).optional(),
  traceIndex: z.number().int().nonnegative().optional(),
});
const LegacySchema = z.strictObject({
  schemaVersion: z.literal(1),
  appVersion: z.string().optional(),
  updatedAt: z.number().finite().nonnegative().optional(),
  onboarding: z
    .strictObject({
      completed: z.boolean().optional(),
      name: z.string().optional(),
      background: z.enum(["java", "python", "both"]).optional(),
      minutes: z.number().int().positive().optional(),
    })
    .optional(),
  diagnostic: z
    .strictObject({
      completed: z.boolean().optional(),
      answers: z.record(z.string(), z.string()).optional(),
      score: z.number().finite().optional(),
      recommendation: z.string().optional(),
    })
    .optional(),
  resume: z
    .strictObject({
      view: z.enum(views).optional(),
      lessonId: z.string().optional(),
      stepIndex: z.number().int().nonnegative().optional(),
      panel: z.enum(["lesson", "code", "output"]).optional(),
      focus: z.boolean().optional(),
    })
    .optional(),
  steps: z.record(z.string(), LegacyStepProgressSchema).optional(),
  events: z.array(EvidenceEventSchema).optional(),
  mastery: z.record(z.string(), MasteryRecordSchema).optional(),
  review: z.array(ReviewItemSchema).optional(),
  reviewSession: ReviewSessionSchema.optional(),
  notes: z.record(z.string(), z.string()).optional(),
  bookmarks: z.array(z.string()).optional(),
  ratings: z.array(RatingSchema).optional(),
  settings: z
    .strictObject({
      theme: z.enum(["light", "dark"]).optional(),
      editorFontSize: z.number().int().min(8).max(40).optional(),
      accessibleEditor: z.boolean().optional(),
    })
    .optional(),
});

function hasDangerousKey(value: unknown, path = "$"): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = hasDangerousKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return undefined;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key.length > 256) return `${path}.[key]`;
    if (key === "__proto__" || key === "prototype" || key === "constructor")
      return `${path}.${key}`;
    const found = hasDangerousKey(child, `${path}.${key}`);
    if (found) return found;
  }
  return undefined;
}

export function createStepProgress(code?: string): StepProgress {
  return {
    ...(code === undefined ? {} : { code }),
    answer: "",
    hints: 0,
    revealed: false,
    completed: false,
    attempts: [],
    rubricChecks: [],
    traceIndex: 0,
  };
}

export function stepKey(lessonId: string, stepId: string): string {
  return `${lessonId}:${stepId}`;
}

export function createInitialState(): UserState {
  return {
    schemaVersion: 3,
    appVersion: DEFAULT_APP_VERSION,
    updatedAt: Date.now(),
    onboarding: { completed: false, name: "", minutes: 15 },
    diagnostic: { completed: false, answers: {}, score: 0, recommendation: "" },
    routePreference: "core",
    resume: {
      view: "dashboard",
      lessonId: "first-program",
      stepIndex: 0,
      panel: "lesson",
      focus: false,
    },
    steps: {},
    events: [],
    mastery: {},
    review: [],
    notes: {},
    bookmarks: [],
    ratings: [],
    settings: { theme: "light", editorFontSize: 16, accessibleEditor: false },
  };
}

function parseCurrent(input: unknown): UserState | undefined {
  const parsed = UserStateSchema.safeParse(input);
  return parsed.success
    ? { ...parsed.data, routePreference: parsed.data.routePreference ?? "core" }
    : undefined;
}

type LegacyOnboarding = {
  completed?: boolean;
  name?: string;
  minutes?: number;
};

function migrateOnboarding(
  onboarding: LegacyOnboarding | undefined,
  initial: UserState["onboarding"],
): UserState["onboarding"] {
  return {
    completed: onboarding?.completed ?? initial.completed,
    name: onboarding?.name ?? initial.name,
    minutes: onboarding?.minutes ?? initial.minutes,
  };
}

export function migrateState(input: unknown): UserState {
  const dangerous = hasDangerousKey(input);
  if (dangerous)
    throw new Error(`Stan zawiera niedozwolony klucz w ${dangerous}`);
  const current = parseCurrent(input);
  if (current) return current;
  const legacyV2 = LegacyV2StateSchema.safeParse(input);
  const legacyV1 = LegacySchema.safeParse(input);
  let old: z.infer<typeof LegacyV2StateSchema> | z.infer<typeof LegacySchema>;
  if (legacyV2.success) {
    old = legacyV2.data;
  } else if (legacyV1.success) {
    old = legacyV1.data;
  } else {
    const version =
      typeof input === "object" && input !== null && "schemaVersion" in input
        ? String((input as { schemaVersion?: unknown }).schemaVersion)
        : "missing";
    throw new Error(
      `Nieobsługiwany lub nieprawidłowy schemat stanu (wersja ${version})`,
    );
  }
  const initial = createInitialState();
  return {
    ...initial,
    appVersion: old.appVersion ?? initial.appVersion,
    updatedAt: old.updatedAt ?? initial.updatedAt,
    routePreference:
      "routePreference" in old
        ? (old.routePreference ?? initial.routePreference)
        : initial.routePreference,
    onboarding: migrateOnboarding(old.onboarding, initial.onboarding),
    diagnostic: { ...initial.diagnostic, ...old.diagnostic },
    resume: { ...initial.resume, ...old.resume },
    steps: Object.fromEntries(
      Object.entries(old.steps ?? {}).map(([key, progress]) => [
        key,
        {
          ...createStepProgress(progress.code),
          ...progress,
          answer: progress.answer ?? "",
          hints: progress.hints ?? 0,
          revealed: progress.revealed ?? false,
          completed: progress.completed ?? false,
          attempts: progress.attempts ?? [],
          rubricChecks: progress.rubricChecks ?? [],
          traceIndex: progress.traceIndex ?? 0,
        },
      ]),
    ),
    events: old.events ?? [],
    mastery: old.mastery ?? {},
    review: old.review ?? [],
    ...(old.reviewSession ? { reviewSession: old.reviewSession } : {}),
    notes: old.notes ?? {},
    bookmarks: old.bookmarks ?? [],
    ratings: old.ratings ?? [],
    settings: { ...initial.settings, ...old.settings },
  };
}

export function exportState(state: UserState): string {
  const checked = migrateState(state);
  return JSON.stringify({
    schemaVersion: 3,
    appVersion: checked.appVersion,
    exportedAt: new Date().toISOString(),
    state: checked,
  });
}

export function importState(text: string): UserState {
  if (
    typeof text !== "string" ||
    new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES
  )
    throw new Error("Import jest zbyt duży");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Import nie zawiera poprawnego JSON");
  }
  const dangerous = hasDangerousKey(parsed);
  if (dangerous)
    throw new Error(`Import zawiera niedozwolony klucz w ${dangerous}`);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Import musi być kopertą stanu");
  const envelope = parsed as Record<string, unknown>;
  if (
    "schemaVersion" in envelope &&
    envelope.schemaVersion !== 2 &&
    envelope.schemaVersion !== 1 &&
    envelope.schemaVersion !== 3
  )
    throw new Error(
      `Nieobsługiwana wersja schematu importu: ${String(envelope.schemaVersion)}`,
    );
  const keys = Object.keys(envelope).sort();
  if (keys.join(",") !== "appVersion,exportedAt,schemaVersion,state")
    throw new Error("Koperta importu ma nieznane albo brakujące pola");
  if (
    typeof envelope.appVersion !== "string" ||
    typeof envelope.exportedAt !== "string"
  )
    throw new Error("Metadane importu są nieprawidłowe");
  if (
    envelope.appVersion.length > 256 ||
    Number.isNaN(Date.parse(envelope.exportedAt)) ||
    !/^\d{4}-\d{2}-\d{2}T/.test(envelope.exportedAt)
  )
    throw new Error(
      "Metadane importu muszą zawierać poprawną datę ISO i ograniczoną wersję aplikacji",
    );
  const importedState = envelope.state;
  const stateVersion =
    importedState &&
    typeof importedState === "object" &&
    !Array.isArray(importedState) &&
    "schemaVersion" in importedState
      ? (importedState as { schemaVersion?: unknown }).schemaVersion
      : undefined;
  if (stateVersion !== envelope.schemaVersion)
    throw new Error("Wersja koperty importu nie pasuje do wersji stanu");
  return migrateState(importedState);
}

export type {
  Attempt,
  Diagnostic,
  EvidenceEvent,
  MasteryRecord,
  ReviewItem,
  RunResult,
};
