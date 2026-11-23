import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { courseEvidencePolicy } from "../../src/content/learning-context";
import { independentCodingTaskIds } from "../../src/engine/learning";
import { lessons, projects } from "./polish-course.helper";
import { createInitialState, stepKey } from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";
import {
  assertArchiveNotices,
  expectedArchivePaths,
} from "./archive-notices.helper";

const lesson = lessons.find(
  (candidate) => candidate.id === "api-frame-protocol-maintenance",
)!;
const model = lesson.steps.find(
  (candidate) => candidate.id === "api-frame-protocol-maintenance-model",
)!;
const review = lesson.steps.find(
  (candidate) => candidate.id === "api-frame-protocol-maintenance-review",
)!;
const project = projects.find(
  (candidate) => candidate.id === "frame-protocol",
)!;

async function seedState(page: Page, state: UserState): Promise<void> {
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

test("Frame maintenance stays optional, resumable, and separate from coding credit", async ({
  page,
}) => {
  expect(model.evidenceKind).toBe("exposure");
  expect(model.evidence?.codingTaskId).toBeUndefined();
  expect(review.evidenceKind).toBe("self-rating");
  expect(review.evidenceGate).toBe(false);
  expect(review.evidence?.codingTaskId).toBeUndefined();

  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  await seedState(page, readyState(lesson.id, lesson.steps.indexOf(model)));
  await expect(page.locator(".task-pane h1")).toHaveText(model.title);

  const modelChoice = page.getByRole("radio", {
    name: /Dodaj FrameErrorCode/,
  });
  await modelChoice.check();
  await expect(page.locator(".save-live")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(model.title);
  await expect(modelChoice).toBeChecked();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();

  let state = await savedState(page);
  expect(state.events.at(-1)).toMatchObject({
    lessonId: lesson.id,
    stepId: model.id,
    kind: "exposure",
    evaluator: "choice",
    passed: true,
    gate: false,
  });
  expect(
    independentCodingTaskIds(
      state,
      "api-compatible-surface",
      courseEvidencePolicy,
    ),
  ).toEqual([]);

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(lesson.steps.indexOf(review))
    .click();
  await expect(page.locator(".task-pane h1")).toHaveText(review.title);
  const rubric = page.locator("details.rubric");
  await rubric.locator("summary").click();
  await page
    .getByRole("textbox", { name: "Twoje wyjaśnienie" })
    .fill("Zachowuję stare ścieżki, źródło I/O oraz rozdzielone features.");
  const criteria = rubric.locator('input[type="checkbox"]');
  for (let index = 0; index < (await criteria.count()); index += 1)
    await criteria.nth(index).check();
  await expect(page.locator(".save-live")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(review.title);
  await expect(
    page.getByRole("textbox", { name: "Twoje wyjaśnienie" }),
  ).toHaveValue(
    "Zachowuję stare ścieżki, źródło I/O oraz rozdzielone features.",
  );
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(
    page
      .locator(".feedback")
      .filter({ hasText: "Sprawdziłeś każde kryterium" }),
  ).toBeVisible();

  state = await savedState(page);
  expect(state.steps[stepKey(lesson.id, review.id)]).toMatchObject({
    completed: true,
    rubricChecks: expect.arrayContaining(review.rubric ?? []),
  });
  expect(state.events.at(-1)).toMatchObject({
    lessonId: lesson.id,
    stepId: review.id,
    kind: "self-rating",
    evaluator: "rubric",
    passed: true,
    gate: false,
  });
  expect(
    independentCodingTaskIds(
      state,
      "api-compatible-surface",
      courseEvidencePolicy,
    ),
  ).toEqual([]);
  expect(
    state.events.filter(
      (event) =>
        event.lessonId === lesson.id &&
        ["fix", "transfer", "project"].includes(event.kind),
    ),
  ).toHaveLength(0);

  const archive = project.package!;
  expect(archive.files.map((file) => file.path)).toEqual(
    expect.arrayContaining(["MAINTENANCE-CHALLENGE.md", "CHANGE-REVIEW.md"]),
  );
  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: project.title })
    .click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  const downloading = page.waitForEvent("download");
  await panel.getByRole("link", { name: "Pobierz pakiet startowy" }).click();
  const download = await downloading;
  expect(await download.failure()).toBeNull();
  const files = unzipSync(await readFile((await download.path())!));
  expect(Object.keys(files).sort()).toEqual(expectedArchivePaths(archive));
  assertArchiveNotices(files, archive);
  for (const path of ["MAINTENANCE-CHALLENGE.md", "CHANGE-REVIEW.md"]) {
    expect(strFromU8(files[`${archive.id}/${path}`])).toContain(
      "Frame Protocol",
    );
  }
});
