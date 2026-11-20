import { expect, test, type Page } from "@playwright/test";
import {
  concepts,
  lessons,
  projects,
  reviewExercises,
} from "../../src/content/course";
import { createInitialState, exportState } from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";

async function restore(page: Page, state: UserState) {
  state.onboarding.completed = true;
  state.diagnostic.completed = true;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  await page.getByLabel("Importuj postęp").setInputFiles({
    name: "course.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportState(state)),
  });
  await page.getByRole("button", { name: "Zastąp postęp tym plikiem" }).click();
}

async function saved(page: Page): Promise<UserState> {
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const req = indexedDB.open("rust-workshop-state", 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const read = db
            .transaction("user-state")
            .objectStore("user-state")
            .get("current");
          read.onerror = () => reject(read.error);
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
        };
      }),
  );
}

for (const location of ["retired lesson", "removed step"] as const) {
  test(`restoring a ${location} waits for an explicit selection without recording unrelated contact`, async ({
    page,
  }) => {
    const state = createInitialState();
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId:
        location === "retired lesson" ? "retired-lesson" : lessons[0].id,
      stepIndex: 999,
    };
    state.notes[state.resume.lessonId] = "Zachowany szkic";
    await restore(page, state);
    await expect(
      page.getByRole("heading", { name: "Zapisany krok jest niedostępny" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Twój warsztat", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Zapisany krok jest niedostępny" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Wybierz lekcję na mapie" }).click();
    await expect(page.locator(".gate-panel")).toBeVisible();
    const before = await saved(page);
    expect(before.events).toEqual([]);
    expect(before.notes).toEqual(state.notes);
    await page.locator(".lesson-list button").first().click();
    await expect(page.locator(".task-pane h1")).toHaveText(
      lessons[0].steps[0].title,
    );
  });
}

test("project reminders preserve past attempts and the interval when requested twice", async ({
  page,
}) => {
  const state = createInitialState();
  const project = projects.find((p) => p.id === "todo-command-session")!;
  const concept = concepts.find((c) => c.id === project.reviewConceptIds![0])!;
  const last = Date.now() - 86400000;
  const item = {
    conceptId: concept.id,
    dueAt: last + 10 * 86400000,
    lastReviewedAt: last,
    intervalDays: 10,
    attempts: 4,
    reason: "scheduled",
  };
  state.review = [item];
  state.resume = {
    ...state.resume,
    view: "project",
    lessonId: project.lessonId,
  };
  await restore(page, state);
  const repeat = page.getByRole("button", {
    name: "Powtórz: " + concept.title,
    exact: true,
  });
  await repeat.click();
  await expect
    .poll(async () => (await saved(page)).review[0].dueAt)
    .toBeLessThan(item.dueAt);
  const first = (await saved(page)).review;
  expect(first).toEqual([
    {
      ...item,
      dueAt: expect.any(Number),
      reason: expect.stringContaining("retrospektywie"),
    },
  ]);
  await repeat.click();
  await expect(page.locator(".save-status")).toContainText(
    "Zapisano na tym urządzeniu",
  );
  expect((await saved(page)).review).toEqual(first);
});

test("the Log Analyzer lesson note and project retrospective remain independently editable", async ({
  page,
}) => {
  const state = createInitialState();
  const id = "log-analyzer-project";
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: id,
    stepIndex: 0,
  };
  state.notes[id] = "Starsza wspólna notatka";
  await restore(page, state);
  await page.getByText("Twój notatnik", { exact: true }).click();
  const note = page.getByRole("textbox", { name: "Notatki do lekcji" });
  await expect(note).toHaveValue(state.notes[id]);
  await note.fill("Wnioski z lekcji");
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const retro = page.getByRole("textbox", { name: "Twoje obserwacje" });
  await expect(retro).toHaveValue(state.notes[id]);
  await retro.fill("Retrospektywa projektu");
  await page.getByRole("button", { name: "Notatnik", exact: true }).click();
  for (const text of [
    "Wnioski z lekcji",
    "Retrospektywa projektu",
    state.notes[id],
  ]) {
    await expect(
      page.locator(".journal-entry textarea").filter({ hasText: text }),
    ).toHaveCount(1);
  }
  await page.reload();
  const after = await saved(page);
  expect(Object.values(after.notes)).toEqual(
    expect.arrayContaining([
      state.notes[id],
      "Wnioski z lekcji",
      "Retrospektywa projektu",
    ]),
  );
});

test("the import confirmation always belongs to the latest selected file", async ({
  page,
}) => {
  const state = createInitialState();
  state.resume.view = "settings";
  await restore(page, state);
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      if (this.name === "slow.json") {
        await new Promise<void>((resolve) =>
          window.addEventListener("finish-file-read", () => resolve(), {
            once: true,
          }),
        );
      }
      const text = await original.call(this);
      if (this.name === "slow.json")
        setTimeout(() => (document.body.dataset.slowRead = "completed"), 0);
      return text;
    };
  });
  const input = page.getByLabel("Importuj postęp");
  async function select(name: string) {
    await input.setInputFiles({
      name,
      mimeType: "application/json",
      buffer: Buffer.from(exportState({ ...state, notes: { personal: name } })),
    });
  }
  const confirm = page.getByRole("button", {
    name: "Zastąp postęp tym plikiem",
  });
  await select("first.json");
  await expect(confirm).toBeVisible();
  await select("slow.json");
  await expect(confirm).toHaveCount(0);
  await select("latest.json");
  await expect(confirm).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(new Event("finish-file-read")),
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-slow-read",
    "completed",
  );
  await confirm.click();
  await expect
    .poll(async () => (await saved(page)).notes.personal)
    .toBe("latest.json");
});

test("a late compiler response cannot undo a completed review after leaving and resuming it", async ({
  page,
}) => {
  const state = createInitialState();
  const conceptId = "ownership-repair";
  const step = reviewExercises[conceptId];
  const sessionId = "pending-review";
  state.settings.accessibleEditor = true;
  state.resume.view = "review";
  state.reviewSession = {
    conceptId,
    sessionId,
    mode: "challenge",
    wasDue: true,
    startedAt: Date.now(),
  };
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  let requests = 0;
  await page.route("**/api/run", async (route) => {
    const first = ++requests === 1;
    if (first) await held;
    await route.fulfill({
      json: {
        status: first ? "compile-error" : "success",
        stdout: "",
        stderr: first ? "compile error" : "",
        diagnostics: [],
        durationMs: 1,
        ...(first ? {} : { tests: { passed: 1, failed: 0 } }),
      },
    });
  });
  await restore(page, state);
  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect.poll(() => requests).toBe(1);
  await page.getByRole("button", { name: "Notatnik", exact: true }).click();
  await page.getByRole("button", { name: /^Powtórki/ }).click();
  await page.getByRole("textbox", { name: "Kod Rust" }).fill(step.solution!);
  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await page.getByRole("button", { name: "Zakończ powtórkę" }).click();
  await expect
    .poll(async () => (await saved(page)).reviewSession)
    .toBeUndefined();
  const before = await saved(page);
  expect(before.events.some((e) => e.kind === "recall" && e.passed)).toBe(true);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/run"));
  release();
  await (await response).finished();
  await page.getByRole("button", { name: "Notatnik", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nowa myśl" })
    .fill("Zapis po odpowiedzi");
  await expect
    .poll(async () => (await saved(page)).notes.personal)
    .toBe("Zapis po odpowiedzi");
  const after = await saved(page);
  expect(after.steps).toEqual(before.steps);
  expect(after.events).toEqual(before.events);
  expect(after.review).toEqual(before.review);
});

test("an ownership prediction records independent work before showing compiler output", async ({
  page,
}) => {
  const state = createInitialState();
  const lesson = lessons.find((l) => l.id === "scenario-assessment")!;
  const step = lesson.steps.find((s) => s.id === "assessment-unseen-copy")!;
  const answer = "(8, true) (8, true)";
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: lesson.id,
    stepIndex: lesson.steps.indexOf(step),
  };
  await page.route("**/api/run", (r) =>
    r.fulfill({
      json: {
        status: "success",
        stdout: answer,
        stderr: "",
        diagnostics: [],
        durationMs: 1,
      },
    }),
  );
  await restore(page, state);
  const run = page.getByRole("button", { name: "Uruchom", exact: true });
  await expect(run).toBeDisabled();
  const field = page.getByRole("textbox", { name: "Twoja odpowiedź" });
  await field.fill("0");
  await page.locator(".answer-area button.primary").click();
  await expect(run).toBeEnabled();
  await run.click();
  await expect(
    page
      .locator(".compiler-output")
      .getByText(answer, { exact: true })
      .first(),
  ).toBeVisible();
  await field.fill(answer);
  await page.locator(".answer-area button.primary").click();
  await expect
    .poll(async () =>
      (await saved(page)).events.filter(
        (e) => e.stepId === step.id && e.kind === "prediction" && e.passed,
      ),
    )
    .toEqual([expect.objectContaining({ hints: 1, revealed: false })]);
});
