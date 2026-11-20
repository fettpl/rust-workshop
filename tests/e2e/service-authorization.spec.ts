import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import {
  lessons,
  modules,
  projects,
  reviewExercises,
} from "../../src/content/course";
import type { LessonStep, UserState } from "../../src/domain/types";
import {
  assistanceForLessonStep,
  courseEvidencePolicy,
  courseGateRecovery,
  courseModuleGate,
  evidenceForLessonStep,
  recordCourseEvidence,
  resolveReviewExercise,
  reviewExerciseIdForSelection,
} from "../../src/content/learning-context";
import { independentCodingTaskIds } from "../../src/engine/learning";
import { revealProjectPackageVariant } from "../../src/domain/project-package";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import {
  assertArchiveNotices,
  expectedArchivePaths,
} from "./archive-notices.helper";

test.describe.configure({ retries: 0 });
const operations = ["policy", "attenuation", "binding", "admission"] as const;
type Operation = (typeof operations)[number];
const courseLesson = (operation: Operation) =>
  lessons.find((item) => item.id === `service-authorization-${operation}`)!;
const courseStep = (operation: Operation, suffix: string) =>
  courseLesson(operation).steps.find(
    (item) => item.id === `authorization-${operation}-${suffix}`,
  )!;
const project = projects.find((item) => item.id === "service-authorization")!;
const archive = project.package!;
const conceptIds = [
  "service-scoped-authority",
  "service-bound-authorization-use",
];
const editor = (page: Page) =>
  page.locator('textarea.code-textarea[aria-label="Kod Rust"]');

function readyState(
  operation: Operation = "policy",
  suffix = "apply",
): UserState {
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
    lessonId: courseLesson(operation).id,
    stepIndex: courseLesson(operation).steps.indexOf(
      courseStep(operation, suffix),
    ),
    panel: "lesson",
  };
  return state;
}

async function seedState(page: Page, state: UserState) {
  await page.evaluate(async (next) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("user-state"))
          request.result.createObjectStore("user-state");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const tx = database.transaction("user-state", "readwrite");
        tx.objectStore("user-state").put(next, "current");
        tx.oncomplete = () => {
          database.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, state);
  await page.reload();
}
async function savedState(page: Page): Promise<UserState> {
  // Persistent status follows hydration/save completion; initial hydration is
  // intentionally silent in .save-live. Mobile CSS may hide the visual label.
  const status = page.locator(".save-status");
  await expect(status).toHaveCount(1);
  await expect(status).toHaveText("Zapisano na tym urządzeniu");
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const get = database
            .transaction("user-state", "readonly")
            .objectStore("user-state")
            .get("current");
          get.onerror = () => reject(get.error);
          get.onsuccess = () => {
            database.close();
            resolve(get.result as UserState);
          };
        };
      }),
  );
}
async function openStep(page: Page, operation: Operation, suffix: string) {
  const lesson = courseLesson(operation);
  // Use actual lesson navigation; do not rewrite state to simulate browsing.
  if ((await savedState(page)).resume.lessonId !== lesson.id) {
    const menu = page.getByRole("button", {
      name: "Otwórz nawigację",
      exact: true,
    });
    if (await menu.isVisible()) await menu.click();
    await page
      .locator(".sidebar-trail")
      .getByRole("button")
      .filter({ hasText: lesson.title })
      .click();
  }
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.indexOf(courseStep(operation, suffix)))
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(
    courseStep(operation, suffix).title,
  );
}
function expectNoIndependent(state: UserState) {
  for (const conceptId of conceptIds)
    expect(
      independentCodingTaskIds(state, conceptId, courseEvidencePolicy),
    ).toEqual([]);
}
function expectHelp(state: UserState, expected: Operation[]) {
  for (const operation of operations) {
    for (const suffix of ["apply", "blank"]) {
      const flags = assistanceForLessonStep(
        state,
        courseLesson(operation),
        courseStep(operation, suffix),
      );
      expect(flags.hints > 0 || flags.revealed, `${operation}/${suffix}`).toBe(
        expected.includes(operation),
      );
    }
  }
}
async function reveal(page: Page) {
  await page
    .getByRole("button", { name: "Pomóż mi to zrozumieć", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż drugą wskazówkę", exact: true })
    .click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await expect(page.locator(".revealed-solution pre")).toBeVisible();
}
// These are actual DOM reads. Imported fixture strings alone cannot establish source exposure.
async function inspectSource(page: Page, operation: Operation, empty = false) {
  await expect(editor(page)).toBeVisible();
  const code = await editor(page).inputValue();
  if (empty) expect(code).toBe("");
  else expect(code).toBe(courseStep(operation, "apply").code);
  const prompt = await page.locator(".task-prompt").innerText();
  if (empty) {
    expect(prompt).toContain('todo!("implement this operation")');
    expect(prompt).toMatch(/fn decide/);
  }
  const revealed = await page
    .locator(".revealed-solution pre")
    .allTextContents();
  const source = [code, prompt, ...revealed].join("\n");
  const forbidden: Record<Operation, RegExp> = {
    policy:
      /\b(?:fn\s+(?:attenuate|authorize|admit|submit)|struct\s+(?:Authorized|AdmissionState|Service))\b/,
    attenuation:
      /\b(?:fn\s+(?:decide|authorize|admit|submit)|struct\s+(?:Authority|Request|Service))\b/,
    binding:
      /\b(?:fn\s+(?:attenuate|admit|submit|replace_grants)|struct\s+(?:GrantSpec|AdmissionState|Service))\b/,
    admission:
      /\b(?:fn\s+(?:decide|authorize|attenuate|submit|fixture)|struct\s+(?:GrantSpec|Service))\b/,
  };
  expect(source).not.toMatch(forbidden[operation]);
  if (operation === "binding") {
    expect(source).toMatch(/test double/);
    expect(source).toContain("expected_principal");
    expect(source).not.toContain("self.grants.iter()");
  }
  if (operation === "admission")
    expect(source).toMatch(/(?:stał|ustalon|fixed)/i);
}
async function openPackage(page: Page) {
  const menu = page.getByRole("button", {
    name: "Otwórz nawigację",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const projectButton = page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button")
    .filter({ has: page.getByText(project.title, { exact: true }) });
  await expect(projectButton).toHaveCount(1);
  await expect(projectButton.locator("strong")).toHaveText(project.title);
  await projectButton.click();
  await expect(projectButton).toHaveAttribute("aria-pressed", "true");
  return page.getByRole("region", { name: "Pakiet Cargo" });
}

// Portable synthetic equivalent of the fourth predecessor (A10 assisted-resume) capture.
// It intentionally contains no real learner data or private capture path.
test("authorization_resume_preserves_predecessor_assistance_and_drafts", async ({
  page,
}) => {
  const state = readyState();
  const old = lessons.find(
    (item) => item.id === "service-client-bounded-retry",
  )!;
  const target = old.steps.find(
    (item) => item.id === "service-client-retry-next-action",
  )!;
  const alias = old.steps.find((item) => item.id === "bounded-retry-blank")!;
  expect(alias).toBeDefined();
  state.resume = {
    ...state.resume,
    lessonId: old.id,
    stepIndex: old.steps.indexOf(target),
  };
  state.steps[stepKey(old.id, target.id)] = {
    ...createStepProgress(target.code),
    code: "// zachowany szkic A10\n",
    completed: true,
    attempts: [
      {
        at: 1_700_000_000_003,
        code: "// dawny kod",
        passed: true,
        feedback: "zachowany wynik",
      },
    ],
  };
  state.steps[stepKey(old.id, alias.id)] = {
    ...createStepProgress(alias.code),
    hints: 1,
    revealed: true,
  };
  state.notes[old.id] = "Notatka sprzed A11.";
  state.bookmarks = [old.id];
  const independent = lessons.find(
    (item) => item.id === "unsafe-miri-byte-view",
  )!;
  const independentStep = independent.steps.find(
    (item) => item.id === "byte-view-initialized-prefix",
  )!;
  state.events = [
    {
      id: "portable-a10-assisted",
      lessonId: old.id,
      stepId: target.id,
      conceptIds: [...target.evidence!.conceptIds],
      evidenceVersion: 2,
      kind: target.evidenceKind,
      evaluator: "tests",
      passed: true,
      hints: 1,
      revealed: true,
      gate: true,
      at: 1_700_000_000_003,
    },
    {
      id: "portable-old-independent",
      lessonId: independent.id,
      stepId: independentStep.id,
      conceptIds: [...independentStep.evidence!.conceptIds],
      evidenceVersion: 2,
      kind: independentStep.evidenceKind,
      evaluator: "tests",
      passed: true,
      hints: 0,
      revealed: false,
      gate: true,
      at: 1_700_000_000_001,
    },
  ];
  const oldCredit = independentCodingTaskIds(
    state,
    independentStep.evidence!.conceptIds[0],
    courseEvidencePolicy,
  );
  expect(oldCredit).toContain(independentStep.evidence!.codingTaskId);
  await page.goto("/");
  await seedState(page, state);
  await expect(page.locator(".task-pane h1")).toHaveText(target.title);
  await expect(editor(page)).toHaveValue(
    state.steps[stepKey(old.id, target.id)].code!,
  );
  await page.reload();
  const resumed = await savedState(page);
  expect(resumed.resume).toEqual(state.resume);
  expect(resumed.notes).toEqual(state.notes);
  expect(resumed.bookmarks).toEqual(state.bookmarks);
  for (const event of state.events)
    expect(resumed.events.find((item) => item.id === event.id)).toEqual(event);
  for (const [key, progress] of Object.entries(state.steps))
    expect(resumed.steps[key]).toEqual(progress);
  expect(
    independentCodingTaskIds(
      resumed,
      independentStep.evidence!.conceptIds[0],
      courseEvidencePolicy,
    ),
  ).toEqual(oldCredit);
  expect(assistanceForLessonStep(resumed, old, target)).toEqual({
    hints: 1,
    revealed: true,
  });
  expectNoIndependent(resumed);
  // A separate synthetic current state tests new work without borrowing a real browser profile.
  await seedState(page, readyState());
  const draft = `${courseStep("policy", "apply").code}\n// własny szkic\n`;
  await editor(page).fill(draft);
  const notebookSummary = page
    .locator("details.lesson-notes > summary")
    .filter({ hasText: /^\s*Twój notatnik\s*$/ });
  await expect(notebookSummary).toHaveCount(1);
  await notebookSummary.click();
  await page
    .getByRole("textbox", { name: "Notatki do lekcji" })
    .fill("Jeden grant musi pokrywać całe żądanie.");
  await savedState(page);
  await page.reload();
  await expect(editor(page)).toHaveValue(draft);
  const after = await savedState(page);
  expect(after.notes[courseLesson("policy").id]).toBe(
    "Jeden grant musi pokrywać całe żądanie.",
  );
  expectNoIndependent(after);
});

// Intercepted responses below prove UI/state behavior only. No Rust compiler executes.
async function mockedRun(page: Page, step: LessonStep) {
  if (step.evaluator?.kind !== "tests")
    throw new Error("expected a tests evaluator");
  const tests = step.evaluator.tests;
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: step.solution,
      mode: "test",
      tests,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "mocked UI/state response; no native Rust proof",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 1, failed: 0 },
      }),
    });
  });
  await editor(page).fill(step.solution!);
  const response = page.waitForResponse((item) =>
    item.url().endsWith("/api/run"),
  );
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await response;
  await expect
    .poll(
      async () =>
        (await savedState(page)).events.filter(
          (event) =>
            event.stepId === step.id &&
            event.passed &&
            event.evaluator === "tests",
        ).length,
    )
    .toBe(1);
  await page.unroute("**/api/run");
}
test("authorization_families_keep_help_and_retrieval_separate", async ({
  page,
}) => {
  await page.goto("/");
  await seedState(page, readyState());
  await page
    .getByRole("button", { name: "Pomóż mi to zrozumieć", exact: true })
    .click();
  expectHelp(await savedState(page), ["policy"]);
  await openStep(page, "policy", "blank");
  await expect(editor(page)).toHaveValue("");
  await mockedRun(page, courseStep("policy", "blank"));
  let state = await savedState(page);
  expect(
    state.events.find(
      (item) =>
        item.stepId === "authorization-policy-blank" &&
        item.evaluator === "tests",
    ),
  ).toMatchObject({ hints: 1, kind: "transfer", passed: true });
  expectNoIndependent(state);
  await openStep(page, "attenuation", "recall");
  await mockedRun(page, courseStep("attenuation", "recall"));
  state = await savedState(page);
  expect(
    state.events.find(
      (item) =>
        item.stepId === "authorization-attenuation-recall" &&
        item.evaluator === "tests",
    ),
  ).toMatchObject({ hints: 0, revealed: false, kind: "recall", gate: false });
  expectHelp(state, ["policy"]);
  expectNoIndependent(state);
  await openStep(page, "binding", "reflect");
  const rubric = page.locator("details.rubric");
  if ((await rubric.getAttribute("open")) === null)
    await rubric.locator("summary").click();
  await page
    .getByRole("textbox", { name: "Twoje wyjaśnienie" })
    .fill(
      "Świadek zachowuje pożyczkę i własne żądanie; model używa test double.",
    );
  for (const checkbox of await rubric.locator('input[type="checkbox"]').all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  state = await savedState(page);
  expect(
    state.events.find(
      (item) =>
        item.stepId === "authorization-binding-reflect" &&
        item.kind === "self-rating",
    ),
  ).toMatchObject({ gate: false });
  expectNoIndependent(state);
});

test("authorization_downloads_exact_starter_and_solution", async ({ page }) => {
  await page.goto("/");
  const initial = readyState();
  await seedState(page, initial);
  const panel = await openPackage(page);
  expect(archive.files).toHaveLength(10);
  expect(archive.revealStepRefs).toEqual(
    operations.flatMap((operation) =>
      ["apply", "blank"].map((suffix) => ({
        lessonId: courseLesson(operation).id,
        stepId: courseStep(operation, suffix).id,
      })),
    ),
  );
  expect(archive.starterRevealStepRefs).toEqual([]);
  for (const variant of ["starter", "solution"] as const) {
    const before = await savedState(page);
    const button = panel.getByRole("button", {
      name:
        variant === "starter" ? "Pliki startowe" : "Pokaż rozwiązanie pakietu",
      exact: true,
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    const link = panel.getByRole("link", {
      name:
        variant === "starter"
          ? "Pobierz pakiet startowy"
          : "Pobierz rozwiązanie",
      exact: true,
    });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      link.click(),
    ]);
    const bytes = await readFile((await download.path())!);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      variant === "starter"
        ? "0faed1bc3f8d8106a93a700bd17dab6c27caf83f25ce9be8a29e7c21694638ed"
        : "76e0261e693a1994c01d05b7c81cdb8ff5b7e0b6606c92a70f6ef28cde7ce4fe",
    );
    const files = unzipSync(bytes);
    expect(Object.keys(files)).toHaveLength(14);
    expect(Object.keys(files).sort()).toEqual(expectedArchivePaths(archive));
    assertArchiveNotices(files, archive);
    for (const file of archive.files)
      expect(strFromU8(files[`${archive.id}/${file.path}`])).toBe(
        variant === "solution" ? (file.solution ?? file.starter) : file.starter,
      );
    const after = await savedState(page);
    const expected = revealProjectPackageVariant(
      before,
      archive,
      lessons,
      variant,
      Date.now(),
      courseEvidencePolicy,
    );
    for (const ref of archive.revealStepRefs) {
      const key = stepKey(ref.lessonId, ref.stepId);
      expect(after.steps[key]?.revealed ?? false).toBe(
        expected.steps[key]?.revealed ?? false,
      );
    }
    expectHelp(after, variant === "starter" ? [] : [...operations]);
    expectNoIndependent(after);
  }
});

test("authorization_keyboard_390_and_source_exposure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = readyState("binding", "predict");
  state.settings.accessibleEditor = false;
  await page.goto("/");
  await seedState(page, state);
  // The mobile dashboard and lesson cards use authored steps instead of time estimates.
  await page
    .getByRole("button", { name: "Otwórz nawigację", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Twój warsztat", exact: true })
    .click();
  const continuation = page.locator(".continue-panel");
  await expect(continuation.locator("h2")).toHaveText(
    courseLesson("binding").title,
  );
  const continuationMeta = continuation.locator(".continue-meta");
  await expect(continuationMeta).toBeVisible();
  await expect(continuationMeta.locator("span")).toHaveText(
    `Krok 1 z ${courseLesson("binding").steps.length}`,
  );
  await expect(continuationMeta.locator("strong")).toHaveText(
    courseLesson("binding").steps[0].title,
  );
  await expect(continuationMeta).not.toContainText(/\bmin\b|[·•]/);
  await expect(continuationMeta.locator("svg")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Otwórz nawigację", exact: true })
    .click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  const lessonCards = page.locator(".lesson-list-item");
  await expect(lessonCards).toHaveCount(4);
  for (const operation of operations) {
    const card = lessonCards.filter({
      has: page.getByRole("heading", {
        name: courseLesson(operation).title,
        exact: true,
      }),
    });
    await expect(card).toHaveCount(1);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeInViewport();
    await expect(card.locator(".lesson-completion")).toHaveText(`0/${courseLesson(operation).steps.length} kroków`);
    await expect(card.locator(".time")).toHaveCount(0);
    await expect(card).not.toContainText(/\b\d+\s*min\b|[·•]/);
  }
  await lessonCards
    .filter({
      has: page.getByRole("heading", {
        name: courseLesson("binding").title,
        exact: true,
      }),
    })
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(
    courseStep("binding", "predict").title,
  );
  const prediction = courseStep("binding", "predict");
  if (prediction.evaluator?.kind !== "choice")
    throw new Error("prediction must use choices");
  const correctId = prediction.evaluator.correct;
  const correct = prediction.choices!.find(
    (choice) => choice.id === correctId,
  )!;
  // A choice is prediction evidence, even when correct; it is not a coding family.
  await page.getByRole("radio", { name: correct.label, exact: true }).check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  const predicted = await savedState(page);
  expect(
    predicted.events.find(
      (event) => event.stepId === prediction.id && event.kind === "prediction",
    ),
  ).toMatchObject({ passed: true, gate: false });
  expectNoIndependent(predicted);
  await page.locator("details.sources summary").click();
  await expect(page.locator("details.sources a")).toHaveCount(
    courseLesson("binding").sourceIds.length,
  );
  expectHelp(await savedState(page), []);
  await openStep(page, "binding", "apply");
  const code = page.getByRole("tab", { name: "Kod", exact: true });
  await code.focus();
  await page.keyboard.press("Enter");
  await expect(code).toHaveAttribute("aria-selected", "true");
  const fallback = page.getByRole("button", {
    name: "Prosty edytor",
    exact: true,
  });
  await fallback.focus();
  await page.keyboard.press("Enter");
  await expect(editor(page)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Monaco Editor", exact: true }),
  ).toBeVisible();
  // Inspect the editor and prompt in their respective visible mobile panels.
  expect(await editor(page).inputValue()).toBe(
    courseStep("binding", "apply").code,
  );
  const task = page.getByRole("tab", { name: "Zadanie", exact: true });
  await task.focus();
  await page.keyboard.press("Enter");
  await expect(task).toHaveAttribute("aria-selected", "true");
  expect(await page.locator(".task-prompt").innerText()).toMatch(/test double/);
  const output = page.getByRole("tab", { name: "Output", exact: true });
  await output.focus();
  await page.keyboard.press("Enter");
  await expect(output).toHaveAttribute("aria-selected", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect
    .poll(async () => (await savedState(page)).resume.panel)
    .toBe("output");
  await page.reload();
  await expect(output).toHaveAttribute("aria-selected", "true");
  expectNoIndependent(await savedState(page));
});

test("authorization_offline_reload_records_new_neutral_exposure", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await seedState(page, readyState("policy", "predict"));
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Obtain an actual controlling worker before disconnecting; no mocked offline reload.
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const beforeWarmup = await savedState(page);
  expectNoIndependent(beforeWarmup);
  expectHelp(beforeWarmup, []);
  // Offline covers visited/cached resources (README.md; public/sw.js).
  // After SW control, loading a different real editor lets its normal fetch
  // finish cache.put before rendering; the target task remains unvisited.
  await openStep(page, "attenuation", "apply");
  await expect(editor(page)).toBeVisible();
  await expect(editor(page)).toHaveValue(
    courseStep("attenuation", "apply").code!,
  );
  await openStep(page, "policy", "predict");
  const before = await savedState(page);
  expect(
    before.steps[
      stepKey(courseLesson("policy").id, courseStep("policy", "apply").id)
    ],
  ).toBeUndefined();
  expect(
    before.events.some(
      (event) =>
        event.lessonId === courseLesson("policy").id &&
        event.stepId === courseStep("policy", "apply").id,
    ),
  ).toBe(false);
  expect(before.events.slice(0, beforeWarmup.events.length)).toEqual(
    beforeWarmup.events,
  );
  const warmupEvents = before.events.slice(beforeWarmup.events.length);
  expect(warmupEvents.map((event) => event.stepId)).toEqual(
    expect.arrayContaining([
      "authorization-attenuation-apply",
      "authorization-policy-predict",
    ]),
  );
  for (const event of warmupEvents) {
    expect([
      "authorization-attenuation-predict",
      "authorization-attenuation-apply",
      "authorization-policy-predict",
    ]).toContain(event.stepId);
    expect(event).toMatchObject({
      kind: "exposure",
      gate: false,
      passed: true,
      hints: 0,
      revealed: false,
    });
  }
  expectNoIndependent(before);
  expectHelp(before, []);
  // The neutral warmup is part of the online baseline, not independent credit.
  const events = before.events.map((event) => ({ ...event }));
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator(".offline-banner")).toContainText("Tryb offline");
    const reloaded = await savedState(page);
    const reloadOpenings = reloaded.events.filter(
      (event) => !events.some((old) => old.id === event.id),
    );
    expect(reloadOpenings).toHaveLength(1);
    expect(reloadOpenings[0]).toMatchObject({
      stepId: "authorization-policy-predict",
      kind: "exposure",
      gate: false,
      passed: true,
      hints: 0,
      revealed: false,
    });
    // A new step, not a repeated cached opening, must create a new neutral record.
    await openStep(page, "policy", "apply");
    await expect
      .poll(
        async () =>
          (await savedState(page)).events.filter(
            (event) =>
              event.stepId === "authorization-policy-apply" &&
              event.kind === "exposure",
          ).length,
      )
      .toBe(1);
    const beforeUnavailable = await savedState(page);
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await expect(
      page.getByText("Kompilator niedostępny", { exact: true }),
    ).toBeVisible();
    const after = await savedState(page);
    for (const event of events)
      expect(after.events.find((item) => item.id === event.id)).toEqual(event);
    const opening = after.events.find(
      (event) =>
        event.stepId === "authorization-policy-apply" &&
        event.kind === "exposure",
    )!;
    expect(opening).toMatchObject({
      gate: false,
      passed: true,
      hints: 0,
      revealed: false,
    });
    expect(after.events).toEqual(beforeUnavailable.events);
    expect(
      after.events.filter(
        (event) => !events.some((old) => old.id === event.id),
      ),
    ).toEqual([...reloadOpenings, opening]);
    expectNoIndependent(after);
    expectHelp(after, []);
  } finally {
    await context.setOffline(false);
  }
});

test("authorization_out_of_order_browsing_does_not_expose_other_family_solutions", async ({
  page,
}) => {
  await page.goto("/");
  await seedState(page, readyState("admission"));
  await inspectSource(page, "admission");
  await openStep(page, "admission", "model");
  expect(await page.locator(".task-prompt").innerText()).not.toMatch(
    /\bfn\s+(?:decide|authorize|attenuate|admit)\b/,
  );
  await openStep(page, "binding", "recall");
  await inspectSource(page, "binding");
  const menu = page.getByRole("button", {
    name: "Otwórz nawigację",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Powtórki", exact: true }).click();
  await page
    .locator(".review-concept")
    .filter({ hasText: "Zakres i osłabianie uprawnień" })
    .click();
  await expect(editor(page)).toHaveValue("");
  const review = await page.locator(".review-session").innerText();
  expect(review).toContain("fn attenuate");
  expect(review).toContain('todo!("implement this operation")');
  expect(review).not.toMatch(
    /\b(?:fn\s+(?:decide|authorize|admit|submit)|struct\s+(?:Authority|Request|Service))\b/,
  );
  const ordinary = reviewExercises["service-scoped-authority"];
  const reviewState = await savedState(page);
  const session = reviewState.reviewSession!;
  expect(session).toMatchObject({
    conceptId: "service-scoped-authority",
    mode: "challenge",
    wasDue: false,
  });
  expect(session.sessionId).toEqual(expect.any(String));
  expect(session.sessionId.length).toBeGreaterThan(0);
  expect(session.startedAt).toEqual(expect.any(Number));
  expect(Number.isFinite(session.startedAt)).toBe(true);
  // No short override is authored: an ordinary session resolves by concept.
  expect(
    reviewExerciseIdForSelection(session.conceptId, "short"),
  ).toBeUndefined();
  expect(session.exerciseId).toBeUndefined();
  expect(resolveReviewExercise(session.conceptId, session.exerciseId)).toEqual({
    status: "ready",
    exerciseId: ordinary.id,
    step: ordinary,
  });
  await expect(page.locator(".review-session h3")).toHaveText(ordinary.title);
  await page.reload();
  const reloadedReview = await savedState(page);
  expect(reloadedReview.reviewSession).toEqual(session);
  expect(reloadedReview.events).toEqual(reviewState.events);
  expect(reloadedReview.review).toEqual(reviewState.review);
  expect(
    resolveReviewExercise(
      reloadedReview.reviewSession!.conceptId,
      reloadedReview.reviewSession!.exerciseId,
    ),
  ).toEqual({ status: "ready", exerciseId: ordinary.id, step: ordinary });
  await expect(page.locator(".review-session h3")).toHaveText(ordinary.title);
  await expect(editor(page)).toHaveValue("");
  expect(await page.locator(".review-session").innerText()).not.toMatch(
    /\b(?:fn\s+(?:decide|authorize|admit|submit)|struct\s+(?:Authority|Request|Service))\b/,
  );
  expectHelp(reloadedReview, []);
  expectNoIndependent(reloadedReview);
  // Real sidebar navigation retains the unfinished ordinary review session.
  await openStep(page, "policy", "blank");
  await inspectSource(page, "policy", true);
  let state = await savedState(page);
  expect(state.reviewSession).toEqual(session);
  expectHelp(state, []);
  expectNoIndependent(state);
  expect(
    state.events.every(
      (event) => event.kind === "exposure" && event.gate === false,
    ),
  ).toBe(true);
  await openStep(page, "admission", "apply");
  await reveal(page);
  await inspectSource(page, "admission");
  state = await savedState(page);
  expectHelp(state, ["admission"]);
  expectNoIndependent(state);
  const panel = await openPackage(page);
  const solution = panel.getByRole("button", {
    name: "Pokaż rozwiązanie pakietu",
    exact: true,
  });
  await solution.click();
  await expect(solution).toHaveAttribute("aria-pressed", "true");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    panel
      .getByRole("link", { name: "Pobierz rozwiązanie", exact: true })
      .click(),
  ]);
  expect(download.suggestedFilename()).toContain(archive.id);
  state = await savedState(page);
  expectHelp(state, [...operations]);
  expectNoIndependent(state);
});

test("ordinary authorization review reveal preserves an independent intersection recovery", async ({
  page,
}, testInfo) => {
  const runnerRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/run")
      runnerRequests.push(request.url());
  });
  const target = courseLesson("attenuation");
  const courseModule = modules.find((item) => item.id === target.moduleId)!;
  const criterion = courseModule.gateCriteria!.find(
    (item) => item.id === "authorization-attenuation-gate",
  )!;
  const concept = "service-scoped-authority";
  const ordinary = reviewExercises[concept];
  let initial = readyState("attenuation");
  // Controlled prerequisite evidence for the other three operations. The target
  // family and review have no seeded events or saved help.
  for (const [index, operation] of operations.entries()) {
    if (operation === "attenuation") continue;
    const lesson = courseLesson(operation);
    const step = courseStep(operation, "apply");
    initial = recordCourseEvidence(initial, {
      id: `controlled-browser-prerequisite:${operation}`,
      lessonId: lesson.id,
      stepId: step.id,
      ...evidenceForLessonStep(lesson, step),
      kind: step.evidenceKind,
      evaluator: "tests",
      gate: true,
      passed: true,
      hints: 0,
      revealed: false,
      at: 100 + index,
    });
  }
  const navigate = async (name: string | RegExp) => {
    const menu = page.getByRole("button", {
      name: "Otwórz nawigację",
      exact: true,
    });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole("button", { name, exact: true }).click();
  };
  const assertCleanTarget = (state: UserState) => {
    for (const alias of ["apply", "blank"] as const) {
      expect(
        assistanceForLessonStep(
          state,
          target,
          courseStep("attenuation", alias),
        ),
      ).toEqual({ hints: 0, revealed: false });
    }
    expect(
      state.events.filter(
        (event) =>
          event.lessonId === target.id &&
          event.passed &&
          event.kind !== "exposure",
      ),
    ).toEqual([]);
  };
  const assertRecovery = async () => {
    const gate = page.locator(".gate-panel");
    const row = gate.locator("li").filter({ hasText: criterion.label });
    await expect(row).toHaveCount(1);
    await expect(row.getByLabel("Do sprawdzenia")).toBeVisible();
    await expect(row).not.toContainText("Brak świeżego samodzielnego wariantu");
    await expect(
      row.getByRole("button", { name: "Sprawdź w zadaniu", exact: true }),
    ).toHaveCount(1);
    await expect(gate.getByLabel("Potwierdzone")).toHaveCount(3);
    await expect(
      gate.getByRole("heading", { name: "Co pokaże, że rozumiesz?" }),
    ).toBeVisible();
    await page.getByLabel("Znajdź moduł lub temat").fill(courseModule.title);
    const picker = page
      .locator(".module-picker")
      .getByRole("button")
      .filter({ has: page.getByText(courseModule.title, { exact: true }) });
    await expect(picker).toHaveCount(1);
    await expect(picker).toContainText("Dostępny");
    await expect(picker).not.toContainText("Samodzielność potwierdzona");
  };
  await page.goto("/");
  await seedState(page, initial);
  await navigate(/^Powtórki(?: \d+)?$/);
  await page
    .locator(".review-concept")
    .filter({ hasText: "Zakres i osłabianie uprawnień" })
    .click();
  await expect(page.locator(".review-session h3")).toHaveText(ordinary.title);
  const started = (await savedState(page)).reviewSession!;
  expect(started).toMatchObject({
    conceptId: concept,
    mode: "challenge",
    wasDue: false,
  });
  expect(started.exerciseId).toBeUndefined();
  expect(started.sessionId).toEqual(expect.any(String));
  const review = page.locator(".review-session");
  await review
    .getByRole("button", { name: "Karta przypomnienia", exact: true })
    .click();
  await review
    .getByLabel("Przypomnij własnymi słowami", { exact: true })
    .fill("Granice zakresu pozostają ważne.");
  await review
    .getByRole("button", { name: "Odsłoń odpowiedź", exact: true })
    .click();
  const isReviewReveal = (event: UserState["events"][number]) =>
    event.lessonId === "review" &&
    event.kind === "exposure" &&
    event.revealed;
  await expect
    .poll(
      async () =>
        (await savedState(page)).events.filter(isReviewReveal).length,
    )
    .toBe(1);
  const revealed = await savedState(page);
  const exposure = revealed.events.find(isReviewReveal)!;
  const expectedStepId = `${ordinary.id}:${started.sessionId}`;
  await testInfo.attach("review-exposure", {
    body: JSON.stringify({
      observedStepId: exposure.stepId,
      expectedStepId,
      runnerRequests,
    }),
    contentType: "application/json",
  });
  expect(exposure.stepId).toBe(expectedStepId);
  expect(revealed.reviewSession).toMatchObject({
    sessionId: started.sessionId,
    mode: "card",
  });
  expect(revealed.reviewSession?.exerciseId).toBeUndefined();
  assertCleanTarget(revealed);

  // The selected lesson ID is retained while the review view is open.
  // Navigate through the sidebar before using the lesson-step helper.
  const menu = page.getByRole("button", {
    name: "Otwórz nawigację",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(".sidebar-trail")
    .getByRole("button")
    .filter({ hasText: target.title })
    .click();
  await openStep(page, "attenuation", "apply");
  await expect(page.locator(".compiler-coach")).toBeVisible();
  await navigate("Mapa nauki");
  await assertRecovery();
  await page.reload();
  const reloaded = await savedState(page);
  expect(reloaded.events.filter(isReviewReveal)).toEqual([exposure]);
  expect(reloaded.reviewSession).toEqual(revealed.reviewSession);
  assertCleanTarget(reloaded);
  await assertRecovery();

  // Practice stays available. Inspect the coach's warning only after the
  // review-only recovery assertions, since opening it requires lesson hints.
  await page
    .locator(".lesson-list-item")
    .filter({
      has: page.getByRole("heading", { name: target.title, exact: true }),
    })
    .click();
  await openStep(page, "attenuation", "apply");
  const coach = page.locator(".compiler-coach");
  await coach
    .getByRole("button", { name: "Pomóż mi to zrozumieć", exact: true })
    .click();
  await coach
    .getByRole("button", { name: "Pokaż drugą wskazówkę", exact: true })
    .click();
  await coach
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await expect(coach).toContainText(
    "dostępnego świeżego zadania",
  );
  const practiced = await savedState(page);
  expect(practiced.events.filter(isReviewReveal)).toEqual([exposure]);
  expect(
    practiced.events.filter(
      (event) =>
        event.lessonId === target.id &&
        event.passed &&
        event.kind !== "exposure",
    ),
  ).toEqual([]);
  expect(runnerRequests).toEqual([]);
  const fresh = target.steps.find(
    (step) => step.id === "authorization-attenuation-intersection",
  )!;
  expect(courseGateRecovery(practiced, criterion, lessons)).toEqual({
    status: "available",
    task: { lessonId: target.id, stepId: fresh.id },
  });
  await navigate("Mapa nauki");
  await assertRecovery();
  await page
    .locator(".gate-panel li")
    .filter({ hasText: criterion.label })
    .getByRole("button", { name: "Sprawdź w zadaniu", exact: true })
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(fresh.title);
  await expect(editor(page)).toHaveValue(fresh.code!);
  // This explicit intercepted success verifies routing/state, not native Rust.
  await mockedRun(page, fresh);
  const recovered = await savedState(page);
  expect(recovered.events.filter(isReviewReveal)).toEqual([exposure]);
  expect(recovered.events.slice(0, practiced.events.length)).toEqual(
    practiced.events,
  );
  expect(
    recovered.events.find(
      (event) => event.stepId === fresh.id && event.evaluator === "tests",
    ),
  ).toMatchObject({ passed: true, hints: 0, revealed: false, gate: true });
  expect(courseModuleGate(recovered, lessons, courseModule).passed).toBe(
    true,
  );
  for (const alias of ["apply", "blank"] as const)
    expect(
      recovered.steps[
        stepKey(target.id, courseStep("attenuation", alias).id)
      ],
    ).toEqual(
      practiced.steps[
        stepKey(target.id, courseStep("attenuation", alias).id)
      ],
    );
  await page.reload();
  const persisted = await savedState(page);
  expect(persisted.resume.lessonId).toBe(target.id);
  expect(persisted.resume.stepIndex).toBe(target.steps.indexOf(fresh));
  expect(persisted.steps[stepKey(target.id, fresh.id)]).toEqual(
    recovered.steps[stepKey(target.id, fresh.id)],
  );
  expect(courseModuleGate(persisted, lessons, courseModule).passed).toBe(
    true,
  );
  expect(runnerRequests).toHaveLength(1);
});
