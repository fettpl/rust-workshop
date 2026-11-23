import { localizedPackageFile } from "../../src/i18n/package-markdown";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { lessons, projects } from "./polish-course.helper";
import { createInitialState } from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";
import { assertArchiveNotices, expectedArchivePaths } from "./archive-notices.helper";

test.describe.configure({ retries: 0 });

const lesson = lessons.find((candidate) => candidate.id === "service-client-bounded-retry")!;
const project = projects.find((candidate) => candidate.id === "durable-log-retry")!;
const predictStep = lesson.steps[0];
if (predictStep.evaluator?.kind !== "choice" || !predictStep.choices) throw new Error("bounded retry prediction must expose choices");
const correctChoiceId = predictStep.evaluator.correct;
const correctChoice = predictStep.choices.find((choice) => choice.id === correctChoiceId);
if (!correctChoice) throw new Error("bounded retry prediction correct choice is missing");

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
        const database = request.result;
        const transaction = database.transaction("user-state", "readwrite");
        transaction.objectStore("user-state").put(nextState, "current");
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, state);
  await page.reload();
}

async function savedState(page: Page): Promise<UserState> {
  await expect(page.locator(".save-live")).toHaveText("Zapisano na tym urządzeniu");
  return page.evaluate(() => new Promise<UserState>((resolve, reject) => {
    const request = indexedDB.open("rust-workshop-state", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction("user-state", "readonly").objectStore("user-state").get("current");
      read.onerror = () => reject(read.error);
      read.onsuccess = () => { database.close(); resolve(read.result as UserState); };
    };
  }));
}

test("resumes bounded retry work, keeps a draft/self-rating ungated, and downloads both variants", async ({ page }) => {
  expect(lesson.minutes).toBeUndefined();
  expect(project.package).toBeDefined();
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = { completed: true, answers: {}, score: 0, recommendation: "" };
  state.resume = { ...state.resume, view: "lesson", lessonId: lesson.id, stepIndex: 0, panel: "lesson" };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await seedState(page, state);
  await expect(page.locator(".task-pane h1")).toHaveText(lesson.steps[0].title);

  await page.getByRole("radio", { name: correctChoice.label, exact: true }).check();
  await page.getByRole("button", { name: "Sprawdź odpowiedź", exact: true }).click();
  const modelStep = lesson.steps.find((step) => step.id === "bounded-retry-model-trace")!;
  await page.locator('[aria-label="Kroki lekcji"] button').nth(lesson.steps.indexOf(modelStep)).click();
  await expect(page.locator(".task-pane h1")).toHaveText(modelStep.title);
  const codingStep = lesson.steps.find((step) => step.id === "service-client-retry-next-action")!;
  await page.locator('[aria-label="Kroki lekcji"] button').nth(lesson.steps.indexOf(codingStep)).click();
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await page.getByRole("button", { name: "Prosty edytor", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Monaco Editor", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#workspace-panel-code")).toBeVisible();
  const editor = page.locator('textarea.code-textarea[aria-label="Kod Rust"]');
  await expect(editor).toBeVisible();
  const draft = `${codingStep.code ?? ""}\n// ten sam frame, nowa próba\n`;
  await editor.fill(draft);
  await expect(page.locator(".save-live")).toHaveText("Zapisano na tym urządzeniu");
  await page.reload();
  await expect(page.getByRole("tab", { name: "Kod", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Monaco Editor", exact: true }),
  ).toBeVisible();
  await expect(editor).toHaveValue(draft);

  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  const rubricStep = lesson.steps.find((step) => step.id === "bounded-retry-transfer")!;
  await page.locator('[aria-label="Kroki lekcji"] button').nth(lesson.steps.indexOf(rubricStep)).click();
  const rubric = page.locator("details.rubric");
  if ((await rubric.getAttribute("open")) === null) await rubric.locator("summary").click();
  await page.getByRole("textbox", { name: "Twoje wyjaśnienie" }).fill("Wspólny deadline ogranicza każdą fazę; timeout nie jest rollbackiem.");
  await expect(rubric.locator('input[type="checkbox"]')).toHaveCount(rubricStep.rubric?.length ?? 0);
  for (const checkbox of await rubric.locator('input[type="checkbox"]').all()) await checkbox.check();
  await page.getByRole("button", { name: "Sprawdź odpowiedź", exact: true }).click();
  await expect(page.locator(".feedback").filter({ hasText: "Sprawdziłeś każde kryterium" })).toBeVisible();
  const persisted = await savedState(page);
  expect(persisted.events.find((event) => event.stepId === rubricStep.id && event.kind === "exposure")).toMatchObject({ kind: "exposure", gate: false });
  expect(persisted.events.find((event) => event.stepId === rubricStep.id && event.kind === "self-rating")).toMatchObject({ kind: "self-rating", gate: false });

  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page.getByRole("navigation", { name: "Wybierz projekt" }).getByRole("button", { name: project.title }).click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  for (const variant of ["startowy", "rozwiązania"] as const) {
    const variantButton =
      variant === "startowy"
        ? panel.getByRole("button", { name: "Pliki startowe", exact: true })
        : panel.getByRole("button", {
            name: "Pokaż rozwiązanie pakietu",
            exact: true,
          });
    await variantButton.click();
    await expect(variantButton).toHaveAttribute("aria-pressed", "true");
    const link = panel.getByRole("link", {
      name:
        variant === "startowy"
          ? "Pobierz pakiet startowy"
          : "Pobierz rozwiązanie",
      exact: true,
    });
    await expect(link).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      link.click(),
    ]);
    const files = unzipSync(await readFile((await download.path())!));
    expect(Object.keys(files).sort()).toEqual(expectedArchivePaths(project.package!));
    assertArchiveNotices(files, project.package!);
    const fileVariant = variant === "startowy" ? "starter" : "solution";
    for (const file of project.package!.files)
      expect(strFromU8(files[`${project.package!.id}/${file.path}`])).toBe(localizedPackageFile(file.path, file[fileVariant] ?? file.starter, "pl"));
  }
});
