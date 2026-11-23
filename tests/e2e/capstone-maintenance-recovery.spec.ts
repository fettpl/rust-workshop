import { localizedPackageFile } from "../../src/i18n/package-markdown";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { courseEvidencePolicy } from "../../src/content/learning-context";
import { independentCodingTaskIds } from "../../src/engine/learning";
import { lessons, projects } from "./polish-course.helper";
import { createInitialState } from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";
import {
  assertArchiveNotices,
  expectedArchivePaths,
} from "./archive-notices.helper";

test.describe.configure({ retries: 0 });

const lesson = lessons.find(
  (candidate) => candidate.id === "capstone-maintenance-recovery",
)!;
const predict = lesson.steps.find(
  (step) => step.id === "capstone-maintenance-predict",
)!;
const packet = lesson.steps.find(
  (step) => step.id === "capstone-maintenance-packet",
)!;
const reviewResponse = lesson.steps.find(
  (step) => step.id === "capstone-maintenance-review-response",
)!;
const project = projects.find(
  (candidate) => candidate.id === "durable-log-service",
)!;

function readyState(lessonId: string, stepIndex: number): UserState {
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
    stepIndex,
    panel: "lesson",
  };
  return state;
}

async function seedState(page: Page, state: UserState): Promise<void> {
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
          read.onerror = () => reject(read.error);
          read.onsuccess = () => {
            database.close();
            resolve(read.result as UserState);
          };
        };
      }),
  );
}

async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator))
      throw new Error("Expected production service-worker support");
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
    if (!navigator.serviceWorker.controller)
      throw new Error("Expected a service-worker-controlled production page");
  });
}

async function openStep(page: Page, stepIndex: number): Promise<void> {
  await page.locator('[aria-label="Kroki lekcji"] button').nth(stepIndex).click();
}

async function openProject(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: project.title })
    .click();
}

async function revealSolutionIfNeeded(
  panel: Locator,
): Promise<void> {
  const reveal = panel.getByRole("button", {
    name: "Pokaż rozwiązanie pakietu",
  });
  if (await reveal.count()) await reveal.click();
}

async function inspectArchive(
  bytes: Buffer,
  variant: "starter" | "solution",
): Promise<void> {
  const archive = project.package!;
  const files = unzipSync(bytes);
  expect(Object.keys(files).sort()).toEqual(expectedArchivePaths(archive));
  assertArchiveNotices(files, archive);
  for (const file of archive.files)
    expect(strFromU8(files[`${archive.id}/${file.path}`])).toBe(localizedPackageFile(file.path, file[variant] ?? file.starter, "pl"));
}

test("resumes optional capstone maintenance practice and downloads both authored archives offline", async ({
  page,
}, testInfo) => {
  expect(lesson.practiceOnly).toBe(true);
  expect(lesson.steps).toHaveLength(6);
  expect(lesson.steps.every((step) => step.evidenceGate !== true)).toBe(true);
  expect(lesson.steps.every((step) => step.evaluator?.kind !== "tests")).toBe(
    true,
  );
  expect(project.package?.files).toHaveLength(40);
  if (!project.package) throw new Error("Expected durable log service package");

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  await seedState(page, readyState(lesson.id, lesson.steps.indexOf(predict)));
  await expect(page.locator(".task-pane h1")).toHaveText(predict.title);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  const admissionDecision =
    "Zamykam admission, rozliczam przyjęte zadania, a nowe odrzucam bez wywołania Store.";
  const correctRadio = page.getByRole("radio", {
    name: admissionDecision,
    exact: true,
  });
  await expect(correctRadio).toHaveCount(1);
  await correctRadio.check();
  await expect(page.locator(".save-live")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(predict.title);
  await expect(correctRadio).toBeChecked();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();

  await openStep(page, lesson.steps.indexOf(packet));
  await expect(page.locator(".task-pane h1")).toHaveText(packet.title);
  const rubric = page.locator("details.rubric");
  await rubric.locator("summary").click();
  const packetDraft =
    "Własny limit i granica admission; referencja pozostaje pomocą, nie dowodem.";
  await page.getByRole("textbox", { name: "Twoje wyjaśnienie" }).fill(packetDraft);
  await expect(page.locator(".save-live")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(packet.title);
  await expect(
    page.getByRole("textbox", { name: "Twoje wyjaśnienie" }),
  ).toHaveValue(packetDraft);
  await expect(rubric).not.toHaveAttribute("open", "");
  await rubric.locator("summary").click();
  await expect(rubric).toHaveAttribute("open", "");
  const criteria = rubric.locator('input[type="checkbox"]');
  await expect(criteria.first()).toBeVisible();
  expect(await criteria.count()).toBe(packet.rubric?.length ?? 0);
  for (let index = 0; index < (await criteria.count()); index += 1)
    await criteria.nth(index).check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(
    page.locator(".feedback").filter({ hasText: "Sprawdziłeś każde kryterium" }),
  ).toBeVisible();

  await openStep(page, lesson.steps.indexOf(reviewResponse));
  await expect(page.locator(".task-pane h1")).toHaveText(reviewResponse.title);
  await page
    .getByRole("textbox", { name: "Twoje wyjaśnienie" })
    .fill("Decyzja: zatrzymuję nową pracę; Stage B pozostaje nierozstrzygnięty.");
  const reviewRubric = page.locator("details.rubric");
  const reviewCriteria = reviewRubric.locator('input[type="checkbox"]');
  if ((await reviewRubric.getAttribute("open")) === null)
    await reviewRubric.locator("summary").click();
  await expect(reviewRubric).toHaveAttribute("open", "");
  const expectedReviewCriteria = reviewResponse.rubric?.length ?? 0;
  expect(expectedReviewCriteria).toBeGreaterThan(0);
  await expect(reviewCriteria).toHaveCount(expectedReviewCriteria);
  await expect(reviewCriteria.first()).toBeVisible();
  for (let index = 0; index < (await reviewCriteria.count()); index += 1)
    await reviewCriteria.nth(index).check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(
    page.locator(".feedback").filter({ hasText: "Sprawdziłeś każde kryterium" }),
  ).toBeVisible();

  await expect(page.locator(".save-live")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  let state = await savedState(page);
  expect(
    state.events.filter((event) => event.lessonId === lesson.id),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        stepId: predict.id,
        kind: "prediction",
        evaluator: "choice",
        passed: true,
        gate: false,
      }),
      expect.objectContaining({
        stepId: packet.id,
        kind: "self-rating",
        evaluator: "rubric",
        passed: true,
        gate: false,
      }),
      expect.objectContaining({
        stepId: reviewResponse.id,
        kind: "self-rating",
        evaluator: "rubric",
        passed: true,
        gate: false,
      }),
    ]),
  );
  expect(
    independentCodingTaskIds(state, lesson.conceptIds[0], courseEvidencePolicy),
  ).toEqual([]);
  expect(
    state.events.filter(
      (event) =>
        event.lessonId === lesson.id &&
        ["fix", "transfer", "project"].includes(event.kind),
    ),
  ).toHaveLength(0);

  await openProject(page);
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  await waitForServiceWorker(page);
  const links: Record<"starter" | "solution", string> = {
    starter: "/localized-projects/pl/durable-log-service-workspace/starter.zip",
    solution: "/localized-projects/pl/durable-log-service-workspace/solution.zip",
  };
  for (const href of Object.values(links)) {
    await page.waitForFunction(async (path) => !!(await caches.match(path)), href);
  }

  const onlineBytes = {} as Record<"starter" | "solution", Buffer>;
  for (const variant of ["starter", "solution"] as const) {
    if (variant === "solution") await revealSolutionIfNeeded(panel);
    const downloading = page.waitForEvent("download");
    await panel
      .getByRole("link", {
        name: variant === "starter" ? "Pobierz pakiet startowy" : "Pobierz rozwiązanie",
      })
      .click();
    const download = await downloading;
    expect(await download.failure()).toBeNull();
    const path = await download.path();
    if (!path) throw new Error(`Expected online ${variant} archive path`);
    onlineBytes[variant] = await readFile(path);
    await inspectArchive(onlineBytes[variant], variant);
  }

  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator(".offline-banner")).toBeVisible();
  await openProject(page);
  const offlinePanel = page.getByRole("region", { name: "Pakiet Cargo" });
  for (const variant of ["starter", "solution"] as const) {
    if (variant === "solution") await revealSolutionIfNeeded(offlinePanel);
    const downloading = page.waitForEvent("download");
    await offlinePanel
      .getByRole("link", {
        name: variant === "starter" ? "Pobierz pakiet startowy" : "Pobierz rozwiązanie",
      })
      .click();
    const download = await downloading;
    expect(await download.failure()).toBeNull();
    const path = await download.path();
    if (!path) throw new Error(`Expected offline ${variant} archive path`);
    const offlineBytes = await readFile(path);
    expect(offlineBytes).toEqual(onlineBytes[variant]);
    await inspectArchive(offlineBytes, variant);
  }

  await expect(page.locator(".save-live")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  state = await savedState(page);
  expect(
    independentCodingTaskIds(state, lesson.conceptIds[0], courseEvidencePolicy),
  ).toEqual([]);
  await testInfo.attach("a8-e2e-browser-diagnostics", {
    body: JSON.stringify({ pageErrors, consoleErrors }, null, 2),
    contentType: "application/json",
  });
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
