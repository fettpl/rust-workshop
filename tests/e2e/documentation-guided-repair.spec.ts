import { expect, test, type Page } from "@playwright/test";
import {
  concepts,
  lessons,
  modules,
  reviewExercises,
} from "../../src/content/course";
import { courseEvidenceSummary } from "../../src/content/learning-context";
import { gateRecovery } from "../../src/engine/learning";
import {
  createInitialState,
  createStepProgress,
  exportState,
  stepKey,
} from "../../src/persistence/state";
import type {
  EvidenceEvent,
  LessonStep,
  UserState,
} from "../../src/domain/types";

const lesson = lessons.find(
  (item) => item.id === "documentation-guided-repair",
)!;
const testingModule = modules.find((item) => item.id === "testing-quality")!;
const prefix = lesson.steps.find((item) => item.id === "docs-prefix-repair")!;
const mismatch = lesson.steps.find(
  (item) => item.id === "docs-mismatch-predict",
)!;
const typeObserve = lesson.steps.find(
  (item) => item.id === "docs-type-observe",
)!;
const ownerObserve = lesson.steps.find(
  (item) => item.id === "docs-owner-observe",
)!;
const signatureDecision = lesson.steps.find(
  (item) => item.id === "docs-signature-decision",
)!;
const splitTransfer = lesson.steps.find(
  (item) => item.id === "docs-split-transfer",
)!;
const splitBlank = lesson.steps.find((item) => item.id === "docs-split-blank")!;
const rationale = lesson.steps.find(
  (item) => item.id === "docs-hypothesis-rationale",
)!;
const review = reviewExercises["documentation-guided-repair"];
const criterion = testingModule.gateCriteria?.find(
  (item) => item.id === "testing-documentation-repair-gate",
);
if (!criterion) throw new Error("Expected authored documentation gate");
const day = 24 * 60 * 60 * 1000;

function preparedState(): UserState {
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 3,
    recommendation: "testing-quality-workflow",
  };
  state.settings.accessibleEditor = true;
  return state;
}

function primaryEvent(step: LessonStep, at: number): EvidenceEvent {
  return {
    id: `documentation-browser-${step.id}-${at}`,
    lessonId: lesson.id,
    stepId: step.id,
    conceptIds: [...(step.evidence?.conceptIds ?? lesson.conceptIds)],
    evidenceVersion: step.evidence?.version,
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at,
  };
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

async function importStateThroughUi(
  page: Page,
  state: UserState,
): Promise<void> {
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  await page.getByLabel("Importuj postęp").setInputFiles({
    name: "documentation-guided-repair-state.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportState(state)),
  });
  await expect(page.getByText("Gotowy do importu")).toBeVisible();
  await page.getByRole("button", { name: "Zastąp postęp tym plikiem" }).click();
}

async function openLesson(page: Page, lessonId = lesson.id): Promise<void> {
  const selectedLesson = lessons.find((item) => item.id === lessonId)!;
  await page.goto("/");
  const map = page.getByRole("button", { name: "Mapa nauki", exact: true });
  if (await map.count()) await map.click();
  else {
    await page.getByRole("button", { name: "Przejdź do nauki" }).click();
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  }
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(testingModule.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: testingModule.title })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: selectedLesson.title })
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(
    selectedLesson.steps[0].title,
  );
}

async function openStep(page: Page, step: LessonStep): Promise<void> {
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.indexOf(step))
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(step.title);
}

async function openMap(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(testingModule.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: testingModule.title })
    .click();
}

async function completeRationale(page: Page): Promise<void> {
  await openStep(page, rationale);
  const rubric = page.locator("details.rubric");
  await expect(rubric).toBeVisible();
  await rubric.locator("summary").click();
  await page
    .getByRole("textbox", { name: "Twoje wyjaśnienie" })
    .fill(
      'Źródło: Rust std::str. Hipoteza: sygnatura zachowuje pożyczkę i rozróżnia None od Some(""). Minimalna poprawka: split_once i strip_prefix. Test: normalny tekst i pusty brzeg.',
    );
  const criteria = rubric.locator('input[type="checkbox"]');
  expect(await criteria.count()).toBeGreaterThan(0);
  for (let index = 0; index < (await criteria.count()); index += 1)
    await criteria.nth(index).check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(
    page
      .locator(".feedback")
      .filter({ hasText: "Sprawdziłeś każde kryterium" }),
  ).toBeVisible();
}

test("preserves an old resume and history while a new draft, help, rationale and source click stay scoped", async ({
  page,
}) => {
  const oldLesson = lessons.find(
    (item) => item.id === "testing-quality-workflow",
  )!;
  const oldStep = oldLesson.steps[0];
  const oldState = preparedState();
  oldState.resume = {
    ...oldState.resume,
    view: "lesson",
    lessonId: oldLesson.id,
    stepIndex: 0,
    panel: "code",
    focus: false,
  };
  const oldKey = stepKey(oldLesson.id, oldStep.id);
  oldState.steps[oldKey] = {
    ...createStepProgress(oldStep.code),
    code: "// zachowany stary szkic",
    answer: "old answer",
    hints: 1,
  };
  const oldEvent: EvidenceEvent = {
    id: "documentation-browser-old-event",
    lessonId: oldLesson.id,
    stepId: oldStep.id,
    conceptIds: [...oldLesson.conceptIds],
    kind: oldStep.evidenceKind,
    evaluator: oldStep.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    at: 1_700_000_000_000,
  };
  oldState.events = [oldEvent];
  await seedState(page, preparedState());
  await importStateThroughUi(page, oldState);
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(oldStep.title);
  const restored = await readState(page);
  expect(restored.resume).toEqual(oldState.resume);
  expect(restored.steps[oldKey]).toEqual(oldState.steps[oldKey]);
  expect(restored.events[0]).toEqual(oldEvent);
  const neutralContacts = restored.events.slice(1);
  expect(neutralContacts.length).toBeGreaterThanOrEqual(1);
  expect(neutralContacts.length).toBeLessThanOrEqual(2);
  expect(new Set(neutralContacts.map((event) => event.id)).size).toBe(
    neutralContacts.length,
  );
  for (const contact of neutralContacts) {
    expect(contact).toMatchObject({
      lessonId: oldLesson.id,
      stepId: oldStep.id,
      conceptIds: oldLesson.conceptIds,
      kind: "exposure",
      passed: true,
      hints: 0,
      revealed: false,
      gate: false,
    });
    expect(contact.id).not.toBe(oldEvent.id);
    expect(contact).not.toHaveProperty("evaluator");
  }
  expect(
    courseEvidenceSummary(restored, lesson.conceptIds[0]).qualifyingCodingTasks,
  ).toBe(0);
  expect(restored.steps[stepKey(lesson.id, prefix.id)]).toBeUndefined();

  await openLesson(page);
  await openStep(page, prefix);
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill("// nowy zachowany szkic");
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  const beforeSource = await readState(page);
  await page.locator("details.sources").locator("summary").click();
  const sourceLink = page.locator("details.sources a").first();
  const popupPromise = page.waitForEvent("popup");
  await sourceLink.click();
  await (await popupPromise).close();
  const afterSource = await readState(page);
  expect(afterSource.events).toEqual(beforeSource.events);
  expect(afterSource.steps[stepKey(lesson.id, prefix.id)]).toMatchObject({
    code: "// nowy zachowany szkic",
    hints: 2,
  });

  await openStep(page, rationale);
  const explanation = page.getByRole("textbox", { name: "Twoje wyjaśnienie" });
  await explanation.fill(
    "Źródło: strip_prefix. Hipoteza: Option rozróżnia brak prefiksu od pustej reszty. Minimalna zmiana: pożycz funkcję. Test: tag: i Unicode.",
  );
  const rubric = page.locator("details.rubric");
  await expect(rubric).toBeVisible();
  await rubric.locator("summary").click();
  await page.getByRole("checkbox").first().check();
  await page.reload();
  await openStep(page, rationale);
  await expect(
    page.getByRole("textbox", { name: "Twoje wyjaśnienie" }),
  ).toHaveValue(
    "Źródło: strip_prefix. Hipoteza: Option rozróżnia brak prefiksu od pustej reszty. Minimalna zmiana: pożycz funkcję. Test: tag: i Unicode.",
  );
});

test("shows the authored E0308 and E0382 diagnostics, then sends exact repaired prefix code and tests", async ({
  page,
}) => {
  const requests: Array<{ code?: string; mode?: string; tests?: string }> = [];
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON() as {
      code?: string;
      mode?: string;
      tests?: string;
    };
    requests.push(request);
    const matching = [typeObserve, ownerObserve, prefix].find((step) => {
      const tests =
        step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined;
      const codeMatches =
        step === prefix
          ? request.code === step.code || request.code === step.solution
          : request.code === step.code;
      return codeMatches && request.tests === tests;
    });
    expect(
      matching,
      "runner receives authored code and evaluator payload",
    ).toBeDefined();
    const diagnostic = matching === ownerObserve ? "E0382" : "E0308";
    const passed = matching === prefix && request.code === prefix.solution;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        passed
          ? {
              status: "success",
              stdout: "test result: ok",
              stderr: "",
              diagnostics: [],
              durationMs: 1,
              tests: { passed: 2, failed: 0 },
            }
          : {
              status: "compile-error",
              stdout: "",
              stderr: `error[${diagnostic}]: authored documentation diagnostic`,
              diagnostics: [
                {
                  code: diagnostic,
                  message: "authored diagnostic",
                  line: 1,
                  level: "error",
                },
              ],
              durationMs: 1,
            },
      ),
    });
  });
  await seedState(page, preparedState());
  await openLesson(page);
  await openStep(page, mismatch);
  await page.getByRole("radio").nth(1).check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  expect(
    courseEvidenceSummary(await readState(page), lesson.conceptIds[0])
      .qualifyingCodingTasks,
  ).toBe(0);
  for (const step of [typeObserve, ownerObserve]) {
    await openStep(page, step);
    await page.getByRole("button", { name: "Uruchom", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Wynik kompilatora" }),
    ).toContainText(step === typeObserve ? "E0308" : "E0382");
  }
  await openStep(page, prefix);
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(prefix.code!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("E0308");
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await editor.fill(prefix.solution!);
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
  expect(requests.at(-1)).toEqual({
    code: prefix.solution,
    mode: "test",
    tests:
      prefix.evaluator?.kind === "tests" ? prefix.evaluator.tests : undefined,
  });
  const after = await readState(page);
  expect(after.events).toContainEqual(
    expect.objectContaining({
      lessonId: lesson.id,
      stepId: prefix.id,
      passed: true,
      hints: 2,
      revealed: true,
    }),
  );
  expect(
    courseEvidenceSummary(after, lesson.conceptIds[0]).qualifyingCodingTasks,
  ).toBe(0);
});

for (const alias of [splitTransfer, splitBlank]) {
  test(`credits clean ${alias.id} as the second gate family and keeps the sibling alias out of recovery`, async ({
    page,
  }) => {
    const state = preparedState();
    state.events.push(primaryEvent(prefix, 1_700_000_000_000));
    const requests: Array<{ code?: string; mode?: string; tests?: string }> =
      [];
    await page.route("**/api/run", async (route) => {
      const request = route.request().postDataJSON() as {
        code?: string;
        mode?: string;
        tests?: string;
      };
      requests.push(request);
      expect(request.mode).toBe("test");
      expect(request.code).toBe(alias.solution);
      expect(request.tests).toBe(
        alias.evaluator?.kind === "tests" ? alias.evaluator.tests : undefined,
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          stdout: "test result: ok",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
          tests: { passed: 4, failed: 0 },
        }),
      });
    });
    await seedState(page, state);
    await openLesson(page);
    await openStep(page, alias);
    await page
      .getByRole("textbox", { name: "Kod Rust", exact: true })
      .fill(alias.solution!);
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await expect(
      page.getByText("Wszystkie testy zakończyły się powodzeniem.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(requests).toHaveLength(1);
    const after = await readState(page);
    expect(after.events).toContainEqual(
      expect.objectContaining({
        stepId: alias.id,
        passed: true,
        hints: 0,
        revealed: false,
      }),
    );
    const sibling = alias.id === splitTransfer.id ? splitBlank : splitTransfer;
    expect(after.steps[stepKey(lesson.id, sibling.id)]).toBeUndefined();
    expect(
      after.events.some(
        (event) => event.lessonId === lesson.id && event.stepId === sibling.id,
      ),
    ).toBe(false);
    expect(gateRecovery(after, criterion, lessons)).toEqual({
      status: "available",
      task: { lessonId: lesson.id, stepId: rationale.id },
    });
    await openMap(page);
    const pendingRow = page
      .locator(".gate-panel li")
      .filter({ hasText: criterion.label });
    await expect(pendingRow.locator('[aria-label="Potwierdzone"]')).toHaveCount(
      0,
    );
    const recoveryButton = pendingRow.getByRole("button", {
      name: "Sprawdź w zadaniu",
    });
    await expect(recoveryButton).toHaveCount(1);
    await recoveryButton.click();
    await expect(page.locator(".task-pane h1")).toHaveText(rationale.title);
    await completeRationale(page);
    const afterRationale = await readState(page);
    expect(afterRationale.events).toContainEqual(
      expect.objectContaining({
        lessonId: lesson.id,
        stepId: rationale.id,
        passed: true,
      }),
    );
    await openMap(page);
    const row = page
      .locator(".gate-panel li")
      .filter({ hasText: criterion.label });
    await expect(row.locator('[aria-label="Potwierdzone"]')).toHaveCount(1);
    expect(gateRecovery(afterRationale, criterion, lessons)).toEqual({
      status: "complete",
    });
    expect(
      courseEvidenceSummary(afterRationale, lesson.conceptIds[0])
        .qualifyingCodingTasks,
    ).toBe(2);
  });
}

test("preserves assisted prefix history while clean split transfer cannot launder it into a second family", async ({
  page,
}) => {
  const state = preparedState();
  const assistedKey = stepKey(lesson.id, prefix.id);
  state.steps[assistedKey] = {
    ...createStepProgress(prefix.code),
    completed: true,
    hints: 1,
  };
  const seeded = state.steps[assistedKey];
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON() as {
      code?: string;
      mode?: string;
      tests?: string;
    };
    expect(request.mode).toBe("test");
    expect(request.code).toBe(splitTransfer.solution);
    expect(request.tests).toBe(
      splitTransfer.evaluator?.kind === "tests"
        ? splitTransfer.evaluator.tests
        : undefined,
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "test result: ok",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 4, failed: 0 },
      }),
    });
  });
  await seedState(page, state);
  await openLesson(page);
  await openStep(page, splitTransfer);
  await page
    .getByRole("textbox", { name: "Kod Rust", exact: true })
    .fill(splitTransfer.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByText("Wszystkie testy zakończyły się powodzeniem.", {
      exact: true,
    }),
  ).toBeVisible();
  const after = await readState(page);
  expect(after.steps[assistedKey]).toEqual(seeded);
  expect(
    courseEvidenceSummary(after, lesson.conceptIds[0]).qualifyingCodingTasks,
  ).toBe(1);
  expect(gateRecovery(after, criterion, lessons).status).toBe("exhausted");
  await openMap(page);
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
});

test("executes ordinary documentation recall with a persisted concept session identity and no primary credit", async ({
  page,
}) => {
  const state = preparedState();
  state.resume = { ...state.resume, view: "review" };
  state.review = [
    {
      conceptId: lesson.conceptIds[0],
      dueAt: Date.now() + day,
      intervalDays: 1,
      attempts: 1,
      reason: "Documentation browser retrieval.",
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
    expect(request.tests).toBe(
      review.evaluator?.kind === "tests" ? review.evaluator.tests : undefined,
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "test result: ok",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 2, failed: 0 },
      }),
    });
  });
  await seedState(page, state);
  await expect(
    page.locator(".review-concept").filter({
      hasText: concepts.find((item) => item.id === lesson.conceptIds[0])!.title,
    }),
  ).toBeVisible();
  await page
    .locator(".review-concept")
    .filter({
      hasText: concepts.find((item) => item.id === lesson.conceptIds[0])!.title,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: review.title, exact: true }),
  ).toBeVisible();
  const active = (await readState(page)).reviewSession;
  if (!active) throw new Error("Expected an active ordinary review session");
  expect(active.conceptId).toBe(lesson.conceptIds[0]);
  expect(active.sessionId).toEqual(expect.any(String));
  expect(active.sessionId).not.toBe("");
  expect(active.exerciseId).toBeUndefined();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
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
    conceptIds: [lesson.conceptIds[0]],
    kind: "recall",
    evaluator: "tests",
    passed: true,
    delayed: false,
  });
  expect(retrieval.stepId).toBe(`${active.conceptId}:${active.sessionId}`);
  expect(
    courseEvidenceSummary(after, lesson.conceptIds[0]).qualifyingCodingTasks,
  ).toBe(0);
});

test("keeps the authored snapshot readable offline and exposes mobile keyboard panels without overflow", async ({
  page,
}) => {
  await seedState(page, preparedState());
  await openLesson(page);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await openStep(page, typeObserve);
  await expect(page.locator(".task-prompt")).toBeVisible();
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  const warmDiagnosticEditor = page.getByRole("textbox", {
    name: "Kod Rust",
    exact: true,
  });
  await expect(warmDiagnosticEditor).toBeVisible();
  await expect(warmDiagnosticEditor).toHaveAttribute("readonly", "");
  await expect(warmDiagnosticEditor).toHaveValue(typeObserve.code!);
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error(
        "Expected service-worker support for offline verification",
      );
    }
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          {
            once: true,
          },
        );
      });
    }
    if (!navigator.serviceWorker.controller)
      throw new Error(
        "Expected the page to be controlled by the service worker",
      );
  });
  await page.context().setOffline(true);
  await expect(page.locator(".offline-banner")).toBeVisible();
  const taskTab = page.getByRole("tab", { name: "Zadanie", exact: true });
  await taskTab.focus();
  await page.keyboard.press("Enter");
  await expect(taskTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".task-prompt")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Output/ })).toBeFocused();
  await taskTab.focus();
  await page.keyboard.press("Enter");
  await expect(taskTab).toHaveAttribute("aria-selected", "true");
  await openStep(page, signatureDecision);
  await expect(page.locator(".task-prompt")).toBeVisible();
  await expect(page.locator(".task-prompt")).toContainText("strip_prefix");
  await expect(page.locator(".task-prompt")).toContainText("Option<&str>");
  await openStep(page, splitTransfer);
  await expect(page.locator(".task-prompt")).toBeVisible();
  await expect(page.locator(".task-prompt")).toContainText("split_once");
  await expect(page.locator(".task-prompt")).toContainText(
    "Option<(&str, &str)>",
  );
  await taskTab.focus();
  await page.keyboard.press("Enter");
  await expect(taskTab).toHaveAttribute("aria-selected", "true");
  const finalNavigationStartedAt = Date.now();
  await openStep(page, typeObserve);
  await expect(page.locator(".task-prompt")).toBeVisible();
  await expect(page.locator(".task-prompt")).toContainText(
    typeObserve.prompt.slice(0, 32),
  );
  await expect
    .poll(async () => {
      const current = await readState(page);
      const last = current.events.at(-1);
      const expectedConceptIds =
        typeObserve.evidence?.conceptIds ?? lesson.conceptIds;
      return Boolean(
        last &&
        last.lessonId === lesson.id &&
        last.stepId === typeObserve.id &&
        last.conceptIds.join("\u0000") === expectedConceptIds.join("\u0000") &&
        last.kind === "exposure" &&
        last.passed === true &&
        last.hints === 0 &&
        last.revealed === false &&
        last.gate === false &&
        last.at >= finalNavigationStartedAt,
      );
    })
    .toBe(true);
  const beforeAttempt = await readState(page);
  expect(beforeAttempt.resume.lessonId).toBe(lesson.id);
  expect(beforeAttempt.resume.stepIndex).toBe(
    lesson.steps.indexOf(typeObserve),
  );
  const finalExposure = beforeAttempt.events.at(-1)!;
  expect(finalExposure).toEqual({
    id: `exposure:${lesson.id}:${typeObserve.id}:${finalExposure.at}:opened`,
    conceptIds: typeObserve.evidence?.conceptIds ?? lesson.conceptIds,
    lessonId: lesson.id,
    stepId: typeObserve.id,
    kind: "exposure",
    passed: true,
    hints: 0,
    revealed: false,
    at: finalExposure.at,
    gate: false,
  });
  expect(finalExposure.at).toBeGreaterThanOrEqual(finalNavigationStartedAt);
  await page.getByRole("tab", { name: "Kod", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  const diagnosticEditor = page.getByRole("textbox", {
    name: "Kod Rust",
    exact: true,
  });
  await expect(diagnosticEditor).toHaveAttribute("readonly", "");
  await expect(diagnosticEditor).toHaveValue(typeObserve.code!);
  await page.getByRole("button", { name: "Uruchom", exact: true }).click();
  const outputTab = page.getByRole("tab", { name: /Output/ });
  await outputTab.focus();
  await page.keyboard.press("Enter");
  await expect(outputTab).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("Kompilator niedostępny");
  await taskTab.focus();
  await page.keyboard.press("Enter");
  await expect(taskTab).toHaveAttribute("aria-selected", "true");
  const lessonPanel = page.locator("#workspace-panel-lesson");
  await expect(lessonPanel).toBeVisible();
  await expect(
    lessonPanel
      .getByRole("status")
      .filter({ hasText: "Próba nie wpływa na mastery." }),
  ).toBeVisible();
  const afterAttempt = await readState(page);
  expect(afterAttempt.events.slice(0, beforeAttempt.events.length)).toEqual(
    beforeAttempt.events,
  );
  expect(afterAttempt.events).toHaveLength(beforeAttempt.events.length);
  expect(
    courseEvidenceSummary(afterAttempt, lesson.conceptIds[0])
      .qualifyingCodingTasks,
  ).toBe(
    courseEvidenceSummary(beforeAttempt, lesson.conceptIds[0])
      .qualifyingCodingTasks,
  );
});
