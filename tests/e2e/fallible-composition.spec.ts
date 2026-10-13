import { expect, test, type Page } from "@playwright/test";
import {
  concepts,
  lessons,
  modules,
  reviewExercises,
} from "../../src/content/course";
import { courseEvidenceSummary } from "../../src/content/learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  stepKey,
} from "../../src/persistence/state";
import { gateRecovery } from "../../src/engine/learning";
import type { EvidenceEvent, UserState } from "../../src/domain/types";

const valueLesson = lessons.find(
  (lesson) => lesson.id === "fallible-value-composition",
)!;
const pipelineLesson = lessons.find(
  (lesson) => lesson.id === "fallible-iterator-contracts",
)!;
const iteratorModule = modules.find((module) => module.id === "iterators")!;
const ownerRepair = valueLesson.steps.find(
  (step) => step.id === "fallible-owner-repair",
)!;
const readingsBlank = pipelineLesson.steps.find(
  (step) => step.id === "fallible-readings-blank",
)!;
const readingsTransfer = pipelineLesson.steps.find(
  (step) => step.id === "fallible-readings-transfer",
)!;
const retrievalCases = [
  {
    conceptId: "fallible-value-composition",
    reviewId: "review-fallible-retry-delay",
  },
  {
    conceptId: "fallible-iterator-contracts",
    reviewId: "review-fallible-flags",
  },
] as const;
const fallibleGateCases = [
  {
    criterionId: "iterators-fallible-values-gate",
    assistedRefs: [
      {
        lessonId: "fallible-value-composition",
        stepId: "fallible-config-contract",
        mode: "saved-hint",
      },
      {
        lessonId: "fallible-value-composition",
        stepId: "fallible-optional-transfer",
        mode: "event-reveal",
      },
    ],
  },
  {
    criterionId: "iterators-fallible-rows-gate",
    assistedRefs: [
      {
        lessonId: "fallible-iterator-contracts",
        stepId: "fallible-rows-contract",
        mode: "saved-hint",
      },
      {
        lessonId: "fallible-iterator-contracts",
        stepId: "fallible-readings-transfer",
        mode: "event-reveal",
      },
    ],
  },
] as const;
const day = 24 * 60 * 60 * 1000;

function preparedState(): UserState {
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 3,
    recommendation: "iterator-contracts",
  };
  state.settings.accessibleEditor = true;
  return state;
}

async function seedState(page: Page, state: UserState): Promise<void> {
  await page.goto("/");
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

async function readState(page: Page): Promise<UserState> {
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
          read.onerror = () => reject(read.error);
          read.onsuccess = () => {
            database.close();
            resolve(read.result as UserState);
          };
        };
      }),
  );
}

async function importStateThroughUi(page: Page, state: UserState) {
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  await page.getByLabel("Importuj postęp").setInputFiles({
    name: "fallible-composition-state.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportState(state)),
  });
  await expect(page.getByText("Gotowy do importu")).toBeVisible();
  await page.getByRole("button", { name: "Zastąp postęp tym plikiem" }).click();
}

async function openLesson(page: Page, lessonId: string): Promise<void> {
  const lesson = lessons.find((candidate) => candidate.id === lessonId)!;
  await page.goto("/");
  const mapButton = page.getByRole("button", {
    name: "Mapa nauki",
    exact: true,
  });
  if (await mapButton.count()) await mapButton.click();
  else {
    await page.getByRole("button", { name: "Przejdź do nauki" }).click();
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  }
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(iteratorModule.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: iteratorModule.title })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(lesson.steps[0].title);
}

function fallibleGateState(
  gateCase: (typeof fallibleGateCases)[number],
): UserState {
  const state = preparedState();
  for (const [index, assistedRef] of gateCase.assistedRefs.entries()) {
    const lesson = lessons.find(
      (candidate) => candidate.id === assistedRef.lessonId,
    )!;
    const step = lesson.steps.find(
      (candidate) => candidate.id === assistedRef.stepId,
    )!;
    const key = stepKey(lesson.id, step.id);
    if (assistedRef.mode === "saved-hint") {
      state.steps[key] = {
        ...createStepProgress(step.code),
        completed: true,
        hints: 1,
      };
      continue;
    }
    state.events.push({
      id: `fallible-browser-gate-assistance-${gateCase.criterionId}-${index}`,
      lessonId: lesson.id,
      stepId: step.id,
      conceptIds: [...lesson.conceptIds],
      evidenceVersion: step.evidence?.version,
      kind: step.evidenceKind,
      evaluator: step.evaluator?.kind,
      passed: true,
      hints: 0,
      revealed: true,
      gate: true,
      at: 1_700_000_000_000 + index,
    });
  }
  return state;
}

test("imports an old iterator resume exactly and gives no credit to appended lessons", async ({
  page,
}) => {
  const oldLesson = lessons.find(
    (lesson) => lesson.id === "iterator-contracts",
  )!;
  const oldStep = oldLesson.steps.find(
    (step) => step.id === "contracts-modify",
  )!;
  const oldState = preparedState();
  oldState.resume = {
    ...oldState.resume,
    view: "lesson",
    lessonId: oldLesson.id,
    stepIndex: oldLesson.steps.indexOf(oldStep),
    panel: "code",
    focus: false,
  };
  const oldKey = stepKey(oldLesson.id, oldStep.id);
  oldState.steps[oldKey] = {
    ...createStepProgress(oldStep.code),
    code: "// preserved iterator draft",
    hints: 1,
  };
  const oldEvent: EvidenceEvent = {
    id: "fallible-browser-preserved-old-event",
    lessonId: oldLesson.id,
    stepId: oldStep.id,
    conceptIds: [...oldLesson.conceptIds],
    kind: "transfer",
    evaluator: "tests",
    passed: true,
    hints: 0,
    revealed: false,
    at: 1_700_000_000_000,
  };
  oldState.events = [oldEvent];

  const cleanState = preparedState();
  await seedState(page, cleanState);
  await importStateThroughUi(page, oldState);
  await page.reload();

  await expect(page.locator(".task-pane h1")).toHaveText(oldStep.title);
  const restored = await readState(page);
  expect(restored.resume).toEqual(oldState.resume);
  expect(restored.steps[oldKey]).toEqual(oldState.steps[oldKey]);
  expect(restored.events[0]).toEqual(oldEvent);
  expect(
    restored.events.some((event) =>
      ["fallible-value-composition", "fallible-iterator-contracts"].includes(
        event.lessonId,
      ),
    ),
  ).toBe(false);
  for (const lesson of [valueLesson, pipelineLesson]) {
    expect(
      Object.keys(restored.steps).some((key) =>
        key.startsWith(`${lesson.id}:`),
      ),
    ).toBe(false);
  }
  expect(
    courseEvidenceSummary(restored, valueLesson.conceptIds[0])
      .qualifyingCodingTasks,
  ).toBe(0);
});

test("records mocked failure then assisted pass, while a clean blank establishes its one pipeline family", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const requests: Array<{ code?: string; mode?: string; tests?: string }> = [];
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON() as {
      code?: string;
      mode?: string;
      tests?: string;
    };
    requests.push(request);
    expect(request.mode).toBe("test");
    const accepted =
      (request.code === ownerRepair.solution &&
        request.tests ===
          (ownerRepair.evaluator?.kind === "tests"
            ? ownerRepair.evaluator.tests
            : undefined)) ||
      (request.code === readingsBlank.solution &&
        request.tests ===
          (readingsBlank.evaluator?.kind === "tests"
            ? readingsBlank.evaluator.tests
            : undefined));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        accepted
          ? {
              status: "success",
              stdout: "mocked fallible contract tests passed",
              stderr: "",
              diagnostics: [],
              durationMs: 1,
              tests: { passed: 4, failed: 0 },
            }
          : {
              status: "test-failure",
              stdout:
                "assertion failed: fallible contract\ntest result: FAILED",
              stderr: "",
              diagnostics: [],
              durationMs: 1,
              tests: { passed: 0, failed: 1 },
            },
      ),
    });
  });

  await seedState(page, preparedState());
  await openLesson(page, valueLesson.id);
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(valueLesson.steps.indexOf(ownerRepair))
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toBeVisible();
  const failedDraft = ownerRepair.code!;
  await editor.fill(failedDraft);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("test result: FAILED");
  const afterFailure = await readState(page);
  expect(afterFailure.events).toContainEqual(
    expect.objectContaining({
      lessonId: valueLesson.id,
      stepId: ownerRepair.id,
      passed: false,
      hints: 0,
      revealed: false,
    }),
  );

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
  await editor.fill(ownerRepair.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await readState(page)).events.filter(
          (event) =>
            event.lessonId === valueLesson.id &&
            event.stepId === ownerRepair.id &&
            event.kind !== "exposure",
        ).length,
    )
    .toBe(2);
  const assisted = (await readState(page)).events
    .filter(
      (event) =>
        event.lessonId === valueLesson.id &&
        event.stepId === ownerRepair.id &&
        event.kind !== "exposure",
    )
    .at(-1)!;
  expect(assisted).toMatchObject({ passed: true, hints: 2, revealed: true });
  expect(
    courseEvidenceSummary(await readState(page), valueLesson.conceptIds[0])
      .qualifyingCodingTasks,
  ).toBe(0);
  expect(requests.map((request) => request.code)).toEqual([
    failedDraft,
    ownerRepair.solution,
  ]);

  await page.goto("/");
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(iteratorModule.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: iteratorModule.title })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: pipelineLesson.title })
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(
    pipelineLesson.steps[0].title,
  );
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(pipelineLesson.steps.indexOf(readingsBlank))
    .click();
  const blankEditor = page.getByRole("textbox", {
    name: "Kod Rust",
    exact: true,
  });
  await expect(blankEditor).toBeVisible();
  await expect(blankEditor).toHaveValue("");
  await blankEditor.fill(readingsBlank.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("mocked fallible contract tests passed");
  await expect
    .poll(
      async () =>
        (await readState(page)).events.filter(
          (event) =>
            event.lessonId === pipelineLesson.id &&
            event.stepId === readingsBlank.id &&
            event.kind !== "exposure",
        ).length,
    )
    .toBe(1);
  const clean = await readState(page);
  expect(clean.events.at(-1)).toMatchObject({
    lessonId: pipelineLesson.id,
    stepId: readingsBlank.id,
    passed: true,
    hints: 0,
    revealed: false,
  });
  expect(
    courseEvidenceSummary(clean, pipelineLesson.conceptIds[0])
      .qualifyingCodingTasks,
  ).toBe(1);
  const note = "Fallible pipeline: pierwszy błąd i None zachowują znaczenie.";
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Notatki do lekcji", exact: true })
    .fill(note);
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  const heading = await page.locator(".task-pane h1").innerText();
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(heading);
  await expect(blankEditor).toHaveValue(readingsBlank.solution!);
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Notatki do lekcji", exact: true }),
  ).toHaveValue(note);
  expect(errors).toEqual([]);
});

for (const retrievalCase of retrievalCases) {
  test(`records ${retrievalCase.reviewId} as non-delayed recall evidence`, async ({
    page,
  }) => {
    const review = reviewExercises[retrievalCase.conceptId];
    expect(review.id).toBe(retrievalCase.reviewId);
    expect(review.evaluator?.kind).toBe("tests");
    const expectedTests =
      review.evaluator?.kind === "tests" ? review.evaluator.tests : undefined;
    const concept = concepts.find(
      (item) => item.id === retrievalCase.conceptId,
    )!;
    const state = preparedState();
    state.resume = { ...state.resume, view: "review" };
    state.review = [
      {
        conceptId: concept.id,
        dueAt: Date.now() + day,
        intervalDays: 1,
        attempts: 1,
        reason: "Fallible composition browser retrieval.",
      },
    ];
    await page.route("**/api/run", async (route) => {
      const request = route.request().postDataJSON() as {
        code?: string;
        mode?: string;
        tests?: string;
      };
      expect(request.mode).toBe("test");
      expect(request.code).toBe(review.solution);
      expect(request.tests).toBe(expectedTests);
      const accepted =
        request.code === review.solution && request.tests === expectedTests;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: accepted ? "success" : "test-failure",
          stdout: accepted
            ? "mocked retrieval tests passed"
            : "test result: FAILED",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
          tests: accepted ? { passed: 2, failed: 0 } : { passed: 0, failed: 1 },
        }),
      });
    });
    await seedState(page, state);
    await expect(
      page.locator(".review-concept").filter({ hasText: concept.title }),
    ).toBeVisible();
    await page
      .locator(".review-concept")
      .filter({ hasText: concept.title })
      .click();
    await expect(
      page.getByRole("heading", { name: review.title, exact: true }),
    ).toBeVisible();
    const activeReview = (await readState(page)).reviewSession;
    if (!activeReview) throw new Error("Expected an active review session");
    expect(activeReview.conceptId).toBe(concept.id);
    expect(activeReview.sessionId).toEqual(expect.any(String));
    expect(activeReview.sessionId).not.toBe("");
    expect(activeReview.exerciseId).toBeUndefined();
    const editor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    await expect(editor).toBeVisible();
    await expect(editor).toHaveValue("");
    await editor.fill(review.solution!);
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await expect(page.getByText("Kod działa.")).toBeVisible();
    const after = await readState(page);
    const retrieval = after.events.at(-1)!;
    expect(retrieval).toMatchObject({
      lessonId: "review",
      conceptIds: [concept.id],
      kind: "recall",
      evaluator: "tests",
      passed: true,
      delayed: false,
    });
    expect(retrieval.stepId).toBe(
      `${activeReview.conceptId}:${activeReview.sessionId}`,
    );
    expect(courseEvidenceSummary(after, concept.id).qualifyingCodingTasks).toBe(
      0,
    );
  });
}

for (const gateCase of fallibleGateCases) {
  test(`${gateCase.criterionId}: assisted families stay exhausted without a false recovery task`, async ({
    page,
  }) => {
    const criterion = iteratorModule.gateCriteria?.find(
      (candidate) => candidate.id === gateCase.criterionId,
    );
    if (!criterion) throw new Error("Expected authored fallible gate");
    expect(criterion.requiredIndependentCodingTasks).toBe(1);

    const seededState = fallibleGateState(gateCase);
    await seedState(page, seededState);
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(iteratorModule.title);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: iteratorModule.title })
      .click();

    const after = await readState(page);
    for (const assistedRef of gateCase.assistedRefs) {
      const key = stepKey(assistedRef.lessonId, assistedRef.stepId);
      expect(after.steps[key]).toEqual(seededState.steps[key]);
      expect(
        after.events.filter(
          (event) =>
            event.lessonId === assistedRef.lessonId &&
            event.stepId === assistedRef.stepId,
        ),
      ).toEqual(
        seededState.events.filter(
          (event) =>
            event.lessonId === assistedRef.lessonId &&
            event.stepId === assistedRef.stepId,
        ),
      );
    }
    expect(gateRecovery(after, criterion, lessons)).toEqual({
      status: "exhausted",
    });
    const criterionRow = page
      .locator(".gate-panel li")
      .filter({ hasText: criterion.label });
    await expect(criterionRow).toContainText(
      "Brak świeżego samodzielnego wariantu",
    );
    await expect(
      criterionRow.getByRole("button", { name: "Sprawdź w zadaniu" }),
    ).toHaveCount(0);
    await expect(page.locator(".module-connections")).toContainText(
      "Brak świeżego samodzielnego wariantu",
    );
    await expect(
      page
        .locator(".module-connections")
        .getByRole("button", { name: criterion.label, exact: true }),
    ).toHaveCount(0);

    if (gateCase.criterionId === "iterators-fallible-rows-gate") {
      const blankKey = stepKey(
        "fallible-iterator-contracts",
        "fallible-readings-blank",
      );
      expect(after.steps[blankKey]).toBeUndefined();
      expect(
        after.events.some(
          (event) =>
            event.lessonId === "fallible-iterator-contracts" &&
            event.stepId === "fallible-readings-blank",
        ),
      ).toBe(false);
    }
  });
}

test("fallible rows gate: clean guided transfer passes after required family assistance without duplicate blank recovery", async ({
  page,
}) => {
  const criterion = iteratorModule.gateCriteria?.find(
    (candidate) => candidate.id === "iterators-fallible-rows-gate",
  );
  if (!criterion) throw new Error("Expected authored fallible rows gate");
  expect(criterion.requiredIndependentCodingTasks).toBe(1);
  expect(readingsTransfer.evaluator?.kind).toBe("tests");

  const rowsContract = pipelineLesson.steps.find(
    (step) => step.id === "fallible-rows-contract",
  )!;
  const seededState = preparedState();
  const assistedKey = stepKey(pipelineLesson.id, rowsContract.id);
  seededState.steps[assistedKey] = {
    ...createStepProgress(rowsContract.code),
    completed: true,
    hints: 1,
  };
  const blankKey = stepKey(pipelineLesson.id, readingsBlank.id);
  expect(seededState.steps[blankKey]).toBeUndefined();
  expect(
    seededState.events.some(
      (event) =>
        event.lessonId === pipelineLesson.id &&
        event.stepId === readingsBlank.id,
    ),
  ).toBe(false);

  const expectedTests =
    readingsTransfer.evaluator?.kind === "tests"
      ? readingsTransfer.evaluator.tests
      : undefined;
  const requests: Array<{ code?: string; mode?: string; tests?: string }> = [];
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON() as {
      code?: string;
      mode?: string;
      tests?: string;
    };
    requests.push(request);
    expect(request.mode).toBe("test");
    expect(request.code).toBe(readingsTransfer.solution);
    expect(request.tests).toBe(expectedTests);
    const accepted =
      request.code === readingsTransfer.solution &&
      request.tests === expectedTests;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: accepted ? "success" : "test-failure",
        stdout: accepted
          ? "mocked guided readings tests passed"
          : "test result: FAILED",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: accepted ? { passed: 4, failed: 0 } : { passed: 0, failed: 1 },
      }),
    });
  });

  await seedState(page, seededState);
  await openLesson(page, pipelineLesson.id);
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(pipelineLesson.steps.indexOf(readingsTransfer))
    .click();
  const editor = page.getByRole("textbox", {
    name: "Kod Rust",
    exact: true,
  });
  await expect(editor).toBeVisible();
  await editor.fill(readingsTransfer.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByText("Wszystkie testy zakończyły się powodzeniem.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("Wykonano poprawnie");
  expect(requests).toHaveLength(1);

  const after = await readState(page);
  const guidedPass = after.events.find(
    (event) =>
      event.lessonId === pipelineLesson.id &&
      event.stepId === readingsTransfer.id &&
      event.kind !== "exposure",
  );
  expect(guidedPass).toMatchObject({
    lessonId: pipelineLesson.id,
    stepId: readingsTransfer.id,
    conceptIds: readingsTransfer.evidence?.conceptIds,
    evidenceVersion: readingsTransfer.evidence?.version,
    kind: readingsTransfer.evidenceKind,
    evaluator: "tests",
    passed: true,
    hints: 0,
    revealed: false,
  });
  expect(after.steps[assistedKey]).toEqual(seededState.steps[assistedKey]);
  expect(after.steps[assistedKey]).toMatchObject({
    completed: true,
    hints: 1,
  });
  expect(after.steps[blankKey]).toBeUndefined();
  expect(
    after.events.some(
      (event) =>
        event.lessonId === pipelineLesson.id &&
        event.stepId === readingsBlank.id,
    ),
  ).toBe(false);

  await page.goto("/");
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(iteratorModule.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: iteratorModule.title })
    .click();

  const criterionRow = page
    .locator(".gate-panel li")
    .filter({ hasText: criterion.label });
  await expect(criterionRow).toContainText(criterion.label);
  await expect(criterionRow.locator('[aria-label="Potwierdzone"]')).toHaveCount(
    1,
  );
  await expect(criterionRow).not.toContainText(
    "Brak świeżego samodzielnego wariantu",
  );
  await expect(
    criterionRow.getByRole("button", { name: "Sprawdź w zadaniu" }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".module-connections")
      .getByRole("button", { name: criterion.label, exact: true }),
  ).toHaveCount(0);
});
