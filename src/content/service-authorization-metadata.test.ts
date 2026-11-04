import { expect, it } from "vitest";
import * as course from "./course";
import { validateContent } from "./validate";
// Sanitized ordered observations from the genuine pre-authoring registry capture.
const predecessorDurations = [
  {
    lessonId: "first-program",
    hasOwnMinutes: true,
    minutesValue: 12,
  },
  {
    lessonId: "bindings-types",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "functions-expressions",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "control-flow",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "foundations-assessment",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "while-progress",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "loop-values",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "loop-control",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "memory-intro",
    hasOwnMinutes: true,
    minutesValue: 12,
  },
  {
    lessonId: "move-copy-discovery",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "functions-and-ownership",
    hasOwnMinutes: true,
    minutesValue: 15,
  },
  {
    lessonId: "borrow-intro",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "number-guessing-transfer",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "blank-page-repair",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "adversarial-no-clone",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "scenario-assessment",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "slices-and-views",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "structs-and-fields",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "methods-and-state",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "enums-and-match",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "option-and-absence",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "modeling-assessment",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "vec-and-borrowing",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "string-and-utf8",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "hashmap-and-entry",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "result-and-recovery",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "propagation-and-errors",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "panic-and-contracts",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "todo-command-parser",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "todo-state-invariants",
    hasOwnMinutes: true,
    minutesValue: 40,
  },
  {
    lessonId: "todo-session-project",
    hasOwnMinutes: true,
    minutesValue: 45,
  },
  {
    lessonId: "module-tree-paths",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "module-visibility",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "imports-and-reexports",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "cargo-package-integration",
    hasOwnMinutes: true,
    minutesValue: 40,
  },
  {
    lessonId: "todo-storage-format",
    hasOwnMinutes: true,
    minutesValue: 40,
  },
  {
    lessonId: "todo-file-persistence",
    hasOwnMinutes: true,
    minutesValue: 45,
  },
  {
    lessonId: "todo-terminal-cli",
    hasOwnMinutes: true,
    minutesValue: 45,
  },
  {
    lessonId: "generic-values",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "generic-impl",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "generic-bounds",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "trait-contracts",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "trait-consumers",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "associated-types",
    hasOwnMinutes: true,
    minutesValue: 32,
  },
  {
    lessonId: "trait-dispatch",
    hasOwnMinutes: true,
    minutesValue: 34,
  },
  {
    lessonId: "lifetime-relations",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "lifetime-structs",
    hasOwnMinutes: true,
    minutesValue: 17,
  },
  {
    lessonId: "lifetime-api",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "closure-captures",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "closure-ownership",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "closure-contracts",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "variance-shared-views",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "variance-mutable-slots",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "hrtb-local-visitors",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "hrtb-borrowed-projections",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "iterator-ownership",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "iterator-pipelines",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "iterator-laziness",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "iterator-contracts",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "gat-receiver-borrows",
    hasOwnMinutes: true,
    minutesValue: 26,
  },
  {
    lessonId: "gat-overlapping-mutable-windows",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "gat-item-capabilities",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "gat-owned-iterator-adapters",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "testing-contracts",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "testing-regressions",
    hasOwnMinutes: true,
    minutesValue: 19,
  },
  {
    lessonId: "testing-quality-workflow",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "guess-input-contract",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "guess-round-state",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "guess-session-io",
    hasOwnMinutes: true,
    minutesValue: 32,
  },
  {
    lessonId: "guess-random-boundary",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "log-records",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "log-streaming",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "log-analyzer-project",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "box-recursive",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "deref-contracts",
    hasOwnMinutes: true,
    minutesValue: 21,
  },
  {
    lessonId: "drop-resources",
    hasOwnMinutes: true,
    minutesValue: 21,
  },
  {
    lessonId: "rc-sharing",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "refcell-borrows",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "weak-links",
    hasOwnMinutes: true,
    minutesValue: 40,
  },
  {
    lessonId: "thread-join",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "thread-move",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "scoped-threads",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "channel-ownership",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "channel-lifecycle",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "channel-backpressure",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "send-sync",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "mutex-state",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "mutex-recovery",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "atomic-rmw",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "atomic-cas",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "atomic-limits",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "release-acquire",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "ordering-contracts",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "loom-evidence",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "future-laziness",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "await-progress",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "future-ownership",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "future-cancellation",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "tokio-runtime-entry",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "tokio-spawn-join",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "tokio-task-boundaries",
    hasOwnMinutes: true,
    minutesValue: 26,
  },
  {
    lessonId: "tokio-join-outcomes",
    hasOwnMinutes: true,
    minutesValue: 27,
  },
  {
    lessonId: "tokio-bounded-channels",
    hasOwnMinutes: true,
    minutesValue: 27,
  },
  {
    lessonId: "tokio-reservation-cancellation",
    hasOwnMinutes: true,
    minutesValue: 31,
  },
  {
    lessonId: "tokio-timeouts",
    hasOwnMinutes: true,
    minutesValue: 27,
  },
  {
    lessonId: "tokio-select-cancellation",
    hasOwnMinutes: true,
    minutesValue: 29,
  },
  {
    lessonId: "tokio-graceful-shutdown",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "tokio-async-read-write",
    hasOwnMinutes: true,
    minutesValue: 29,
  },
  {
    lessonId: "tokio-framing-eof",
    hasOwnMinutes: true,
    minutesValue: 32,
  },
  {
    lessonId: "tokio-retained-frame-progress",
    hasOwnMinutes: true,
    minutesValue: 37,
  },
  {
    lessonId: "tokio-stream-next",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "tokio-receiver-stream-drain",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "tokio-spawn-blocking-boundary",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "tokio-blocking-cooperative-stop",
    hasOwnMinutes: true,
    minutesValue: 31,
  },
  {
    lessonId: "tokio-tcp-connect",
    hasOwnMinutes: true,
    minutesValue: 31,
  },
  {
    lessonId: "tokio-tcp-half-close",
    hasOwnMinutes: true,
    minutesValue: 34,
  },
  {
    lessonId: "tokio-frame-deadlines",
    hasOwnMinutes: true,
    minutesValue: 34,
  },
  {
    lessonId: "tokio-admission-lifecycle",
    hasOwnMinutes: true,
    minutesValue: 38,
  },
  {
    lessonId: "async-lending-receiver",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "async-lending-callbacks",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "async-lending-cancel-commit",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "async-lending-send-boundary",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "async-lending-dyn-adapter",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "api-validated-construction",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "api-error-source-chain",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "api-trait-compatibility",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "api-compatible-surface",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "api-frame-protocol-maintenance",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "api-release-old-contracts",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "api-release-matrix-decision",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "macros-exactly-once",
    hasOwnMinutes: true,
    minutesValue: 19,
  },
  {
    lessonId: "macros-repetition-grammar",
    hasOwnMinutes: true,
    minutesValue: 19,
  },
  {
    lessonId: "macros-exported-paths-2024",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "cargo-dependency-contract",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "cargo-resolver-feature-unification",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "cargo-lock-msrv-policy",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "cargo-package-rehearsal",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "dependency-graph-diagnosis",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "dependency-source-license-policy",
    hasOwnMinutes: true,
    minutesValue: 27,
  },
  {
    lessonId: "dependency-advisory-exceptions",
    hasOwnMinutes: true,
    minutesValue: 27,
  },
  {
    lessonId: "dependency-release-dossier",
    hasOwnMinutes: true,
    minutesValue: 29,
  },
  {
    lessonId: "grep-context-selection",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "grep-bounded-input",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "grep-path-policy",
    hasOwnMinutes: true,
    minutesValue: 34,
  },
  {
    lessonId: "grep-cli-contract",
    hasOwnMinutes: true,
    minutesValue: 36,
  },
  {
    lessonId: "property-invariants",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "property-generated-inputs",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "property-shrinking-replay",
    hasOwnMinutes: true,
    minutesValue: 32,
  },
  {
    lessonId: "property-metamorphic-transfer",
    hasOwnMinutes: true,
    minutesValue: 34,
  },
  {
    lessonId: "fuzz-input-domain",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
  {
    lessonId: "fuzz-oracle-sensitivity",
    hasOwnMinutes: true,
    minutesValue: 23,
  },
  {
    lessonId: "fuzz-counterexample-regression",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "fuzz-campaign-evidence",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "performance-measured-workload",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "performance-borrowed-stream",
    hasOwnMinutes: true,
    minutesValue: 26,
  },
  {
    lessonId: "performance-bounded-buffer",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "performance-evidence-decisions",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "performance-evidence-investigation",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "profile-instruction-cost",
    hasOwnMinutes: true,
    minutesValue: 24,
  },
  {
    lessonId: "profile-allocation-events",
    hasOwnMinutes: true,
    minutesValue: 26,
  },
  {
    lessonId: "profile-optimization-transfer",
    hasOwnMinutes: true,
    minutesValue: 27,
  },
  {
    lessonId: "profile-regression-decision",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "runtime-allocation-scope",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "runtime-allocation-comparison",
    hasOwnMinutes: true,
    minutesValue: 27,
  },
  {
    lessonId: "unsafe-ffi-checked-view",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "unsafe-ffi-split-regions",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "unsafe-ffi-raw-record",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "unsafe-ffi-owned-handle",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "unsafe-miri-byte-view",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "unsafe-miri-disjoint-regions",
    hasOwnMinutes: true,
    minutesValue: 25,
  },
  {
    lessonId: "unsafe-miri-slot-state",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "unsafe-miri-mut-slot",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "unsafe-borrowed-provenance",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "unsafe-borrowed-reborrow",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "unsafe-borrowed-slot",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "unsafe-borrowed-auto-traits",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "service-trust-admission",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "service-correlated-telemetry",
    hasOwnMinutes: true,
    minutesValue: 28,
  },
  {
    lessonId: "service-readiness-drain",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "service-incident-diagnosis",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "capstone-domain-boundary",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "capstone-idempotent-commit",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "capstone-bounded-lifecycle",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "capstone-protocol-evolution",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "capstone-incident-recovery",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "capstone-release-evidence",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "capstone-maintenance-recovery",
    hasOwnMinutes: true,
    minutesValue: 16,
  },
  {
    lessonId: "service-client-bounded-retry",
    hasOwnMinutes: false,
  },
  {
    lessonId: "service-client-ambiguous-driver",
    hasOwnMinutes: false,
  },
  {
    lessonId: "conversion-ownership-views",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "checked-conversions",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "nested-patterns-and-destructuring",
    hasOwnMinutes: true,
    minutesValue: 20,
  },
  {
    lessonId: "function-ownership-calibration",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "shared-borrow-calibration",
    hasOwnMinutes: true,
    minutesValue: 18,
  },
  {
    lessonId: "fallible-value-composition",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "fallible-iterator-contracts",
    hasOwnMinutes: true,
    minutesValue: 30,
  },
  {
    lessonId: "documentation-guided-repair",
    hasOwnMinutes: true,
    minutesValue: 35,
  },
  {
    lessonId: "ownership-foundation-transfer",
    hasOwnMinutes: true,
    minutesValue: 22,
  },
] as const;
it("all_four_authorization_lessons_omit_minutes", () => {
  const added = course.lessons.filter(
    (lesson) => lesson.moduleId === "service-authorization",
  );
  expect(added).toHaveLength(4);
  for (const lesson of added) {
    expect(Object.hasOwn(lesson, "minutes")).toBe(false);
    expect(lesson.minutes).toBeUndefined();
  }
  expect(
    validateContent(course).filter((error) => error.includes("minutes")),
  ).toEqual([]);
});
it("predecessor_198_duration_presence_is_exact", () => {
  const observed = course.lessons
    .slice(0, 198)
    .map((lesson) => ({
      lessonId: lesson.id,
      hasOwnMinutes: Object.hasOwn(lesson, "minutes"),
      ...(Object.hasOwn(lesson, "minutes")
        ? { minutesValue: lesson.minutes }
        : {}),
    }));
  expect(observed).toEqual(predecessorDurations);
  expect(observed.filter((row) => row.hasOwnMinutes)).toHaveLength(196);
});
it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
  "invalid_explicit_authorization_minutes_are_rejected: %s",
  (minutes) => {
    for (const target of course.lessons.slice(-4)) {
      const changed = {
        ...course,
        lessons: course.lessons.map((lesson) =>
          lesson.id === target.id ? { ...lesson, minutes } : lesson,
        ),
      };
      expect(
        validateContent(changed).some((error) =>
          error.includes("learning metadata"),
        ),
      ).toBe(true);
    }
  },
);
