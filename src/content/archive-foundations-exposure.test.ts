import { describe, expect, it } from "vitest";
import { projects, lessons } from "./course";
import {
  projectFiles,
  revealProjectPackageVariant,
} from "../domain/project-package";
import { createInitialState, stepKey } from "../persistence/state";
import {
  courseEvidencePolicy,
  recordCourseEvidence,
  evidenceForLessonStep,
} from "./learning-context";
import { independentCodingTaskIds } from "../engine/learning";

const archive = (id: string) =>
  projects.find((project) => project.package?.id === id)!.package!;
const refs = (id: string, variant: "starter" | "solution") => {
  const project = archive(id);
  return (
    variant === "starter"
      ? (project.starterRevealStepRefs ?? [])
      : [...project.revealStepRefs, ...(project.starterRevealStepRefs ?? [])]
  ).map((ref) => stepKey(ref.lessonId, ref.stepId));
};
const atomicAnswers = [
  stepKey("atomic-cas", "atomic-cas-conditional-blank"),
  stepKey("release-acquire", "release-acquire-publication-gate"),
];
const lendingAnswers = [
  "receiver",
  "callbacks",
  "cancel-commit",
  "send-boundary",
  "dyn-adapter",
].flatMap((suffix) =>
  ["gate", "blank"].map((kind) =>
    stepKey(`async-lending-${suffix}`, `async-lending-${suffix}-${kind}`),
  ),
);
const blockingAnswer = stepKey(
  "tokio-spawn-blocking-boundary",
  "tokio-spawn-blocking-boundary-owned-gate",
);

describe("authored foundation archive exposure audit", () => {
  it("attributes the atomic algorithms present in the ADR and reference, leaving different protocols fresh", () => {
    const project = archive("concurrency-lab-workshop");
    expect([...new Set(refs(project.id, "solution"))].sort()).toEqual(
      [...atomicAnswers].sort(),
    );
    expect(refs(project.id, "starter").sort()).toEqual(
      [...atomicAnswers].sort(),
    );
    const starter = projectFiles(project, "starter");
    const solution = projectFiles(project, "solution");
    expect(starter["ADR.md"]).toContain(
      "ponownie sprawdzamy dodawanie i limit",
    );
    expect(starter["ADR.md"]).toContain("ready przez Acquire");
    expect(solution["src/lib.rs"]).toContain("Err(observed) => old = observed");
    expect(solution["src/lib.rs"]).toContain(
      "self.0.ready.store(true, Ordering::Release)",
    );
    for (const absent of [
      "fetch_add(",
      "fetch_or(",
      "Mutex",
      "CasCell",
      "ordering_allowed",
      "assert_model_evidence",
      "acknowledge(",
    ])
      expect(solution["src/lib.rs"]).not.toContain(absent);
  });

  it("attributes worked service starter lending code and both solved frame/permit directions", () => {
    const project = archive("tokio-service-workshop");
    const starterRefs = [...new Set(refs(project.id, "starter"))];
    expect(starterRefs.sort()).toEqual(
      [...lendingAnswers, blockingAnswer].sort(),
    );
    expect([...new Set(refs(project.id, "solution"))].sort()).toEqual(
      [
        ...lendingAnswers,
        blockingAnswer,
        stepKey("tokio-frame-deadlines", "tokio-frame-deadlines-gate"),
        stepKey("tokio-frame-deadlines", "tokio-frame-deadlines-blank"),
        stepKey("tokio-admission-lifecycle", "tokio-admission-lifecycle-blank"),
      ].sort(),
    );
    const starter = projectFiles(project, "starter");
    const solution = projectFiles(project, "solution");
    expect(starter["src/lending.rs"]).toContain(
      "let result = visit(packet.bytes()).await",
    );
    expect(starter["src/report_source.rs"]).toContain(
      "impl Future<Output = Vec<OwnedReport>> + Send + 'static",
    );
    expect(starter["src/report_source.rs"]).toContain(
      "Box<dyn LocalReportProvider + 'a>",
    );
    expect(solution["src/protocol.rs"]).toContain("writer.flush().await");
    expect(solution["src/service.rs"]).toContain(
      "let _connection_permit = permit;",
    );
  });

  it("records variant-specific help once without manufacturing independent credit or touching distinct transfers", () => {
    const project = archive("tokio-service-workshop");
    let state = revealProjectPackageVariant(
      createInitialState(),
      project,
      lessons,
      "starter",
      1000,
      courseEvidencePolicy,
    );
    const first = state.events.length;
    state = revealProjectPackageVariant(
      state,
      project,
      lessons,
      "starter",
      1001,
      courseEvidencePolicy,
    );
    expect(state.events).toHaveLength(first);
    expect(
      state.events.every(
        (event) => event.kind === "exposure" && event.revealed,
      ),
    ).toBe(true);
    const lesson = lessons.find(
      (entry) => entry.id === "async-lending-receiver",
    )!;
    const step = lesson.steps.find(
      (entry) => entry.id === "async-lending-receiver-blank",
    )!;
    const submission = {
      id: "archive-audit/attempt",
      lessonId: lesson.id,
      stepId: step.id,
      ...evidenceForLessonStep(lesson, step),
      kind: step.evidenceKind,
      evaluator: "tests" as const,
      gate: true,
      passed: true,
      hints: 0,
      revealed: false,
      at: 1002,
    };
    const clean = recordCourseEvidence(createInitialState(), submission);
    expect(
      independentCodingTaskIds(
        clean,
        lesson.conceptIds[0],
        courseEvidencePolicy,
      ),
    ).toHaveLength(1);
    state = recordCourseEvidence(state, submission);
    expect(
      independentCodingTaskIds(
        state,
        lesson.conceptIds[0],
        courseEvidencePolicy,
      ),
    ).toEqual([]);
    for (const [lessonId, stepId] of [
      ["tokio-tcp-connect", "tokio-tcp-connect-gate"],
      ["tokio-tcp-half-close", "tokio-tcp-half-close-gate"],
      ["tokio-admission-lifecycle", "tokio-admission-lifecycle-gate"],
      ["async-lending-receiver", "async-lending-receiver-bounded-batch"],
      ["async-lending-callbacks", "async-lending-callbacks-bounded-transform"],
      ["async-lending-cancel-commit", "async-lending-cancel-commit-lost-reply"],
      [
        "async-lending-send-boundary",
        "async-lending-send-boundary-prepared-handoff",
      ],
      [
        "async-lending-dyn-adapter",
        "async-lending-dyn-adapter-borrowed-sources",
      ],
    ])
      expect(state.steps[stepKey(lessonId, stepId)]?.revealed, stepId).not.toBe(
        true,
      );
    state = revealProjectPackageVariant(
      state,
      project,
      lessons,
      "solution",
      1003,
      courseEvidencePolicy,
    );
    expect(
      state.steps[
        stepKey("tokio-frame-deadlines", "tokio-frame-deadlines-blank")
      ]?.revealed,
    ).toBe(true);
    expect(
      state.steps[
        stepKey("tokio-admission-lifecycle", "tokio-admission-lifecycle-blank")
      ]?.revealed,
    ).toBe(true);
  });

  it.each([
    {
      id: "number-guessing-workshop",
      source: "src/lib.rs",
      supplied: ["pub fn parse_input", "pub fn new_game_with", "pub fn play"],
      distinct: [
        "parse_command",
        "ScoreRound",
        "receive_notice",
        "assign_shift_with",
      ],
    },
    {
      id: "log-analyzer-workshop",
      source: "src/analyzer.rs",
      supplied: [
        "pub fn parse_record",
        "pub fn analyze_reader",
        "pub fn render_report",
      ],
      distinct: [
        "parse_reading",
        "count_statuses",
        "inventory_report",
        "metrics_report",
      ],
    },
    {
      id: "tokio-pipeline-workshop",
      source: "src/lib.rs",
      supplied: [
        "sender.reserve().await",
        "tokio::time::timeout",
        "join_next_with_id",
      ],
      distinct: [
        "watch::",
        "forward_reserved",
        "await_operation_through_wakes",
        "join_before",
      ],
    },
  ])(
    "retains the directly supplied scope and distinct neighboring decisions for $id",
    ({ id, source, supplied, distinct }) => {
      const code = projectFiles(archive(id), "solution")[source];
      for (const token of supplied) expect(code).toContain(token);
      for (const token of distinct) expect(code).not.toContain(token);
    },
  );

  it.each([
    "number-guessing-workshop",
    "log-analyzer-workshop",
    "tokio-pipeline-workshop",
  ])("keeps unsolved starter tasks fresh for %s", (id) => {
    expect(archive(id).starterRevealStepRefs ?? []).toEqual([]);
    const state = revealProjectPackageVariant(
      createInitialState(),
      archive(id),
      lessons,
      "starter",
      1000,
      courseEvidencePolicy,
    );
    expect(state.events).toEqual([]);
  });
});
