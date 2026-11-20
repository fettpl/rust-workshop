import { expect, test, type Page } from "@playwright/test";
import {
  createInitialState,
  createStepProgress,
} from "../../src/persistence/state";
import {
  concepts,
  reviewExercises,
  shortReviewExercises,
} from "../../src/content/course";
import { reviewSessionKey } from "../../src/engine/review-session";
import type { UserState } from "../../src/domain/types";

function ready(): UserState {
  const state = createInitialState();
  state.onboarding.completed = true;
  state.diagnostic.completed = true;
  state.resume.view = "review";
  state.settings.accessibleEditor = true;
  return state;
}

async function seed(page: Page, state: UserState) {
  await page.goto("/");
  await page.evaluate(
    async (value) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("user-state");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("user-state", "readwrite");
          tx.objectStore("user-state").put(value, "current");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    state,
  );
  await page.reload();
}

async function stored(page: Page): Promise<UserState> {
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("user-state");
          const read = tx.objectStore("user-state").get("current");
          read.onerror = () => reject(read.error);
          read.onsuccess = () => resolve(read.result);
          tx.oncomplete = () => db.close();
        };
      }),
  );
}

for (const equalTime of [false, true]) {
  test(`a legacy rated session with missing completion stays read-only (${equalTime ? "same time" : "later rating"})`, async ({
    page,
  }) => {
    const state = ready();
    const conceptId = "move-semantics";
    state.reviewSession = {
      conceptId,
      mode: "card",
      sessionId: "legacy-rated",
      startedAt: 100,
      wasDue: true,
    };
    state.ratings = [{ conceptId, rating: "good", at: equalTime ? 100 : 101 }];
    state.steps[reviewSessionKey("legacy-rated")] = {
      ...createStepProgress(),
      answer: "saved explanation",
      revealed: true,
    };
    state.review = [
      { conceptId, dueAt: 500, intervalDays: 4, attempts: 1, reason: "rated" },
    ];
    await seed(page, state);
    await expect(
      page.getByRole("button", { name: "Good · Dobrze" }),
    ).toBeDisabled();
    await expect(page.getByRole("textbox")).toBeDisabled();
    await page.getByRole("button", { name: "← Do kolejki" }).click();
    await expect
      .poll(async () => (await stored(page)).reviewSession)
      .toBeUndefined();
    const after = await stored(page);
    expect(after.ratings).toEqual(state.ratings);
    expect(after.steps).toEqual(state.steps);
    expect(after.events).toEqual(state.events);
    expect(after.review).toEqual(state.review);
  });
}

test("a rated restored short probe cannot rate again or capture the next explicit start", async ({
  page,
}) => {
  const state = ready();
  const conceptId = "io-format-roundtrip";
  const exercise = shortReviewExercises[conceptId];
  const sessionId = "rated-probe";
  state.reviewSession = {
    conceptId,
    exerciseId: exercise.id,
    mode: "challenge",
    sessionId,
    startedAt: 100,
    wasDue: true,
  };
  state.ratings = [{ conceptId, rating: "good", at: 101 }];
  state.steps[reviewSessionKey(sessionId)] = {
    ...createStepProgress(exercise.solution),
    completed: true,
    attempts: [
      {
        at: 100,
        code: exercise.solution,
        passed: true,
        feedback: "saved success",
        result: {
          status: "success",
          stdout: "",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
          tests: { passed: 1, failed: 0 },
        },
      },
    ],
  };
  await seed(page, state);
  await expect(
    page.getByRole("heading", { name: exercise.title, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Good · Dobrze" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "← Do kolejki" }).click();
  await page
    .getByRole("button", {
      name:
        concepts.find((concept) => concept.id === conceptId)!.title +
        " · krótka decyzja",
      exact: true,
    })
    .click();
  await expect
    .poll(async () => (await stored(page)).reviewSession?.sessionId)
    .not.toBe(sessionId);
  expect((await stored(page)).ratings).toEqual(state.ratings);
});

for (const priorAt of ["same-time", "future"] as const) {
  test(`a fresh ordinary session can rate despite an older ${priorAt} rating`, async ({
    page,
  }) => {
    const state = ready();
    const conceptId = "move-semantics";
    const now = 1_800_000_000_000;
    state.ratings = [
      {
        conceptId,
        rating: "good",
        at: priorAt === "same-time" ? now : now + 86_400_000,
      },
    ];
    await page.clock.install({ time: now });
    await page.clock.pauseAt(now);
    await seed(page, state);
    await page
      .getByRole("button", {
        name: concepts.find((concept) => concept.id === conceptId)!.title,
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Karta przypomnienia", exact: true })
      .click();
    await page.getByRole("textbox").fill("A value has one owner.");
    await page
      .getByRole("button", { name: "Odsłoń odpowiedź", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Good · Dobrze" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Good · Dobrze" }).click();
    await expect.poll(async () => (await stored(page)).ratings.length).toBe(2);
    expect((await stored(page)).ratings[0]).toEqual(state.ratings[0]);
  });
}

test("a legacy rated executable session cannot submit new recall evidence", async ({
  page,
}) => {
  const state = ready();
  const conceptId = "ownership-repair";
  const exercise = reviewExercises[conceptId];
  const sessionId = "rated-executable";
  state.reviewSession = {
    conceptId,
    exerciseId: exercise.id,
    mode: "challenge",
    sessionId,
    startedAt: 100,
    wasDue: true,
  };
  state.ratings = [{ conceptId, rating: "good", at: 101 }];
  state.steps[reviewSessionKey(sessionId)] = createStepProgress(
    exercise.solution,
  );
  await seed(page, state);
  await expect(
    page.getByRole("heading", { name: exercise.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Uruchom testy", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "← Do kolejki" }).click();
  await expect
    .poll(async () => (await stored(page)).reviewSession)
    .toBeUndefined();
  const after = await stored(page);
  expect(after.events).toEqual([]);
  expect(after.steps).toEqual(state.steps);
  expect(after.ratings).toEqual(state.ratings);
});
