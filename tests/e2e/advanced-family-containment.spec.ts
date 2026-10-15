import { expect, test, type Page } from "@playwright/test";
import { lessons, modules } from "../../src/content/course";
import {
  courseEvidencePolicy,
  courseEvidenceSummary,
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
      "Ten sam kontrakt ma zapisaną pomoc w innym kroku",
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
    expect(gateRecovery(after, criterion, lessons).status).toBe("exhausted");
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    await expect(page.locator(".solution-warning")).toContainText(
      "potwierdzenie samodzielności poczeka na inne świeże zadanie",
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
  },
  {
    lessonId: "async-lending-callbacks",
    conceptId: "async-lending-callback-borrow",
    stepId: "async-lending-callbacks-bounded-transform",
    family: "async-lending/callback-bounded-transform-v1",
    oldFamily: "async-lending/sequential-callback-v1",
    reviewExerciseId: "async-lending-callbacks-review",
    mockPassed: 8,
  },
  {
    lessonId: "async-lending-dyn-adapter",
    conceptId: "async-lending-dyn-adapter",
    stepId: "async-lending-dyn-adapter-borrowed-sources",
    family: "async-lending/dyn-borrowed-sources-v1",
    oldFamily: "async-lending/dyn-adapter-v1",
    reviewExerciseId: "async-lending-dyn-adapter-review",
    mockPassed: 7,
  },
] as const;

type AsyncTransferCase = (typeof asyncTransferCases)[number];

function asyncTransferContext(item: AsyncTransferCase) {
  const lesson = lessons.find((candidate) => candidate.id === item.lessonId)!;
  // Both accepted M10 lessons saved their existing gate at index 2.
  const oldStep = lesson.steps[2];
  expect(oldStep.id).toBe(`${item.lessonId}-gate`);
  expect(oldStep.evidenceKind).toBe("fix");
  const blank = lesson.steps.find(
    (candidate) => candidate.id === `${item.lessonId}-blank`,
  )!;
  const transfer = lesson.steps.find(
    (candidate) => candidate.id === item.stepId,
  )!;
  expect(lesson.steps.at(-1)).toBe(transfer);
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
    stepIndex: 2,
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
  if (item.lessonId === "async-lending-send-boundary") {
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

async function revealAsyncSolution(page: Page, item: AsyncTransferCase) {
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
          "Ten sam kontrakt ma zapisaną pomoc w innym kroku",
        );
        await page
          .getByRole("button", { name: stage.title, exact: true })
          .click();
        const criterionRow = page
          .locator(".gate-panel li")
          .filter({ hasText: criterion.label });
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
      if (item.lessonId === "async-lending-send-boundary") {
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
      "Ten sam kontrakt ma zapisaną pomoc w innym kroku",
    );
    await expect(
      page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`${item.stepId}: both helped families show exhaustion without clearing old assistance`, async ({
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
      "potwierdzenie samodzielności poczeka na inne świeże zadanie",
    );
    await page
      .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
      .click();
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
      .filter({ hasText: criterion.label });
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
