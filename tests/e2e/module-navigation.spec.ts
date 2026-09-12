import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules } from "../../src/content/course";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import type { Lesson } from "../../src/domain/types";

async function resumeAtLastStep(page: Page, lesson: Lesson) {
  const state = createInitialState();
  state.onboarding.completed = true;
  state.diagnostic.completed = true;
  state.settings.accessibleEditor = true;
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: lesson.id,
    stepIndex: lesson.steps.length - 1,
  };
  state.steps[stepKey(lesson.id, lesson.steps.at(-1)!.id)] = {
    ...createStepProgress(),
    completed: true,
  };
  await page.goto("/");
  await page.evaluate(async (value) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("user-state");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("user-state", "readwrite");
        transaction.objectStore("user-state").put(value, "current");
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, state);
  await page.reload();
}

test("returns from the last course step to its map without losing the resume", async ({
  page,
}) => {
  const lesson = lessons.at(-1)!;
  await resumeAtLastStep(page, lesson);
  await page.getByRole("button", { name: "Wróć do mapy", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Od pierwszego programu do samodzielności.",
    }),
  ).toBeVisible();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await expect(
    page.getByRole("heading", {
      name: lesson.steps.at(-1)!.title,
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: lesson.steps.at(-1)!.title,
      exact: true,
    }),
  ).toBeVisible();
});

test("names the module boundary and opens the following module", async ({
  page,
}) => {
  const firstModule = modules[0];
  const lastLesson = lessons.find(
    (lesson) => lesson.id === firstModule.lessonIds.at(-1),
  )!;
  const nextLesson = lessons.find(
    (lesson) => lesson.id === modules[1].lessonIds[0],
  )!;
  await resumeAtLastStep(page, lastLesson);
  await page
    .getByRole("button", { name: "Kolejny moduł", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: nextLesson.steps[0].title, exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".lesson-top").getByRole("button", { name: modules[1].title }),
  ).toBeVisible();
});

test("opens modeling, repairs a slice and retains the work across a module switch", async ({
  page,
}, testInfo) => {
  const lesson = lessons.find((item) => item.id === "slices-and-views")!;
  const step = lesson.steps.find((item) => item.id === "slice-repair")!;
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON();
    const correct = request.code === step.solution;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        correct
          ? {
              status: "success",
              stdout: "",
              stderr: "",
              diagnostics: [],
              tests: { passed: 2, failed: 0 },
              durationMs: 1,
            }
          : {
              status: "compile-error",
              stdout: "",
              stderr: "error[E0308]: mismatched types",
              diagnostics: [
                { code: "E0308", message: "mismatched types", level: "error" },
              ],
              durationMs: 1,
            },
      ),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Modelowanie danych/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Modelowanie danych", exact: true }),
  ).toBeVisible();
  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: step.title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByText("Błąd kompilacji", { exact: true }),
  ).toBeVisible();
  await editor.fill(step.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(page.getByText(/Testy: 2 poprawnych/)).toBeVisible();
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(step.solution!);
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Fundamenty Rust/ })
    .click();
  await page.locator(".lesson-list-item").first().click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Modelowanie danych/ })
    .click();
  await page.locator(".lesson-list-item").first().click();
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(lesson.steps.indexOf(step))
    .click();
  await expect(editor).toHaveValue(step.solution!);
  await page.screenshot({
    path: testInfo.outputPath("modeling-code.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Modelowanie danych", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("modeling-map-mobile.png"),
    fullPage: true,
  });
});
