import { expect, test } from "@playwright/test";
import { lessons, modules, projects } from "./polish-course.helper";
import { courseEvidencePolicy } from "../../src/content/learning-context";
import { independentCodingTaskIds } from "../../src/engine/learning";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import type { EvidenceEvent, UserState } from "../../src/domain/types";

const lesson = lessons.find(
  (candidate) => candidate.id === "unsafe-miri-slot-state",
)!;
const model = lesson.steps.find(
  (candidate) => candidate.id === "slot-state-lazy-init-model",
)!;
const transfer = lesson.steps.find(
  (candidate) => candidate.id === "slot-state-lazy-init-transfer",
)!;
const oldGate = lesson.steps.find(
  (candidate) => candidate.id === "slot-state-gate",
)!;
const oldBlank = lesson.steps.find(
  (candidate) => candidate.id === "slot-state-blank",
)!;
const stage = modules.find((candidate) => candidate.id === lesson.moduleId)!;
const criterion = stage.gateCriteria!.find((candidate) =>
  candidate.taskRefs.some((reference) => reference.stepId === transfer.id),
)!;
const oldFamily = "unsafe-miri/slot-state-v1";
const transferFamily = "unsafe-miri/slot-lazy-init-v1";
const oldKey = stepKey(lesson.id, oldGate.id);
const blankKey = stepKey(lesson.id, oldBlank.id);
const transferKey = stepKey(lesson.id, transfer.id);

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
    code: "// zachowany szkic starego kontraktu\n",
    completed: true,
  };
  state.steps[blankKey] = {
    ...createStepProgress(oldBlank.code),
    hints: 1,
  };
  const oldEvent: EvidenceEvent = {
    id: "slot-browser-preserved-old-event",
    conceptIds: ["unsafe-miri-slot-state-contract"],
    lessonId: lesson.id,
    stepId: oldGate.id,
    evidenceVersion: 2,
    kind: oldGate.evidenceKind,
    evaluator: "tests",
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at: 1_700_000_000_003,
  };
  state.events = [oldEvent];
  state.notes[lesson.id] = "Notatka sprzed lazy init.";
  return state;
}

function assertExposureAppend(before: UserState, after: UserState) {
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  const additions = after.events.slice(before.events.length);
  expect(additions.length).toBeGreaterThan(0);
  for (const event of additions) {
    expect(event.kind).toBe("exposure");
    expect(
      courseEvidencePolicy.definitionForEvent(event)?.codingTaskId,
    ).toBeUndefined();
  }
}

test("Slot lazy-init model and primary preserve old evidence and mobile state", async ({
  page,
}) => {
  const before = oldState();
  const oldEvent = before.events[0];
  expect(courseEvidencePolicy.definitionForEvent(oldEvent)?.codingTaskId).toBe(
    oldFamily,
  );
  expect(
    independentCodingTaskIds(
      before,
      "unsafe-miri-slot-state-contract",
      courseEvidencePolicy,
    ),
  ).toEqual([oldFamily]);
  expect(model.evidence?.codingTaskId).toBeUndefined();
  expect(model.evidenceGate).toBe(false);
  expect(transfer.evidence).toEqual({
    version: 2,
    conceptIds: ["unsafe-miri-slot-state-contract"],
    codingTaskId: transferFamily,
  });
  expect(criterion.taskRefs).toContainEqual({
    lessonId: lesson.id,
    stepId: transfer.id,
  });

  await page.goto("/");
  await seedState(page, before);
  await expect(page.locator(".task-pane h1")).toHaveText(oldGate.title);

  const modelIndex = lesson.steps.indexOf(model);
  const transferIndex = lesson.steps.indexOf(transfer);
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(modelIndex)
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(model.title);
  await expect(page.locator(".task-pane")).toContainText("Option");
  await expect(page.locator(".task-pane")).toContainText("pusty");
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
      "unsafe-miri-slot-state-contract",
      courseEvidencePolicy,
    ),
  ).toEqual([oldFamily]);
  expect(afterModel.resume.stepIndex).toBe(modelIndex);

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(transferIndex)
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(transfer.title);
  await expect(page.locator(".task-pane")).toContainText("get_or_try_init");
  await expect(
    page.getByRole("textbox", { name: "Kod Rust", exact: true }),
  ).toHaveValue(/FnOnce/);
  await expect(page.locator(".task-pane")).toContainText("Empty");

  await page.getByRole("button", { name: stage.title, exact: true }).click();
  const criterionRow = page
    .locator(".gate-panel li")
    .filter({ hasText: criterion.label });
  await expect(criterionRow).toBeVisible();
  await expect(criterionRow.getByLabel("Potwierdzone")).toBeVisible();
  await expect(
    criterionRow.getByRole("button", { name: "Sprawdź w zadaniu" }),
  ).toHaveCount(0);
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(transferIndex)
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(transfer.title);

  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const simpleEditor = page.getByRole("button", {
    name: "Prosty edytor",
    exact: true,
  });
  if ((await simpleEditor.count()) && (await simpleEditor.isVisible())) {
    await simpleEditor.click();
  }
  const draft = "// lazy init draft zachowany lokalnie\n";
  const note = "Full pomija inicjalizator; Empty po błędzie pozostaje pusty.";
  await editor.fill(draft);
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page.getByLabel("Notatki do lekcji").fill(note);
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await expect(
    page.getByRole("button", { name: "Pokaż drugą wskazówkę" }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const state = await savedState(page);
      return {
        code: state.steps[transferKey]?.code,
        hints: state.steps[transferKey]?.hints,
        note: state.notes[lesson.id],
        resume: state.resume,
      };
    })
    .toMatchObject({
      code: draft,
      hints: 1,
      note,
      resume: { lessonId: lesson.id, stepIndex: transferIndex },
    });

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
    page.getByRole("button", { name: "Pokaż drugą wskazówkę" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(editor).toHaveValue(draft);

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
  expect(afterReveal.steps[transferKey]).toMatchObject({
    hints: 2,
    revealed: true,
    code: draft,
  });
  assertExposureAppend(before, afterReveal);
  expect(
    independentCodingTaskIds(
      afterReveal,
      "unsafe-miri-slot-state-contract",
      courseEvidencePolicy,
    ),
  ).toEqual([oldFamily]);
  expect(afterReveal.steps[oldKey]).toEqual(before.steps[oldKey]);
  expect(afterReveal.steps[blankKey]).toEqual(before.steps[blankKey]);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const project = projects.find((candidate) => candidate.id === "miri-safety")!;
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: project.title })
    .click();
  const packagePanel = page.getByRole("region", { name: "Pakiet Cargo" });
  const starter = page.waitForEvent("download");
  await packagePanel
    .getByRole("link", { name: "Pobierz pakiet startowy" })
    .click();
  expect(await (await starter).failure()).toBeNull();
  await packagePanel
    .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
    .click();
  const solution = page.waitForEvent("download");
  await packagePanel.getByRole("link", { name: "Pobierz rozwiązanie" }).click();
  expect(await (await solution).failure()).toBeNull();
  const afterDownloads = await savedState(page);
  assertExposureAppend(before, afterDownloads);
  expect(
    independentCodingTaskIds(
      afterDownloads,
      "unsafe-miri-slot-state-contract",
      courseEvidencePolicy,
    ),
  ).toEqual([oldFamily]);
});
