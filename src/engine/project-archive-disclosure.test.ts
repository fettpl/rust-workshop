import { observedSubmission } from "./learning";
import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { expect, it } from "vitest";
import { lessons, modules, projects } from "../content/course";
import { submitPassingExercise } from "../content/gate-recovery-test-helpers";
import {
  assistanceForLessonStep,
  courseEvidencePolicy,
  courseGateRecovery,
  courseModuleGate,
  revealCourseProjectPackageVariant,
} from "../content/learning-context";
import { projectFiles } from "../domain/project-package";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";

const archives = projects.flatMap((project) =>
  project.package ? [project.package] : [],
);
it.each(archives)(
  "$id attributes both shipped variants and recommends work that can earn credit",
  (archive) => {
    for (const variant of ["starter", "solution"] as const) {
      const files = unzipSync(
        readFileSync(`public/projects/${archive.id}/${variant}.zip`),
      );
      for (const [path, expected] of Object.entries(
        projectFiles(archive, variant),
      )) {
        expect(strFromU8(files[`${archive.id}/${path}`]), path).toBe(expected);
      }
      const reveal = (
        state: ReturnType<typeof createInitialState>,
        at: number,
      ) =>
        revealCourseProjectPackageVariant(state, archive, lessons, variant, at);
      const state = importState(exportState(reveal(createInitialState(), 10)));
      const refs = [
        ...(archive.starterRevealStepRefs ?? []),
        ...(variant === "solution" ? archive.revealStepRefs : []),
      ];
      expect(state.events).toHaveLength(
        new Set(refs.map((ref) => ref.lessonId + ":" + ref.stepId)).size,
      );
      const redisplayed = reveal(state, 11);
      expect(redisplayed.events.slice(0, state.events.length)).toEqual(
        state.events,
      );
      expect(
        redisplayed.events
          .slice(state.events.length)
          .every(
            (event) =>
              event.kind === "exposure" &&
              event.gate === false &&
              event.at === 11,
          ),
      ).toBe(true);
      for (const ref of refs) {
        expect(state.events).toContainEqual(
          expect.objectContaining({
            ...ref,
            kind: "exposure",
            at: 10,
            revealed: true,
          }),
        );
      }
      for (const ref of refs) {
        // A restored journal can carry an unannotated success from either side of the preview.
        for (const at of [5, 20]) {
          const success = submitPassingExercise(
            createInitialState(),
            ref,
            at,
          ).events.at(-1)!;
          const journal = { ...state, events: [...state.events, success] };
          const observed = observedSubmission(
            journal,
            journal.events.length - 1,
            courseEvidencePolicy,
          );
          expect(observed.revealed, ref.stepId).toBe(at >= 10);
          expect(success.revealed).toBe(false);
        }
      }
      for (const stage of modules) {
        for (const criterion of stage.gateCriteria ?? []) {
          const label = archive.id + "/" + variant + "/" + criterion.id;
          expect(courseGateRecovery(state, criterion).status, label).toBe(
            "available",
          );
          // Exercise affected gates all the way through their quota and any supplementary work.
          if (
            !criterion.taskRefs.some((ref) => {
              const lesson = lessons.find((l) => l.id === ref.lessonId)!;
              return assistanceForLessonStep(
                state,
                lesson,
                lesson.steps.find((s) => s.id === ref.stepId)!,
              ).revealed;
            })
          )
            continue;
          let trial = state;
          for (
            let i = 0;
            i <
            criterion.taskRefs.length +
              (criterion.supplementaryStepRefs?.length ?? 0);
            i++
          ) {
            const next = courseGateRecovery(trial, criterion);
            if (next.status === "complete") break;
            if (next.status !== "available")
              throw new Error(label + ": no independent route");
            trial = submitPassingExercise(trial, next.task, 20 + i);
          }
          expect(
            courseModuleGate(trial, lessons, {
              ...stage,
              gateCriteria: [criterion],
            }).passed,
            label,
          ).toBe(true);
        }
      }
    }
  },
);

it("marks the decisions provided by the operations solution and leaves the independent incident classifier available", () => {
  const archive = archives.find((p) => p.id === "service-operations-workshop")!;
  for (const variant of ["starter", "solution"] as const) {
    const source = projectFiles(archive, variant)["src/operations.rs"];
    const state = revealCourseProjectPackageVariant(
      createInitialState(),
      archive,
      lessons,
      variant,
      10,
    );
    for (const [id, witness] of [
      ["trust-admission-budget-gate", "active >= policy.max_active"],
      [
        "telemetry-correlation-allowlist-gate",
        "source_allowlist.contains(&event.source.as_str())",
      ],
      [
        "readiness-drain-accounting-gate",
        "self.accepted.len() == self.completed.len()",
      ],
    ]) {
      const lesson = lessons.find((l) => l.steps.some((s) => s.id === id))!;
      expect(source.includes(witness)).toBe(variant === "solution");
      expect(
        assistanceForLessonStep(
          state,
          lesson,
          lesson.steps.find((s) => s.id === id)!,
        ).revealed,
        id,
      ).toBe(variant === "solution");
    }
    const incident = lessons.find(
      (l) => l.id === "service-incident-diagnosis",
    )!;
    expect(
      assistanceForLessonStep(
        state,
        incident,
        incident.steps.find((s) => s.id === "incident-diagnosis-gate")!,
      ).revealed,
    ).toBe(false);
  }
});

it("attributes inherited capstone code in the retry starter while keeping the unfinished client independent", () => {
  const capstone = projects.find(
    (p) => p.id === "durable-log-service",
  )!.package!;
  const retry = projects.find((p) => p.id === "durable-log-retry")!.package!;
  const inherited = projectFiles(capstone, "solution");
  const starter = projectFiles(retry, "starter");
  for (const path of [
    "crates/ingest-core/src/domain.rs",
    "crates/ingest-core/src/protocol.rs",
    "crates/ingest-store/src/store.rs",
  ]) {
    expect(starter[path], path).toBe(inherited[path]);
    expect(projectFiles(capstone, "starter")[path], path).toContain("todo!");
  }
  const client = "crates/ingest-service/src/retry_client.rs";
  expect(starter[client]).toContain("todo!");
  expect(projectFiles(retry, "solution")[client]).toContain(
    "pub async fn send_with_retry",
  );
  for (const [archive, variant, domainSolved, clientSolved] of [
    [capstone, "starter", false, false],
    [capstone, "solution", true, false],
    [retry, "starter", true, false],
    [retry, "solution", true, true],
  ] as const) {
    const state = revealCourseProjectPackageVariant(
      createInitialState(),
      archive,
      lessons,
      variant,
      10,
    );
    for (const [stepId, helped] of [
      ["capstone-domain-validate", domainSolved],
      ["service-client-immutable-frame-replay", clientSolved],
      ["capstone-domain-validate-transfer", false],
    ] as const) {
      const lesson = lessons.find((l) => l.steps.some((s) => s.id === stepId))!;
      expect(
        assistanceForLessonStep(
          state,
          lesson,
          lesson.steps.find((s) => s.id === stepId)!,
        ).revealed,
        stepId,
      ).toBe(helped);
    }
  }
});

it.each([
  [
    "file-schema-evolution",
    "src/model.rs",
    "implement normalization",
    "schema-normalize-apply",
    "schema-validate-current-snapshot",
  ],
  [
    "service-authorization",
    "src/lib.rs",
    "implement this operation",
    "authorization-binding-apply",
    "authorization-binding-atomic-batch",
  ],
])(
  "%s only supplies the completed single-operation contract in the solution",
  (id, path, unfinished, supplied, fresh) => {
    const archive = projects.find((p) => p.id === id)!.package!;
    const lesson = lessons.find((l) => l.steps.some((s) => s.id === supplied))!;
    for (const variant of ["starter", "solution"] as const) {
      const state = revealCourseProjectPackageVariant(
        createInitialState(),
        archive,
        lessons,
        variant,
        10,
      );
      expect(projectFiles(archive, variant)[path].includes(unfinished)).toBe(
        variant === "starter",
      );
      for (const stepId of [supplied, fresh]) {
        const step = lesson.steps.find((s) => s.id === stepId)!;
        expect(
          assistanceForLessonStep(state, lesson, step).revealed,
          stepId,
        ).toBe(stepId === supplied && variant === "solution");
      }
    }
  },
);
