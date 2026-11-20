import { expect, test, type Page } from "@playwright/test";
import { lessons } from "../../src/content/course";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import { courseEvidencePolicy } from "../../src/content/learning-context";
import { hasQuietInterval } from "../../src/engine/learning";
import type { UserState } from "../../src/domain/types";

async function persisted(page: Page): Promise<UserState> {
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("user-state", "readonly");
          const read = transaction.objectStore("user-state").get("current");
          transaction.oncomplete = () => {
            db.close();
            resolve(read.result);
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
  );
}

async function startAt(
  page: Page,
  lessonId: string,
  stepId: string,
  prepare?: (state: UserState) => void,
) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Zrozum kod/ })).toBeVisible();
  const state = createInitialState();
  state.onboarding.completed = true;
  state.diagnostic.completed = true;
  state.settings.accessibleEditor = true;
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId,
    stepIndex: lessons
      .find((lesson) => lesson.id === lessonId)!
      .steps.findIndex((step) => step.id === stepId),
  };
  prepare?.(state);
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("user-state", "readwrite");
          transaction.objectStore("user-state").put(value, "current");
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    state,
  );
  await page.reload();
}

test("model observation completes through acknowledgement and preserves exposure history", async ({
  page,
}) => {
  await startAt(
    page,
    "service-client-bounded-retry",
    "bounded-retry-model-trace",
  );
  await expect(
    page.getByRole("heading", { name: "Prześledź model" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Zapisz obserwację" }),
  ).toBeVisible();
  await expect(page.getByLabel("Twoja odpowiedź")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Zapisz obserwację" })
    .click();
  await expect
    .poll(
      async () =>
        (await persisted(page)).steps[
          stepKey("service-client-bounded-retry", "bounded-retry-model-trace")
        ]?.completed,
    )
    .toBe(true);
  const events = (await persisted(page)).events.filter(
    (event) => event.stepId === "bounded-retry-model-trace",
  );
  expect(
    events.some((event) => event.passed && event.kind === "exposure"),
  ).toBe(true);
  expect(
    events.every((event) => event.gate !== true && event.kind === "exposure"),
  ).toBe(true);
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Obserwacja zapisana" }),
  ).toHaveCount(0);
  await expect
    .poll(async () => (await persisted(page)).resume.stepIndex)
    .toBe(2);
  await page.reload();
  expect((await persisted(page)).resume.stepIndex).toBe(2);
});

test("own Polish explanation requires all self-checks and stays self-rated after reload", async ({
  page,
}) => {
  await startAt(page, "capstone-domain-boundary", "capstone-domain-explain");
  await expect(
    page.getByRole("heading", { name: "Nazwij warunki" }),
  ).toBeVisible();
  const answer =
    "Znak ł zajmuje dwa bajty UTF-8; limit bajtów transportu sprawdzam osobno od liczby znaków.";
  await page.getByLabel("Twoje wyjaśnienie").fill(answer);
  await page.getByRole("button", { name: "Sprawdź odpowiedź" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Dodaj własne, niepuste wyjaśnienie" }),
  ).toBeVisible();
  await page.getByText("Porównaj z kryteriami", { exact: true }).click();
  for (const checkbox of await page
    .locator(".rubric input[type=checkbox]")
    .all())
    await checkbox.check();
  await page.getByRole("button", { name: "Sprawdź odpowiedź" }).click();
  await expect
    .poll(
      async () =>
        (await persisted(page)).steps[
          stepKey("capstone-domain-boundary", "capstone-domain-explain")
        ]?.completed,
    )
    .toBe(true);
  const state = await persisted(page);
  expect(
    state.events
      .filter(
        (event) => event.stepId === "capstone-domain-explain" && event.passed,
      )
      .some(
        (event) =>
          event.kind === "self-rating" &&
          event.evaluator === "rubric" &&
          event.gate === false,
      ),
  ).toBe(true);
  expect(state.mastery["capstone-domain-boundary-contract"]?.level).toBe(
    "exposed",
  );
  await page.reload();
  await expect(page.getByLabel("Twoje wyjaśnienie")).toHaveValue(answer);
  expect(
    (await persisted(page)).steps[
      stepKey("capstone-domain-boundary", "capstone-domain-explain")
    ].rubricChecks,
  ).toHaveLength(2);
});

test("ordering bank exposes identifiers and grades the learner's reconstructed order", async ({
  page,
}) => {
  await startAt(page, "control-flow", "flow-recall");
  await expect(
    page.getByText(/modify — zmodyfikuj i uruchom ponownie/),
  ).toBeVisible();
  await page
    .getByLabel("Twoja odpowiedź")
    .fill("modify, run, discover, predict");
  await page.getByRole("button", { name: "Sprawdź odpowiedź" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Spróbuj ponownie" }),
  ).toBeVisible();
  await page
    .getByLabel("Twoja odpowiedź")
    .fill("discover, predict, run, modify");
  await page.getByRole("button", { name: "Sprawdź odpowiedź" }).click();
  await expect(
    page.getByText("Kolejność jest poprawna.", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await persisted(page)).steps[stepKey("control-flow", "flow-recall")]
          ?.completed,
    )
    .toBe(true);
});

test("reopening a visible full reference records renewed dated contact without a rerender loop", async ({
  page,
}) => {
  const sourceLesson = "macros-exactly-once";
  const sourceStep = "macros-exactly-once-gate";
  await startAt(page, sourceLesson, sourceStep, (state) => {
    state.steps[stepKey(sourceLesson, sourceStep)] = {
      ...createStepProgress(),
      hints: 2,
      revealed: true,
    };
    state.events.push({
      id: `supplied-solution:${sourceLesson}:${sourceStep}:100:revealed`,
      lessonId: sourceLesson,
      stepId: sourceStep,
      conceptIds: ["macros-exactly-once"],
      kind: "exposure",
      passed: true,
      hints: 0,
      revealed: true,
      gate: false,
      at: 100,
    });
  });
  await page.locator(".revealed-solution pre").scrollIntoViewIfNeeded();
  await expect
    .poll(
      async () =>
        (await persisted(page)).events.filter(
          (event) =>
            event.lessonId === sourceLesson &&
            event.stepId === sourceStep &&
            event.id.startsWith("supplied-solution:") &&
            event.at > 100,
        ).length,
    )
    .toBe(1);
  const shown = await persisted(page);
  expect(
    hasQuietInterval(
      shown,
      "macros-exported-paths-2024",
      Date.now(),
      courseEvidencePolicy,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Włącz ciemny motyw" }).click();
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  expect(
    (await persisted(page)).events.filter(
      (event) =>
        event.lessonId === sourceLesson &&
        event.stepId === sourceStep &&
        event.id.startsWith("supplied-solution:") &&
        event.at > 100,
    ),
  ).toHaveLength(1);
});
