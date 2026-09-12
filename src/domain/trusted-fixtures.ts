import type { LessonStep } from "./types";

export const TOKIO_FIXTURE_TARGET = "cargo-tokio-runtime-1.53.1" as const;
export type TrustedFixtureTarget = NonNullable<
  LessonStep["trustedFixtureTarget"]
>;

/** Authoring check, not a parser or a boundary for executing untrusted Rust. */
export function trustedFixtureIssues(step: LessonStep): string[] {
  const target = step.trustedFixtureTarget ?? "rustc-2024";
  if (target !== "rustc-2024" && target !== TOKIO_FIXTURE_TARGET)
    return [`unknown trusted fixture target: ${target}`];
  const source = [
    step.code,
    step.solution,
    step.evaluator?.kind === "tests" ? step.evaluator.tests : "",
  ].join("\n");
  const usesTokio = /\btokio\s*::|\b(?:extern\s+crate|use)\s+tokio\b/.test(
    source,
  );
  if (usesTokio && target !== TOKIO_FIXTURE_TARGET)
    return [`Tokio fixture requires ${TOKIO_FIXTURE_TARGET}`];
  if (!usesTokio && target === TOKIO_FIXTURE_TARGET)
    return ["Tokio fixture target has no authored Tokio source"];
  return [];
}

export function getTrustedFixtureTarget(
  step: LessonStep,
): TrustedFixtureTarget {
  const errors = trustedFixtureIssues(step);
  if (errors.length) throw new Error(`${step.id}: ${errors.join("; ")}`);
  return step.trustedFixtureTarget ?? "rustc-2024";
}

export function hasRustTestAttribute(source: string): boolean {
  return /#\s*\[\s*(?:test|tokio\s*::\s*test(?:\s*\([^)]*\))?)\s*\]/.test(
    source,
  );
}
