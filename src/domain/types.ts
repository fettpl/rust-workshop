import type { ManifestContract } from "./manifest";

export type MasteryLevel =
  "new" | "exposed" | "practiced" | "understood" | "retained";
export type EvidenceKind =
  | "exposure"
  | "prediction"
  | "fix"
  | "trace"
  | "transfer"
  | "project"
  | "assessment"
  | "recall"
  | "self-rating";
export type RunStatus =
  | "success"
  | "compile-error"
  | "runtime-error"
  | "test-failure"
  | "timeout"
  | "infrastructure-error";
export interface Diagnostic {
  code?: string;
  message: string;
  line?: number;
  level: "error" | "warning" | "note";
}
export interface RunResult {
  status: RunStatus;
  stdout: string;
  stderr: string;
  diagnostics: Diagnostic[];
  durationMs: number;
  tests?: { passed: number; failed: number };
}
export interface RunRequest {
  code: string;
  mode: "run" | "test";
  tests?: string;
}
export interface RustRunner {
  run(request: RunRequest): Promise<RunResult>;
}
export interface Source {
  id: string;
  title: string;
  url: string;
  classification: "stable" | "dynamic" | "versioned";
  reviewedAt: string;
  recheckPolicy: string;
}
export interface Concept {
  id: string;
  title: string;
  prerequisites: string[];
  competencyIds: string[];
  reviewPrompt: string;
  reviewAnswer: string;
  distinguish: string;
  evidenceArtifact?: "rust-code" | "manifest";
  evidenceCalibration?: { version: number; minimumCodingTasks: number };
}
export interface Competency {
  id: string;
  title: string;
}
export interface TraceFrame {
  line: number;
  explanation: string;
  stack: {
    name: string;
    value: string;
    state:
      "owner" | "copied" | "moved" | "shared" | "mutable" | "weak" | "dropped";
  }[];
  heap: {
    id: string;
    value: string;
    owner: string;
    dropped?: boolean;
    valueDropped?: boolean;
    /** Visible handles in the teaching model, not allocator internals. */
    strongHandles?: number;
    weakHandles?: number;
  }[];
}
export interface Trace {
  title: string;
  code: string;
  frames: TraceFrame[];
}
export type Evaluator =
  | {
      kind: "exact-output";
      expected: string;
      requiredPatterns?: string[];
      forbiddenPatterns?: string[];
    }
  | { kind: "compilation" }
  | { kind: "expected-error"; code?: string; diagnostic?: string }
  | { kind: "tests"; tests: string; forbiddenPatterns?: string[] }
  | { kind: "answer"; accepted: string[]; feedback: string }
  | { kind: "choice"; correct: string; explanations: Record<string, string> }
  | { kind: "ordering"; correct: string[] }
  | { kind: "rubric"; criteria: string[] }
  | { kind: "manifest-contract"; contract: ManifestContract };
export type StepKind =
  | "predict"
  | "run"
  | "observe"
  | "explain"
  | "modify"
  | "debug"
  | "recall"
  | "apply"
  | "trace"
  | "blank"
  | "assessment";
export interface StepEvidenceDefinition {
  version: number;
  conceptIds: string[];
  codingTaskId?: string;
}
export interface LessonStep {
  evidence?: StepEvidenceDefinition;
  id: string;
  kind: StepKind;
  reviewPurpose?: "practice-probe";
  title: string;
  prompt: string;
  code?: string;
  solution?: string;
  hints?: [string, string];
  explanation?: string;
  choices?: { id: string; label: string }[];
  evaluator?: Evaluator;
  evidenceKind: EvidenceKind;
  evidenceGate?: boolean;
  traceId?: string;
  rubric?: string[];
  expectedStatus?: RunStatus;
  expectedError?: string;
  /** Authored compiler message fragment when rustc emits no stable E-code. */
  expectedDiagnostic?: string;
  /** Maintainer-only compiler selection for repository-authored fixtures, never a runner request. */
  trustedFixtureTarget?:
    "rustc-2024" | "cargo-tokio-runtime-1.54.1" | "cargo-tokio-runtime-1.53.1";
  editorMode?: "rust" | "toml";
  editorFile?: string;
}
export interface Lesson {
  /** Optional authoring role for ungated practice lessons; when present it must be true. */
  practiceOnly?: true;
  id: string;
  moduleId: string;
  conceptIds: string[];
  competencyIds: string[];
  prerequisites: string[];
  title: string;
  subtitle: string;
  /** Optional author estimate; new lessons may omit duration rather than invent one. */
  minutes?: number;
  outcomes: string[];
  steps: LessonStep[];
  misconceptions: string[];
  transferTask: string;
  evidenceGate: string;
  sourceIds: string[];
  sessionStops?: Array<{
    afterStepId: string;
    title: string;
    nextGoal: string;
  }>;
}
export interface ModuleGateTaskRef {
  lessonId: string;
  stepId: string;
}
export interface ModuleGateCriterion {
  id: string;
  label: string;
  taskRefs: ModuleGateTaskRef[];
  supplementaryStepRefs?: ModuleGateTaskRef[];
  requiredIndependentCodingTasks?: number;
}
export interface CourseModule {
  id: string;
  title: string;
  whyItMatters: string;
  capabilities: string[];
  prerequisites: string[];
  lessonIds: string[];
  exitGate: string[];
  projectConnection: string;
  assessmentId: string;
  gateCriteria?: ModuleGateCriterion[];
}
export interface ProjectInstructionCard {
  title: string;
  summary?: string;
  points: string[];
  followUp?: ProjectInstructionCard;
}
export interface ProjectContract {
  id: string;
  lessonIds?: string[];
  reviewConceptIds?: string[];
  title: string;
  objective: string;
  requiredBehaviors: string[];
  requiredEvidence: string[];
  constraints: string[];
  lessonId: string;
  adversarialLessonId: string;
  adversarialInject: string;
  retrospective: string[];
  learnerInstruction?: ProjectInstructionCard;
  package?: ProjectPackage;
}
export interface ProjectPackage {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  /** Authored virtual-workspace layout; actual manifest membership is checked by Cargo. */
  workspaceMembers?: string[];
  revealStepRefs: ModuleGateTaskRef[];
  starterRevealStepRefs?: ModuleGateTaskRef[];
  files: {
    path: string;
    starter: string;
    solution?: string;
  }[];
}
export interface EvidenceEvent {
  id: string;
  conceptIds: string[];
  lessonId: string;
  stepId: string;
  kind: EvidenceKind;
  passed: boolean;
  hints: number;
  revealed: boolean;
  at: number;
  evidenceVersion?: number;
  delayed?: boolean;
  gate?: boolean;
  evaluator?: Evaluator["kind"];
}
export interface LessonExposure {
  conceptIds: string[];
  lessonId: string;
  stepId: string;
  at: number;
  revealed?: boolean;
}
export interface MasteryRecord {
  level: MasteryLevel;
  reason: string;
  updatedAt: number;
}
export interface ReviewItem {
  conceptId: string;
  dueAt: number;
  intervalDays: number;
  attempts: number;
  reason: string;
  lastReviewedAt?: number;
}
export interface Attempt {
  at: number;
  answer?: string;
  code?: string;
  result?: RunResult;
  passed: boolean;
  feedback: string;
}
export interface StepProgress {
  code?: string;
  answer: string;
  hints: number;
  revealed: boolean;
  completed: boolean;
  attempts: Attempt[];
  rubricChecks: string[];
  traceIndex: number;
}
export interface ReviewSession {
  conceptId: string;
  mode: "card" | "challenge";
  sessionId: string;
  startedAt: number;
  wasDue: boolean;
  exerciseId?: string;
}
export type View =
  | "dashboard"
  | "course"
  | "lesson"
  | "review"
  | "project"
  | "journal"
  | "settings";
export interface UserState {
  schemaVersion: 3;
  appVersion: string;
  updatedAt: number;
  onboarding: {
    completed: boolean;
    name: string;
    minutes: number;
  };
  diagnostic: {
    completed: boolean;
    answers: Record<string, string>;
    score: number;
    recommendation: string;
  };
  /** Optional map-only preference; unknown imported values resolve to core at read time. */
  routePreference?: string;
  resume: {
    view: View;
    lessonId: string;
    stepIndex: number;
    panel: "lesson" | "code" | "output";
    focus: boolean;
  };
  steps: Record<string, StepProgress>;
  events: EvidenceEvent[];
  mastery: Record<string, MasteryRecord>;
  review: ReviewItem[];
  reviewSession?: ReviewSession;
  notes: Record<string, string>;
  bookmarks: string[];
  ratings: {
    conceptId: string;
    rating: "again" | "hard" | "good" | "easy";
    at: number;
  }[];
  settings: {
    theme: "light" | "dark";
    editorFontSize: number;
    accessibleEditor: boolean;
  };
}
export interface EvaluationInput {
  answer?: string;
  code?: string;
  result?: RunResult;
  rubricChecks?: string[];
}
export interface EvaluationResult {
  passed: boolean;
  feedback: string;
  evaluator: Evaluator["kind"];
}
