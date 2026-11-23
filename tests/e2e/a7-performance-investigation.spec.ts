import { localizedPackageFile } from "../../src/i18n/package-markdown";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { courseEvidencePolicy } from "../../src/content/learning-context";
import { independentCodingTaskIds } from "../../src/engine/learning";
import { lessons, modules, projects } from "./polish-course.helper";
import { createInitialState } from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";
import {
  assertArchiveNotices,
  expectedArchivePaths,
} from "./archive-notices.helper";

test.describe.configure({ retries: 0 });

const lesson = lessons.find(
  (candidate) => candidate.id === "performance-evidence-investigation",
)!;
const predict = lesson.steps.find(
  (step) => step.id === "performance-investigation-predict",
)!;
const reference = lesson.steps.find(
  (step) => step.id === "performance-investigation-reference-exposure",
)!;
const packet = lesson.steps.find(
  (step) => step.id === "performance-investigation-own-packet",
)!;
const performanceModule = modules.find(
  (candidate) => candidate.id === "performance-evidence",
)!;
const logProject = projects.find(
  (candidate) => candidate.package?.id === "log-analyzer-workshop",
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
        const db = request.result;
        const transaction = db.transaction("user-state", "readwrite");
        transaction.objectStore("user-state").put(nextState, "current");
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
          read.onsuccess = () => {
            db.close();
            resolve(read.result as UserState);
          };
          read.onerror = () => reject(read.error);
        };
      }),
  );
}

async function openStep(page: Page, stepIndex: number): Promise<void> {
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(stepIndex)
    .click();
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
          {
            once: true,
          },
        ),
      );
    if (!navigator.serviceWorker.controller)
      throw new Error("Expected a service-worker-controlled production page");
  });
}

test("resumes optional performance practice and downloads its cached archive offline", async ({
  page,
}, testInfo) => {
  expect(lesson.practiceOnly).toBe(true);
  expect(lesson.steps).toHaveLength(6);
  expect(lesson.steps.every((step) => step.evidenceGate !== true)).toBe(true);
  expect(lesson.steps.every((step) => step.evaluator?.kind !== "tests")).toBe(
    true,
  );
  expect(performanceModule.gateCriteria).toHaveLength(8);
  expect(
    performanceModule.gateCriteria!.flatMap((criterion) => criterion.taskRefs),
  ).not.toContainEqual(expect.objectContaining({ lessonId: lesson.id }));
  expect(logProject?.package?.files).toHaveLength(26);
  if (!logProject?.package) throw new Error("Expected Log Analyzer package");

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

  const prediction = page.locator('input[type="radio"][value="same-workload"]');
  await prediction.check();
  await expect(page.locator(".save-live")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(predict.title);
  await expect(prediction).toBeChecked();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();

  await openStep(page, lesson.steps.indexOf(reference));
  await expect(page.locator(".task-pane h1")).toHaveText(reference.title);
  await page.locator('input[type="radio"][value="scope"]').check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();

  await openStep(page, lesson.steps.indexOf(packet));
  await expect(page.locator(".task-pane h1")).toHaveText(packet.title);
  const rubric = page.locator("details.rubric");
  await rubric.locator("summary").click();
  const packetDraft =
    "Workload: inny selektywny strumień; oracle literalny; replay i kontrprzykład; decyzja inconclusive.";
  await expect(
    page.getByRole("textbox", { name: "Twoje wyjaśnienie" }),
  ).toHaveValue("");
  await page
    .getByRole("textbox", { name: "Twoje wyjaśnienie" })
    .fill(packetDraft);
  await expect(page.locator(".save-live")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(packet.title);
  await expect(
    page.getByRole("textbox", { name: "Twoje wyjaśnienie" }),
  ).toHaveValue(packetDraft);
  const criteria = rubric.locator('input[type="checkbox"]');
  await rubric.locator("summary").click();
  await expect(rubric).toHaveAttribute("open", "");
  await expect(criteria.first()).toBeVisible();
  expect(await criteria.count()).toBe(packet.rubric?.length ?? 0);
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

  let state = await savedState(page);
  expect(state.events.filter((event) => event.lessonId === lesson.id)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        stepId: predict.id,
        kind: "prediction",
        evaluator: "choice",
        passed: true,
        gate: false,
      }),
      expect.objectContaining({
        stepId: reference.id,
        kind: "exposure",
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

  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const picker = page.getByRole("navigation", { name: "Wybierz projekt" });
  await picker
    .getByRole("button", { name: new RegExp(logProject.title) })
    .click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  const starter = panel.getByRole("link", { name: "Pobierz pakiet startowy" });
  await expect(starter).toHaveAttribute(
    "href",
    "/localized-projects/pl/log-analyzer-workshop/starter.zip",
  );
  await waitForServiceWorker(page);
  const archiveUrl = await starter.getAttribute("href");
  if (!archiveUrl) throw new Error("Expected starter archive URL");
  await page.waitForFunction(
    async (path) => !!(await caches.match(path)),
    archiveUrl,
  );

  const onlineStarted = page.waitForEvent("download");
  await starter.click();
  const onlineDownload = await onlineStarted;
  expect(await onlineDownload.failure()).toBeNull();
  const onlinePath = await onlineDownload.path();
  if (!onlinePath) throw new Error("Expected online archive path");
  const onlineBytes = await readFile(onlinePath);
  const archive = logProject.package;
  const onlineFiles = unzipSync(onlineBytes);
  expect(Object.keys(onlineFiles).sort()).toEqual(
    expectedArchivePaths(archive),
  );
  assertArchiveNotices(onlineFiles, archive);
  for (const file of archive.files)
    expect(strFromU8(onlineFiles[`${archive.id}/${file.path}`])).toBe(
      localizedPackageFile(file.path, file.starter, "pl"),
    );

  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator(".offline-banner")).toBeVisible();
  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: new RegExp(logProject.title) })
    .click();
  const offlinePanel = page.getByRole("region", { name: "Pakiet Cargo" });
  const offlineStarted = page.waitForEvent("download");
  await offlinePanel
    .getByRole("link", { name: "Pobierz pakiet startowy" })
    .click();
  const offlineDownload = await offlineStarted;
  expect(await offlineDownload.failure()).toBeNull();
  const offlinePath = await offlineDownload.path();
  if (!offlinePath) throw new Error("Expected offline archive path");
  const offlineBytes = await readFile(offlinePath);
  expect(offlineBytes).toEqual(onlineBytes);
  const offlineFiles = unzipSync(offlineBytes);
  expect(Object.keys(offlineFiles).sort()).toEqual(
    expectedArchivePaths(archive),
  );
  assertArchiveNotices(offlineFiles, archive);
  expect(
    [...archive.files]
      .filter((file) => file.path.startsWith("A7-"))
      .map((file) => file.path),
  ).toEqual([
    "A7-PERFORMANCE-MANIFEST.json",
    "A7-REPLAY.md",
    "A7-INVESTIGATION.md",
  ]);
  for (const file of archive.files)
    expect(strFromU8(offlineFiles[`${archive.id}/${file.path}`])).toBe(
      localizedPackageFile(file.path, file.starter, "pl"),
    );

  state = await savedState(page);
  expect(
    independentCodingTaskIds(state, lesson.conceptIds[0], courseEvidencePolicy),
  ).toEqual([]);
  await testInfo.attach("a7-e2e-browser-diagnostics", {
    body: JSON.stringify({ pageErrors, consoleErrors }, null, 2),
    contentType: "application/json",
  });
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
