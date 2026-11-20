import { expect, test, type Page } from "@playwright/test";
import { courseEvidencePolicy } from "../../src/content/learning-context";
import { independentCodingTaskIds } from "../../src/engine/learning";
import { lessons } from "../../src/content/course";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";

const lesson = lessons.find(
  (candidate) => candidate.id === "ownership-foundation-transfer",
)!;
const model = lesson.steps.find(
  (candidate) => candidate.id === "foundation-contract-model",
)!;
const repair = lesson.steps.find(
  (candidate) => candidate.id === "ownership-restore-rejection-transfer",
)!;
const nestedDrop = lesson.steps.find(
  (candidate) => candidate.id === "scope-nested-drop-transfer",
)!;
const cargo = lessons.find(
  (candidate) => candidate.id === "cargo-package-integration",
)!;

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

test("ownership foundation preserves model evidence, editor state, and Cargo resumes", async ({
  page,
}) => {
  expect(model.evidence?.codingTaskId).toBeUndefined();
  expect(model.evidenceKind).toBe("exposure");
  expect(repair.evidence?.codingTaskId).toBe(
    "ownership/restore-after-rejection-v1",
  );

  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  await seedState(page, readyState(lesson.id, lesson.steps.indexOf(model)));
  await expect(page.locator(".task-pane h1")).toHaveText(model.title);
  await expect(page.locator(".task-pane")).toContainText("Option::take");
  await expect(page.locator(".task-pane")).toContainText("support::Marker");

  await page.getByRole("radio", { name: /Błąd przywraca oryginał/ }).check();
  await page.getByRole("button", { name: "Sprawdź odpowiedź" }).click();
  await expect(page.locator(".task-pane").getByRole("status")).toContainText(
    "Poprawnie",
  );
  const afterModel = await savedState(page);
  expect(
    independentCodingTaskIds(
      afterModel,
      "ownership-repair",
      courseEvidencePolicy,
    ),
  ).toEqual([]);

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.indexOf(nestedDrop))
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(nestedDrop.title);
  await page.getByRole("tab", { name: "Kod" }).click();
  const nestedDropEditor = page.getByRole("textbox", {
    name: "Kod Rust",
    exact: true,
  });
  const nestedDropStarter = await nestedDropEditor.inputValue();
  expect(nestedDropStarter).toContain("nested_scope");
  expect(nestedDropStarter).toContain("support::DropLog");
  expect(nestedDropStarter).toContain("__rust_workshop_hidden_tests::support");
  expect(nestedDropStarter).not.toMatch(
    /RefCell|impl\s+Drop|pub\s+mod\s+support|struct\s+DropLog|events\s*:/,
  );
  await page.getByRole("tab", { name: "Zadanie" }).click();
  const afterDropView = await savedState(page);
  const dropExposureEvents = afterDropView.events.filter(
    (event) => event.lessonId === lesson.id && event.stepId === nestedDrop.id,
  );
  expect(dropExposureEvents).toHaveLength(1);
  expect(dropExposureEvents[0]).toMatchObject({
    kind: "exposure",
    passed: true,
    gate: false,
  });
  expect(dropExposureEvents[0].evidenceVersion).toBeUndefined();
  expect(
    independentCodingTaskIds(afterDropView, "scope-drop", courseEvidencePolicy),
  ).toEqual([]);

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.indexOf(repair))
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(repair.title);
  await expect(page.getByLabel("Miejsce na przerwę")).toContainText(
    "Opcjonalna przerwa przed Drop i Copy",
  );

  await page.getByRole("tab", { name: "Kod" }).click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(`${repair.code}\n// szkic zachowany na urządzeniu\n`);
  await page.getByRole("tab", { name: "Zadanie" }).click();
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page
    .getByLabel("Notatki do lekcji")
    .fill("Po odrzuceniu przywracam dokładny String.");
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await expect(page.getByText("WSKAZÓWKA 2 · REGUŁA")).toBeVisible();

  const codeTab = page.getByRole("tab", { name: "Kod" });
  await codeTab.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Zadanie" })).toBeFocused();
  await codeTab.click();
  await expect(editor).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ mode: "test" });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "infrastructure-error",
        stdout: "",
        stderr: "runner unavailable",
        diagnostics: [],
        durationMs: 1,
      }),
    });
  });
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(page.locator(".task-pane")).toContainText(
    "Próba nie wpływa na mastery",
  );
  await page.getByRole("tab", { name: "Output" }).click();
  await expect(page.getByLabel("Wynik kompilatora")).toContainText(
    "Kompilator niedostępny",
  );
  await page.getByRole("tab", { name: "Zadanie" }).click();
  const afterFailure = await savedState(page);
  const repairState = afterFailure.steps[stepKey(lesson.id, repair.id)];
  expect(repairState?.code).toContain("szkic zachowany");
  expect(repairState?.hints).toBe(2);
  expect(afterFailure.notes[lesson.id]).toBe(
    "Po odrzuceniu przywracam dokładny String.",
  );
  expect(
    independentCodingTaskIds(
      afterFailure,
      "ownership-repair",
      courseEvidencePolicy,
    ),
  ).toEqual([]);

  await page.reload();
  await page.getByRole("tab", { name: "Kod" }).click();
  await expect(editor).toHaveValue(/szkic zachowany/);
  await page.getByRole("tab", { name: "Zadanie" }).click();
  await expect(page.getByText("WSKAZÓWKA 2 · REGUŁA")).toBeVisible();

  const cargoModify = cargo.steps.findIndex(
    (step) => step.id === "cargo-modify",
  );
  await seedState(page, readyState(cargo.id, cargoModify));
  await expect(page.locator(".task-pane h1")).toHaveText(
    cargo.steps[cargoModify].title,
  );
  await expect(page.getByLabel("Miejsce na przerwę")).toContainText(
    "Opcjonalna przerwa przed pustą stroną",
  );
  await seedState(page, readyState(cargo.id, cargo.steps.length - 1));
  await expect(page.locator(".task-pane h1")).toHaveText(
    cargo.steps.at(-1)!.title,
  );
});
