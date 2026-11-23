import { expect, test, type Page } from "@playwright/test";
import { lessons, modules } from "./polish-course.helper";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";

const traits = modules.find((module) => module.id === "traits")!;
const dataModeling = modules.find((module) => module.id === "data-modeling")!;
const freshIds = ["conversion-ownership-views", "checked-conversions"];
async function saved(page: Page): Promise<UserState> {
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction("user-state", "readonly")
            .objectStore("user-state")
            .get("current");
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
          read.onsuccess = () => {
            db.close();
            resolve(read.result as UserState);
          };
        };
      }),
  );
}
async function seed(page: Page, state: UserState) {
  await page.goto("/");
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("user-state"))
            request.result.createObjectStore("user-state");
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("user-state", "readwrite");
          transaction.objectStore("user-state").put(value, "current");
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    state,
  );
  await page.reload();
}
function errorLog(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}
async function openThroughTraits(page: Page, lessonId: string) {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(traits.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: traits.title })
    .click();
  const card = page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title });
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".task-pane h1")).toHaveText(lesson.steps[0].title);
}
async function openThroughDataModeling(page: Page, lessonId: string) {
  const courseModule = modules.find((item) => item.id === "data-modeling")!;
  const lesson = lessons.find((item) => item.id === lessonId)!;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(courseModule.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: courseModule.title })
    .click();
  const card = page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title });
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".task-pane h1")).toHaveText(lesson.steps[0].title);
}

for (const lessonId of freshIds) {
  test(`${lessonId}: mocked UI run, keyboard draft/panel/note/bookmark resume and fresh help alternative`, async ({
    page,
  }) => {
    const errors = errorLog(page);
    const lesson = lessons.find((item) => item.id === lessonId)!;
    const step = lesson.steps[2];
    const repair = lesson.steps[3];
    const blank = lesson.steps[4];
    await openThroughTraits(page, lessonId);
    const apiButton = page
      .getByLabel("Kroki lekcji")
      .getByRole("button")
      .nth(2);
    await apiButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".task-pane h1")).toHaveText(step.title);
    await page
      .getByRole("button", { name: "Prosty edytor", exact: true })
      .click();
    const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    const draft = `${step.solution}\n// Maintained UI persistence fixture: ${lessonId}.\n`;
    await editor.fill(draft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    const note = `Notatka o API ${lessonId}: własność i wynik ż.`;
    await page
      .getByRole("textbox", { name: "Notatki do lekcji", exact: true })
      .fill(note);
    await page
      .getByRole("button", { name: "Dodaj zakładkę", exact: true })
      .click();
    // Interception proves request/UI/storage behavior only; maintained Rust suites prove the contract.
    await page.route("**/api/run", async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        code: draft,
        mode: "test",
        tests:
          step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined,
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          stdout: "Mocked core practice UI result",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
          tests: { passed: 1, failed: 0 },
        }),
      });
    });
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Wynik kompilatora" }),
    ).toContainText("Mocked core practice UI result");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: /^Wyjście/ }).click();
    const beforeReload = await saved(page);
    expect(beforeReload.resume).toMatchObject({
      lessonId,
      stepIndex: 2,
      panel: "output",
    });
    expect(beforeReload.notes[lessonId]).toBe(note);
    expect(beforeReload.bookmarks).toContain(lessonId);
    expect(beforeReload.steps[stepKey(lessonId, step.id)].code).toBe(draft);
    await page.reload();
    await expect(page.getByRole("tab", { name: /^Wyjście/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("region", { name: "Wynik kompilatora" }),
    ).toContainText("Mocked core practice UI result");
    const outputTab = page.getByRole("tab", { name: /^Wyjście/ });
    await outputTab.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("tab", { name: "Kod", exact: true }),
    ).toBeFocused();
    await expect(editor).toHaveValue(draft);
    await editor.focus();
    await expect(editor).toBeFocused();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(3).click();
    await expect(page.locator(".task-pane h1")).toHaveText(repair.title);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    await page
      .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
      .click();
    const assisted = await saved(page);
    expect(assisted.steps[stepKey(lessonId, repair.id)]).toMatchObject({
      hints: 2,
      revealed: true,
    });
    await page.reload();
    await expect(
      page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: traits.title, exact: true }).click();
    const criterion = traits.gateCriteria!.find((gate) =>
      gate.taskRefs.some((ref) => ref.lessonId === lessonId),
    )!;
    const row = page
      .locator(".gate-panel li")
      .filter({ hasText: criterion.label });
    await row.locator(".gate-action").click();
    await expect(page.locator(".task-pane h1")).toHaveText(blank.title);
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await expect(editor).toHaveValue("");
    await expect(
      page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
    ).toHaveCount(0);
    const blankDraft = `// Fresh fixed UI draft for ${blank.id}.\nstruct Draft;\n`;
    await editor.fill(blankDraft);
    const fresh = await saved(page);
    expect(fresh.steps[stepKey(lessonId, repair.id)]).toEqual(
      assisted.steps[stepKey(lessonId, repair.id)],
    );
    expect(fresh.steps[stepKey(lessonId, blank.id)]).toMatchObject({
      code: blankDraft,
      hints: 0,
      revealed: false,
      completed: false,
    });
    expect(fresh.events.filter((event) => event.kind !== "exposure")).toEqual(
      beforeReload.events.filter((event) => event.kind !== "exposure"),
    );
    expect(fresh.notes[lessonId]).toBe(note);
    expect(fresh.bookmarks).toContain(lessonId);
    await page.reload();
    await expect(editor).toHaveValue(blankDraft);
    expect((await saved(page)).resume).toMatchObject({
      lessonId,
      stepIndex: 4,
      panel: "code",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("preserves an old advanced resume, history and notes without relocating it to conversion practice", async ({
  page,
}) => {
  const errors = errorLog(page);
  const lesson = lessons.find(
    (item) => item.id === "capstone-release-evidence",
  )!;
  const step = lesson.steps[2];
  const state = createInitialState();
  delete state.routePreference;
  state.onboarding.completed = true;
  state.diagnostic.completed = true;
  state.settings.accessibleEditor = true;
  state.resume = {
    view: "lesson",
    lessonId: lesson.id,
    stepIndex: 2,
    panel: "code",
    focus: false,
  };
  const key = stepKey(lesson.id, step.id);
  const draft = "// Preserved historical advanced draft ż.\n";
  state.steps[key] = { ...createStepProgress(draft), hints: 2, revealed: true };
  state.notes = { [lesson.id]: "Historyczna notatka" };
  state.bookmarks = [lesson.id, "trait-dispatch"];
  state.events = [
    {
      id: "preserved-history",
      lessonId: lesson.id,
      stepId: step.id,
      conceptIds: [...lesson.conceptIds],
      kind: "self-rating",
      evaluator: "rubric",
      passed: true,
      hints: 2,
      revealed: true,
      at: 100,
    },
  ];
  await seed(page, state);
  await page.setViewportSize({ width: 390, height: 844 });
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toHaveValue(draft);
  await page.reload();
  await expect(editor).toHaveValue(draft);
  const restored = await saved(page);
  expect(restored.resume).toEqual(state.resume);
  expect(restored.steps[key]).toEqual(state.steps[key]);
  expect(restored.notes).toEqual(state.notes);
  expect(restored.bookmarks).toEqual(state.bookmarks);
  expect(restored.events.slice(0, state.events.length)).toEqual(state.events);
  expect(
    restored.events
      .slice(state.events.length)
      .every((event) => event.kind === "exposure" && !event.gate),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("real API smoke executes the maintained standard conversion example", async ({
  page,
}) => {
  test.setTimeout(75_000);
  const errors = errorLog(page);
  const lesson = lessons.find((item) => item.id === freshIds[0])!;
  const step = lesson.steps[1];
  await openThroughTraits(page, lesson.id);
  const button = page.getByLabel("Kroki lekcji").getByRole("button").nth(1);
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".task-pane h1")).toHaveText(step.title);
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/run"),
  );
  await page.getByRole("button", { name: "Uruchom", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const result = await response.json();
  expect(result.status).toBe("success");
  expect(result.stdout).toBe(
    step.evaluator?.kind === "exact-output"
      ? step.evaluator.expected
      : "missing authored output",
  );
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("żółć 8");
  expect(errors).toEqual([]);
});

test("nested patterns: mocked repair persists UI state and recovers a fresh transfer", async ({
  page,
}) => {
  const errors = errorLog(page);
  const lesson = lessons.find(
    (item) => item.id === "nested-patterns-and-destructuring",
  )!;
  const repair = lesson.steps.find((step) => step.id === "nested-repair")!;
  const transfer = lesson.steps.find((step) => step.id === "nested-transfer")!;
  await openThroughDataModeling(page, lesson.id);
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.indexOf(repair))
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".task-pane h1")).toHaveText(repair.title);
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await page.getByRole("button", { name: "Prosty edytor", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = repair.solution + "\n// nested-pattern UI fixture.\n";
  await editor.fill(draft);
  const note = "Notatka nested patterns: brak, stan i dane.";
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page.getByRole("textbox", { name: "Notatki do lekcji", exact: true }).fill(note);
  await page.getByRole("button", { name: "Dodaj zakładkę", exact: true }).click();
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      code: draft,
      mode: "test",
      tests:
        repair.evaluator?.kind === "tests" ? repair.evaluator.tests : undefined,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "Mocked nested pattern result",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 1, failed: 0 },
      }),
    });
  });
  await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("Mocked nested pattern result");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: /^Wyjście/ }).click();
  const beforeReload = await saved(page);
  expect(beforeReload.resume).toMatchObject({
    lessonId: lesson.id,
    stepIndex: 2,
    panel: "output",
  });
  expect(beforeReload.notes[lesson.id]).toBe(note);
  expect(beforeReload.bookmarks).toContain(lesson.id);
  expect(beforeReload.steps[stepKey(lesson.id, repair.id)].code).toBe(draft);
  await page.reload();
  await expect(page.getByRole("tab", { name: /^Wyjście/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("Mocked nested pattern result");
  const outputTab = page.getByRole("tab", { name: /^Wyjście/ });
  await outputTab.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Kod", exact: true })).toBeFocused();
  await expect(editor).toHaveValue(draft);
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await page.getByRole("button", { name: dataModeling.title, exact: true }).click();
  const criterion = dataModeling.gateCriteria!.find(
    (gate) => gate.id === "nested-pattern-gate",
  )!;
  const row = page
    .locator(".gate-panel li")
    .filter({ hasText: criterion.label });
  await row.locator(".gate-action").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".task-pane h1")).toHaveText(transfer.title);
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(editor).toHaveValue("");
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toHaveCount(0);
  const transferDraft = "// Fresh nested transfer draft.\nstruct Draft;\n";
  await editor.fill(transferDraft);
  const afterRecovery = await saved(page);
  expect(afterRecovery.steps[stepKey(lesson.id, transfer.id)]).toMatchObject({
    code: transferDraft,
    hints: 0,
    revealed: false,
    completed: false,
  });
  expect(afterRecovery.steps[stepKey(lesson.id, repair.id)]).toMatchObject({
    code: draft,
    hints: 2,
    revealed: true,
  });
  expect(afterRecovery.notes[lesson.id]).toBe(note);
  expect(afterRecovery.bookmarks).toContain(lesson.id);
  await page.reload();
  await expect(editor).toHaveValue(transferDraft);
  expect((await saved(page)).resume).toMatchObject({
    lessonId: lesson.id,
    stepIndex: 3,
    panel: "code",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("real API smoke executes the maintained nested pattern example", async ({
  page,
}) => {
  test.setTimeout(75_000);
  const errors = errorLog(page);
  const lesson = lessons.find(
    (item) => item.id === "nested-patterns-and-destructuring",
  )!;
  const step = lesson.steps.find((item) => item.id === "nested-run")!;
  await openThroughDataModeling(page, lesson.id);
  const button = page.getByLabel("Kroki lekcji").getByRole("button").nth(1);
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".task-pane h1")).toHaveText(step.title);
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/run"),
  );
  await page.getByRole("button", { name: "Uruchom", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const result = await response.json();
  expect(result.status).toBe("success");
  expect(result.stdout).toBe(
    step.evaluator?.kind === "exact-output"
      ? step.evaluator.expected
      : "missing authored output",
  );
  expect(result.stdout).toContain("failed: failed");
  expect(errors).toEqual([]);
});
