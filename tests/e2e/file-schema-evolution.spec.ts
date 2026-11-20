import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import {
  concepts,
  lessons,
  modules,
  projects,
  reviewExercises,
} from "../../src/content/course";
import {
  assistanceForLessonStep,
  courseEvidencePolicy,
  courseGateRecovery,
  courseModuleGate,
  recordCourseLessonExposure,
} from "../../src/content/learning-context";
import { packageDownloadPath } from "../../src/domain/project-package";
import type { Lesson, LessonStep, UserState } from "../../src/domain/types";
import { independentCodingTaskIds } from "../../src/engine/learning";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import {
  assertArchiveNotices,
  expectedArchivePaths,
} from "./archive-notices.helper";

const normalization = lessons.find(
  ({ id }) => id === "file-schema-normalization",
)!;
const upgrade = lessons.find(
  ({ id }) => id === "file-schema-explicit-upgrade",
)!;
const courseModule = modules.find(({ id }) => id === "file-schema-evolution")!;
const criterion = courseModule.gateCriteria![0];
const project = projects.find(({ id }) => id === courseModule.id)!;
const archive = project.package!;
const concept = concepts.find(({ id }) => id === "file-version-meaning")!;
const review = reviewExercises[concept.id];
const [prediction, model, debug, apply, blank] = normalization.steps;
const snapshot = normalization.steps.find(
  (step) => step.id === "schema-validate-current-snapshot",
)!;
const editor = (page: Page) =>
  page.locator('textarea.code-textarea[aria-label="Kod Rust"]');

test.describe.configure({ retries: 0 });

function controlledState(lesson: Lesson, step: LessonStep): UserState {
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
    stepIndex: lesson.steps.indexOf(step),
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

async function openNavigation(page: Page) {
  const button = page.getByRole("button", {
    name: "Otwórz nawigację",
    exact: true,
  });
  if (await button.isVisible()) await button.click();
}

async function openStep(page: Page, lesson: Lesson, step: LessonStep) {
  const state = await savedState(page);
  if (state.resume.view !== "lesson" || state.resume.lessonId !== lesson.id) {
    await openNavigation(page);
    await page
      .locator(".sidebar-trail")
      .getByRole("button")
      .filter({ hasText: lesson.title })
      .click();
  }
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.indexOf(step))
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(step.title);
}

async function openPackage(page: Page) {
  await openNavigation(page);
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const button = page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button")
    .filter({ has: page.getByText(project.title, { exact: true }) });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  return page.getByRole("region", { name: "Pakiet Cargo" });
}

function expectPackageActionEvents(
  before: UserState,
  after: UserState,
  variant: "starter" | "solution",
) {
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  const refs = variant === "starter" ? [] : archive.revealStepRefs;
  const added = after.events.slice(before.events.length);
  expect(added).toEqual(
    refs.map((ref) =>
      expect.objectContaining({
        ...ref,
        conceptIds: normalization.conceptIds,
        kind: "exposure",
        passed: true,
        hints: 0,
        revealed: true,
        gate: false,
      }),
    ),
  );
  for (const event of added) {
    expect(event.id).toMatch(/^supplied-solution:/);
    expect(event).not.toHaveProperty("evaluator");
    expect(event).not.toHaveProperty("evidenceVersion");
  }
  expectNoCredit(after);
}

async function downloadPackage(page: Page, variant: "starter" | "solution") {
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  const selection = panel.getByRole("button", {
    name:
      variant === "starter" ? "Pliki startowe" : "Pokaż rozwiązanie pakietu",
    exact: true,
  });
  const beforePreview = await savedState(page);
  await selection.click();
  await expect(selection).toHaveAttribute("aria-pressed", "true");
  const afterPreview = await savedState(page);
  // Preview and download are distinct real contacts. Each records exactly one
  // complete ref set; re-rendering must not duplicate either action.
  expectPackageActionEvents(beforePreview, afterPreview, variant);
  const link = panel.getByRole("link", {
    name:
      variant === "starter" ? "Pobierz pakiet startowy" : "Pobierz rozwiązanie",
    exact: true,
  });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    link.click(),
  ]);
  expect(await download.failure()).toBeNull();
  const afterDownload = await savedState(page);
  expectPackageActionEvents(afterPreview, afterDownload, variant);
  const bytes = await readFile((await download.path())!);
  const files = unzipSync(bytes);
  expect(Object.keys(files).sort()).toEqual(expectedArchivePaths(archive));
  assertArchiveNotices(files, archive);
  for (const file of archive.files) {
    const expected =
      variant === "starter" ? file.starter : (file.solution ?? file.starter);
    expect(strFromU8(files[`${archive.id}/${file.path}`])).toBe(expected);
  }
  return bytes;
}

function expectNoCredit(state: UserState) {
  expect(
    independentCodingTaskIds(state, concept.id, courseEvidencePolicy),
  ).toEqual([]);
}

function expectSavedHelp(state: UserState, revealed: boolean) {
  for (const step of [apply, blank]) {
    expect(assistanceForLessonStep(state, normalization, step)).toEqual({
      hints: 0,
      revealed,
    });
  }
}

const traversal =
  /\b(?:fn\s+(?:normalize|decode|encode_current|prepare_upgrade|upgrade_file)|struct\s+(?:UpgradePlan|StagedFile))\b|\.into_iter\(\)\.enumerate\(\)/;
const nativeSource =
  /\b(?:fn\s+(?:decode|encode_current|prepare_upgrade|upgrade_file)|struct\s+(?:UpgradePlan|StagedFile))\b/;

test("out-of-order lessons and ordinary review expose only scoped source and record real help", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  // Synthetic ready state contains no recorded exercise result.
  await seedState(page, controlledState(upgrade, upgrade.steps[1]));
  for (const [lesson, step] of [
    [upgrade, upgrade.steps[1]],
    [upgrade, upgrade.steps[2]],
    [normalization, model],
    [normalization, debug],
  ] as const) {
    await openStep(page, lesson, step);
    expect(await page.locator(".task-prompt").innerText()).not.toMatch(
      traversal,
    );
    await expect(page.locator(".revealed-solution pre")).toHaveCount(0);
  }

  await openNavigation(page);
  await page.getByRole("button", { name: /^Powtórki(?: \d+)?$/ }).click();
  await page
    .locator(".review-concept")
    .filter({ hasText: concept.title })
    .click();
  const reviewPanel = page.locator(".review-session");
  await expect(reviewPanel.locator("h3")).toHaveText(review.title);
  await expect(editor(page)).toHaveValue("");
  const reviewPrompt = await reviewPanel.innerText();
  expect(reviewPrompt).toContain('todo!("implement normalization")');
  expect(reviewPrompt).not.toMatch(nativeSource);
  expect(reviewPrompt).not.toContain(".into_iter().enumerate()");
  const session = (await savedState(page)).reviewSession!;
  expect(session).toMatchObject({
    conceptId: concept.id,
    mode: "challenge",
    wasDue: false,
  });
  expect(session.exerciseId).toBeUndefined();
  await reviewPanel
    .getByRole("button", { name: "Karta przypomnienia", exact: true })
    .click();
  await reviewPanel
    .getByLabel("Przypomnij własnymi słowami", { exact: true })
    .fill("NEXT zachowuje historię numeracji.");
  await reviewPanel
    .getByRole("button", { name: "Odsłoń odpowiedź", exact: true })
    .click();
  const reviewStepId = `${review.id}:${session.sessionId}`;
  await expect
    .poll(async () =>
      (await savedState(page)).events.filter(
        (event) =>
          event.lessonId === "review" &&
          event.stepId === reviewStepId &&
          event.revealed,
      ),
    )
    .toEqual([
      expect.objectContaining({
        kind: "exposure",
        gate: false,
        passed: true,
        hints: 0,
      }),
    ]);
  const beforePackage = await savedState(page);
  expectSavedHelp(beforePackage, false);
  expectNoCredit(beforePackage);
  expect(
    courseGateRecovery(beforePackage, criterion, [normalization, upgrade]),
  ).toEqual({
    status: "available",
    task: { lessonId: normalization.id, stepId: snapshot.id },
  });

  const packagePanel = await openPackage(page);
  await downloadPackage(page, "starter");
  await packagePanel.getByLabel("Plik w pakiecie").selectOption("src/model.rs");
  const preview = packagePanel.locator("pre");
  await expect(preview).toContainText("fn normalize");
  await expect(preview).toContainText("todo!");
  const starterModel = archive.files.find(
    (file) => file.path === "src/model.rs",
  )!;
  expect(await preview.textContent()).toBe(starterModel.starter);
  const afterStarter = await savedState(page);
  expect(afterStarter.events).toEqual(beforePackage.events);
  expectSavedHelp(afterStarter, false);
  await downloadPackage(page, "solution");
  await expect(preview).toContainText("fn normalize");
  expect(await preview.textContent()).toBe(starterModel.solution);
  const afterSolution = await savedState(page);
  expect(afterSolution.events.slice(0, afterStarter.events.length)).toEqual(
    afterStarter.events,
  );
  const reveals = afterSolution.events.slice(afterStarter.events.length);
  expect(reveals.map(({ lessonId, stepId }) => ({ lessonId, stepId }))).toEqual(
    [...archive.revealStepRefs, ...archive.revealStepRefs],
  );
  expect(reveals).toEqual(
    [...archive.revealStepRefs, ...archive.revealStepRefs].map((ref) =>
      expect.objectContaining({
        ...ref,
        kind: "exposure",
        revealed: true,
        gate: false,
        hints: 0,
      }),
    ),
  );
  expectSavedHelp(afterSolution, true);

  for (const step of [apply, blank]) {
    await openStep(page, normalization, step);
    await expect(editor(page)).toHaveValue(step.code!);
    await expect(page.locator(".revealed-solution pre")).toHaveText(
      step.solution!,
    );
    const visible = [
      await editor(page).inputValue(),
      await page.locator(".task-prompt").innerText(),
    ].join("\n");
    expect(visible).toContain('todo!("implement normalization")');
    expect(visible).not.toMatch(nativeSource);
    expect(visible).not.toContain(".into_iter().enumerate()");
  }
  const beforeMock = await savedState(page);
  if (blank.evaluator?.kind !== "tests")
    throw new Error("Expected the fixed test evaluator");
  const tests = blank.evaluator.tests;
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: blank.solution,
      mode: "test",
      tests,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "controlled browser state response",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 1, failed: 0 },
      }),
    });
  });
  // This fixed mocked response exercises submission and saved assistance only.
  await editor(page).fill(blank.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await savedState(page)).events.filter(
        (event) => event.stepId === blank.id && event.evaluator === "tests",
      ),
    )
    .toEqual([
      expect.objectContaining({
        lessonId: normalization.id,
        stepId: blank.id,
        kind: "transfer",
        passed: true,
        hints: 0,
        revealed: true,
        evidenceVersion: 2,
      }),
    ]);
  const afterMock = await savedState(page);
  expect(afterMock.events.slice(0, beforeMock.events.length)).toEqual(
    beforeMock.events,
  );
  expectSavedHelp(afterMock, true);
  expectNoCredit(afterMock);
  expect(courseGateRecovery(afterMock, criterion, lessons)).toEqual({
    status: "available",
    task: { lessonId: normalization.id, stepId: snapshot.id },
  });
  await page.unroute("**/api/run");
  await openNavigation(page);
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page.getByLabel("Znajdź moduł lub temat").fill(courseModule.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: courseModule.title })
    .click();
  await page
    .locator(".gate-panel li")
    .filter({ hasText: criterion.label })
    .getByRole("button", { name: "Sprawdź w zadaniu", exact: true })
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(snapshot.title);
  await expect(editor(page)).toHaveValue(snapshot.code!);
  if (snapshot.evaluator?.kind !== "tests")
    throw new Error("Expected snapshot tests");
  const snapshotTests = snapshot.evaluator.tests;
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: snapshot.solution,
      mode: "test",
      tests: snapshotTests,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: "controlled browser state response",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 1, failed: 0 },
      }),
    });
  });
  await editor(page).fill(snapshot.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await savedState(page)).events.some(
        (event) =>
          event.stepId === snapshot.id &&
          event.evaluator === "tests" &&
          event.passed,
      ),
    )
    .toBe(true);
  const recovered = await savedState(page);
  expect(recovered.events.slice(0, afterMock.events.length)).toEqual(
    afterMock.events,
  );
  expectSavedHelp(recovered, true);
  expect(
    recovered.events.find(
      (event) => event.stepId === snapshot.id && event.evaluator === "tests",
    ),
  ).toMatchObject({ passed: true, hints: 0, revealed: false, gate: true });
  expect(
    courseModuleGate(recovered, lessons, courseModule).criteria[0].passed,
  ).toBe(true);
  await page.reload();
  const persisted = await savedState(page);
  expect(persisted.resume.stepIndex).toBe(
    normalization.steps.indexOf(snapshot),
  );
  expect(persisted.steps[stepKey(normalization.id, snapshot.id)]).toEqual(
    recovered.steps[stepKey(normalization.id, snapshot.id)],
  );
  expect(
    courseModuleGate(persisted, lessons, courseModule).criteria[0].passed,
  ).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("offline downloads and reload preserve saved state and record one fresh neutral opening", async ({
  page,
  context,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const runnerRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/run")
      runnerRequests.push(request.url());
  });
  const key = stepKey(normalization.id, apply.id);
  const draft = "// zapisany szkic testowy";
  const note = "Zachowaj kolejność i następny identyfikator.";
  const at = 1700000000000;
  const initial = controlledState(normalization, prediction);
  initial.steps[key] = { ...createStepProgress(draft), hints: 1 };
  initial.notes[normalization.id] = note;
  const seed = recordCourseLessonExposure(initial, {
    lessonId: normalization.id,
    stepId: apply.id,
    conceptIds: [concept.id],
    at,
  });
  await page.goto("/");
  await seedState(page, seed);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  // Warm a different coding view through the controlling worker. The blank stays unvisited.
  await openStep(page, normalization, apply);
  await expect(editor(page)).toHaveValue(draft);
  await openPackage(page);
  for (const variant of ["starter", "solution"] as const) {
    await page.waitForFunction(
      async (href) => Boolean(await caches.match(href)),
      packageDownloadPath(archive, variant),
    );
  }
  const starter = await downloadPackage(page, "starter");
  const solution = await downloadPackage(page, "solution");
  expect(starter.equals(solution)).toBe(false);
  await openStep(page, normalization, prediction);
  const before = await savedState(page);
  expect(before.steps[key]).toMatchObject({
    code: draft,
    hints: 1,
    revealed: true,
  });
  expect(before.notes[normalization.id]).toBe(note);
  expect(before.events.slice(0, seed.events.length)).toEqual(seed.events);
  expect(
    before.events.filter(
      (event) => event.stepId === blank.id && !event.revealed,
    ),
  ).toEqual([]);
  expectNoCredit(before);

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator(".offline-banner")).toContainText("Tryb offline");
    const reloaded = await savedState(page);
    expect(reloaded.resume).toEqual(before.resume);
    expect(reloaded.steps).toEqual(before.steps);
    expect(reloaded.notes).toEqual(before.notes);
    expect(reloaded.review).toEqual(before.review);
    expect(reloaded.events.slice(0, before.events.length)).toEqual(
      before.events,
    );

    await openStep(page, normalization, blank);
    await expect(editor(page)).toHaveValue("");
    await expect
      .poll(async () =>
        (await savedState(page)).events.slice(reloaded.events.length),
      )
      .toEqual([
        expect.objectContaining({
          lessonId: normalization.id,
          stepId: blank.id,
          kind: "exposure",
          gate: false,
          passed: true,
          hints: 0,
          revealed: false,
        }),
      ]);
    const opened = await savedState(page);
    const neutral = opened.events.at(-1)!;
    expect(neutral).not.toHaveProperty("evaluator");
    expect(neutral).not.toHaveProperty("evidenceVersion");
    await expect(
      page.getByRole("button", { name: "Uruchom testy", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".offline-banner")).toHaveText(
      "Tryb offline. Możesz uczyć się i edytować kod. Kompilator wymaga połączenia.",
    );
    const afterChecks = await savedState(page);
    expect(afterChecks.events).toEqual(opened.events);
    expect(afterChecks.steps[key]).toEqual(before.steps[key]);
    expect(afterChecks.notes).toEqual(before.notes);
    expect(afterChecks.resume).toMatchObject({
      lessonId: normalization.id,
      stepIndex: normalization.steps.indexOf(blank),
    });
    expect(assistanceForLessonStep(afterChecks, normalization, blank)).toEqual({
      hints: 1,
      revealed: true,
    });
    expectNoCredit(afterChecks);
    expect(runnerRequests).toEqual([]);

    await openPackage(page);
    const offlineStarter = await downloadPackage(page, "starter");
    const offlineSolution = await downloadPackage(page, "solution");
    expect(offlineStarter.equals(starter)).toBe(true);
    expect(offlineSolution.equals(solution)).toBe(true);
    const afterDownloads = await savedState(page);
    expect(afterDownloads.events.slice(0, afterChecks.events.length)).toEqual(
      afterChecks.events,
    );
    expect(
      afterDownloads.events
        .slice(afterChecks.events.length)
        .map(({ lessonId, stepId }) => ({ lessonId, stepId })),
    ).toEqual([...archive.revealStepRefs, ...archive.revealStepRefs]);
    expect(afterDownloads.steps).toEqual(afterChecks.steps);
    expect(afterDownloads.notes).toEqual(before.notes);
    expectNoCredit(afterDownloads);
    expect(pageErrors).toEqual([]);
  } finally {
    await context.setOffline(false);
  }
});
