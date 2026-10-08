import { expect, test, type Page } from "@playwright/test";
import { lessons, modules } from "../../src/content/course";
import { courseEvidenceSummary } from "../../src/content/learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  stepKey,
} from "../../src/persistence/state";
import { gateRecovery } from "../../src/engine/learning";
import type { EvidenceEvent, UserState } from "../../src/domain/types";

const lesson = lessons.find((item) => item.id === "unsafe-miri-byte-view")!;
const gate = lesson.steps.find((step) => step.id === "byte-view-gate")!;
const blank = lesson.steps.find((step) => step.id === "byte-view-blank")!;
const conceptId = lesson.conceptIds[0];
const gateTests = gate.evaluator?.kind === "tests" ? gate.evaluator.tests : "";
const criterion = modules
  .find((module) => module.id === lesson.moduleId)!
  .gateCriteria!.find((item) =>
    item.taskRefs.some(
      (ref) => ref.lessonId === lesson.id && ref.stepId === gate.id,
    ),
  )!;
const gateKey = stepKey(lesson.id, gate.id);
const blankKey = stepKey(lesson.id, blank.id);
const legacyEvent: EvidenceEvent = {
  id: "browser-preserved-legacy-event",
  conceptIds: [conceptId],
  lessonId: lesson.id,
  stepId: "byte-view-contract-gate",
  kind: "transfer",
  passed: true,
  hints: 0,
  revealed: false,
  at: 1_700_000_000_000,
  evaluator: "tests",
};

function importedState(): UserState {
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
    lessonId: lesson.id,
    stepIndex: lesson.steps.indexOf(gate),
    panel: "lesson",
  };
  state.steps[gateKey] = {
    ...createStepProgress(gate.code),
    code: "// draft-before-import",
  };
  state.steps[blankKey] = {
    ...createStepProgress(blank.code),
    hints: 2,
    revealed: true,
  };
  state.events = [legacyEvent];
  state.reviewSession = {
    conceptId,
    mode: "challenge",
    sessionId: "browser-review-identity",
    startedAt: 1_700_000_000_000,
    wasDue: false,
    exerciseId: "review-unsafe-miri-byte-view",
  };
  state.review = [
    {
      conceptId,
      dueAt: 1_700_000_000_001,
      intervalDays: 1,
      attempts: 1,
      reason: "browser-preserved-review",
    },
  ];
  return state;
}

async function seedState(page: Page, state: UserState) {
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
          read.onsuccess = () => {
            database.close();
            resolve(read.result as UserState);
          };
          read.onerror = () => reject(read.error);
        };
      }),
  );
}

async function importThroughUi(page: Page, state: UserState) {
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  await page.getByLabel("Importuj postęp").setInputFiles({
    name: "advanced-family-state.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportState(state)),
  });
  await expect(page.getByText("Gotowy do importu")).toBeVisible();
  await page.getByRole("button", { name: "Zastąp postęp tym plikiem" }).click();
}

test("imports supplementary help and preserves evidence boundaries on client submit", async ({
  page,
}) => {
  await page.goto("/");
  const before = importedState();
  const baseline = createInitialState();
  baseline.onboarding = { completed: true, name: "Ada", minutes: 15 };
  baseline.diagnostic = {
    completed: true,
    answers: {},
    score: 0,
    recommendation: "",
  };
  baseline.settings.accessibleEditor = true;
  await seedState(page, baseline);
  await importThroughUi(page, before);
  await page.reload();

  await expect(page.locator(".task-pane")).toContainText(
    "Ten sam kontrakt ma zapisaną pomoc w innym kroku",
  );
  await expect(page.locator(".task-pane")).toContainText(
    "Bieżący kontrakt: wersja 2",
  );
  const imported = await savedState(page);
  expect(imported.events[0]).toEqual(legacyEvent);
  expect(
    imported.events.filter((event) => event.stepId === blank.id),
  ).toHaveLength(0);
  expect(imported.reviewSession?.sessionId).toBe("browser-review-identity");
  expect(imported.steps[gateKey].code).toBe("// draft-before-import");
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await expect(page.locator(".solution-warning")).toContainText(
    "potwierdzenie samodzielności poczeka na inne świeże zadanie",
  );

  let runnerCall = false;
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON();
    expect(request).toMatchObject({
      mode: "test",
      code: gate.solution,
      tests: gateTests,
    });
    runnerCall = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "mocked authored contract tests passed",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 4, failed: 0 },
      }),
    });
  });
  const beforeSubmit = await savedState(page);
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(gate.solution!);
  const runResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/run"),
  );
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await runResponse;
  await expect
    .poll(async () => (await savedState(page)).events.length)
    .toBe(beforeSubmit.events.length + 1);

  const after = await savedState(page);
  expect(runnerCall).toBe(true);
  expect(after.events[0]).toEqual(legacyEvent);
  expect(after.events.at(-1)).toMatchObject({
    lessonId: lesson.id,
    stepId: gate.id,
    conceptIds: [conceptId],
    evidenceVersion: 2,
    kind: "transfer",
    evaluator: "tests",
    passed: true,
    hints: 2,
    revealed: true,
    gate: true,
  });
  expect(after.reviewSession?.sessionId).toBe("browser-review-identity");
  expect(after.steps[gateKey].completed).toBe(true);
  expect(courseEvidenceSummary(after, conceptId).qualifyingCodingTasks).toBe(0);
  expect(gateRecovery(after, criterion, lessons).status).toBe("exhausted");
  await expect(page.locator(".solution-warning")).toContainText(
    "potwierdzenie samodzielności poczeka na inne świeże zadanie",
  );
});
