import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  delayedReviewExercises,
  lessons,
  modules,
  reviewExercises,
} from "../../src/content/course";
import {
  recordCourseEvidence,
  courseEvidenceSummary,
} from "../../src/content/learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  stepKey,
} from "../../src/persistence/state";
import { reviewSessionKey } from "../../src/engine/review-session";
import type { EvidenceEvent, UserState } from "../../src/domain/types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 7, 12);
const ownership = modules.find((module) => module.id === "ownership")!;
const borrowing = ownership.gateCriteria!.find(
  (criterion) => criterion.id === "borrowing",
)!;
function authored(lessonId: string, stepId: string) {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  return { lesson, step: lesson.steps.find((item) => item.id === stepId)! };
}
const append = authored("borrow-intro", "borrow-conflict");
const replace = authored("borrow-intro", "borrow-mutable-run");
const sharedCountWords = authored(
  "shared-borrow-calibration",
  "shared-count-words",
);
const sharedHasSuffix = authored(
  "shared-borrow-calibration",
  "shared-has-suffix",
);
function readyState(view: UserState["resume"]["view"] = "lesson") {
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
    view,
    lessonId: append.lesson.id,
    stepIndex: append.lesson.steps.indexOf(append.step),
  };
  return state;
}
function sharedReadyState(view: UserState["resume"]["view"] = "lesson") {
  const state = readyState(view);
  state.resume.lessonId = sharedCountWords.lesson.id;
  state.resume.stepIndex = sharedCountWords.lesson.steps.indexOf(
    sharedCountWords.step,
  );
  return state;
}
function primaryEvent(stepId: string, at: number): EvidenceEvent {
  const { lesson, step } = authored("borrow-intro", stepId);
  return {
    id: `${stepId}/${at}`,
    lessonId: lesson.id,
    stepId,
    kind: step.evidenceKind,
    evaluator: step.evaluator!.kind,
    conceptIds: [...step.evidence!.conceptIds],
    evidenceVersion: step.evidence!.version,
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at,
  };
}
async function seedState(page: Page, state: UserState) {
  await page.goto("/");
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
async function exportedState(page: Page) {
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksportuj postęp" }).click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  return JSON.parse(await readFile((await download.path())!, "utf8"))
    .state as UserState;
}
async function importThroughUi(page: Page, state: UserState) {
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  await page.getByLabel("Importuj postęp").setInputFiles({
    name: "ownership-state.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportState(state)),
  });
  await expect(page.getByText("Gotowy do importu")).toBeVisible();
  await page.getByRole("button", { name: "Zastąp postęp tym plikiem" }).click();
}
const editor = (page: Page) =>
  page.getByRole("textbox", { name: "Kod Rust", exact: true });
async function runTests(page: Page) {
  const before = await savedState(page);
  const response = page.waitForResponse((response) =>
    response.url().endsWith("/api/run"),
  );
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await response;
  await expect
    .poll(async () => (await savedState(page)).events.length)
    .toBeGreaterThan(before.events.length);
  await expect(
    page.getByRole("region", {
      name: "Wynik kompilatora",
      includeHidden: true,
    }),
  ).toBeAttached();
}
async function mockTests(page: Page) {
  // These interceptions prove UI/payload/state boundaries. Task 2's real compiler fixtures prove Rust behavior.
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON();
    expect(request.mode).toBe("test");
    const step = [
      append.step,
      replace.step,
      sharedCountWords.step,
      sharedHasSuffix.step,
      authored("scenario-assessment", "assessment-repair").step,
      reviewExercises["mutable-borrow"],
      delayedReviewExercises["function-ownership"],
      delayedReviewExercises["shared-borrow"],
    ].find(
      (candidate) =>
        candidate.evaluator?.kind === "tests" &&
        candidate.evaluator.tests === request.tests,
    );
    expect(step, "exact current authored tests sent to runner").toBeDefined();
    const passed = request.code === step!.solution;
    const expectedStarterStatus: Record<
      string,
      "compile-error" | "test-failure"
    > = {
      "borrow-conflict": "compile-error",
      "borrow-mutable-run": "test-failure",
      "shared-count-words": "compile-error",
      "shared-has-suffix": "compile-error",
      "assessment-repair": "compile-error",
      "review-mutable-borrow": "test-failure",
      "review-function-ownership-delayed-v1": "test-failure",
      "review-shared-borrow-delayed-v1": "compile-error",
    };
    const starter = request.code === step!.code;
    const starterStatus = expectedStarterStatus[step!.id];
    if (!starterStatus)
      throw new Error(`missing starter status for ${step!.id}`);
    const starterResult =
      starterStatus === "compile-error"
        ? {
            status: "compile-error",
            stdout: "",
            stderr:
              step!.id === "borrow-conflict"
                ? "error[E0502]: cannot borrow `message` as mutable because it is also borrowed as immutable"
                : step!.id === "shared-count-words"
                  ? "error[E0308]: mismatched types"
                  : step!.id === "shared-has-suffix" ||
                      step!.id === "review-shared-borrow-delayed-v1"
                    ? "error[E0382]: borrow of moved value"
                    : "starter diagnostic",
            diagnostics:
              step!.id === "borrow-conflict"
                ? [
                    {
                      code: "E0502",
                      message: "borrow conflict",
                      line: 4,
                      level: "error" as const,
                    },
                  ]
                : step!.id === "shared-count-words"
                  ? [
                      {
                        code: "E0308",
                        message: "mismatched types",
                        line: 1,
                        level: "error" as const,
                      },
                    ]
                  : step!.id === "shared-has-suffix" ||
                      step!.id === "review-shared-borrow-delayed-v1"
                    ? [
                        {
                          code: "E0382",
                          message: "borrow of moved value",
                          line: 1,
                          level: "error" as const,
                        },
                      ]
                    : [],
            durationMs: 1,
          }
        : {
            status: "test-failure",
            stdout: "test result: FAILED",
            stderr: "",
            diagnostics: [],
            durationMs: 1,
            tests: { passed: 0, failed: 1 },
          };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        starter
          ? starterResult
          : {
              status: passed ? "success" : "test-failure",
              stdout: passed
                ? "ownership UI test response"
                : "assertion failed: caller buffer mutation\ntest result: FAILED",
              stderr: "",
              diagnostics: [],
              durationMs: 1,
              tests: { passed: passed ? 3 : 0, failed: passed ? 0 : 1 },
            },
      ),
    });
  });
}
async function overview(page: Page) {
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(ownership.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: ownership.title })
    .click();
}
function borrowingRow(page: Page) {
  return page.locator(".gate-panel li").filter({ hasText: borrowing.label });
}

test("grades exact mutable contracts, keeps diagnostics and counts two distinct primary tasks", async ({
  page,
}) => {
  await mockTests(page);
  await seedState(page, readyState());
  await expect(page.locator(".task-pane h1")).toHaveText(append.step.title);
  await expect(page.locator(".task-pane")).toContainText(
    "Bieżący kontrakt: wersja 2",
  );
  await expect(page.getByLabel("Twoja odpowiedź")).toHaveCount(0);
  await expect(editor(page)).toHaveValue(append.step.code!);
  await runTests(page);
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("E0502");
  await editor(page).fill('fn main() { println!("hi!"); }');
  await runTests(page);
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("caller buffer mutation");
  await expect(page.locator(".task-pane")).toContainText(
    "samodzielne zadania kodowe 0/2",
  );
  await editor(page).fill(append.step.solution!);
  await runTests(page);
  await expect(page.locator(".task-pane")).toContainText(
    "samodzielne zadania kodowe 1/2",
  );
  await runTests(page);
  await expect(page.locator(".task-pane")).toContainText(
    "samodzielne zadania kodowe 1/2",
  );
  await page.getByLabel("Kroki lekcji").getByRole("button").nth(5).click();
  const choice = append.lesson.steps[5];
  await page
    .getByRole("radio", {
      name: choice.choices!.find(
        (item) => item.id === (choice.evaluator as { correct: string }).correct,
      )!.label,
    })
    .check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  const afterChoice = await savedState(page);
  expect(
    courseEvidenceSummary(afterChoice, "mutable-borrow").qualifyingCodingTasks,
  ).toBe(1);
  expect(
    courseEvidenceSummary(afterChoice, "mutable-borrow").mastery.level,
  ).toBe("practiced");
  await page.getByLabel("Kroki lekcji").getByRole("button").nth(3).click();
  await expect(page.getByLabel("Twoja odpowiedź")).toHaveCount(0);
  await editor(page).fill(replace.step.solution!);
  await runTests(page);
  await expect(page.locator(".task-pane")).toContainText(
    "samodzielne zadania kodowe 2/2",
  );
  const state = await savedState(page);
  const coding = state.events.filter((event) => event.evaluator === "tests");
  expect(
    coding.every(
      (event) =>
        event.evidenceVersion === 2 &&
        event.conceptIds.length === 1 &&
        event.conceptIds[0] === "mutable-borrow",
    ),
  ).toBe(true);
  expect(state.review.some((item) => item.conceptId === "shared-borrow")).toBe(
    false,
  );
  expect(
    courseEvidenceSummary(state, "shared-borrow").qualifyingCodingTasks,
  ).toBe(0);
  await page
    .getByRole("button", { name: "Twój warsztat", exact: true })
    .click();
  await expect(
    page.locator(".concept-row").filter({ hasText: "Pożyczka mutowalna" }),
  ).toContainText("Potwierdzone w zadaniach");
});

test("preserves assisted completion, code, flags and raw export/import while offering another family", async ({
  page,
}) => {
  await mockTests(page);
  await seedState(page, readyState());
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await editor(page).fill(append.step.solution!);
  await runTests(page);
  await expect(page.locator(".task-pane")).toContainText(
    "samodzielne zadania kodowe 0/2",
  );
  const before = await savedState(page);
  expect(before.steps[stepKey(append.lesson.id, append.step.id)]).toMatchObject(
    { completed: true, hints: 2, revealed: true, code: append.step.solution },
  );
  await page.reload();
  await expect(editor(page)).toHaveValue(append.step.solution!);
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toBeVisible();
  const exported = await exportedState(page);
  expect(exported.events.slice(0, before.events.length)).toEqual(before.events);
  expect(exported.steps).toEqual(before.steps);
  await importThroughUi(page, exported);
  await page
    .getByRole("button", { name: "Twój warsztat", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Kontynuuj naukę", exact: true })
    .click();
  await expect(editor(page)).toHaveValue(append.step.solution!);
  await runTests(page);
  const after = await savedState(page);
  expect(
    after.events.filter((event) => event.evaluator === "tests").at(-1),
  ).toMatchObject({ hints: 2, revealed: true, evidenceVersion: 2 });
  await overview(page);
  await borrowingRow(page)
    .getByRole("button", { name: "Sprawdź w zadaniu" })
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(replace.step.title);
  await editor(page).fill(replace.step.solution!);
  await runTests(page);
  await expect(page.locator(".task-pane")).toContainText(
    "samodzielne zadania kodowe 1/2",
  );
  await overview(page);
  await borrowingRow(page)
    .getByRole("button", { name: "Sprawdź w zadaniu" })
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(
    authored("adversarial-no-clone", "adversarial-conflict").step.title,
  );
});

test("labels exhausted counted variants without offering a fake independent reset", async ({
  page,
}) => {
  const state = readyState("course");
  for (const ref of borrowing.taskRefs)
    state.steps[stepKey(ref.lessonId, ref.stepId)] = {
      ...createStepProgress("// retained assisted draft"),
      hints: 1,
      revealed: true,
      completed: true,
    };
  await seedState(page, state);
  await expect(borrowingRow(page)).toContainText(
    "Brak świeżego samodzielnego wariantu",
  );
  await expect(borrowingRow(page).getByRole("button")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Otwórz pierwszą lekcję do powtórki" }),
  ).toHaveCount(0);
  await expect(page.locator(".module-connections")).toContainText(
    "powtórzenie nie usuwa wcześniejszej pomocy",
  );
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: append.lesson.title })
    .click();
  await page.getByLabel("Kroki lekcji").getByRole("button").nth(2).click();
  await expect(editor(page)).toHaveValue("// retained assisted draft");
});

test("shows legacy interpretation on first render and exports the exact raw prefix/cache/drafts", async ({
  page,
}) => {
  const state = readyState("dashboard");
  state.events = [
    {
      ...primaryEvent("borrow-conflict", NOW - 3 * DAY),
      evidenceVersion: undefined,
      conceptIds: ["mutable-borrow", "shared-borrow"],
    },
  ];
  for (const id of ["mutable-borrow", "shared-borrow"])
    state.mastery[id] = {
      level: "retained",
      reason: "legacy cached result",
      updatedAt: NOW - DAY,
    };
  state.steps[stepKey(append.lesson.id, append.step.id)] = {
    ...createStepProgress("// old saved draft"),
    completed: true,
    hints: 2,
    revealed: true,
  };
  state.notes = { personal: "keep historical note" };
  await seedState(page, state);
  const row = page
    .locator(".concept-row")
    .filter({ hasText: "Pożyczka mutowalna" });
  await expect(row).toContainText("Samodzielne zadania kodowe: 0/2");
  await expect(row).toContainText(
    "Starsze wyniki nie spełniają bieżącego wymagania",
  );
  await expect(row).not.toContainText("Odtworzone po czasie");
  await expect(page.locator(".competency-section")).toContainText(
    "Historia i ukończone kroki pozostają zapisane",
  );
  const firstExport = await exportedState(page);
  expect(firstExport.events).toEqual(state.events);
  expect(firstExport.mastery).toEqual(state.mastery);
  expect(firstExport.steps).toEqual(state.steps);
  expect(firstExport.notes).toEqual(state.notes);
  await page
    .getByRole("button", { name: "Twój warsztat", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Kontynuuj naukę", exact: true })
    .click();
  await expect(editor(page)).toHaveValue("// old saved draft");
  const after = await savedState(page);
  expect(after.events.slice(0, state.events.length)).toEqual(state.events);
  expect(
    after.events
      .slice(state.events.length)
      .every(
        (event) =>
          event.kind === "exposure" &&
          event.passed &&
          !event.gate &&
          event.evidenceVersion === undefined,
      ),
  ).toBe(true);
  expect(after.steps).toEqual(state.steps);
});

for (const scenario of [
  "delayed",
  "exact24",
  "recent exposure",
  "one task",
  "revealed reminder",
] as const) {
  test(`current executable recall: ${scenario}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(NOW));
    await mockTests(page);
    let state = readyState("review");
    const lastContact = scenario === "exact24" ? NOW - DAY : NOW - DAY - 1;
    state = recordCourseEvidence(
      state,
      primaryEvent("borrow-conflict", lastContact - 1_000),
    );
    if (scenario !== "one task")
      state = recordCourseEvidence(
        state,
        primaryEvent("borrow-mutable-run", lastContact),
      );
    if (scenario === "recent exposure")
      state = recordCourseEvidence(state, {
        id: "recent-open",
        conceptIds: ["mutable-borrow"],
        lessonId: append.lesson.id,
        stepId: append.step.id,
        kind: "exposure",
        passed: true,
        hints: 0,
        revealed: false,
        at: NOW - 1,
      });
    state.reviewSession = {
      conceptId: "mutable-borrow",
      sessionId: "controlled-recall",
      mode: "challenge",
      startedAt: NOW,
      wasDue: true,
    };
    state.review = [
      {
        conceptId: "mutable-borrow",
        dueAt: NOW - DAY,
        attempts: 1,
        intervalDays: 1,
        reason: "controlled queue",
      },
    ];
    await seedState(page, state);
    await expect(page.locator(".review-session h2")).toHaveText(
      "Pożyczka mutowalna",
    );
    if (scenario === "revealed reminder") {
      await page
        .getByRole("button", { name: "Karta przypomnienia", exact: true })
        .click();
      await page
        .getByPlaceholder("Zanim odsłonisz odpowiedź…")
        .fill("Moja próba przed przypomnieniem");
      await page
        .getByRole("button", { name: "Odsłoń odpowiedź", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Mały eksperyment", exact: true })
        .click();
    }
    await editor(page).fill(reviewExercises["mutable-borrow"].solution!);
    await runTests(page);
    const expectedLevel =
      scenario === "delayed"
        ? "retained"
        : scenario === "one task"
          ? "practiced"
          : "understood";
    const recorded = await savedState(page);
    expect(recorded.events.at(-1)).toMatchObject({
      lessonId: "review",
      stepId: "mutable-borrow:controlled-recall",
      conceptIds: ["mutable-borrow"],
      evidenceVersion: 2,
      evaluator: "tests",
      kind: "recall",
      passed: true,
      revealed: scenario === "revealed reminder",
    });
    expect(recorded.mastery["mutable-borrow"].level).toBe(expectedLevel);
    expect(
      courseEvidenceSummary(recorded, "mutable-borrow").mastery.level,
    ).toBe(expectedLevel);
    await expect(page.locator(".review-session .mastery-badge")).toHaveText(
      new RegExp(
        scenario === "delayed"
          ? "Odtworzone po czasie"
          : scenario === "one task"
            ? "Ćwiczone"
            : "Potwierdzone w zadaniach",
      ),
    );
    await page.reload();
    await expect(editor(page)).toHaveValue(
      reviewExercises["mutable-borrow"].solution!,
    );
    await expect(
      page.getByRole("region", { name: "Wynik kompilatora" }),
    ).toContainText("ownership UI test response");
    const exported = await exportedState(page);
    expect(exported.events).toEqual(recorded.events);
    expect(exported.mastery).toEqual(recorded.mastery);
    expect(exported.steps).toEqual(recorded.steps);
  });
}

function pinnedDelayedState(
  exerciseId: string,
  conceptId = "function-ownership",
): UserState {
  const state = readyState("review");
  const sessionId = "delayed-ownership-session";
  state.reviewSession = {
    conceptId,
    mode: "challenge",
    sessionId,
    startedAt: NOW,
    wasDue: true,
    exerciseId,
  };
  state.steps[reviewSessionKey(sessionId)] = {
    ...createStepProgress(),
    code: delayedReviewExercises[conceptId].code!,
    answer: "draft delayed answer",
  };
  return state;
}

function sharedPrimaryEvent(stepId: string, at: number): EvidenceEvent {
  const { lesson, step } = authored("shared-borrow-calibration", stepId);
  if (!step.evidence || !step.evaluator || !step.evidenceKind)
    throw new Error("missing shared-borrow authored evidence");
  return {
    id: `${lesson.id}/${step.id}/${at}`,
    conceptIds: [...step.evidence.conceptIds],
    lessonId: lesson.id,
    stepId: step.id,
    kind: step.evidenceKind,
    evaluator: step.evaluator.kind,
    evidenceVersion: step.evidence.version,
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at,
  };
}

function sharedDelayedRecallState(): UserState {
  const state = pinnedDelayedState(
    delayedReviewExercises["shared-borrow"].id,
    "shared-borrow",
  );
  state.events = [
    sharedPrimaryEvent("shared-count-words", NOW - 2 * DAY),
    sharedPrimaryEvent("shared-has-suffix", NOW - 2 * DAY + 1),
    {
      id: "shared-delayed-contact",
      conceptIds: ["shared-borrow"],
      lessonId: "review",
      stepId: "shared-borrow:delayed-contact",
      kind: "exposure",
      passed: false,
      hints: 0,
      revealed: false,
      at: NOW - DAY - 1,
      evidenceVersion: 2,
      evaluator: "answer",
    },
  ];
  state.review = [
    {
      conceptId: "shared-borrow",
      dueAt: NOW - DAY,
      attempts: 1,
      intervalDays: 1,
      reason: "shared delayed test",
    },
  ];
  return state;
}

function sharedCoachState(
  status: "available" | "exhausted" | "complete",
): UserState {
  const state = sharedReadyState();
  state.resume.stepIndex = sharedCountWords.lesson.steps.indexOf(
    sharedCountWords.step,
  );
  state.steps[stepKey(sharedCountWords.lesson.id, sharedCountWords.step.id)] = {
    ...createStepProgress(sharedCountWords.step.code),
    hints: 2,
    completed: true,
  };
  if (status === "exhausted") {
    state.steps[stepKey(sharedHasSuffix.lesson.id, sharedHasSuffix.step.id)] = {
      ...createStepProgress(sharedHasSuffix.step.code),
      hints: 2,
      completed: true,
    };
  }
  if (status === "complete") {
    state.events = [
      sharedPrimaryEvent("shared-count-words", NOW - 2 * DAY),
      sharedPrimaryEvent("shared-has-suffix", NOW - 2 * DAY + 1),
    ];
  }
  return state;
}

function unrelatedCoachState(): UserState {
  const state = readyState();
  const lesson = lessons.find((item) => item.id === "first-program")!;
  const step = lesson.steps.find((item) => item.id === "entry-run")!;
  state.resume.lessonId = lesson.id;
  state.resume.stepIndex = lesson.steps.indexOf(step);
  state.steps[stepKey(lesson.id, step.id)] = {
    ...createStepProgress(step.code),
    hints: 2,
    completed: true,
  };
  return state;
}

function functionOwnershipPrimaryEvent(
  stepId: string,
  at: number,
): EvidenceEvent {
  const { lesson, step } = authored(
    stepId === "assessment-repair"
      ? "scenario-assessment"
      : "function-ownership-calibration",
    stepId,
  );
  if (!step.evidence || !step.evaluator || !step.evidenceKind)
    throw new Error("missing function-ownership authored evidence");
  return {
    id: `${lesson.id}/${step.id}/${at}`,
    conceptIds: [...step.evidence.conceptIds],
    lessonId: lesson.id,
    stepId: step.id,
    kind: step.evidenceKind,
    evaluator: step.evaluator.kind,
    evidenceVersion: step.evidence.version,
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at,
  };
}

test("opening a delayed question records no neutral contact", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(NOW));
  await mockTests(page);
  await seedState(
    page,
    pinnedDelayedState(delayedReviewExercises["function-ownership"].id),
  );
  const before = await savedState(page);
  await expect(page.locator(".review-session h2")).toBeVisible();
  expect((await savedState(page)).events).toEqual(before.events);
});

test("ordinary queue return resumes the pinned unfinished review globally", async ({
  page,
}) => {
  const state = pinnedDelayedState(
    delayedReviewExercises["function-ownership"].id,
  );
  const sessionKey = reviewSessionKey(state.reviewSession!.sessionId);
  const draft = `${state.steps[sessionKey].code!}\n// unfinished edited draft`;
  state.steps[sessionKey].code = draft;
  await seedState(page, state);

  await expect(page.locator(".review-session h2")).toHaveText(
    "Własność na granicy funkcji",
  );
  const before = await savedState(page);
  await expect(editor(page)).toHaveValue(draft);
  await page.getByRole("button", { name: "← Do kolejki", exact: true }).click();

  const queued = await savedState(page);
  expect(queued.reviewSession).toEqual(before.reviewSession);
  expect(queued.steps[sessionKey]).toEqual(before.steps[sessionKey]);

  await page
    .getByRole("button", { name: "Pożyczka mutowalna", exact: true })
    .click();
  await expect(page.locator(".review-session h2")).toHaveText(
    "Własność na granicy funkcji",
  );
  await expect(editor(page)).toHaveValue(draft);
  const resumed = await savedState(page);
  expect(resumed.reviewSession).toEqual(before.reviewSession);
  expect(resumed.steps[sessionKey]).toEqual(before.steps[sessionKey]);

  await page.reload();
  await expect(page.locator(".review-session h2")).toHaveText(
    "Własność na granicy funkcji",
  );
  await expect(editor(page)).toHaveValue(draft);
  const reloaded = await savedState(page);
  expect(reloaded.reviewSession).toEqual(before.reviewSession);
  expect(reloaded.steps[sessionKey]).toEqual(before.steps[sessionKey]);
});

function delayedRecallState(): UserState {
  const state = pinnedDelayedState(
    delayedReviewExercises["function-ownership"].id,
  );
  state.events = [
    functionOwnershipPrimaryEvent("assessment-repair", NOW - 2 * DAY),
    functionOwnershipPrimaryEvent("function-is-empty-text", NOW - 2 * DAY + 1),
    {
      id: "delayed-contact",
      conceptIds: ["function-ownership"],
      lessonId: "review",
      stepId: "function-ownership:delayed-contact",
      kind: "exposure",
      passed: false,
      hints: 0,
      revealed: false,
      at: NOW - DAY - 1,
      evidenceVersion: 2,
      evaluator: "answer",
    },
  ];
  state.review = [
    {
      conceptId: "function-ownership",
      dueAt: NOW - DAY,
      attempts: 1,
      intervalDays: 1,
      reason: "delayed test",
    },
  ];
  return state;
}

async function runNoEventAttempt(
  page: Page,
  status: "timeout" | "infrastructure-error",
) {
  await page.route("**/api/run", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status,
        stdout: "",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
      }),
    });
  });
  const before = await savedState(page);
  const sessionKey = reviewSessionKey(before.reviewSession!.sessionId);
  const attemptsBefore = before.steps[sessionKey]?.attempts.length ?? 0;
  const response = page.waitForResponse((item) =>
    item.url().endsWith("/api/run"),
  );
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await response;
  await expect
    .poll(async () => {
      const after = await savedState(page);
      return {
        attempts: after.steps[sessionKey]?.attempts.length ?? 0,
        result: after.steps[sessionKey]?.attempts.at(-1)?.result?.status,
      };
    })
    .toEqual({ attempts: attemptsBefore + 1, result: status });
  const after = await savedState(page);
  expect(after.events).toEqual(before.events);
}

test("assisted delayed success remains uncredited", async ({ page }) => {
  await page.clock.setFixedTime(new Date(NOW));
  await mockTests(page);
  await seedState(page, delayedRecallState());
  await editor(page).fill(delayedReviewExercises["function-ownership"].code!);
  await runTests(page);
  const afterFailure = await savedState(page);
  expect(afterFailure.events.at(-1)).toMatchObject({
    kind: "recall",
    passed: false,
    delayed: true,
  });
  await page
    .getByRole("button", { name: "Karta przypomnienia", exact: true })
    .click();
  await page.getByPlaceholder("Zanim odsłonisz odpowiedź…").fill("próba");
  await page
    .getByRole("button", { name: "Odsłoń odpowiedź", exact: true })
    .click();
  const afterReveal = await savedState(page);
  expect(afterReveal.events.some((event) => event.revealed)).toBe(true);
  await page
    .getByRole("button", { name: "Mały eksperyment", exact: true })
    .click();
  await editor(page).fill(
    delayedReviewExercises["function-ownership"].solution!,
  );
  await runTests(page);
  const afterSuccess = await savedState(page);
  expect(afterSuccess.events.at(-1)).toMatchObject({
    kind: "recall",
    passed: true,
    delayed: true,
    revealed: true,
  });
  expect(
    courseEvidenceSummary(afterSuccess, "function-ownership").mastery.level,
  ).not.toBe("retained");
  expect(afterSuccess.events.length).toBeGreaterThan(
    afterFailure.events.length,
  );
});

test("clean delayed success after two primary families is credited", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(NOW));
  await mockTests(page);
  await seedState(page, delayedRecallState());
  await editor(page).fill(
    delayedReviewExercises["function-ownership"].solution!,
  );
  await runTests(page);
  const recorded = await savedState(page);
  expect(recorded.events.at(-1)).toMatchObject({
    kind: "recall",
    passed: true,
    delayed: true,
    revealed: false,
  });
  expect(
    courseEvidenceSummary(recorded, "function-ownership").mastery.level,
  ).toBe("retained");
  const laterAssistance = recordCourseEvidence(recorded, {
    id: "later-assistance",
    conceptIds: ["function-ownership"],
    lessonId: "review",
    stepId: delayedReviewExercises["function-ownership"].id + ":later",
    kind: "recall",
    passed: false,
    hints: 1,
    revealed: true,
    delayed: true,
    at: NOW + 1,
    evidenceVersion: 2,
    evaluator: "tests",
  });
  expect(
    courseEvidenceSummary(laterAssistance, "function-ownership").mastery.level,
  ).toBe("retained");
});

test("timeout does not append a delayed event", async ({ page }) => {
  await page.clock.setFixedTime(new Date(NOW));
  await seedState(page, delayedRecallState());
  await runNoEventAttempt(page, "timeout");
});

test("infrastructure failure does not append a delayed event", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(NOW));
  await seedState(page, delayedRecallState());
  await runNoEventAttempt(page, "infrastructure-error");
});

test("reload keeps the delayed exercise ID and opaque draft key", async ({
  page,
}) => {
  await seedState(
    page,
    pinnedDelayedState(delayedReviewExercises["function-ownership"].id),
  );
  await page.reload();
  const state = await savedState(page);
  expect(state.reviewSession?.exerciseId).toBe(
    delayedReviewExercises["function-ownership"].id,
  );
  expect(
    state.steps[reviewSessionKey("delayed-ownership-session")].answer,
  ).toBe("draft delayed answer");
});

test("unknown pinned ID is unavailable and return to queue preserves its draft", async ({
  page,
}) => {
  await seedState(page, pinnedDelayedState("removed-review-id"));
  await expect(
    page.getByText("Ta powtórka nie jest dostępna w tej wersji."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Do kolejki", exact: false }).click();
  const after = await savedState(page);
  expect(after.reviewSession).toBeUndefined();
  expect(
    after.steps[reviewSessionKey("delayed-ownership-session")].answer,
  ).toBe("draft delayed answer");
});

test("shared-borrow calibration grades its two exact fresh families", async ({
  page,
}) => {
  await mockTests(page);
  await seedState(page, sharedReadyState());
  await expect(page.locator(".task-pane h1")).toHaveText(
    sharedCountWords.step.title,
  );
  await expect(editor(page)).toHaveValue(sharedCountWords.step.code!);

  await runTests(page);
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("E0308");
  expect(
    courseEvidenceSummary(await savedState(page), "shared-borrow")
      .qualifyingCodingTasks,
  ).toBe(0);

  await editor(page).fill(sharedCountWords.step.solution!);
  await runTests(page);
  await expect(page.locator(".task-pane")).toContainText(
    "samodzielne zadania kodowe 1/2",
  );

  await page.getByLabel("Kroki lekcji").getByRole("button").nth(3).click();
  await expect(page.locator(".task-pane h1")).toHaveText(
    sharedHasSuffix.step.title,
  );
  await expect(editor(page)).toHaveValue(sharedHasSuffix.step.code!);
  await runTests(page);
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("E0382");
  await editor(page).fill(sharedHasSuffix.step.solution!);
  await runTests(page);

  const recorded = await savedState(page);
  expect(
    courseEvidenceSummary(recorded, "shared-borrow").qualifyingCodingTasks,
  ).toBe(2);
  expect(
    recorded.events.filter((event) => event.evaluator === "tests"),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        lessonId: "shared-borrow-calibration",
        stepId: "shared-count-words",
        conceptIds: ["shared-borrow"],
        evidenceVersion: 2,
        passed: true,
      }),
      expect.objectContaining({
        lessonId: "shared-borrow-calibration",
        stepId: "shared-has-suffix",
        conceptIds: ["shared-borrow"],
        evidenceVersion: 2,
        passed: true,
      }),
    ]),
  );
});

test("shared-borrow coach names the available fresh member", async ({
  page,
}) => {
  await seedState(page, sharedCoachState("available"));
  await expect(page.locator(".solution-warning")).toContainText(
    "dostępnego świeżego zadania",
  );
  await expect(page.locator(".solution-warning")).not.toContainText(
    "możesz dalej ćwiczyć",
  );
});

test("shared-borrow coach describes exhausted members without a reset", async ({
  page,
}) => {
  await seedState(page, sharedCoachState("exhausted"));
  await expect(page.locator(".solution-warning")).toContainText(
    "możesz dalej ćwiczyć",
  );
  await expect(page.locator(".solution-warning")).not.toContainText(
    "dostępnego świeżego zadania",
  );
});

test("shared-borrow coach keeps completed pair truth after later hints", async ({
  page,
}) => {
  await seedState(page, sharedCoachState("complete"));
  await expect(page.locator(".solution-warning")).toContainText(
    "porównaj ją ze swoją próbą",
  );
  await expect(page.locator(".solution-warning")).not.toContainText(
    "potwierdzenie samodzielności poczeka",
  );
});

test("unrelated lesson coach uses neutral copy without a gate promise", async ({
  page,
}) => {
  await seedState(page, unrelatedCoachState());
  await expect(page.locator(".solution-warning")).toContainText(
    "porównaj ją ze swoją próbą",
  );
  await expect(page.locator(".solution-warning")).not.toContainText(
    "potwierdzenie samodzielności poczeka",
  );
  await expect(page.locator(".solution-warning")).not.toContainText(
    "dostępnego świeżego zadania",
  );
});

test("shared-borrow assistance persists by family through reload and import", async ({
  page,
}) => {
  const state = sharedReadyState();
  state.resume.stepIndex = sharedHasSuffix.lesson.steps.indexOf(
    sharedHasSuffix.step,
  );
  state.steps[stepKey(sharedCountWords.lesson.id, sharedCountWords.step.id)] = {
    ...createStepProgress(sharedCountWords.step.code),
    hints: 2,
    completed: true,
  };
  await mockTests(page);
  await seedState(page, state);
  await expect(page.locator(".task-pane")).toContainText(
    "wcześniejsze podpowiedzi pozostają przypisane do zadania",
  );
  await editor(page).fill(sharedHasSuffix.step.solution!);
  await runTests(page);

  const after = await savedState(page);
  expect(
    courseEvidenceSummary(after, "shared-borrow").qualifyingCodingTasks,
  ).toBe(1);
  expect(
    after.steps[stepKey(sharedCountWords.lesson.id, sharedCountWords.step.id)],
  ).toMatchObject({ hints: 2, completed: true });
  const exported = await exportedState(page);
  expect(exported.steps).toEqual(after.steps);
  await importThroughUi(page, exported);
  await page.reload();
  const reloaded = await savedState(page);
  expect(reloaded.steps).toEqual(after.steps);
  expect(reloaded.events).toEqual(after.events);
  expect(
    courseEvidenceSummary(reloaded, "shared-borrow").qualifyingCodingTasks,
  ).toBe(1);
});

test("shared-borrow delayed recall credits only a clean due attempt", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(NOW));
  await mockTests(page);
  await seedState(page, sharedDelayedRecallState());
  await expect(page.locator(".review-session h2")).toBeVisible();
  await editor(page).fill(delayedReviewExercises["shared-borrow"].solution!);
  await runTests(page);
  const recorded = await savedState(page);
  expect(recorded.events.at(-1)).toMatchObject({
    lessonId: "review",
    stepId: "review-shared-borrow-delayed-v1:delayed-ownership-session",
    conceptIds: ["shared-borrow"],
    kind: "recall",
    delayed: true,
    passed: true,
    revealed: false,
  });
  expect(courseEvidenceSummary(recorded, "shared-borrow").mastery.level).toBe(
    "retained",
  );

  const laterAssistance = recordCourseEvidence(recorded, {
    id: "shared-later-assistance",
    conceptIds: ["shared-borrow"],
    lessonId: "review",
    stepId: "review-shared-borrow-delayed-v1:later",
    kind: "recall",
    passed: false,
    hints: 1,
    revealed: true,
    delayed: true,
    at: NOW + 1,
    evidenceVersion: 2,
    evaluator: "tests",
  });
  expect(
    courseEvidenceSummary(laterAssistance, "shared-borrow").mastery.level,
  ).toBe("retained");
});

test("shared-borrow delayed timeout preserves draft without assessment credit", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(NOW));
  await seedState(page, sharedDelayedRecallState());
  await runNoEventAttempt(page, "timeout");
  const after = await savedState(page);
  expect(after.events).toHaveLength(3);
  expect(
    after.steps[reviewSessionKey("delayed-ownership-session")].attempts.at(-1)
      ?.result?.status,
  ).toBe("timeout");
  expect(
    courseEvidenceSummary(after, "shared-borrow").qualifyingCodingTasks,
  ).toBe(2);
});

test("shared-borrow delayed exercise ID and draft survive queue return and reload", async ({
  page,
}) => {
  const state = pinnedDelayedState(
    delayedReviewExercises["shared-borrow"].id,
    "shared-borrow",
  );
  const sessionKey = reviewSessionKey(state.reviewSession!.sessionId);
  state.steps[sessionKey].code += "\n// shared delayed draft";
  await seedState(page, state);
  await expect(editor(page)).toHaveValue(state.steps[sessionKey].code!);
  const before = await savedState(page);
  await page.getByRole("button", { name: "← Do kolejki", exact: true }).click();
  expect((await savedState(page)).reviewSession).toEqual(before.reviewSession);
  expect((await savedState(page)).steps[sessionKey]).toEqual(
    before.steps[sessionKey],
  );
  await page.reload();
  const reloaded = await savedState(page);
  expect(reloaded.reviewSession?.exerciseId).toBe(
    delayedReviewExercises["shared-borrow"].id,
  );
  expect(reloaded.steps[sessionKey]).toEqual(before.steps[sessionKey]);
});

test("function calibration flows into shared borrowing and then modeling", async ({
  page,
}) => {
  const functionLesson = lessons.find(
    (lesson) => lesson.id === "function-ownership-calibration",
  )!;
  const modelingLesson = lessons.find(
    (lesson) =>
      lesson.id ===
      modules.find((module) => module.id === "data-modeling")!.lessonIds[0],
  )!;
  const state = sharedReadyState();
  state.resume.lessonId = functionLesson.id;
  state.resume.stepIndex = functionLesson.steps.length - 1;
  state.steps[stepKey(functionLesson.id, functionLesson.steps.at(-1)!.id)] = {
    ...createStepProgress(),
    completed: true,
  };
  state.steps[
    stepKey(
      sharedCountWords.lesson.id,
      sharedCountWords.lesson.steps.at(-1)!.id,
    )
  ] = {
    ...createStepProgress(),
    completed: true,
  };
  await seedState(page, state);
  await page
    .getByRole("button", { name: "Następna lekcja", exact: true })
    .click();
  await expect(page.locator(".lesson-top")).toContainText(
    sharedCountWords.lesson.title,
  );
  await page.getByLabel("Kroki lekcji").getByRole("button").nth(4).click();
  await page
    .getByRole("button", { name: "Kolejny moduł", exact: true })
    .click();
  await expect(page.locator(".lesson-top")).toContainText(modelingLesson.title);
});

test("shared-borrow mobile tabs preserve the new lesson draft and compiler result", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockTests(page);
  await seedState(page, sharedReadyState());
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  const draft = sharedCountWords.step.code!;
  await editor(page).fill(draft);
  await editor(page).focus();
  await expect(editor(page)).toBeFocused();
  await runTests(page);
  await page.getByRole("tab", { name: "Output", exact: false }).click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("E0308");
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  const before = await savedState(page);
  expect(
    before.steps[stepKey(sharedCountWords.lesson.id, sharedCountWords.step.id)],
  ).toMatchObject({
    code: draft,
  });
  await page.reload();
  await expect(editor(page)).toHaveValue(draft);
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Output", exact: false }).click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("E0308");
  const after = await savedState(page);
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  expect(
    after.events
      .slice(before.events.length)
      .every((event) => event.kind === "exposure" && !event.gate),
  ).toBe(true);
  expect(
    courseEvidenceSummary(after, "shared-borrow").qualifyingCodingTasks,
  ).toBe(0);
});

test("discards an in-flight old-generation ownership response after importing another raw state", async ({
  page,
}) => {
  let release!: () => void;
  let arrived!: () => void;
  const started = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/run", async (route) => {
    arrived();
    await blocked;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "stale result",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 3, failed: 0 },
      }),
    });
  });
  await seedState(page, readyState());
  await editor(page).fill(append.step.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await started;
  const replacement = readyState("dashboard");
  replacement.notes.personal = "import wins";
  await importThroughUi(page, replacement);
  release();
  await expect(
    page
      .locator(".save-status")
      .filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.waitForTimeout(100);
  const after = await savedState(page);
  expect(after.events).toEqual(replacement.events);
  expect(after.steps).toEqual(replacement.steps);
  expect(after.notes).toEqual(replacement.notes);
});

for (const flags of [
  { hints: 1, revealed: false },
  { hints: 0, revealed: true },
]) {
  test(`direct submission inherits imported read-length sibling assistance ${JSON.stringify(flags)}`, async ({
    page,
  }) => {
    const state = readyState();
    const target = authored("scenario-assessment", "assessment-repair");
    state.resume.lessonId = target.lesson.id;
    state.resume.stepIndex = target.lesson.steps.indexOf(target.step);
    state.steps[stepKey("adversarial-no-clone", "adversarial-code")] = {
      ...createStepProgress("// old sibling draft"),
      completed: true,
      ...flags,
    };
    await mockTests(page);
    await seedState(page, state);
    await expect(page.locator(".task-pane")).toContainText(
      "Ten sam kontrakt ma zapisaną pomoc w innym kroku",
    );
    await editor(page).fill(target.step.solution!);
    await runTests(page);
    const recorded = await savedState(page);
    expect(
      recorded.events.filter((event) => event.evaluator === "tests").at(-1),
    ).toMatchObject({
      ...flags,
      evidenceVersion: 2,
      lessonId: target.lesson.id,
      stepId: target.step.id,
    });
    expect(
      recorded.steps[stepKey("adversarial-no-clone", "adversarial-code")],
    ).toEqual(state.steps[stepKey("adversarial-no-clone", "adversarial-code")]);
    expect(
      recorded.steps[stepKey(target.lesson.id, target.step.id)].completed,
    ).toBe(true);
    expect(
      courseEvidenceSummary(recorded, "shared-borrow").qualifyingCodingTasks,
    ).toBe(0);
    const exported = await exportedState(page);
    expect(exported.events).toEqual(recorded.events);
    expect(exported.steps).toEqual(recorded.steps);
  });
}

test("Move assessment schedules only its exact concept and keeps Copy provisional", async ({
  page,
}) => {
  const state = readyState();
  const target = authored("move-copy-discovery", "move-error");
  state.resume.lessonId = target.lesson.id;
  state.resume.stepIndex = target.lesson.steps.indexOf(target.step);
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: target.step.solution,
      mode: "run",
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout:
          target.step.evaluator!.kind === "exact-output"
            ? target.step.evaluator!.expected
            : "",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
      }),
    });
  });
  await seedState(page, state);
  await editor(page).fill(target.step.solution!);
  const response = page.waitForResponse((response) =>
    response.url().endsWith("/api/run"),
  );
  await page.getByRole("button", { name: "Uruchom", exact: true }).click();
  await response;
  await expect
    .poll(async () =>
      (await savedState(page)).events.some(
        (event) => event.evaluator === "exact-output",
      ),
    )
    .toBe(true);
  const recorded = await savedState(page);
  expect(
    recorded.events.filter((event) => event.evaluator === "exact-output"),
  ).toHaveLength(1);
  expect(
    recorded.events.filter((event) => event.evaluator === "exact-output")[0],
  ).toMatchObject({
    evidenceVersion: 2,
    conceptIds: ["move-semantics"],
    passed: true,
  });
  expect(recorded.review.map((item) => item.conceptId)).toEqual([
    "move-semantics",
  ]);
  expect(
    courseEvidenceSummary(recorded, "copy-semantics").qualifyingCodingTasks,
  ).toBe(0);
  expect(courseEvidenceSummary(recorded, "copy-semantics").mastery.level).toBe(
    "exposed",
  ); // Normal opening remains lesson-wide neutral exposure.
});

test("ownership mobile tabs preserve keyboard focus, raw failure and exact draft/panel resume", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockTests(page);
  await seedState(page, readyState());
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  const draft = "// mobile caller buffer mutation draft\n";
  await editor(page).fill(draft);
  await editor(page).focus();
  await expect(editor(page)).toBeFocused();
  await runTests(page);
  await page.getByRole("tab", { name: "Output", exact: false }).click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("caller buffer mutation");
  await page.getByRole("tab", { name: "Output", exact: false }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const before = await savedState(page);
  expect(before.resume.panel).toBe("code");
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(editor(page)).toHaveValue(draft);
  await page.getByRole("tab", { name: "Output", exact: false }).click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("caller buffer mutation");
  const recorded = await savedState(page);
  expect(recorded.events.slice(0, before.events.length)).toEqual(before.events);
  expect(
    courseEvidenceSummary(recorded, "mutable-borrow").qualifyingCodingTasks,
  ).toBe(0);
});
