import { expect, test, type Page } from "@playwright/test";
import { lessons, modules, projects } from "../../src/content/course";
import {
  courseEvidencePolicy,
  courseEvidenceSummary,
  revealCourseProjectPackageVariant,
} from "../../src/content/learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  stepKey,
} from "../../src/persistence/state";
import {
  gateRecovery,
  independentCodingTaskIds,
} from "../../src/engine/learning";
import type { EvidenceEvent, UserState } from "../../src/domain/types";

const lesson = lessons.find((item) => item.id === "unsafe-miri-byte-view")!;
const gate = lesson.steps.find((step) => step.id === "byte-view-gate")!;
const supplementary = lesson.steps.find(
  (step) => step.id === "byte-view-contract-gate",
)!;
const conceptId = lesson.conceptIds[0];
const gateTests = gate.evaluator?.kind === "tests" ? gate.evaluator.tests : "";
const criterion = modules
  .find((module) => module.id === lesson.moduleId)!
  .gateCriteria!.find((item) =>
    item.taskRefs.some(
      (ref) => ref.lessonId === lesson.id && ref.stepId === gate.id,
    ),
  )!;
const gateKey = stepKey(lesson.id, gate.id);
const supplementaryKey = stepKey(lesson.id, supplementary.id);
const legacyEvent: EvidenceEvent = {
  id: "browser-preserved-legacy-event",
  conceptIds: [conceptId],
  lessonId: lesson.id,
  stepId: "byte-view-run",
  kind: "exposure",
  passed: true,
  hints: 0,
  revealed: false,
  at: 1_700_000_000_000,
  evaluator: "exact-output",
};

const assistanceCases = [
  { label: "saved hint only", hints: 1, revealed: false },
  { label: "saved reveal only", hints: 0, revealed: true },
] as const;

function importedState(
  assistance: (typeof assistanceCases)[number],
): UserState {
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 0,
    recommendation: "",
  };
  state.settings.accessibleEditor = true;
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: lesson.id,
    stepIndex: lesson.steps.indexOf(gate),
    panel: "lesson",
  };
  state.steps[gateKey] = {
    ...createStepProgress(gate.code),
    code: "// draft-before-import",
  };
  state.steps[supplementaryKey] = {
    ...createStepProgress(supplementary.code),
    hints: assistance.hints,
    revealed: assistance.revealed,
  };
  state.events = [legacyEvent];
  state.reviewSession = {
    conceptId,
    mode: "challenge",
    sessionId: "browser-review-identity",
    startedAt: 1_700_000_000_000,
    wasDue: false,
    exerciseId: "review-unsafe-miri-byte-view",
  };
  state.review = [
    {
      conceptId,
      dueAt: 1_700_000_000_001,
      intervalDays: 1,
      attempts: 1,
      reason: "browser-preserved-review",
    },
  ];
  return state;
}

async function seedState(page: Page, state: UserState) {
  await page.evaluate(async (nextState) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("user-state"))
          request.result.createObjectStore("user-state");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("user-state", "readwrite");
        transaction.objectStore("user-state").put(nextState, "current");
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, state);
  await page.reload();
}

async function savedState(page: Page): Promise<UserState> {
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const read = database
            .transaction("user-state", "readonly")
            .objectStore("user-state")
            .get("current");
          read.onsuccess = () => {
            database.close();
            resolve(read.result as UserState);
          };
          read.onerror = () => reject(read.error);
        };
      }),
  );
}

async function importThroughUi(page: Page, state: UserState) {
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  await page.getByLabel("Importuj postęp").setInputFiles({
    name: "advanced-family-state.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportState(state)),
  });
  await expect(page.getByText("Gotowy do importu")).toBeVisible();
  await page.getByRole("button", { name: "Zastąp postęp tym plikiem" }).click();
}

for (const assistance of assistanceCases) {
  test(`imports ${assistance.label} on the supplementary alias and preserves evidence boundaries`, async ({
    page,
  }) => {
    await page.goto("/");
    const before = importedState(assistance);
    const baseline = createInitialState();
    baseline.onboarding = { completed: true, name: "Ada", minutes: 15 };
    baseline.diagnostic = {
      completed: true,
      answers: {},
      score: 0,
      recommendation: "",
    };
    baseline.settings.accessibleEditor = true;
    await seedState(page, baseline);
    await importThroughUi(page, before);
    await page.reload();

    await expect(page.locator(".task-pane")).toContainText(
      "Historia tego zadania zawiera podpowiedź lub odsłonięcie",
    );
    await expect(page.locator(".task-pane")).toContainText(
      "Bieżący kontrakt: wersja 2",
    );
    const imported = await savedState(page);
    expect(imported.events[0]).toEqual(legacyEvent);
    expect(
      imported.events.filter((event) => event.stepId === supplementary.id),
    ).toHaveLength(0);
    expect(imported.steps[supplementaryKey]).toMatchObject({
      hints: assistance.hints,
      revealed: assistance.revealed,
    });
    expect(imported.reviewSession?.sessionId).toBe("browser-review-identity");
    expect(imported.steps[gateKey].code).toBe("// draft-before-import");
    let runnerCall = false;
    await page.route("**/api/run", async (route) => {
      const request = route.request().postDataJSON();
      expect(request).toMatchObject({
        mode: "test",
        code: gate.solution,
        tests: gateTests,
      });
      runnerCall = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          stdout: "mocked authored contract tests passed",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
          tests: { passed: 4, failed: 0 },
        }),
      });
    });
    const beforeSubmit = await savedState(page);
    const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    await editor.fill(gate.solution!);
    const runResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/run"),
    );
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await runResponse;
    await expect
      .poll(async () => (await savedState(page)).events.length)
      .toBe(beforeSubmit.events.length + 1);

    const after = await savedState(page);
    expect(runnerCall).toBe(true);
    expect(after.events[0]).toEqual(legacyEvent);
    expect(after.events.at(-1)).toMatchObject({
      lessonId: lesson.id,
      stepId: gate.id,
      conceptIds: [conceptId],
      evidenceVersion: 2,
      kind: "transfer",
      evaluator: "tests",
      passed: true,
      hints: assistance.hints,
      revealed: assistance.revealed,
      gate: true,
    });
    expect(after.reviewSession?.sessionId).toBe("browser-review-identity");
    expect(after.steps[gateKey].completed).toBe(true);
    expect(courseEvidenceSummary(after, conceptId).qualifyingCodingTasks).toBe(
      0,
    );
    expect(gateRecovery(after, criterion, lessons)).toEqual({
      status: "available",
      task: {
        lessonId: lesson.id,
        stepId: "byte-view-initialized-prefix",
      },
    });
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    await expect(page.locator(".solution-warning")).toContainText(
      "możesz przejść do dostępnego świeżego zadania",
    );
  });
}

// Intercepted successes below verify production UI/state flow only; no Rust runs.
const asyncTransferCases = [
  {
    lessonId: "async-lending-send-boundary",
    conceptId: "async-lending-send-boundary",
    stepId: "async-lending-send-boundary-prepared-handoff",
    family: "async-lending/send-prepared-handoff-v1",
    oldFamily: "async-lending/send-boundary-v1",
    reviewExerciseId: "async-lending-send-boundary-review",
    mockPassed: 7,
    oldStepId: "async-lending-send-boundary-gate",
    blankStepId: "async-lending-send-boundary-blank",
  },
  {
    lessonId: "async-lending-callbacks",
    conceptId: "async-lending-callback-borrow",
    stepId: "async-lending-callbacks-bounded-transform",
    family: "async-lending/callback-bounded-transform-v1",
    oldFamily: "async-lending/sequential-callback-v1",
    reviewExerciseId: "async-lending-callbacks-review",
    mockPassed: 8,
    oldStepId: "async-lending-callbacks-gate",
    blankStepId: "async-lending-callbacks-blank",
  },
  {
    lessonId: "async-lending-dyn-adapter",
    conceptId: "async-lending-dyn-adapter",
    stepId: "async-lending-dyn-adapter-borrowed-sources",
    family: "async-lending/dyn-borrowed-sources-v1",
    oldFamily: "async-lending/dyn-adapter-v1",
    reviewExerciseId: "async-lending-dyn-adapter-review",
    mockPassed: 7,
    oldStepId: "async-lending-dyn-adapter-gate",
    blankStepId: "async-lending-dyn-adapter-blank",
  },
  {
    lessonId: "async-lending-cancel-commit",
    conceptId: "async-lending-cancel-commit",
    stepId: "async-lending-cancel-commit-lost-reply",
    family: "async-lending/cancel-lost-reply-v1",
    oldFamily: "async-lending/cancel-commit-v1",
    reviewExerciseId: "async-lending-cancel-commit-review",
    mockPassed: 9,
    oldStepId: "async-lending-cancel-commit-gate",
    blankStepId: "async-lending-cancel-commit-blank",
  },
  {
    lessonId: "unsafe-miri-byte-view",
    conceptId: "unsafe-miri-byte-view-contract",
    stepId: "byte-view-initialized-prefix",
    family: "unsafe-miri/initialized-prefix-v1",
    oldFamily: "unsafe-miri/byte-view-v1",
    reviewExerciseId: "review-unsafe-miri-byte-view",
    mockPassed: 8,
    oldStepId: "byte-view-gate",
    blankStepId: "byte-view-blank",
  },
  {
    lessonId: "unsafe-miri-slot-state",
    conceptId: "unsafe-miri-slot-state-contract",
    stepId: "slot-state-lazy-init-transfer",
    family: "unsafe-miri/slot-lazy-init-v1",
    oldFamily: "unsafe-miri/slot-state-v1",
    reviewExerciseId: "review-unsafe-miri-slot-state",
    mockPassed: 5,
    oldStepId: "slot-state-gate",
    blankStepId: "slot-state-blank",
  },
] as const;

type AsyncTransferCase = (typeof asyncTransferCases)[number];

function asyncTransferContext(item: AsyncTransferCase) {
  const lesson = lessons.find((candidate) => candidate.id === item.lessonId)!;
  const oldStep = lesson.steps.find(
    (candidate) => candidate.id === item.oldStepId,
  )!;
  const blank = lesson.steps.find(
    (candidate) => candidate.id === item.blankStepId,
  )!;
  const transfer = lesson.steps.find(
    (candidate) => candidate.id === item.stepId,
  )!;
  if (item.lessonId === "unsafe-miri-slot-state") {
    expect(lesson.steps[8]).toBe(transfer);
    expect(lesson.steps.at(-1)?.id).toBe("slot-state-move-transfer");
  } else {
    expect(lesson.steps.at(-1)).toBe(transfer);
  }
  expect(transfer.evidence).toEqual({
    version: 2,
    conceptIds: [item.conceptId],
    codingTaskId: item.family,
  });
  const stage = modules.find((candidate) => candidate.id === lesson.moduleId)!;
  const criterion = stage.gateCriteria!.find((candidate) =>
    candidate.taskRefs.some((ref) => ref.stepId === item.stepId),
  )!;
  return { lesson, oldStep, blank, transfer, stage, criterion };
}

function oldAsyncState(item: AsyncTransferCase, helped: boolean): UserState {
  const { lesson, oldStep, blank } = asyncTransferContext(item);
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 0,
    recommendation: "",
  };
  state.settings.accessibleEditor = true;
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: lesson.id,
    stepIndex: lesson.steps.indexOf(oldStep),
    panel: "lesson",
  };
  state.steps[stepKey(lesson.id, oldStep.id)] = {
    ...createStepProgress(oldStep.code),
    code: `// exact old ${item.lessonId} draft\n`,
    completed: true,
    attempts: [
      {
        at: 1_700_000_000_003,
        code: "// preserved old attempt",
        passed: true,
        feedback: "preserved old feedback",
      },
    ],
  };
  state.steps[stepKey(lesson.id, blank.id)] = {
    ...createStepProgress(blank.code),
    hints: helped ? 1 : 0,
  };
  if (
    item.lessonId === "async-lending-send-boundary" ||
    item.lessonId === "async-lending-cancel-commit"
  ) {
    // A historically completed five-step lesson does not pass the appended work.
    for (const step of lesson.steps.slice(0, 5)) {
      const key = stepKey(lesson.id, step.id);
      state.steps[key] = {
        ...(state.steps[key] ?? createStepProgress(step.code)),
        completed: true,
      };
    }
  }
  state.events = [
    {
      id: `preserved-${item.lessonId}-old-event`,
      lessonId: lesson.id,
      stepId: oldStep.id,
      conceptIds: [item.conceptId],
      evidenceVersion: 2,
      kind: oldStep.evidenceKind,
      evaluator: "tests",
      passed: true,
      hints: helped ? 1 : 0,
      revealed: false,
      gate: true,
      at: 1_700_000_000_003,
    },
  ];
  state.notes[lesson.id] = "Notatka sprzed dodania drugiej rodziny.";
  state.bookmarks = [lesson.id];
  state.reviewSession = {
    conceptId: item.conceptId,
    mode: "challenge",
    sessionId: `preserved-${item.lessonId}-review-session`,
    exerciseId: item.reviewExerciseId,
    startedAt: 1_700_000_000_002,
    wasDue: false,
  };
  state.review = [
    {
      conceptId: item.conceptId,
      dueAt: 1_700_000_000_004,
      intervalDays: 1,
      attempts: 1,
      reason: "preserved old review",
    },
  ];
  return state;
}

async function importOldAsyncState(
  page: Page,
  before: UserState,
  item: AsyncTransferCase,
  helped: boolean,
) {
  const expectedFamilies = helped ? [] : [item.oldFamily];
  expect(
    courseEvidencePolicy.definitionForEvent(before.events[0])?.codingTaskId,
  ).toBe(item.oldFamily);
  expect(
    independentCodingTaskIds(before, item.conceptId, courseEvidencePolicy),
  ).toEqual(expectedFamilies);
  await page.goto("/");
  const baseline = createInitialState();
  baseline.onboarding = before.onboarding;
  baseline.diagnostic = before.diagnostic;
  baseline.settings.accessibleEditor = true;
  await seedState(page, baseline);
  await importThroughUi(page, before);
  await expect
    .poll(async () => (await savedState(page)).reviewSession)
    .toEqual(before.reviewSession);
  await page.reload();
  const imported = await savedState(page);
  expect(imported.schemaVersion).toBe(3);
  expect(imported.steps[stepKey(item.lessonId, item.stepId)]).toBeUndefined();
  expect(
    imported.events.some(
      (event) =>
        event.lessonId === item.lessonId && event.stepId === item.stepId,
    ),
  ).toBe(false);
  expect(imported.resume).toEqual(before.resume);
  expect(imported.reviewSession).toEqual(before.reviewSession);
  expect(imported.review).toEqual(before.review);
  expect(imported.notes).toEqual(before.notes);
  expect(imported.bookmarks).toEqual(before.bookmarks);
  expect(imported.ratings).toEqual(before.ratings);
  expect(imported.settings).toEqual(before.settings);
  for (const [key, progress] of Object.entries(before.steps)) {
    expect(imported.steps[key]).toEqual(progress);
  }
  expect(
    imported.events.find((event) => event.id === before.events[0].id),
  ).toEqual(before.events[0]);
  const importedOldEvent = imported.events.find(
    (event) => event.id === before.events[0].id,
  )!;
  expect(
    courseEvidencePolicy.definitionForEvent(importedOldEvent)?.codingTaskId,
  ).toBe(item.oldFamily);
  expect(
    independentCodingTaskIds(imported, item.conceptId, courseEvidencePolicy),
  ).toEqual(expectedFamilies);
  await expect(
    page.getByRole("textbox", { name: "Kod Rust", exact: true }),
  ).toHaveValue(
    before.steps[
      stepKey(
        before.resume.lessonId,
        lessons.find((lesson) => lesson.id === before.resume.lessonId)!.steps[
          before.resume.stepIndex
        ].id,
      )
    ].code!,
  );
}

async function openAsyncTransfer(page: Page, item: AsyncTransferCase) {
  const { lesson, transfer } = asyncTransferContext(item);
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.indexOf(transfer))
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(transfer.title);
}

function observeBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function revealAsyncSolution(
  page: Page,
  item: { lessonId: string; stepId: string },
) {
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const progress = (await savedState(page)).steps[
        stepKey(item.lessonId, item.stepId)
      ];
      return { hints: progress?.hints, revealed: progress?.revealed };
    })
    .toEqual({ hints: 2, revealed: true });
}

for (const item of asyncTransferCases) {
  for (const helped of [false, true]) {
    test(`${item.stepId}: old ${helped ? "helped" : "clean"} schema3 resume and mocked success retain exact identities (UI/state only)`, async ({
      page,
    }) => {
      const errors = observeBrowserErrors(page);
      const { lesson, oldStep, blank, transfer, stage, criterion } =
        asyncTransferContext(item);
      const before = oldAsyncState(item, helped);
      await importOldAsyncState(page, before, item, helped);
      await expect(page.locator(".task-pane h1")).toHaveText(oldStep.title);
      if (helped) {
        await expect(page.locator(".task-pane")).toContainText(
          "Historia tego zadania zawiera podpowiedź lub odsłonięcie",
        );
        await page
          .getByRole("button", { name: stage.title, exact: true })
          .click();
        const criterionRow = page
          .locator(".gate-panel li")
          .filter({
            has: page.getByText(criterion.label, { exact: true }),
          });
        await expect(criterionRow).toHaveCount(1);
        await criterionRow
          .getByRole("button", { name: "Sprawdź w zadaniu" })
          .click();
        await expect(page.locator(".task-pane h1")).toHaveText(transfer.title);
      } else {
        await openAsyncTransfer(page, item);
      }
      const editor = page.getByRole("textbox", {
        name: "Kod Rust",
        exact: true,
      });
      const draft = `${transfer.solution}\n// retained ${item.stepId} draft\n`;
      await editor.fill(draft);
      await expect
        .poll(
          async () =>
            (await savedState(page)).steps[stepKey(lesson.id, item.stepId)]
              ?.code,
        )
        .toBe(draft);
      await page.reload();
      await expect(page.locator(".task-pane h1")).toHaveText(transfer.title);
      await expect(editor).toHaveValue(draft);
      if (
        item.lessonId === "async-lending-send-boundary" ||
        item.lessonId === "async-lending-cancel-commit" ||
        item.lessonId === "unsafe-miri-slot-state"
      ) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByRole("tab", { name: "Kod", exact: true }).click();
        await expect(editor).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await editor.focus();
        await page.keyboard.press("Tab");
        await expect(
          page.getByRole("button", { name: "Monaco Editor", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(editor).toBeFocused();
      }
      const reloaded = await savedState(page);
      expect(reloaded.resume.lessonId).toBe(lesson.id);
      expect(reloaded.resume.stepIndex).toBe(lesson.steps.indexOf(transfer));
      expect(reloaded.reviewSession).toEqual(before.reviewSession);
      let requests = 0;
      await page.route("**/api/run", async (route) => {
        requests += 1;
        expect(route.request().postDataJSON()).toEqual({
          code: draft,
          mode: "test",
          tests:
            transfer.evaluator?.kind === "tests"
              ? transfer.evaluator.tests
              : undefined,
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "success",
            stdout: "mocked transfer success: UI/state only; Rust not executed",
            stderr: "",
            diagnostics: [],
            durationMs: 1,
            tests: {
              passed: item.mockPassed,
              failed: 0,
            },
          }),
        });
      });
      const response = page.waitForResponse((response) =>
        response.url().endsWith("/api/run"),
      );
      await page
        .getByRole("button", { name: "Uruchom testy", exact: true })
        .click();
      await response;
      await expect
        .poll(
          async () =>
            (await savedState(page)).events.filter(
              (event) =>
                event.stepId === item.stepId && event.kind === "transfer",
            ).length,
        )
        .toBe(1);
      const after = await savedState(page);
      const event = after.events.find(
        (event) => event.stepId === item.stepId && event.kind === "transfer",
      )!;
      expect(requests).toBe(1);
      expect(event).toMatchObject({
        lessonId: lesson.id,
        stepId: item.stepId,
        conceptIds: [item.conceptId],
        evidenceVersion: 2,
        kind: "transfer",
        evaluator: "tests",
        gate: true,
        passed: true,
        hints: 0,
        revealed: false,
      });
      expect(event).not.toHaveProperty("codingTaskId");
      expect(courseEvidencePolicy.definitionForEvent(event)?.codingTaskId).toBe(
        item.family,
      );
      expect(
        independentCodingTaskIds(after, item.conceptId, courseEvidencePolicy),
      ).toEqual(helped ? [item.family] : [item.oldFamily, item.family]);
      expect(
        courseEvidenceSummary(after, item.conceptId).qualifyingCodingTasks,
      ).toBe(helped ? 1 : 2);
      expect(
        courseEvidenceSummary(after, item.conceptId).requiredCodingTasks,
      ).toBe(2);
      expect(gateRecovery(after, criterion, lessons).status).toBe("complete");
      expect(
        after.events.find((event) => event.id === before.events[0].id),
      ).toEqual(before.events[0]);
      expect(after.steps[stepKey(lesson.id, oldStep.id)]).toEqual(
        before.steps[stepKey(lesson.id, oldStep.id)],
      );
      expect(after.steps[stepKey(lesson.id, blank.id)]).toEqual(
        before.steps[stepKey(lesson.id, blank.id)],
      );
      expect(after.reviewSession).toEqual(before.reviewSession);
      await expect(page.locator(".task-pane")).toContainText(
        `samodzielne zadania kodowe ${helped ? 1 : 2}/2`,
      );
      expect(errors).toEqual([]);
    });
  }

  test(`${item.stepId}: reveal stays in its family and preserves prior raw clean evidence`, async ({
    page,
  }) => {
    const errors = observeBrowserErrors(page);
    const { lesson, oldStep, blank } = asyncTransferContext(item);
    const before = oldAsyncState(item, false);
    const unrelated = asyncTransferCases.find(
      (candidate) => candidate !== item,
    )!;
    const unrelatedKey = stepKey(unrelated.lessonId, unrelated.stepId);
    before.steps[unrelatedKey] = createStepProgress("// unrelated draft");
    await importOldAsyncState(page, before, item, false);
    await openAsyncTransfer(page, item);
    await revealAsyncSolution(page, item);
    const after = await savedState(page);
    expect(after.steps[stepKey(lesson.id, item.stepId)]).toMatchObject({
      hints: 2,
      revealed: true,
    });
    expect(after.steps[stepKey(lesson.id, oldStep.id)]).toEqual(
      before.steps[stepKey(lesson.id, oldStep.id)],
    );
    expect(after.steps[stepKey(lesson.id, blank.id)]).toEqual(
      before.steps[stepKey(lesson.id, blank.id)],
    );
    expect(after.steps[unrelatedKey]).toEqual(before.steps[unrelatedKey]);
    expect(
      after.events.find((event) => event.id === before.events[0].id),
    ).toEqual(before.events[0]);
    expect(
      independentCodingTaskIds(after, item.conceptId, courseEvidencePolicy),
    ).toEqual([item.oldFamily]);
    await page
      .getByLabel("Kroki lekcji")
      .getByRole("button")
      .nth(lesson.steps.indexOf(blank))
      .click();
    await expect(page.locator(".task-pane h1")).toHaveText(blank.title);
    await expect(page.locator(".task-pane")).not.toContainText(
      "Historia tego zadania zawiera podpowiedź lub odsłonięcie",
    );
    await expect(
      page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`${item.stepId}: ${item.lessonId === "unsafe-miri-slot-state" ? "older helped families route to the final task before exhaustion" : "both helped families show exhaustion"} without clearing old assistance`, async ({
    page,
  }) => {
    const errors = observeBrowserErrors(page);
    const { lesson, blank, stage, criterion } = asyncTransferContext(item);
    const before = oldAsyncState(item, true);
    await importOldAsyncState(page, before, item, true);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    await page
      .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
      .click();
    await expect(page.locator(".solution-warning")).toContainText(
      "możesz przejść do dostępnego świeżego zadania",
    );
    await openAsyncTransfer(page, item);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    await page
      .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
      .click();
    await expect(page.locator(".solution-warning")).toContainText(
      item.lessonId === "unsafe-miri-slot-state"
        ? "możesz przejść do dostępnego świeżego zadania"
        : "potwierdzenie samodzielności poczeka na inne świeże zadanie",
    );
    await page
      .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
      .click();
    if (item.lessonId === "unsafe-miri-slot-state") {
      const fresh = lesson.steps.find(
        (step) => step.id === "slot-state-move-transfer",
      )!;
      expect(gateRecovery(await savedState(page), criterion, lessons)).toEqual({
        status: "available",
        task: { lessonId: lesson.id, stepId: fresh.id },
      });
      await page
        .getByRole("button", { name: stage.title, exact: true })
        .click();
      await page
        .locator(".gate-panel li")
        .filter({
          has: page.getByText(criterion.label, { exact: true }),
        })
        .getByRole("button", { name: "Sprawdź w zadaniu" })
        .click();
      await expect(page.locator(".task-pane h1")).toHaveText(fresh.title);
      await revealAsyncSolution(page, {
        lessonId: lesson.id,
        stepId: fresh.id,
      });
    }
    const after = await savedState(page);
    expect(after.steps[stepKey(lesson.id, blank.id)]).toEqual(
      before.steps[stepKey(lesson.id, blank.id)],
    );
    expect(
      after.events.find((event) => event.id === before.events[0].id),
    ).toEqual(before.events[0]);
    expect(
      courseEvidenceSummary(after, item.conceptId).qualifyingCodingTasks,
    ).toBe(0);
    expect(gateRecovery(after, criterion, lessons).status).toBe("exhausted");
    await page.getByRole("button", { name: stage.title, exact: true }).click();
    await expect(page.locator(".module-connections")).toContainText(
      "Brak świeżego samodzielnego wariantu",
    );
    const criterionRow = page
      .locator(".gate-panel li")
      .filter({
        has: page.getByText(
          `${criterion.label} · Brak świeżego samodzielnego wariantu`,
          { exact: true },
        ),
      });
    await expect(criterionRow).toHaveCount(1);
    await expect(criterionRow).toContainText(
      "Brak świeżego samodzielnego wariantu",
    );
    await expect(
      criterionRow.getByRole("button", { name: "Sprawdź w zadaniu" }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("prepared handoff reveal persists across retry without laundering assistance (UI/state only)", async ({
  page,
}) => {
  const item = asyncTransferCases.find(
    (candidate) => candidate.lessonId === "async-lending-send-boundary",
  )!;
  const errors = observeBrowserErrors(page);
  const { lesson, transfer, criterion } = asyncTransferContext(item);
  const before = oldAsyncState(item, false);
  await importOldAsyncState(page, before, item, false);
  await openAsyncTransfer(page, item);
  await revealAsyncSolution(page, item);
  await page.reload();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(transfer.solution!);
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: transfer.solution,
      mode: "test",
      tests:
        transfer.evaluator?.kind === "tests"
          ? transfer.evaluator.tests
          : undefined,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "assisted retry: UI/state only",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 7, failed: 0 },
      }),
    });
  });
  const beforeRetry = await savedState(page);
  const isSubmittedTransfer = (event: EvidenceEvent) =>
    event.lessonId === lesson.id &&
    event.stepId === item.stepId &&
    event.kind === "transfer" &&
    event.evaluator === "tests" &&
    event.passed;
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await savedState(page)).events.filter(isSubmittedTransfer).length,
    )
    .toBe(1);
  const after = await savedState(page);
  expect(after.events.slice(0, beforeRetry.events.length)).toEqual(
    beforeRetry.events,
  );
  const submitted = after.events.find(isSubmittedTransfer)!;
  expect(courseEvidencePolicy.definitionForEvent(submitted)?.codingTaskId).toBe(
    item.family,
  );
  expect(submitted).toMatchObject({
    hints: 2,
    revealed: true,
    kind: "transfer",
    evidenceVersion: 2,
  });
  expect(
    after.events.find((event) => event.id === before.events[0].id),
  ).toEqual(before.events[0]);
  expect(after.steps[stepKey(lesson.id, item.stepId)]).toMatchObject({
    hints: 2,
    revealed: true,
  });
  expect(
    independentCodingTaskIds(after, item.conceptId, courseEvidencePolicy),
  ).toEqual([item.oldFamily]);
  expect(gateRecovery(after, criterion, lessons).status).toBe("complete");
  expect(errors).toEqual([]);
});

test("lost reply reveal persists across retry without laundering assistance (UI/state only)", async ({
  page,
}) => {
  const item = asyncTransferCases.find(
    (candidate) => candidate.lessonId === "async-lending-cancel-commit",
  )!;
  const errors = observeBrowserErrors(page);
  const { lesson, transfer, criterion } = asyncTransferContext(item);
  const before = oldAsyncState(item, false);
  await importOldAsyncState(page, before, item, false);
  await openAsyncTransfer(page, item);
  await revealAsyncSolution(page, item);
  await page.reload();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(transfer.solution!);
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: transfer.solution,
      mode: "test",
      tests:
        transfer.evaluator?.kind === "tests"
          ? transfer.evaluator.tests
          : undefined,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "assisted retry: UI/state only",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: item.mockPassed, failed: 0 },
      }),
    });
  });
  const beforeRetry = await savedState(page);
  const isSubmittedTransfer = (event: EvidenceEvent) =>
    event.lessonId === lesson.id &&
    event.stepId === item.stepId &&
    event.kind === "transfer" &&
    event.evaluator === "tests" &&
    event.passed;
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await savedState(page)).events.filter(isSubmittedTransfer).length,
    )
    .toBe(1);
  const after = await savedState(page);
  expect(after.events.slice(0, beforeRetry.events.length)).toEqual(
    beforeRetry.events,
  );
  const submitted = after.events.find(isSubmittedTransfer)!;
  expect(submitted).toMatchObject({
    lessonId: lesson.id,
    stepId: item.stepId,
    kind: "transfer",
    evaluator: "tests",
    passed: true,
    hints: 2,
    revealed: true,
    evidenceVersion: 2,
  });
  expect(courseEvidencePolicy.definitionForEvent(submitted)?.codingTaskId).toBe(
    item.family,
  );
  expect(
    independentCodingTaskIds(after, item.conceptId, courseEvidencePolicy),
  ).toEqual([item.oldFamily]);
  expect(gateRecovery(after, criterion, lessons).status).toBe("complete");
  expect(errors).toEqual([]);
});

test("initialized-prefix assisted primary retry stays uncredited without a prior clean new-family submission (UI/state only)", async ({
  page,
}) => {
  const item = asyncTransferCases.find(
    (candidate) => candidate.lessonId === "unsafe-miri-byte-view",
  )!;
  const errors = observeBrowserErrors(page);
  const { lesson, transfer, criterion } = asyncTransferContext(item);
  const before = oldAsyncState(item, false);
  await importOldAsyncState(page, before, item, false);
  await openAsyncTransfer(page, item);
  await revealAsyncSolution(page, item);
  await page.reload();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(transfer.solution!);
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: transfer.solution,
      mode: "test",
      tests:
        transfer.evaluator?.kind === "tests" ? transfer.evaluator.tests : undefined,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "initialized-prefix assisted retry: UI/state only",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: item.mockPassed, failed: 0 },
      }),
    });
  });
  const beforeRetry = await savedState(page);
  await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
  const isMatchingSubmission = (event: EvidenceEvent) =>
    event.lessonId === lesson.id &&
    event.stepId === item.stepId &&
    event.kind === "transfer" &&
    event.evaluator === "tests" &&
    event.passed;
  await expect
    .poll(async () =>
      (await savedState(page)).events.filter(isMatchingSubmission).length,
    )
    .toBe(1);
  const after = await savedState(page);
  expect(after.events.slice(0, beforeRetry.events.length)).toEqual(
    beforeRetry.events,
  );
  const matchingSubmissions = after.events.filter(isMatchingSubmission);
  expect(matchingSubmissions).toHaveLength(1);
  const submitted = matchingSubmissions[0];
  expect(submitted).toMatchObject({
    lessonId: lesson.id,
    stepId: item.stepId,
    kind: "transfer",
    evaluator: "tests",
    passed: true,
    hints: 2,
    revealed: true,
    evidenceVersion: 2,
  });
  expect(courseEvidencePolicy.definitionForEvent(submitted)?.codingTaskId).toBe(
    item.family,
  );
  expect(
    independentCodingTaskIds(after, item.conceptId, courseEvidencePolicy),
  ).toEqual([item.oldFamily]);
  expect(gateRecovery(after, criterion, lessons).status).toBe("complete");
  expect(errors).toEqual([]);
});

test("A2 cancellation prose stays within the mobile viewport", async ({
  page,
}, testInfo) => {
  const lesson = lessons.find(
    (candidate) => candidate.id === "async-lending-cancel-commit",
  )!;
  const model = lesson.steps.find(
    (candidate) =>
      candidate.id === "async-lending-cancel-commit-reply-model",
  )!;
  const primary = lesson.steps.find(
    (candidate) => candidate.id === "async-lending-cancel-commit-lost-reply",
  )!;
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 0,
    recommendation: "",
  };
  state.settings.accessibleEditor = true;
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: lesson.id,
    stepIndex: lesson.steps.indexOf(model),
    panel: "lesson",
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await seedState(page, state);

  const modelHeading = page.getByRole("heading", {
    name: "Przewiduj cztery stany po utracie odpowiedzi",
    exact: true,
  });
  const modelPrompt = page.locator(
    ".task-pane .task-prompt .learning-text",
  );
  await modelHeading.waitFor();
  await modelPrompt.waitFor();
  const modelHeadingText = await modelHeading.textContent();
  const modelObservation = await page.evaluate(() => {
    const prompt = document.querySelector(
      ".task-pane .task-prompt .learning-text",
    );
    const rect = prompt?.getBoundingClientRect();
    return {
      documentWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      innerWidth: window.innerWidth,
      promptRight: rect?.right ?? Number.NaN,
      promptText: prompt?.textContent ?? "",
    };
  });

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.indexOf(primary))
    .click();
  const primaryHeading = page.getByRole("heading", {
    name: "Zachowaj commit po utracie odpowiedzi",
    exact: true,
  });
  const primaryPrompt = page.locator(
    ".task-pane .task-prompt .learning-text",
  );
  await primaryHeading.waitFor();
  await primaryPrompt.waitFor();
  const primaryHeadingText = await primaryHeading.textContent();
  const primaryObservation = await page.evaluate(() => {
    const prompt = document.querySelector(
      ".task-pane .task-prompt .learning-text",
    );
    const rect = prompt?.getBoundingClientRect();
    return {
      documentWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      innerWidth: window.innerWidth,
      promptRight: rect?.right ?? Number.NaN,
      promptText: prompt?.textContent ?? "",
    };
  });
  await testInfo.attach("a2-mobile-wrapping-observations.json", {
    body: JSON.stringify(
      {
        viewport: { width: 390, height: 844 },
        model: modelObservation,
        primary: primaryObservation,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  const afterVisits = await savedState(page);
  const observations = [modelObservation, primaryObservation];

  for (const observation of observations) {
    expect(observation.documentWidth).toBeLessThanOrEqual(
      observation.innerWidth + 1,
    );
    expect(observation.promptRight).toBeLessThanOrEqual(
      observation.innerWidth + 1,
    );
  }
  expect(modelHeadingText).toBe(
    "Przewiduj cztery stany po utracie odpowiedzi",
  );
  expect(primaryHeadingText).toBe("Zachowaj commit po utracie odpowiedzi");
  expect(modelObservation.promptText).toContain(
    "https://github.com/fettpl/rustcrushcourse/blob/main/docs/capstone-change-review.md",
  );
  expect(modelObservation.promptText).toContain(
    "Wybierz i opisz wszystkie cztery stany: (1) przed pierwszym poll",
  );
  expect(primaryObservation.promptText).toContain(
    "https://github.com/fettpl/rustcrushcourse/blob/main/docs/capstone-change-review.md",
  );
  expect(primaryObservation.promptText).toContain(
    "Dla tego samego klucza i tego samego payloadu zwróć oryginalny receipt",
  );
  expect(
    afterVisits.events.some(
      (event) =>
        event.lessonId === lesson.id &&
        event.stepId === primary.id &&
        event.kind === "transfer" &&
        event.evaluator === "tests" &&
        event.passed,
    ),
  ).toBe(false);
});

test("initialized prefix preserves old seven-step history through import, help, and mobile resume", async ({
  page,
}) => {
  const initializedLesson = lessons.find(
    (candidate) => candidate.id === "unsafe-miri-byte-view",
  )!;
  const oldSteps = initializedLesson.steps.slice(0, 7);
  const model = initializedLesson.steps.find(
    (candidate) => candidate.id === "byte-view-initialized-prefix-model",
  )!;
  const primary = initializedLesson.steps.find(
    (candidate) => candidate.id === "byte-view-initialized-prefix",
  )!;
  expect(initializedLesson.steps.slice(7).map((step) => step.id)).toEqual([
    model.id,
    primary.id,
  ]);
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 0,
    recommendation: "",
  };
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: initializedLesson.id,
    stepIndex: 6,
    panel: "lesson",
  };
  for (const [index, step] of oldSteps.entries()) {
    state.steps[stepKey(initializedLesson.id, step.id)] = {
      ...createStepProgress(step.code),
      code: `// old seven draft ${index}`,
      completed: true,
      attempts: [],
    };
    state.events.push({
      id: `old-byte-view-${index}`,
      lessonId: initializedLesson.id,
      stepId: step.id,
      conceptIds: initializedLesson.conceptIds,
      kind: step.evidenceKind,
      evaluator: step.evaluator?.kind,
      passed: true,
      hints: 0,
      revealed: false,
      at: 1_700_000_000_000 + index,
      ...(step.evidence ? { evidenceVersion: step.evidence.version } : {}),
    });
  }
  state.notes[initializedLesson.id] = "Stara notatka zachowana po migracji.";
  state.bookmarks = [initializedLesson.id];
  const importedRawPrefix = state.events.slice();
  await page.goto("/");
  const baseline = createInitialState();
  baseline.onboarding = { completed: true, name: "Ada", minutes: 15 };
  baseline.diagnostic = {
    completed: true,
    answers: {},
    score: 0,
    recommendation: "",
  };
  await seedState(page, baseline);
  await importThroughUi(page, state);
  await expect
    .poll(async () => {
      const saved = await savedState(page);
      return {
        rawPrefix: saved.events.slice(0, importedRawPrefix.length),
        oldSteps: oldSteps.map(
          (step) => saved.steps[stepKey(initializedLesson.id, step.id)],
        ),
        resume: saved.resume,
        notes: saved.notes,
        bookmarks: saved.bookmarks,
      };
    })
    .toEqual({
      rawPrefix: importedRawPrefix,
      oldSteps: oldSteps.map(
        (step) => state.steps[stepKey(initializedLesson.id, step.id)],
      ),
      resume: state.resume,
      notes: state.notes,
      bookmarks: state.bookmarks,
    });
  const imported = await savedState(page);
  expect(imported.events.slice(0, importedRawPrefix.length)).toEqual(
    importedRawPrefix,
  );
  expect(imported.resume).toEqual(state.resume);
  expect(imported.notes).toEqual(state.notes);
  expect(imported.bookmarks).toEqual(state.bookmarks);
  for (const step of oldSteps) {
    expect(imported.steps[stepKey(initializedLesson.id, step.id)]?.completed).toBe(
      true,
    );
  }
  expect(imported.steps[stepKey(initializedLesson.id, model.id)]).toBeUndefined();
  expect(imported.steps[stepKey(initializedLesson.id, primary.id)]).toBeUndefined();

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(initializedLesson.steps.indexOf(model))
    .click();
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Od storage do zainicjalizowanego prefiksu", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(initializedLesson.steps.indexOf(primary))
    .click();
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zainicjalizuj prefiks i pożycz wynik", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(page.locator("#workspace-panel-code")).toBeVisible();
  const simpleEditor = page.getByRole("button", { name: "Prosty edytor", exact: true });
  await expect(simpleEditor).toBeVisible();
  await simpleEditor.click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toBeVisible();
  const draft = "// Szkic prefiksu zachowany po imporcie i pomocy.\n";
  await editor.fill(draft);
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await expect(page.locator("#workspace-panel-lesson")).toBeVisible();
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(page.getByLabel("Notatki do lekcji")).toBeVisible();
  const note = "Najpierw zapis, potem pożyczka dokładnego prefiksu.";
  await page.getByLabel("Notatki do lekcji").fill(note);
  await expect(page.locator(".save-status")).toHaveText("Zapisano na tym urządzeniu");
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await expect.poll(async () => {
    const saved = await savedState(page);
    return {
      code: saved.steps[stepKey(initializedLesson.id, primary.id)]?.code,
      hints: saved.steps[stepKey(initializedLesson.id, primary.id)]?.hints,
      note: saved.notes[initializedLesson.id],
      resume: saved.resume,
    };
  }).toMatchObject({
    code: draft,
    hints: 1,
    note,
    resume: {
        panel: "lesson",
        view: "lesson",
      lessonId: initializedLesson.id,
      stepIndex: initializedLesson.steps.indexOf(primary),
    },
  });
  const helped = await savedState(page);
  expect(helped.events.slice(0, importedRawPrefix.length)).toEqual(
    importedRawPrefix,
  );
  expect(helped.events.filter((event) =>
    event.lessonId === initializedLesson.id &&
    event.stepId === primary.id &&
    event.kind === "transfer" &&
    event.evaluator === "tests",
  )).toEqual([]);
  expect(helped.events.filter((event) =>
    event.lessonId === initializedLesson.id &&
    event.stepId === model.id &&
    event.kind === "exposure",
  ).length).toBeGreaterThan(0);
  await page.reload();
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await expect(page.locator("#workspace-panel-lesson")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Zainicjalizuj prefiks i pożycz wynik", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(editor).toHaveValue(draft);
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(page.getByLabel("Notatki do lekcji")).toBeVisible();
  await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(note);
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(editor).toBeVisible();
  await editor.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Monaco Editor", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(editor).toBeFocused();
});

for (const [lessonId, freshId] of [
  ["unsafe-miri-disjoint-regions", "disjoint-regions-pivot-transfer"],
  ["unsafe-miri-slot-state", "slot-state-move-transfer"],
]) {
  test(`${freshId}: solution archive routes both criteria to final fresh work and only its reveal exhausts them (UI/state only)`, async ({
    page,
  }) => {
    const lesson = lessons.find((item) => item.id === lessonId)!;
    const fresh = lesson.steps.find((step) => step.id === freshId)!;
    const stage = modules.find((item) => item.id === lesson.moduleId)!;
    const criteria = stage.gateCriteria!.filter(
      (item) =>
        item.id === lessonId + "-gate" || item.id === lessonId + "-recall",
    );
    const state = createInitialState();
    state.onboarding = { completed: true, name: "Ada", minutes: 15 };
    state.diagnostic = {
      completed: true,
      answers: {},
      score: 0,
      recommendation: "",
    };
    state.settings.accessibleEditor = true;
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId,
      stepIndex: 0,
      panel: "lesson",
    };
    const exposed = revealCourseProjectPackageVariant(
      state,
      projects.find((item) => item.id === "miri-safety")!.package!,
      lessons,
      "solution",
      100,
    );
    await page.goto("/");
    await seedState(page, exposed);
    await page.getByRole("button", { name: stage.title, exact: true }).click();
    for (const criterion of criteria) {
      expect(gateRecovery(await savedState(page), criterion, lessons)).toEqual({
        status: "available",
        task: { lessonId, stepId: freshId },
      });
      const row = page
        .locator(".gate-panel li")
        .filter({ has: page.getByText(criterion.label, { exact: true }) });
      await expect(
        row.getByRole("button", { name: "Sprawdź w zadaniu" }),
      ).toBeVisible();
    }
    await page
      .locator(".gate-panel li")
      .filter({ has: page.getByText(criteria[0].label, { exact: true }) })
      .getByRole("button", { name: "Sprawdź w zadaniu" })
      .click();
    await expect(page.locator(".task-pane h1")).toHaveText(fresh.title);
    await expect(page.locator(".revealed-solution")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(fresh.title);
    await revealAsyncSolution(page, { lessonId, stepId: freshId });
    const after = await savedState(page);
    expect(after.events.slice(0, exposed.events.length)).toEqual(
      exposed.events,
    );
    for (const criterion of criteria)
      expect(gateRecovery(after, criterion, lessons)).toEqual({
        status: "exhausted",
      });
    await page.getByRole("button", { name: stage.title, exact: true }).click();
    for (const criterion of criteria) {
      const row = page
        .locator(".gate-panel li")
        .filter({ hasText: criterion.label });
      await expect(row).toContainText("Brak świeżego samodzielnego wariantu");
      await expect(
        row.getByRole("button", { name: "Sprawdź w zadaniu" }),
      ).toHaveCount(0);
    }
  });
}
