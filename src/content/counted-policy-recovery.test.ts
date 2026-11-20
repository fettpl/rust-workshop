/** Fixed authored native controls only; no learner or imported code is executed. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lessons, modules } from "./course";
import {
  courseGateRecovery,
  recordSuppliedSolutions,
} from "./learning-context";
import { revealAuthoredStepSolutions } from "../domain/project-package";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../persistence/state";
import { appendHiddenTests } from "../runner";

const criteria = [
  "authorization-exact-scope-gate",
  "authorization-attenuation-gate",
  "authorization-request-binding-gate",
  "authorization-consuming-admission-gate",
  "file-schema-normalization-gate",
];
it.each(criteria)(
  "%s retains a complete path after any one visible or restored primary solution",
  (id) => {
    const criterion = modules
      .flatMap((m) => m.gateCriteria ?? [])
      .find((c) => c.id === id)!;
    for (const revealed of criterion.taskRefs)
      for (const visible of [false, true]) {
        let state = createInitialState();
        state.steps[stepKey(revealed.lessonId, revealed.stepId)] = {
          ...createStepProgress(),
          revealed: true,
        };
        if (visible) {
          const source = lessons
            .find((l) => l.id === revealed.lessonId)!
            .steps.find((s) => s.id === revealed.stepId)!;
          state = revealAuthoredStepSolutions(state, [revealed], lessons, 1);
          state = recordSuppliedSolutions(state, source, "solution", 1);
        }
        const accepted = new Set<string>();
        for (let at = 2; at < 20; at++) {
          const next = courseGateRecovery(state, criterion, lessons);
          if (next.status !== "available") break;
          const step = lessons
            .find((l) => l.id === next.task.lessonId)!
            .steps.find((s) => s.id === next.task.stepId)!;
          if (step.evidence?.codingTaskId)
            accepted.add(step.evidence.codingTaskId);
          state.events.push({
            id: `fixed-${at}`,
            ...next.task,
            conceptIds: step.evidence?.conceptIds ?? [],
            evidenceVersion: step.evidence?.version,
            kind:
              step.evaluator?.kind === "rubric"
                ? "self-rating"
                : step.evidenceKind,
            evaluator: step.evaluator?.kind,
            passed: true,
            hints: 0,
            revealed: false,
            at,
          });
        }
        expect(
          accepted.size,
          `${id}/${revealed.stepId}/${visible}`,
        ).toBeGreaterThanOrEqual(criterion.requiredIndependentCodingTasks!);
        expect(courseGateRecovery(state, criterion, lessons).status).toBe(
          "complete",
        );
      }
  },
);
const controls = [
  [
    "authorization-policy-matching-indexes",
    "g.subject == principal.subject",
    "true",
    "indexes.push(index);",
    "indexes.extend([index]);",
  ],
  [
    "authorization-attenuation-intersection",
    "requested.max_cost <= parent.max_cost",
    "true",
    "Ok(*requested)",
    "Result::Ok(*requested)",
  ],
  [
    "authorization-binding-atomic-batch",
    "return Err((reason, requests));",
    "return Err((reason, Vec::new()));",
    "requests.into_iter().map(|request| Authorized { authority, principal, request }).collect()",
    "requests.into_iter().map(|request| { Authorized { request, principal, authority } }).collect()",
  ],
  [
    "authorization-admission-atomic-batch",
    "let next_charged = charged.checked_add(witness.request.cost)",
    "state.accepted = accepted;\n        let next_charged = charged.checked_add(witness.request.cost)",
    "accepted = next;",
    "accepted = next + 0;",
  ],
  [
    "schema-validate-current-snapshot",
    "!seen.insert(row.id)",
    "!seen.insert(row.id) && false",
    "row.id >= next",
    "next <= row.id",
  ],
] as const;
it.each(controls)(
  "checks fixed recovery %s with canonical/equivalent and negative controls",
  (id, from, to, equivalentFrom, equivalentTo) => {
    const step = lessons.flatMap((l) => l.steps).find((s) => s.id === id);
    expect(step, id).toBeDefined();
    if (!step || step.evaluator?.kind !== "tests")
      throw new Error("Missing fixed authored tests");
    expect(step.solution).toContain(from);
    expect(step.solution).toContain(equivalentFrom);
    const extraMutations: readonly (readonly [string, string])[] =
      id === "authorization-attenuation-intersection"
        ? [
            ["Ok(*requested)", "Ok(*parent)"],
            [
              "Err(AttenuationError::WouldAmplify)",
              "Ok(GrantSpec { max_cost:requested.max_cost.min(parent.max_cost), scope:parent.scope, actions:parent.actions, ..*requested })",
            ],
            [
              "}).collect()",
              "}).filter(|decision| decision.is_ok()).collect()",
            ],
          ]
        : id === "authorization-admission-atomic-batch"
          ? [
              [
                "principal:w.principal",
                "principal:Principal {tenant:TenantId(99),..w.principal}",
              ],
              [
                "request:w.request",
                "request:Request {resource:Resource {tenant:TenantId(99),..w.request.resource},..w.request}",
              ],
            ]
          : id === "schema-validate-current-snapshot"
            ? [
                [
                  "for row in legacy {",
                  "for row in legacy.into_iter().take(0) {",
                ],
                [
                  "Ok(Loaded {version:Version::V2, snapshot})",
                  "Ok(Loaded {version:Version::V2, snapshot:Snapshot {rows:snapshot.rows.into_iter().enumerate().map(|(index,row)| Row {id:index as u64+1,..row}).collect(),next:snapshot.next}})",
                ],
              ]
            : [];
    const extraSources = extraMutations.map(([before, after]) => {
      expect(step.solution).toContain(before);
      return [step.solution!.replace(before, after), false] as const;
    });
    const dir = mkdtempSync(join(tmpdir(), "counted-policy-recovery-"));
    try {
      for (const [source, passes] of [
        [step.solution!, true],
        [step.solution!.replace(equivalentFrom, equivalentTo), true],
        [step.code!, false],
        [step.solution!.replace(from, to), false],
        ...extraSources,
      ] as const) {
        const file = join(dir, "control.rs"),
          binary = join(dir, "control");
        writeFileSync(file, appendHiddenTests(source, step.evaluator.tests));
        const compile = spawnSync(
          "rustc",
          ["--test", "--edition=2024", file, "-o", binary],
          { encoding: "utf8", timeout: 60_000 },
        );
        if (compile.error) throw compile.error;
        expect(compile.status, compile.stderr).toBe(0);
        const run = spawnSync(binary, [], {
          encoding: "utf8",
          timeout: 10_000,
        });
        if (run.error) throw run.error;
        expect(run.status, run.stdout + run.stderr).toBe(passes ? 0 : 101);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
