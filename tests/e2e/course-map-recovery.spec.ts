import { expect, test, type Page } from "@playwright/test";
import { lessons, modules } from "../../src/content/course";
import {
  createInitialState,
  createStepProgress,
  exportState,
  stepKey,
} from "../../src/persistence/state";
import { evidenceForLessonStep } from "../../src/content/learning-context";
import type { EvidenceEvent, UserState } from "../../src/domain/types";

function ready(lessonId: string): UserState {
  const state = createInitialState();
  state.onboarding.completed = true;
  state.diagnostic.completed = true;
  state.settings.accessibleEditor = true;
  state.resume = { ...state.resume, view: "course", lessonId };
  return state;
}

async function seed(page: Page, state: UserState) {
  await page.goto("/");
  await page.evaluate(async (value) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("user-state");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("user-state", "readwrite");
        transaction.objectStore("user-state").put(value, "current");
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

async function reveal(page: Page) {
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await expect(page.locator(".revealed-solution pre")).toBeVisible();
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
}

test("scopes exhausted recovery to its criterion and keeps remaining fresh practice open", async ({
  page,
}, testInfo) => {
  const stage = modules.find((module) => module.id === "ownership")!;
  const borrowing = stage.gateCriteria!.find(
    (criterion) => criterion.id === "borrowing",
  )!;
  const lesson = lessons.find((item) => item.id === "borrow-intro")!;
  const state = ready(lesson.id);
  state.resume.view = "lesson";
  state.resume.stepIndex = lesson.steps.findIndex(
    (step) => step.id === "borrow-conflict",
  );
  await seed(page, state);

  await reveal(page);
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.findIndex((step) => step.id === "borrow-mutable-run"))
    .click();
  await reveal(page);
  await page.getByRole("button", { name: stage.title, exact: true }).click();

  const recovery = page.locator(".module-connections > div").filter({
    has: page.getByRole("heading", {
      name: "Jak wrócić do praktyki",
      exact: true,
    }),
  });
  const borrowingRow = page
    .locator(".gate-panel li")
    .filter({ hasText: borrowing.label });
  // One fresh task remains even though two different independent tasks are required.
  await expect(borrowingRow).not.toContainText(
    "Brak świeżego samodzielnego wariantu",
  );
  await recovery
    .getByRole("button", { name: borrowing.label, exact: true })
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText("Napraw konflikt");
  await reveal(page);
  await page.getByRole("button", { name: stage.title, exact: true }).click();

  const notice = recovery
    .locator("p")
    .filter({ hasText: "Brak świeżego samodzielnego wariantu" });
  await expect(notice).toContainText(borrowing.label);
  await expect(notice).not.toContainText("Przewidywanie move w nowym kodzie");
  await expect(
    borrowingRow.getByRole("button", { name: "Sprawdź w zadaniu" }),
  ).toHaveCount(0);
  await expect(
    recovery.getByRole("button", { name: borrowing.label, exact: true }),
  ).toHaveCount(0);
  await recovery.screenshot({
    path: testInfo.outputPath("mixed-recovery.png"),
  });
  await recovery
    .getByRole("button", {
      name: "Przewidywanie move w nowym kodzie",
      exact: true,
    })
    .click();
  const prediction = lessons
    .find((item) => item.id === "move-copy-discovery")!
    .steps.find((step) => step.id === "move-predict")!;
  await expect(page.locator(".task-pane h1")).toHaveText(prediction.title);
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(prediction.title);
  await page.getByRole("button", { name: stage.title, exact: true }).click();
  await expect(notice).toContainText(borrowing.label);
});

test("imported cross-module solution history does not confirm a supplied Todo component", async ({
  page,
}) => {
  const stage = modules.find((module) => module.id === "todo-project")!;
  const state = ready("todo-state-invariants");
  const sourceLesson = lessons.find(
    (lesson) => lesson.id === "todo-storage-format",
  )!;
  const source = sourceLesson.steps.find((step) => step.id === "format-debug")!;
  const success = (
    lessonId: string,
    stepId: string,
    at: number,
  ): EvidenceEvent => {
    const lesson = lessons.find((item) => item.id === lessonId)!;
    const step = lesson.steps.find((item) => item.id === stepId)!;
    return {
      id: `historical-${stepId}`,
      lessonId,
      stepId,
      ...evidenceForLessonStep(lesson, step),
      kind: step.evidenceKind,
      evaluator: step.evaluator!.kind,
      passed: true,
      gate: true,
      hints: 0,
      revealed: false,
      at,
    };
  };
  // Older backups can contain the disclosure source without derived component flags.
  // These historical records test import/navigation only, never execution of Rust.
  state.events = [
    {
      id: "supplied-solution:historical-format-debug",
      lessonId: sourceLesson.id,
      stepId: source.id,
      ...evidenceForLessonStep(sourceLesson, source),
      kind: "exposure",
      passed: true,
      gate: false,
      hints: 0,
      revealed: true,
      at: 100,
    },
    success("todo-state-invariants", "state-add-done-gate", 200),
    success("todo-session-project", "todo-session-replay", 250),
  ];
  state.steps[stepKey("todo-session-project", "session-blank")] = {
    ...createStepProgress(),
    hints: 1,
  };

  await seed(page, ready("todo-state-invariants"));
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  await page.getByLabel("Importuj postęp").setInputFiles({
    name: "source-only-solution-history.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportState(state)),
  });
  await expect(page.getByText("Gotowy do importu")).toBeVisible();
  await page.getByRole("button", { name: "Zastąp postęp tym plikiem" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: stage.title, exact: true }),
  ).toBeVisible();

  const row = page.locator(".gate-panel li").filter({
    hasText:
      "Add i Done zachowują walidację, identyfikatory i stan po błędzie.",
  });
  await expect(row.getByLabel("Potwierdzone")).toHaveCount(0);
  await expect(row.getByLabel("Do sprawdzenia")).toBeVisible();
  await expect(
    page
      .locator(".gate-panel li")
      .filter({
        hasText: "Sesja daje wynik każdej linii i kontynuuje po błędzie.",
      })
      .getByLabel("Potwierdzone"),
  ).toBeVisible();
  await row.getByRole("button", { name: "Sprawdź w zadaniu" }).click();
  await expect(page.locator(".task-pane h1")).toHaveText(
    "Zastosuj grupową edycję tablicy",
  );
});

test("fully exhausted recovery preserves access through the lesson list without a fresh-task fallback", async ({
  page,
}, testInfo) => {
  const stage = modules.find((module) => module.id === "service-operations")!;
  const state = ready(stage.lessonIds[0]);
  // Restored assistance only: no completion, execution result, or independent credit.
  for (const criterion of stage.gateCriteria!) {
    for (const ref of criterion.taskRefs) {
      state.steps[stepKey(ref.lessonId, ref.stepId)] = {
        ...createStepProgress(),
        revealed: true,
      };
    }
  }
  await seed(page, state);
  const recovery = page.locator(".module-connections > div").filter({
    has: page.getByRole("heading", {
      name: "Jak wrócić do praktyki",
      exact: true,
    }),
  });
  const notice = recovery
    .locator("p")
    .filter({ hasText: "Brak świeżego samodzielnego wariantu" });
  for (const criterion of stage.gateCriteria!) {
    await expect(notice).toContainText(criterion.label);
    await expect(
      page.locator(".gate-panel li").filter({ hasText: criterion.label }),
    ).toContainText("Brak świeżego samodzielnego wariantu");
  }
  await expect(recovery.getByRole("button")).toHaveCount(0);
  await expect(page.locator(".gate-action")).toHaveCount(0);
  await expect(recovery).toContainText(
    "Każdą lekcję możesz otworzyć ze ścieżki eksperymentów.",
  );
  await recovery.screenshot({
    path: testInfo.outputPath("exhausted-recovery.png"),
  });
  await page.locator(".lesson-list-item").first().click();
  const firstLesson = lessons.find(
    (lesson) => lesson.id === stage.lessonIds[0],
  )!;
  await expect(page.locator(".task-pane h1")).toHaveText(
    firstLesson.steps[0].title,
  );
});
