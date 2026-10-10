import { expect, test, type Page } from "@playwright/test";
import { lessons } from "../../src/content/course";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";

async function seed(page: Page, state: UserState) {
  await page.goto("/");
  await page.evaluate(async (value) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("user-state"))
          request.result.createObjectStore("user-state");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("user-state", "readwrite");
        tx.objectStore("user-state").put(value, "current");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, state);
  await page.reload();
}

for (const [lessonId, stepId, stdout] of [
  ["memory-intro", "memory-run", "3\n"],
  ["memory-intro", "memory-modify", "warm\n"],
  ["functions-and-ownership", "function-expression-run", "42\n"],
  ["number-guessing-transfer", "project-result-run", "correct\n"],
]) {
  test(`${lessonId}/${stepId} executes code despite a saved correct answer and resumes exactly`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const lesson = lessons.find((lesson) => lesson.id === lessonId)!;
    const step = lesson.steps.find((step) => step.id === stepId)!;
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
      stepIndex: lesson.steps.indexOf(step),
    };
    state.steps[stepKey(lessonId, stepId)] = {
      ...createStepProgress(),
      code: "fn main() {}",
      answer: stdout.trim(),
    };
    let calls = 0;
    // Controlled runner responses exercise UI/evaluator wiring; Rust behavior is proved separately.
    await page.route("**/api/run", async (route) => {
      calls += 1;
      const request = route.request().postDataJSON();
      expect(request.mode).toBe("run");
      expect(request.tests).toBeUndefined();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          stdout: request.code === step.solution ? stdout : "wrong\n",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
        }),
      });
    });
    await seed(page, state);
    await expect(
      page.getByRole("heading", { name: step.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Twoja odpowiedź", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Sprawdź odpowiedź", exact: true }),
    ).toHaveCount(0);
    const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    await expect(editor).toHaveValue("fn main() {}");
    await page.getByRole("button", { name: "Uruchom", exact: true }).click();
    await expect(
      page.getByText("Dane wyjściowe nie są jeszcze zgodne z oczekiwaniem.", {
        exact: true,
      }),
    ).toBeVisible();
    if (step.hints?.length) {
      await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
      await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
      await page
        .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
        .click();
      await page
        .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
        .click();
      await expect(page.locator(".revealed-solution")).toBeVisible();
    }
    await editor.fill(step.solution!);
    await page.getByRole("button", { name: "Uruchom", exact: true }).click();
    await expect(
      page.getByText("Dane wyjściowe są zgodne.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".save-status")).toHaveText(
      "Zapisano na tym urządzeniu",
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: step.title, exact: true }),
    ).toBeVisible();
    await expect(editor).toHaveValue(step.solution!);
    expect(calls).toBe(2);
    expect(errors).toEqual([]);
  });
}
