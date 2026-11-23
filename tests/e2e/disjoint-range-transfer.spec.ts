import { expect, test } from "@playwright/test";
import { lessons, modules, projects } from "./polish-course.helper";
import { stepKey } from "../../src/persistence/state";

type PersistedState = {
  notes: Record<string, string>;
  steps: Record<
    string,
    { code?: string; hints: number; revealed: boolean; completed: boolean }
  >;
  events: Array<{
    lessonId: string;
    stepId: string;
    kind: string;
    passed: boolean;
    evaluator?: string;
  }>;
  resume: {
    lessonId: string;
    stepIndex: number;
    panel?: string;
    view?: string;
  };
};

test("disjoint range model and transfer preserve state and assistance boundaries", async ({
  page,
}) => {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const stage = modules.find((item) => item.id === "unsafe-miri-contracts")!;
  const lesson = lessons.find(
    (item) => item.id === "unsafe-miri-disjoint-regions",
  )!;
  const model = lesson.steps.find(
    (step) => step.id === "disjoint-regions-range-model",
  )!;
  const primary = lesson.steps.find(
    (step) => step.id === "disjoint-regions-range-transfer",
  )!;
  const modelIndex = lesson.steps.findIndex((step) => step.id === model.id);
  const primaryIndex = lesson.steps.findIndex((step) => step.id === primary.id);
  const primaryKey = stepKey(lesson.id, primary.id);

  const readLearningState = () =>
    page.evaluate(
      () =>
        new Promise<PersistedState>((resolve, reject) => {
          const request = indexedDB.open("rust-workshop-state", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const read = request.result
              .transaction("user-state", "readonly")
              .objectStore("user-state")
              .get("current");
            read.onerror = () => reject(read.error);
            read.onsuccess = () => resolve(read.result as PersistedState);
          };
        }),
    );

  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(stage.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: stage.title })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(modelIndex)
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(model.title);
  await expect(page.locator(".task-pane")).toContainText("0..2");
  await expect(page.locator(".task-pane")).toContainText("pusty zakres");
  await expect(page.locator(".task-pane")).toContainText(/overlap/i);

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(primaryIndex)
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(primary.title);
  await expect(page.locator(".task-pane")).toContainText("RangeError");
  await expect(page.locator(".task-pane")).toContainText("FirstInvalid");
  await expect(page.locator(".task-pane")).toContainText("półotwarte");

  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = "// Zakresy zachowane lokalnie przed transferem.\n";
  const note = "Półotwarte zakresy zachowują kolejność caller'a.";
  let observedRequest:
    { code: string; mode: string; tests?: string } | undefined;
  await page.route("**/api/run", async (route) => {
    observedRequest = route.request().postDataJSON() as typeof observedRequest;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "test-failure",
        stdout: "",
        stderr: "disjoint range draft requires the transfer contract",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 0, failed: 1 },
      }),
    });
  });
  await editor.fill(draft);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("disjoint range draft requires the transfer contract");
  expect(observedRequest).toMatchObject({
    code: draft,
    mode: "test",
    tests:
      primary.evaluator?.kind === "tests" ? primary.evaluator.tests : undefined,
  });

  await page
    .getByRole("button", { name: "Pomóż mi to zrozumieć", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pokaż drugą wskazówkę", exact: true }),
  ).toBeVisible();
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page.getByLabel("Notatki do lekcji").fill(note);
  await expect(
    page
      .locator(".save-status")
      .filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await readLearningState()).steps[primaryKey]?.code)
    .toBe(draft);
  await expect
    .poll(async () => (await readLearningState()).steps[primaryKey]?.hints)
    .toBe(1);
  await expect
    .poll(async () => (await readLearningState()).notes[lesson.id])
    .toBe(note);

  const beforeReload = await readLearningState();
  expect(beforeReload.resume).toMatchObject({
    lessonId: lesson.id,
    stepIndex: primaryIndex,
  });
  expect(
    beforeReload.events.some(
      (event) =>
        event.lessonId === lesson.id &&
        event.stepId === primary.id &&
        event.kind === "transfer" &&
        event.passed,
    ),
  ).toBe(false);

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

  const heading = await page.locator(".task-pane h1").innerText();
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(heading);
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pokaż drugą wskazówkę", exact: true }),
  ).toBeVisible();
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(note);
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(editor).toHaveValue(draft);
  expect((await readLearningState()).resume).toMatchObject({
    lessonId: lesson.id,
    stepIndex: primaryIndex,
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const project = projects.find((item) => item.id === "miri-safety")!;
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: project.title })
    .click();
  const packagePanel = page.getByRole("region", { name: "Pakiet Cargo" });
  const starterDownload = page.waitForEvent("download");
  await packagePanel
    .getByRole("link", { name: "Pobierz pakiet startowy" })
    .click();
  expect(await (await starterDownload).failure()).toBeNull();
  expect((await readLearningState()).steps[primaryKey]?.revealed).toBe(false);
  await packagePanel
    .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
    .click();
  await expect
    .poll(async () => (await readLearningState()).steps[primaryKey]?.revealed)
    .toBe(true);
  expect(
    (await readLearningState()).events.some(
      (event) =>
        event.lessonId === lesson.id &&
        event.stepId === primary.id &&
        event.kind === "transfer" &&
        event.passed,
    ),
  ).toBe(false);

  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
