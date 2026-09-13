import type { Evaluator, LessonStep } from "../src/domain/types";
import {
  getTrustedFixtureTarget,
  TOKIO_FIXTURE_TARGET,
} from "../src/domain/trusted-fixtures";

export interface AuthoredCargoCase {
  id: string;
  code: string;
  tests?: string;
  expectedCompileError?: string;
  expectedDiagnostic?: string;
  expectRejection?: boolean;
  expectRuntimeFailure?: boolean;
  expectedOutput?: string;
  evaluator?: Evaluator;
}

/** Pure inventory. Execution accepts only the inventory imported from registered course data. */
export function tokioCasesForStep(
  prefix: string,
  step: LessonStep,
): AuthoredCargoCase[] {
  if (getTrustedFixtureTarget(step) !== TOKIO_FIXTURE_TARGET) return [];
  const result: AuthoredCargoCase[] = [];
  const id = `${prefix}/${step.id}`;
  if (!step.solution?.trim())
    throw new Error(
      `${id}: targeted Cargo fixture requires an authored solution`,
    );
  const tests =
    step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined;
  const expectedOutput =
    step.evaluator?.kind === "exact-output"
      ? step.evaluator.expected
      : undefined;
  if (tests !== undefined) {
    if (!tests.trim()) throw new Error(`${id}: empty authored tests`);
    result.push({
      id: `${id}/reject-empty-implementation`,
      code: "",
      tests,
      expectedCompileError: "any",
    });
  }
  if (step.code !== undefined) {
    result.push({
      id: `${id}/starter`,
      code: step.code,
      expectedCompileError:
        step.expectedStatus === "compile-error"
          ? (step.expectedError ?? "any")
          : undefined,
      expectedDiagnostic:
        step.expectedStatus === "compile-error"
          ? step.expectedDiagnostic
          : undefined,
      expectRuntimeFailure: step.expectedStatus === "runtime-error",
      expectedOutput,
    });
    if (tests !== undefined && step.expectedStatus !== "compile-error")
      result.push({
        id: `${id}/starter-rejected`,
        code: step.code,
        tests,
        expectRejection: true,
        evaluator: step.evaluator,
      });
  }
  result.push({
    id: `${id}/solution`,
    code: step.solution,
    tests,
    expectedOutput,
    evaluator: step.evaluator,
  });
  return result;
}
