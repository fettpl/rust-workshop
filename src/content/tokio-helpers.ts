import type { LessonStep } from "@/domain/types";

const tokioTarget = "cargo-tokio-runtime-1.54.1" as const;

export function choose(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  correct: number,
  answers: [string, string, string],
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    choices: answers.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((explanation, index) => [String(index), explanation]),
      ),
    },
    evidenceKind:
      kind === "predict"
        ? "prediction"
        : kind === "recall"
          ? "recall"
          : "exposure",
  };
}

export function tokioRun(
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected: string,
): LessonStep {
  return {
    id,
    kind: "run",
    title,
    prompt,
    code,
    solution: code,
    evaluator: { kind: "exact-output", expected },
    expectedStatus: "success",
    evidenceKind: "exposure",
    trustedFixtureTarget: tokioTarget,
  };
}

export function tokioError(
  id: string,
  title: string,
  prompt: string,
  code: string,
  solution: string,
  expected: { code?: string; diagnostic?: string },
): LessonStep {
  return {
    id,
    kind: "observe",
    title,
    prompt,
    code,
    solution,
    evaluator: {
      kind: "expected-error",
      ...(expected.code === undefined ? {} : { code: expected.code }),
      ...(expected.diagnostic === undefined
        ? {}
        : { diagnostic: expected.diagnostic }),
    },
    expectedStatus: "compile-error",
    ...(expected.code === undefined ? {} : { expectedError: expected.code }),
    ...(expected.diagnostic === undefined
      ? {}
      : { expectedDiagnostic: expected.diagnostic }),
    evidenceKind: "exposure",
    trustedFixtureTarget: tokioTarget,
  };
}

export function tokioExercise(options: {
  id: string;
  kind: "modify" | "apply" | "debug" | "blank";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
  forbiddenPatterns?: string[];
  gate?: boolean;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: options.hints,
    evaluator: {
      kind: "tests",
      tests: options.tests,
      forbiddenPatterns: [
        "unsafe",
        "std::thread",
        ...(options.forbiddenPatterns ?? []),
      ],
    },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
    trustedFixtureTarget: tokioTarget,
  };
}
