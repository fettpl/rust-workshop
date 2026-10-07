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

async function readStoredResume(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("rust-workshop-state", 1);
    return await new Promise<unknown>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const get = request.result
          .transaction("user-state", "readonly")
          .objectStore("user-state")
          .get("current");
        get.onerror = () => reject(get.error);
        get.onsuccess = () => resolve(get.result?.resume);
      };
    });
  });
}

async function readStoredLearningSnapshot(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("rust-workshop-state", 1);
    return await new Promise<unknown>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const get = request.result
          .transaction("user-state", "readonly")
          .objectStore("user-state")
          .get("current");
        get.onerror = () => reject(get.error);
        get.onsuccess = () => {
          const state = get.result;
          resolve({
            steps: state?.steps ?? {},
            events: state?.events ?? [],
            mastery: state?.mastery ?? {},
            review: state?.review ?? [],
          });
        };
      };
    });
  });
}

test("returns from an extension's final step to its map without losing the resume", async ({
  page,
}) => {
  const extension = modules.find(
    (module) => module.id === "capstone-integration",
  )!;
  const lesson = lessons.find(
    (candidate) => candidate.id === extension.lessonIds.at(-1),
  )!;
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
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
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

test("core Next skips extension modules and follows the reviewed route", async ({
  page,
}) => {
  const closures = modules.find((module) => module.id === "closures")!;
  const lastLesson = lessons.find(
    (lesson) => lesson.id === closures.lessonIds.at(-1),
  )!;
  const nextCoreLesson = lessons.find(
    (lesson) =>
      lesson.id ===
      modules.find((module) => module.id === "iterators")!.lessonIds[0],
  )!;
  await resumeAtLastStep(page, lastLesson);
  const before = await readStoredLearningSnapshot(page);
  await page
    .getByRole("button", { name: "Kolejny moduł", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: nextCoreLesson.steps[0].title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".lesson-top").getByRole("button", { name: "Iteratory" }),
  ).toBeVisible();
  const after = (await readStoredLearningSnapshot(page)) as {
    steps: unknown;
    events: Array<{ kind: string }>;
    mastery: Record<string, { level?: string }>;
    review: unknown;
  };
  const beforeSnapshot = before as typeof after;
  expect(after.steps).toEqual(beforeSnapshot.steps);
  expect(after.review).toEqual(beforeSnapshot.review);
  const masteryRank = (level?: string) =>
    ["new", "exposed", "practiced", "understood", "retained"].indexOf(
      level ?? "new",
    );
  const beforeProven = Object.entries(beforeSnapshot.mastery).filter(
    ([, record]) => masteryRank(record.level) >= 2,
  );
  const afterProven = Object.entries(after.mastery).filter(
    ([, record]) => masteryRank(record.level) >= 2,
  );
  expect(afterProven).toEqual(beforeProven);
  expect(after.events.slice(0, beforeSnapshot.events.length)).toEqual(
    beforeSnapshot.events,
  );
  expect(after.events.filter((event) => event.kind !== "exposure")).toEqual(
    beforeSnapshot.events.filter((event) => event.kind !== "exposure"),
  );
  expect(after.events.length).toBeGreaterThanOrEqual(
    beforeSnapshot.events.length,
  );
  expect(
    after.events
      .slice(beforeSnapshot.events.length)
      .every((event) => event.kind === "exposure"),
  ).toBe(true);
});

test("extension endpoint returns to its selected overview without rewriting resume panel", async ({
  page,
}) => {
  const extension = modules.find((module) => module.id === "shared-ownership")!;
  const lesson = lessons.find(
    (candidate) => candidate.id === extension.lessonIds.at(-1),
  )!;
  const state = createInitialState();
  state.onboarding.completed = true;
  state.diagnostic.completed = true;
  state.routePreference = "extensions";
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: lesson.id,
    stepIndex: lesson.steps.length - 1,
    panel: "output",
  };
  state.steps[stepKey(lesson.id, lesson.steps.at(-1)!.id)] = {
    ...createStepProgress(),
    completed: true,
  };
  await page.goto("/");
  await page.evaluate(async (value) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onsuccess = () => {
        const transaction = request.result.transaction(
          "user-state",
          "readwrite",
        );
        transaction.objectStore("user-state").put(value, "current");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, state);
  await page.reload();
  const beforeEndpoint = await readStoredLearningSnapshot(page);
  await page.getByRole("button", { name: "Wróć do mapy", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: extension.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Język, ownership i abstrakcja", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wymagania wstępne", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Box, Deref i Drop/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Polecane rozszerzenia", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jak wrócić do praktyki", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".module-connections .text-button")).toHaveCount(7);
  await expect(readStoredResume(page)).resolves.toMatchObject({
    view: "course",
    lessonId: lesson.id,
    stepIndex: lesson.steps.length - 1,
    panel: "output",
  });
  await expect(readStoredLearningSnapshot(page)).resolves.toEqual(
    beforeEndpoint,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: extension.title, exact: true }),
  ).toBeVisible();
});

test("Log Analyzer endpoint preserves the authored final resume and learning evidence", async ({
  page,
}) => {
  const logModule = modules.find((module) => module.id === "log-analyzer")!;
  const lesson = lessons.find(
    (candidate) => candidate.id === logModule.lessonIds.at(-1),
  )!;
  const finalStep = lesson.steps.at(-1)!;
  const state = createInitialState();
  state.onboarding.completed = true;
  state.diagnostic.completed = true;
  state.routePreference = "core";
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: lesson.id,
    stepIndex: lesson.steps.length - 1,
    panel: "output",
  };
  state.steps[stepKey(lesson.id, finalStep.id)] = {
    ...createStepProgress("saved final Log Analyzer draft"),
    completed: true,
  };
  state.events.push({
    id: "log-analyzer-existing-assessment",
    conceptIds: lesson.conceptIds,
    lessonId: lesson.id,
    stepId: finalStep.id,
    kind: "assessment",
    passed: true,
    hints: 0,
    revealed: false,
    at: 100,
    gate: true,
    evaluator: "tests",
  });
  for (const conceptId of lesson.conceptIds) {
    state.mastery[conceptId] = {
      level: "understood",
      reason: "existing assessment",
      updatedAt: 100,
    };
  }
  state.review.push({
    conceptId: lesson.conceptIds[0],
    dueAt: 200,
    intervalDays: 2,
    attempts: 1,
    reason: "existing review",
  });
  await page.goto("/");
  await page.evaluate(async (value) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onsuccess = () => {
        const transaction = request.result.transaction(
          "user-state",
          "readwrite",
        );
        transaction.objectStore("user-state").put(value, "current");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, state);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: finalStep.title, exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        ((await readStoredLearningSnapshot(page)) as { events: unknown[] })
          .events.length,
    )
    .toBeGreaterThan(state.events.length);
  const before = await readStoredLearningSnapshot(page);
  await page.getByRole("button", { name: "Wróć do mapy", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: logModule.title, exact: true }),
  ).toBeVisible();
  await expect(readStoredResume(page)).resolves.toMatchObject({
    view: "course",
    lessonId: lesson.id,
    stepIndex: lesson.steps.length - 1,
    panel: "output",
  });
  await expect(readStoredLearningSnapshot(page)).resolves.toEqual(before);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: logModule.title, exact: true }),
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
