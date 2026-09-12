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
    state: "owner" | "copied" | "moved" | "shared" | "mutable" | "dropped";
  }[];
  heap: { id: string; value: string; owner: string; dropped?: boolean }[];
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
  | { kind: "expected-error"; code: string }
  | { kind: "tests"; tests: string; forbiddenPatterns?: string[] }
  | { kind: "answer"; accepted: string[]; feedback: string }
  | { kind: "choice"; correct: string; explanations: Record<string, string> }
  | { kind: "ordering"; correct: string[] }
  | { kind: "rubric"; criteria: string[] };
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
export interface LessonStep {
  id: string;
  kind: StepKind;
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
}
export interface Lesson {
  id: string;
  moduleId: string;
  conceptIds: string[];
  competencyIds: string[];
  prerequisites: string[];
  title: string;
  subtitle: string;
  minutes: number;
  outcomes: string[];
  steps: LessonStep[];
  misconceptions: string[];
  transferTask: string;
  evidenceGate: string;
  sourceIds: string[];
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
  package?: ProjectPackage;
}
export interface ProjectPackage {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  revealStepRefs: ModuleGateTaskRef[];
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
