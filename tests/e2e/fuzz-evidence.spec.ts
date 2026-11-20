import { test, expect } from "@playwright/test";
import { lessons, modules, projects } from "../../src/content/course";

type PersistedLearningState = {
  mastery: Record<string, unknown>;
  events: Array<{
    lessonId: string;
    stepId: string;
    kind: string;
    passed: boolean;
    hints: number;
    revealed: boolean;
  }>;
};

test("fuzz evidence keeps prediction, mocked success, reveal, independent blank and exact resume", async ({ page }) => {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const stage = modules.find((item) => item.id === "fuzz-evidence-lifecycle")!;
  const firstCriterion = stage.gateCriteria![0];
  const primary = lessons.find((lesson) => lesson.id === firstCriterion.taskRefs[0].lessonId)!;
  const gate = primary.steps.find((step) => step.id === firstCriterion.taskRefs[0].stepId)!;
  const blank = primary.steps.find((step) => step.id === firstCriterion.taskRefs[1].stepId)!;
  const gateIndex = primary.steps.findIndex((step) => step.id === gate.id);
  const blankIndex = primary.steps.findIndex((step) => step.id === blank.id);
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page.getByRole("searchbox", { name: "Znajdź moduł lub temat" }).fill(stage.title);
  await page.locator(".module-picker > button").filter({ hasText: stage.title }).click();
  await page.locator(".gate-action").first().click();
  await page.getByLabel("Kroki lekcji").getByRole("button").first().click();
  await expect(page.locator(".task-pane h1")).toHaveText(primary.steps[0].title);
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Sprawdź odpowiedź", exact: true }).click();
  await expect(
    page.locator('[aria-label="Zadanie"]').getByRole("status"),
  ).toBeVisible();
  await page.getByLabel("Kroki lekcji").getByRole("button").nth(gateIndex).click();
  await page.getByRole("button", { name: "Prosty edytor", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = `${gate.code}\n// Prediction recorded before the authored run.\n`;
  await editor.fill(draft);
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON();
    if (request.code === draft)
      expect(request).toEqual({ code: draft, mode: "test", tests: gate.evaluator?.kind === "tests" ? gate.evaluator.tests : undefined });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "success", stdout: "test result: ok", stderr: "", diagnostics: [], durationMs: 1, tests: { passed: 1, failed: 0 } }) });
  });
  await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
  await expect(page.getByRole("region", { name: "Wynik kompilatora" })).toContainText("test result: ok");
  await expect(page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" })).toBeVisible();
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć", exact: true }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę", exact: true }).click();
  await expect(page.getByText("Potrzebuję pełnego rozwiązania", { exact: true })).toBeVisible();
  const readLearningState = () => page.evaluate(async (): Promise<PersistedLearningState> => {
    const request = indexedDB.open("rust-workshop-state", 1);
    return await new Promise<PersistedLearningState>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction("user-state", "readonly");
        const get = transaction.objectStore("user-state").get("current");
        get.onsuccess = () => resolve({
          mastery: (get.result?.mastery ?? {}) as Record<string, unknown>,
          events: (get.result?.events ?? []) as PersistedLearningState["events"],
        });
        get.onerror = () => reject(get.error);
      };
    });
  });
  const stateBeforeReveal = await readLearningState();
  await page.getByText("Potrzebuję pełnego rozwiązania", { exact: true }).click();
  await page.getByRole("button", { name: "Pokaż rozwiązanie", exact: true }).click();
  const project = projects.find((item) => item.id === "mini-grep")!;
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page.getByRole("navigation", { name: "Wybierz projekt" }).getByRole("button", { name: project.title }).click();
  const packagePanel = page.getByRole("region", { name: "Pakiet Cargo" });
  await packagePanel.getByRole("button", { name: "Pokaż rozwiązanie pakietu" }).click();
  const downloadStarted = page.waitForEvent("download");
  await packagePanel.getByRole("link", { name: "Pobierz rozwiązanie" }).click();
  const archive = await downloadStarted;
  expect(await archive.failure()).toBeNull();
  expect(archive.suggestedFilename()).toBe("mini-grep-workshop-solution.zip");
  const stateAfterReveal = await readLearningState();
  const stableMastery = (mastery: Record<string, unknown>) => {
    const entry = mastery[primary.conceptIds[0]] as Record<string, unknown> | undefined;
    return { level: entry?.level, reason: entry?.reason };
  };
  expect(stableMastery(stateAfterReveal.mastery)).toEqual(stableMastery(stateBeforeReveal.mastery));
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page.getByRole("searchbox", { name: "Znajdź moduł lub temat" }).fill(stage.title);
  await page.locator(".module-picker > button").filter({ hasText: stage.title }).click();
  await page.locator(".lesson-list-item").filter({ hasText: primary.title }).click();
  await page.getByLabel("Kroki lekcji").getByRole("button").nth(gateIndex).click();
  await page.getByRole("textbox", { name: "Kod Rust", exact: true }).fill(gate.solution!);
  await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
  await expect(page.getByRole("region", { name: "Wynik kompilatora" })).toContainText("test result: ok");
  await expect(page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" })).toBeVisible();
  const assistedEventsFor = async () => {
    const state = await readLearningState();
    return state.events.slice(stateAfterReveal.events.length).filter(
      (event) =>
        event.lessonId === primary.id &&
        event.stepId === gate.id &&
        event.kind !== "exposure",
    );
  };
  await expect.poll(assistedEventsFor).toHaveLength(1);
  const stateAfterAssistedPrimary = await readLearningState();
  const assistedEvents = await assistedEventsFor();
  expect(assistedEvents).toHaveLength(1);
  const assistedEvent = assistedEvents[0];
  expect(assistedEvent).toMatchObject({ passed: true, hints: 2, revealed: true });
  const independent =
    assistedEvent.passed &&
    assistedEvent.hints === 0 &&
    !assistedEvent.revealed &&
    assistedEvent.kind !== "self-rating";
  expect(independent).toBe(false);
  expect(stableMastery(stateAfterAssistedPrimary.mastery)).toEqual(stableMastery(stateAfterReveal.mastery));
  await page.getByLabel("Kroki lekcji").getByRole("button").nth(blankIndex).click();
  const blankEditor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(blankEditor).toHaveValue("");
  const blankDraft = "// Independent fuzz contract draft.\n";
  await blankEditor.fill(blankDraft);
  await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
  await expect(page.getByRole("region", { name: "Wynik kompilatora" })).toContainText("test result: ok");
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page.getByLabel("Notatki do lekcji").fill("Prediction, replay and blank stay separate.");
  await expect(page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" })).toBeVisible();
  const heading = await page.locator(".task-pane h1").innerText();
  await blankEditor.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Monaco Editor", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(blankEditor).toBeFocused();
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(heading);
  await expect(blankEditor).toHaveValue(blankDraft);
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(page.getByLabel("Notatki do lekcji")).toHaveValue("Prediction, replay and blank stay separate.");
  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
