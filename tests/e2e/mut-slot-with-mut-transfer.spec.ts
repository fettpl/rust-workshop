import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { lessons, modules, projects } from "../../src/content/course";
import { courseEvidencePolicy } from "../../src/content/learning-context";
import { independentCodingTaskIds } from "../../src/engine/learning";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import type { EvidenceEvent, UserState } from "../../src/domain/types";
import {
  assertArchiveNotices,
  expectedArchivePaths,
} from "./archive-notices.helper";

const lesson = lessons.find(
  (candidate) => candidate.id === "unsafe-miri-mut-slot",
)!;
const model = lesson.steps.find(
  (candidate) => candidate.id === "mut-slot-with-mut-model",
)!;
const primary = lesson.steps.find(
  (candidate) => candidate.id === "mut-slot-with-mut-transfer",
)!;
const oldGate = lesson.steps.find(
  (candidate) => candidate.id === "mut-slot-gate",
)!;
const oldBlank = lesson.steps.find(
  (candidate) => candidate.id === "mut-slot-blank",
)!;
const stage = modules.find((candidate) => candidate.id === lesson.moduleId)!;
const criterion = stage.gateCriteria!.find((candidate) =>
  candidate.taskRefs.some(
    (reference) =>
      reference.lessonId === lesson.id && reference.stepId === primary.id,
  ),
)!;
const oldFamily = "unsafe-miri/mut-slot-v1";
const primaryFamily = "unsafe-miri/mut-slot-with-mut-v1";
const oldKey = stepKey(lesson.id, oldGate.id);
const blankKey = stepKey(lesson.id, oldBlank.id);
const primaryKey = stepKey(lesson.id, primary.id);

async function seedState(
  page: import("@playwright/test").Page,
  state: UserState,
) {
  await page.evaluate(async (nextState) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("user-state")) {
          request.result.createObjectStore("user-state");
        }
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

async function savedState(page: import("@playwright/test").Page) {
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

function oldState(): UserState {
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
    stepIndex: lesson.steps.indexOf(oldGate),
    panel: "lesson",
  };
  state.steps[oldKey] = {
    ...createStepProgress(oldGate.code),
    code: "// zachowany szkic starego kontraktu MutSlot\n",
    completed: true,
  };
  state.steps[blankKey] = {
    ...createStepProgress(oldBlank.code),
    hints: 1,
  };
  const oldEvent: EvidenceEvent = {
    id: "mut-slot-browser-preserved-old-event",
    conceptIds: ["unsafe-miri-mut-slot-variance-contract"],
    lessonId: lesson.id,
    stepId: oldGate.id,
    evidenceVersion: 2,
    kind: oldGate.evidenceKind,
    evaluator: "tests",
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at: 1_700_000_000_007,
  };
  state.events = [oldEvent];
  state.notes[lesson.id] = "Notatka sprzed helpera with_mut.";
  return state;
}

function assertExposureAppend(before: UserState, after: UserState) {
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  const additions = after.events.slice(before.events.length);
  expect(additions.length).toBeGreaterThan(0);
  for (const event of additions) {
    if (event.kind === "exposure") {
      expect(
        courseEvidencePolicy.definitionForEvent(event)?.codingTaskId,
      ).toBeUndefined();
    } else {
      expect(event).toMatchObject({
        lessonId: lesson.id,
        stepId: primary.id,
        kind: "transfer",
        passed: false,
      });
    }
  }
}

function assertNoPrimaryCredit(state: UserState) {
  expect(
    state.events.filter(
      (event) =>
        event.lessonId === lesson.id &&
        event.stepId === primary.id &&
        event.kind === "transfer" &&
        event.passed,
    ),
  ).toEqual([]);
}

test("with_mut model and primary preserve the old v2 prefix and mobile state", async ({
  page,
}, testInfo) => {
  const before = oldState();
  const oldEvent = before.events[0];
  expect(courseEvidencePolicy.definitionForEvent(oldEvent)?.codingTaskId).toBe(
    oldFamily,
  );
  expect(
    independentCodingTaskIds(
      before,
      "unsafe-miri-mut-slot-variance-contract",
      courseEvidencePolicy,
    ),
  ).toEqual([oldFamily]);
  expect(lesson.steps.indexOf(model)).toBe(8);
  expect(lesson.steps.indexOf(primary)).toBe(9);
  expect(model.kind).toBe("run");
  expect(model.evidenceKind).toBe("exposure");
  expect(model.evidence?.codingTaskId).toBeUndefined();
  expect(model.evidenceGate).not.toBe(true);
  expect(primary.evidence).toEqual({
    version: 2,
    conceptIds: ["unsafe-miri-mut-slot-variance-contract"],
    codingTaskId: primaryFamily,
  });
  expect(criterion.taskRefs).toContainEqual({
    lessonId: lesson.id,
    stepId: primary.id,
  });

  await page.goto("/");
  await seedState(page, before);
  await expect(page.locator(".task-pane h1")).toHaveText(oldGate.title);

  const modelIndex = lesson.steps.indexOf(model);
  const primaryIndex = lesson.steps.indexOf(primary);
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(modelIndex)
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(model.title);
  await expect(page.locator(".task-pane")).toContainText("with_mut");
  await expect
    .poll(async () =>
      (await savedState(page)).events.some(
        (event) =>
          event.lessonId === lesson.id &&
          event.stepId === model.id &&
          event.kind === "exposure",
      ),
    )
    .toBe(true);
  const afterModel = await savedState(page);
  assertExposureAppend(before, afterModel);
  expect(
    independentCodingTaskIds(
      afterModel,
      "unsafe-miri-mut-slot-variance-contract",
      courseEvidencePolicy,
    ),
  ).toEqual([oldFamily]);
  expect(afterModel.resume.stepIndex).toBe(modelIndex);

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(primaryIndex)
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(primary.title);
  await expect(page.locator(".task-pane")).toContainText("with_mut");
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const simpleEditor = page.getByRole("button", {
    name: "Prosty edytor",
    exact: true,
  });
  if ((await simpleEditor.count()) && (await simpleEditor.isVisible())) {
    await simpleEditor.click();
  }
  await expect(editor).toBeVisible();
  const authoredStarter = await editor.inputValue();
  expect(authoredStarter).toContain("with_mut");
  expect(authoredStarter).toMatch(/for\s*<\s*'short\s*>\s*FnOnce/);

  let observedRequest:
    { code: string; mode: string; tests?: string } | undefined;
  await page.route("**/api/run", async (route) => {
    observedRequest = route.request().postDataJSON() as typeof observedRequest;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "test-failure",
        stdout: "",
        stderr: "with_mut draft requires the authored callback contract",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 0, failed: 1 },
      }),
    });
  });

  const draft = "// with_mut draft zachowany lokalnie bez runnera.\n";
  const note = "FnOnce dostaje krótkie reborrow; R nie pożycza callbacka.";
  await editor.fill(draft);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("with_mut draft requires the authored callback contract");
  expect(observedRequest).toMatchObject({
    code: draft,
    mode: "test",
    tests:
      primary.evaluator?.kind === "tests" ? primary.evaluator.tests : undefined,
  });

  await expect(page.locator("#workspace-panel-lesson")).toBeVisible();
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page.getByLabel("Notatki do lekcji").fill(note);
  await page
    .getByRole("button", { name: "Pomóż mi to zrozumieć", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pokaż drugą wskazówkę", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const state = await savedState(page);
      return {
        code: state.steps[primaryKey]?.code,
        hints: state.steps[primaryKey]?.hints,
        note: state.notes[lesson.id],
        resume: state.resume,
      };
    })
    .toMatchObject({
      code: draft,
      hints: 1,
      note,
      resume: { lessonId: lesson.id, stepIndex: primaryIndex },
    });
  const beforeReload = await savedState(page);
  assertNoPrimaryCredit(beforeReload);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(editor).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await editor.focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Monaco Editor", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(editor).toBeFocused();

  const heading = await page.locator(".task-pane h1").innerText();
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(heading);
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(note);
  await expect(
    page.getByRole("button", { name: "Pokaż drugą wskazówkę", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(editor).toHaveValue(draft);
  expect((await savedState(page)).resume).toMatchObject({
    lessonId: lesson.id,
    stepIndex: primaryIndex,
  });

  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await page
    .getByRole("button", { name: "Pokaż drugą wskazówkę", exact: true })
    .click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  const afterReveal = await savedState(page);
  expect(afterReveal.steps[primaryKey]).toMatchObject({
    hints: 2,
    revealed: true,
    code: draft,
  });
  assertExposureAppend(before, afterReveal);
  assertNoPrimaryCredit(afterReveal);
  expect(
    independentCodingTaskIds(
      afterReveal,
      "unsafe-miri-mut-slot-variance-contract",
      courseEvidencePolicy,
    ),
  ).toEqual([oldFamily]);
  for (const ref of [oldGate, oldBlank]) {
    const key = stepKey(lesson.id, ref.id);
    expect(afterReveal.steps[key]).toEqual({ ...before.steps[key], revealed: true });
    const disclosures = afterReveal.events.filter((event) =>
      event.lessonId === lesson.id && event.stepId === ref.id &&
      event.kind === "exposure" && event.id.startsWith("supplied-solution:"),
    );
    expect(disclosures).toHaveLength(1);
    expect(disclosures[0]).toMatchObject({ gate: false, revealed: true });
    expect(disclosures[0].at).toBeGreaterThan(oldEvent.at);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const project = projects.find((candidate) => candidate.id === "miri-safety")!;
  const archive = project.package!;
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: project.title })
    .click();
  const packagePanel = page.getByRole("region", { name: "Pakiet Cargo" });
  const starterDownload = page.waitForEvent("download");
  await packagePanel
    .getByRole("link", { name: "Pobierz pakiet startowy" })
    .click();
  const starter = await starterDownload;
  expect(await starter.failure()).toBeNull();
  const starterZip = unzipSync(await readFile((await starter.path())!));
  expect(Object.keys(starterZip).sort()).toEqual(expectedArchivePaths(archive));
  assertArchiveNotices(starterZip, archive);
  await packagePanel
    .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
    .click();
  const solutionDownload = page.waitForEvent("download");
  await packagePanel.getByRole("link", { name: "Pobierz rozwiązanie" }).click();
  const solution = await solutionDownload;
  expect(await solution.failure()).toBeNull();
  const solutionZip = unzipSync(await readFile((await solution.path())!));
  expect(Object.keys(solutionZip).sort()).toEqual(
    expectedArchivePaths(archive),
  );
  assertArchiveNotices(solutionZip, archive);
  const afterDownloads = await savedState(page);
  assertExposureAppend(before, afterDownloads);
  assertNoPrimaryCredit(afterDownloads);
  expect(
    independentCodingTaskIds(
      afterDownloads,
      "unsafe-miri-mut-slot-variance-contract",
      courseEvidencePolicy,
    ),
  ).toEqual([oldFamily]);
  expect(afterDownloads.events.slice(0, before.events.length)).toEqual(
    before.events,
  );
  await testInfo.attach("mut-slot-browser-contracts.json", {
    body: JSON.stringify(
      {
        lessonId: lesson.id,
        modelId: model.id,
        primaryId: primary.id,
        modelIndex,
        primaryIndex,
        oldFamily,
        primaryFamily,
        oldEvent,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});
