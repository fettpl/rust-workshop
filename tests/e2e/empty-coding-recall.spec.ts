import { expect, test, type Page } from "@playwright/test";
import { concepts, lessons, reviewExercises } from "./polish-course.helper";
import type { LessonStep, UserState } from "../../src/domain/types";
import { reviewSessionKey } from "../../src/engine/review-session";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";

// Fixed IDs from the curriculum review's Chromium reproduction, not a filter
// that could silently omit a regression when the authored content changes.
const reviewIds = [
  "review-guess-session-io",
  "review-guess-random-boundary",
  "review-tokio-async-read-write",
  "review-tokio-framing-eof",
  "review-tokio-retained-frame-progress",
  "async-lending-receiver-review",
  "async-lending-callbacks-review",
  "async-lending-cancel-commit-review",
  "async-lending-send-boundary-review",
  "async-lending-dyn-adapter-review",
  "review-api-trait-compatibility",
  "review-api-compatible-surface",
  "dependency-graph-diagnosis-review",
  "dependency-source-license-policy-review",
  "dependency-advisory-exceptions-review",
  "dependency-release-dossier-review",
  "property-shrinking-replay-review",
  "property-metamorphic-transfer-review",
  "review-service-operations-bounded-admission",
  "review-service-operations-allowlisted-telemetry",
  "review-service-operations-readiness-drain",
  "review-service-operations-incident-evidence",
];
const recallLessons = [
  "dependency-graph-diagnosis",
  "dependency-source-license-policy",
  "dependency-advisory-exceptions",
  "dependency-release-dossier",
  "property-shrinking-replay",
  "property-metamorphic-transfer",
];
const historyKey = stepKey(lessons[0].id, lessons[0].steps[0].id);
const oldAttempt = {
  at: 1000,
  answer: "dawna odpowiedź tekstowa",
  passed: false,
  feedback: "Historyczna próba.",
};

function readyState() {
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 3,
    recommendation: "memory-intro",
  };
  state.settings.accessibleEditor = true;
  state.steps[historyKey] = {
    ...createStepProgress("// zapisany wcześniej szkic"),
    attempts: [oldAttempt],
    hints: 2,
    revealed: true,
  };
  state.events = [
    {
      id: "historical-exposure",
      conceptIds: [...lessons[0].conceptIds],
      lessonId: lessons[0].id,
      stepId: lessons[0].steps[0].id,
      kind: "exposure",
      passed: false,
      hints: 2,
      revealed: true,
      at: 1000,
    },
  ];
  state.notes[lessons[0].id] = "Zachowaj notatkę i zakładkę.";
  state.bookmarks = [historyKey];
  return state;
}

async function seed(page: Page, state: UserState) {
  await page.goto("/");
  await page.evaluate(
    (next) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("rust-workshop-state", 1);
        open.onupgradeneeded = () => {
          if (!open.result.objectStoreNames.contains("user-state"))
            open.result.createObjectStore("user-state");
        };
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("user-state", "readwrite");
          tx.objectStore("user-state").put(next, "current");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    state,
  );
  await page.reload();
}

async function stored(page: Page): Promise<UserState> {
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const open = indexedDB.open("rust-workshop-state", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db
            .transaction("user-state", "readonly")
            .objectStore("user-state")
            .get("current");
          read.onsuccess = () => {
            db.close();
            resolve(read.result as UserState);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
}

function expectHistory(current: UserState, original: UserState) {
  expect(current.steps[historyKey]).toEqual(original.steps[historyKey]);
  expect(current.notes).toEqual(original.notes);
  expect(current.bookmarks).toEqual(original.bookmarks);
  expect(current.events.slice(0, original.events.length)).toEqual(
    original.events,
  );
}

async function codingFlow(
  page: Page,
  step: LessonStep,
  key: string,
  initial: UserState,
) {
  // Only the external execution boundary is intercepted. These tests establish
  // real view, request, evaluator, and IndexedDB behavior, not Rust correctness.
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON();
    expect(request.mode).toBe("test");
    expect(request.tests).toBe(
      step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined,
    );
    const passed = request.code === step.solution;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: passed ? "success" : "test-failure",
        stdout: "",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: passed ? 1 : 0, failed: passed ? 0 : 1 },
      }),
    });
  });
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const run = page.getByRole("button", { name: "Uruchom testy", exact: true });
  await expect(editor).toBeEditable();
  await expect(editor).toHaveValue("");
  await expect(run).toBeDisabled();
  await editor.fill("// niepełny szkic");
  await run.click();
  await expect
    .poll(async () => (await stored(page)).steps[key]?.attempts.length)
    .toBe(2);
  let current = await stored(page);
  expect(current.steps[key].completed).toBe(false);
  expect(current.steps[key].attempts[0]).toEqual(oldAttempt);
  expect(current.steps[key].attempts[1].passed).toBe(false);
  expectHistory(current, initial);
  await page.reload();
  await expect(editor).toHaveValue("// niepełny szkic");
  await expect(editor).toBeEditable();
  expect(step.solution).toBeTruthy();
  await editor.fill(step.solution!);
  await expect
    .poll(async () => (await stored(page)).steps[key]?.code)
    .toBe(step.solution);
  await page.reload();
  await expect(editor).toHaveValue(step.solution!);
  await run.click();
  await expect
    .poll(async () => (await stored(page)).steps[key]?.completed)
    .toBe(true);
  current = await stored(page);
  expect(current.steps[key].attempts).toHaveLength(3);
  expect(current.steps[key].attempts[0]).toEqual(oldAttempt);
  expect(current.steps[key].attempts[2]).toMatchObject({
    code: step.solution,
    passed: true,
    result: { status: "success" },
  });
  expectHistory(current, initial);
  await page.reload();
  await expect(editor).toHaveValue(step.solution!);
  expect((await stored(page)).steps[key].completed).toBe(true);
}

for (const id of reviewIds) {
  test(`${id}: empty coding review survives failure, reload, success, and finish`, async ({
    page,
  }) => {
    const entry = Object.entries(reviewExercises).find(
      ([, step]) => step.id === id,
    );
    expect(entry, `registered review ${id}`).toBeDefined();
    const [conceptId, step] = entry!;
    const state = readyState();
    const sessionId = `empty-editor-${id}`;
    const key = reviewSessionKey(sessionId);
    state.resume.view = "review";
    state.review = [
      {
        conceptId,
        dueAt: 1000,
        intervalDays: 1,
        attempts: 1,
        reason: "Zapisana powtórka.",
      },
    ];
    state.reviewSession = {
      conceptId,
      mode: "challenge",
      sessionId,
      startedAt: Date.now(),
      wasDue: true,
    };
    state.steps[key] = {
      ...createStepProgress(),
      answer: oldAttempt.answer,
      attempts: [oldAttempt],
    };
    await seed(page, state);
    await expect(
      page.getByRole("heading", { name: step.title, exact: true }),
    ).toBeVisible();
    await codingFlow(page, step, key, state);
    await page
      .getByRole("button", { name: "Zakończ powtórkę", exact: true })
      .click();
    await expect
      .poll(async () => (await stored(page)).reviewSession)
      .toBeUndefined();
    await page.reload();
    const current = await stored(page);
    expect(current.steps[key].completed).toBe(true);
    expect(current.steps[key].answer).toBe(oldAttempt.answer);
    expect(current.reviewSession).toBeUndefined();
    expect(
      current.review.find((item) => item.conceptId === conceptId)?.dueAt,
    ).toBeGreaterThan(1000);
    expectHistory(current, state);
  });
}

for (const lessonId of recallLessons) {
  test(`${lessonId}: recall without a starter provides a saved editable program`, async ({
    page,
  }) => {
    const lesson = lessons.find((item) => item.id === lessonId)!;
    const stepIndex = lesson.steps.findIndex(
      (step) => step.id === `${lessonId}-recall`,
    );
    expect(stepIndex).toBeGreaterThanOrEqual(0);
    const step = lesson.steps[stepIndex];
    const key = stepKey(lessonId, step.id);
    const state = readyState();
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId,
      stepIndex,
      panel: "code",
    };
    state.steps[key] = { ...createStepProgress(), attempts: [oldAttempt] };
    await seed(page, state);
    await expect(page.locator(".task-pane h1")).toHaveText(step.title);
    await codingFlow(page, step, key, state);
    const current = await stored(page);
    expect(current.resume).toMatchObject({ lessonId, stepIndex });
  });
}

for (const [lessonId, stepId] of [
  ["generic-values", "values-discover"],
  ["generic-impl", "impl-discover"],
  ["generic-bounds", "bounds-discover"],
  ["closure-captures", "capture-mut-call"],
  ["property-generated-inputs", "property-generated-inputs-observe"],
]) {
  test(`${stepId}: observation code remains read only`, async ({ page }) => {
    const lesson = lessons.find((item) => item.id === lessonId)!;
    const stepIndex = lesson.steps.findIndex((step) => step.id === stepId);
    const step = lesson.steps[stepIndex];
    const state = readyState();
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId,
      stepIndex,
      panel: "code",
    };
    await seed(page, state);
    const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    await expect(editor).toBeVisible();
    await expect(editor).not.toBeEditable();
    await expect(editor).toHaveValue(step.code!);
    await expect(
      page.getByRole("button", { name: "Uruchom", exact: true }),
    ).toBeEnabled();
  });
}

test("opens a new empty coding review through normal practice selection", async ({
  page,
}) => {
  const conceptId = "guess-session-io";
  const step = reviewExercises[conceptId];
  const state = readyState();
  state.resume.view = "review";
  state.steps = {};
  state.events = [];
  state.notes = {};
  state.bookmarks = [];
  await seed(page, state);
  await page
    .locator(".review-concept")
    .filter({
      hasText: concepts.find((concept) => concept.id === conceptId)!.title,
    })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toBeEditable();
  await expect(editor).toHaveValue("");
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: step.solution,
      mode: "test",
      tests:
        step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined,
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 1, failed: 0 },
      }),
    });
  });
  await editor.fill(step.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Zakończ powtórkę", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(step.solution!);
  await page
    .getByRole("button", { name: "Zakończ powtórkę", exact: true })
    .click();
  await expect
    .poll(async () => (await stored(page)).reviewSession)
    .toBeUndefined();
});
