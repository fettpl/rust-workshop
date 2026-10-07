import { expect, test, type Page } from "@playwright/test";
import { lessons, projects, reviewExercises } from "../../src/content/course";
import { createInitialState, stepKey } from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";

function readyState(): UserState {
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 3,
    recommendation: "memory-intro",
  };
  state.settings.accessibleEditor = true;
  return state;
}

async function seed(page: Page, state: UserState) {
  await page.goto("/");
  await page.evaluate(async (next) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("user-state");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("user-state", "readwrite");
        transaction.objectStore("user-state").put(next, "current");
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

async function savedState(page: Page): Promise<UserState> {
  await expect(
    page.locator(".save-status"),
  ).toBeVisible();
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const open = indexedDB.open("rust-workshop-state", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db
            .transaction("user-state")
            .objectStore("user-state")
            .get("current");
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
          read.onerror = () => reject(read.error);
        };
      }),
  );
}

test("checks a TOML draft locally, preserves it after reload, and loads Monaco with the correct language", async ({
  page,
}) => {
  const lesson = lessons.find(
    (item) => item.id === "cargo-dependency-contract",
  )!;
  const stepIndex = lesson.steps.findIndex((step) => step.id.endsWith("-gate"));
  const step = lesson.steps[stepIndex];
  const state = readyState();
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: lesson.id,
    stepIndex,
    panel: "code",
  };
  let runRequests = 0;
  await page.route("**/api/run", (route) => {
    runRequests++;
    return route.abort();
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page, state);
  const editor = page.getByRole("textbox", { name: "Kod TOML", exact: true });
  await expect(editor).toHaveValue(step.code!);
  await expect(page.getByRole("button", { name: /^Uruchom/ })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sprawdź manifest", exact: true })
    .click();
  await expect(page.locator(".feedback")).toBeVisible();
  expect(
    (await savedState(page)).steps[stepKey(lesson.id, step.id)].attempts.at(-1)
      ?.passed,
  ).toBe(false);
  const draft = `${step.solution}\n# Samodzielny szkic\n`;
  await editor.fill(draft);
  await savedState(page);
  await page.reload();
  await expect(editor).toHaveValue(draft);
  await page
    .getByRole("button", { name: "Sprawdź manifest", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();
  const saved = await savedState(page);
  const attempt = saved.steps[stepKey(lesson.id, step.id)].attempts.at(-1)!;
  expect(attempt.code).toBe(draft);
  expect(attempt.result).toBeUndefined();
  expect(saved.events.at(-1)?.evaluator).toBe("manifest-contract");
  await page.setViewportSize({ width: 390, height: 844 });
  const panels = page.getByRole("tablist", { name: "Panele zadania" });
  await expect(panels.getByRole("tab")).toHaveCount(2);
  await panels.getByRole("tab", { name: "Kod", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    panels.getByRole("tab", { name: "Zadanie", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(
    panels.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .getByRole("button", { name: "Monaco Editor", exact: true })
    .click();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await expect(
    page.locator(".monaco-editor").getByRole("textbox", {
      name: "Kod TOML",
      exact: true,
    }),
  ).toBeVisible();
  expect(runRequests).toBe(0);
  expect(errors).toEqual([]);
});

test("submits a due manifest retrieval without a Rust request or fabricated result", async ({
  page,
}) => {
  const id = "cargo-lock-msrv-policy";
  const review = reviewExercises[id];
  const state = readyState();
  state.resume.view = "review";
  state.review = [
    {
      conceptId: id,
      dueAt: Date.now() - 1000,
      intervalDays: 1,
      attempts: 1,
      reason: "Powtórka deklaracji.",
    },
  ];
  let runRequests = 0;
  await page.route("**/api/run", (route) => {
    runRequests++;
    return route.abort();
  });
  await seed(page, state);
  await page.locator(".review-row").click();
  await page
    .getByRole("textbox", { name: "Kod TOML", exact: true })
    .fill(review.solution!);
  await page
    .getByRole("button", { name: "Sprawdź manifest", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Kod TOML", exact: true }),
  ).toHaveCount(0);
  const saved = await savedState(page);
  const event = saved.events.find(
    (event) => event.evaluator === "manifest-contract",
  )!;
  expect(event).toMatchObject({ passed: true, delayed: true, kind: "recall" });
  const attempts = Object.values(saved.steps).flatMap((step) => step.attempts);
  expect(
    attempts.some(
      (attempt) => attempt.code === review.solution && !attempt.result,
    ),
  ).toBe(true);
  expect(runRequests).toBe(0);
});

test("starter preview and download expose primary manifests while preserving blank tasks", async ({
  page,
}) => {
  await seed(page, readyState());
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const project = projects.find((item) => item.id === "frame-protocol")!;
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: project.title })
    .click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  await expect(panel.getByLabel("Zawartość pliku")).toBeVisible();
  let saved = await savedState(page);
  for (const ref of project.package!.starterRevealStepRefs!) {
    expect(saved.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed).toBe(true);
    expect(
      saved.steps[stepKey(ref.lessonId, `${ref.lessonId}-blank`)]?.revealed,
    ).toBeFalsy();
  }
  const exposureCount = saved.events.length;
  const downloading = page.waitForEvent("download");
  await panel.getByRole("link", { name: "Pobierz pakiet startowy" }).click();
  expect(await (await downloading).failure()).toBeNull();
  saved = await savedState(page);
  expect(saved.events.length).toBe(exposureCount);
  await panel
    .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
    .click();
  saved = await savedState(page);
  for (const ref of project.package!.revealStepRefs)
    expect(saved.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed).toBe(true);
});
