import { dependencyFileSuccessor } from "./dependency-maintenance-compatibility-fixture";
import {
  assertReviewedHistoryRedaction,
  historyRedactionDeltas,
  historyRedactionPath,
} from "./history-redaction-test-support";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as currentCourse from "./course";
import baseline from "./fixtures/async-send-pre-handoff.json";
import { asyncLendingAssessmentFixtures } from "./async-lending-assessment-fixtures";
import { historicalBeforeCancellationTransfer } from "./async-lending-cancel-compatibility-fixture";
import { historicalBeforeFrameProtocolMaintenance } from "./frame-maintenance-compatibility-fixture";
import { historicalBeforeInitializedPrefix } from "./unsafe-miri-prefix-compatibility-fixture";
import { historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./file-schema-evolution-compatibility-fixture";

const sha = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

it("appends exactly two Send steps without changing the accepted lesson prefix", () => {
  const lesson = currentCourse.lessons.find(
    (l) => l.id === baseline.sendLesson.id,
  )!;
  expect(lesson.steps.slice(0, 5)).toEqual(baseline.sendLesson.steps);
  expect(lesson.steps.slice(5).map((step) => step.id)).toEqual([
    "async-lending-send-boundary-handoff-model",
    "async-lending-send-boundary-prepared-handoff",
  ]);
  const historicalCourse = historicalBeforeFrameProtocolMaintenance(
    historicalBeforeExistingContractRepair(currentCourse),
  );
  expect(historicalCourse.lessons.flatMap((l) => l.steps)).toHaveLength(1287);
});

it("keeps accepted immutable bytes or the exact reviewed presentation successor", () => {
  expect(Object.keys(historyRedactionDeltas)).toEqual([historyRedactionPath]);
  assertReviewedHistoryRedaction(
    baseline.immutableFiles,
    readFileSync(new URL(`../../${historyRedactionPath}`, import.meta.url)),
  );
  for (const file of baseline.immutableFiles) {
    const successor = dependencyFileSuccessor(file.path, file.sha256);
    const bytes = readFileSync(
      new URL(`../../${successor?.currentPath ?? file.path}`, import.meta.url),
    );
    if (successor) dependencyFileSuccessor(file.path, file.sha256, bytes);
    const expected =
      file.path === historyRedactionPath
        ? historyRedactionDeltas[historyRedactionPath].currentSha256
        : file.sha256;
    expect(createHash("sha256").update(bytes).digest("hex"), file.path).toBe(
      successor?.currentSha256 ?? expected,
    );
  }
});

it("preserves every accepted async fixture string and relative order", () => {
  const ids = new Set(baseline.oldAsyncFixtures.map((f) => f.id));
  const hashText = (text: string) =>
    createHash("sha256").update(text).digest("hex");
  expect(
    asyncLendingAssessmentFixtures
      .filter((f) => ids.has(f.id))
      .map((f) => ({
        id: f.id,
        equivalentSha256: hashText(f.equivalent),
        mutantSha256: hashText(f.mutant),
        additionalMutantSha256: (f.mutants ?? []).map(hashText),
      })),
  ).toEqual(baseline.oldAsyncFixtures);
});

import {
  historicalBeforeSendHandoff,
  sendHandoffStepIds,
} from "./async-lending-send-compatibility-fixture";
import {
  createInitialState,
  exportState,
  importState,
} from "../persistence/state";
import {
  courseEvidencePolicy,
  courseEvidenceSummary,
} from "./learning-context";
import { independentCodingTaskIds } from "../engine/learning";
import type { EvidenceEvent } from "../domain/types";
import savedFixtures from "./fixtures/baseline-correction-saves.json";

it("projects only the named A1 additions while preserving every accepted registry definition", () => {
  const previous = historicalBeforeSendHandoff(
    historicalBeforeCancellationTransfer(
      historicalBeforeInitializedPrefix(
        historicalBeforeExistingContractRepair(currentCourse),
      ),
    ),
  );
  for (const [name, expected] of Object.entries(baseline.registries)) {
    const registry = previous[name as keyof typeof previous];
    const actual = Array.isArray(registry)
      ? registry.map((value) => ({
          id: (value as { id?: string }).id ?? null,
          sha256: sha(value),
        }))
      : Object.entries(registry).map(([id, value]) => ({
          id,
          sha256: sha(value),
        }));
    expect(actual, name).toEqual(expected);
  }
});

it("keeps old V1/V2/V3 saved locations and raw history without passing either new step", () => {
  for (const fixture of savedFixtures.fixtures) {
    const raw = fixture.state;
    const restored = importState(
      JSON.stringify({
        schemaVersion: raw.schemaVersion,
        appVersion: raw.appVersion,
        exportedAt: "2026-10-15T12:00:00.000Z",
        state: raw,
      }),
    );
    expect(restored.events).toEqual(raw.events);
    expect(restored.steps).toEqual(raw.steps);
    expect(restored.notes).toEqual(raw.notes);
    expect(restored.bookmarks).toEqual(raw.bookmarks);
    expect(restored.review).toEqual(raw.review);
    expect(restored.ratings).toEqual(raw.ratings ?? []);
    expect(restored.reviewSession).toEqual(raw.reviewSession);
    expect(restored.resume).toEqual({
      ...createInitialState().resume,
      ...raw.resume,
    });
    expect(restored.settings).toEqual({
      ...createInitialState().settings,
      ...raw.settings,
    });
    for (const stepId of sendHandoffStepIds) {
      expect(
        restored.steps[`async-lending-send-boundary:${stepId}`],
      ).toBeUndefined();
      expect(
        restored.events.some(
          (event) =>
            event.lessonId === "async-lending-send-boundary" &&
            event.stepId === stepId,
        ),
      ).toBe(false);
    }
    expect(importState(exportState(restored))).toEqual(restored);
    expect(
      courseEvidenceSummary(restored, "async-lending-send-boundary")
        .qualifyingCodingTasks,
    ).toBe(0);
  }
});

it("exposes eight two-family advanced concepts while one remains provisional", () => {
  const state = createInitialState();
  state.events = currentCourse.lessons.flatMap((lesson) =>
    lesson.steps
      .filter((step) => step.evidence)
      .map((step, index): EvidenceEvent => ({
        id: `${lesson.id}/${step.id}`,
        lessonId: lesson.id,
        stepId: step.id,
        conceptIds: [...step.evidence!.conceptIds],
        evidenceVersion: step.evidence!.version,
        kind: step.evidenceKind,
        evaluator: step.evaluator?.kind,
        passed: true,
        hints: 0,
        revealed: false,
        at: index + 1,
      })),
  );
  expect(
    currentCourse.concepts
      .filter(
        (concept) =>
          concept.evidenceCalibration &&
          independentCodingTaskIds(state, concept.id, courseEvidencePolicy)
            .length < concept.evidenceCalibration.minimumCodingTasks,
      )
      .map((concept) => concept.id),
  ).toEqual(["stack-heap"]);
  expect(
    independentCodingTaskIds(
      state,
      "async-lending-send-boundary",
      courseEvidencePolicy,
    ),
  ).toEqual([
    "async-lending/send-boundary-v1",
    "async-lending/send-prepared-handoff-v1",
  ]);
});

it("binds the pre-A1 golden to the accepted main snapshot captured before implementation", () => {
  expect(baseline.provenance.head).toBe(
    "3c1ee89c3d46b0b1b9e3798a317587464a236e5c",
  );
  expect(baseline.provenance.tree).toBe(
    "7638d5f7a07ca24907a15edec7ea7d3627496d18",
  );
  expect(
    createHash("sha256")
      .update(
        readFileSync(
          new URL("./fixtures/async-send-pre-handoff.json", import.meta.url),
        ),
      )
      .digest("hex"),
  ).toBe("6d4e410f8752934b4ccc308f6982e67b1f2d39d1e6abd628109bda52232a304f");
});
