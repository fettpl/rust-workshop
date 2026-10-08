import { expect, test, type Page } from "@playwright/test";
import {
  createInitialState,
  createStepProgress,
} from "../../src/persistence/state";
import { reviewSessionKey } from "../../src/engine/review-session";
import {
  reviewExercises,
  shortReviewExercises,
} from "../../src/content/course";
import type { UserState } from "../../src/domain/types";

const DAY = 24 * 60 * 60 * 1000;

function readyReviewState(): UserState {
  const state = createInitialState();
  state.onboarding = {
    completed: true,
    name: "Ada",
    minutes: 15,
  };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 3,
    recommendation: "memory-intro",
  };
  state.resume = {
    ...state.resume,
    view: "review",
  };
  state.settings = { ...state.settings, accessibleEditor: true };
  return state;
}

async function mockReviewRunner(page: Page): Promise<void> {
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON() as {
      code?: string;
      mode?: string;
    };
    const code = request.code ?? "";
    const broken =
      code.includes("show(text);") ||
      code === shortReviewExercises["io-format-roundtrip"].code;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        broken
          ? {
              status: "compile-error",
              stdout: "",
              stderr:
                "error[E0382]: borrow of moved value: `text`\n --> review.rs:3:13",
              diagnostics: [
                {
                  code: "E0382",
                  message: "borrow of moved value",
                  line: 3,
                  level: "error",
                },
              ],
              durationMs: 4,
            }
          : {
              status: "success",
              stdout: "",
              stderr: "",
              diagnostics: [],
              durationMs: 4,
              ...(request.mode === "test"
                ? { tests: { passed: 1, failed: 0 } }
                : {}),
            },
      ),
    });
  });
}

async function seedState(page: Page, state: UserState): Promise<void> {
  await page.goto("/");
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

async function readStoredState(page: Page): Promise<UserState> {
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("user-state", "readonly");
          const read = transaction.objectStore("user-state").get("current");
          read.onerror = () => reject(read.error);
          read.onsuccess = () => {
            database.close();
            resolve(read.result as UserState);
          };
        };
      }),
  );
}

test("serves a due review as delayed recall and schedules the next attempt after success", async ({
  page,
}) => {
  const state = readyReviewState();
  const now = Date.now();
  state.review = [
    {
      conceptId: "move-semantics",
      dueAt: now - DAY,
      intervalDays: 1,
      attempts: 1,
      reason: "Powtórka oczekuje.",
    },
  ];

  await seedState(page, state);

  await expect(
    page.getByRole("heading", { name: "Co zostało w pamięci?" }),
  ).toBeVisible();
  await expect(
    page.locator(".review-row").filter({ hasText: "Semantyka move" }),
  ).toBeVisible();
  await page
    .locator(".review-row")
    .filter({ hasText: "Semantyka move" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Powtórka: przeniesiony String" }),
  ).toBeVisible();

  await page.getByRole("textbox").fill("moved");
  await page.getByRole("button", { name: "Sprawdź" }).click();
  await expect(page.getByText("Na dziś nic nie czeka.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Po przerwie" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText("Na dziś nic nie czeka.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Po przerwie" }),
  ).toBeVisible();
});

test("does not expose rating controls after a completed review challenge", async ({
  page,
}) => {
  await seedState(page, readyReviewState());

  await page
    .locator(".review-concept")
    .filter({ hasText: "Semantyka move" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Powtórka: przeniesiony String" }),
  ).toBeVisible();
  await page.getByRole("textbox").fill("moved");
  await page.getByRole("button", { name: "Sprawdź" }).click();

  await expect(
    page.getByRole("heading", { name: "Po przerwie" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Again|Hard|Good|Easy/ }),
  ).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Po przerwie" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Again|Hard|Good|Easy/ }),
  ).toHaveCount(0);
});

test("resumes an unfinished review answer after reload", async ({ page }) => {
  const state = readyReviewState();
  const sessionId = "unfinished-review";
  state.reviewSession = {
    conceptId: "move-semantics",
    mode: "challenge",
    sessionId,
    startedAt: Date.now() - 5 * 60 * 1000,
    wasDue: true,
  };
  state.steps[reviewSessionKey(sessionId)] = {
    ...createStepProgress(),
    answer: "only moved",
  };

  await seedState(page, state);

  const answer = page.getByRole("textbox");
  await expect(
    page.getByRole("heading", { name: "Powtórka: przeniesiony String" }),
  ).toBeVisible();
  await expect(answer).toHaveValue("only moved");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Powtórka: przeniesiony String" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("only moved");
});

test("keeps compiler output, code, and successful review evidence across reload", async ({
  page,
}) => {
  await mockReviewRunner(page);
  const state = readyReviewState();
  const now = Date.now();
  state.review = [
    {
      conceptId: "ownership-repair",
      dueAt: now - DAY,
      intervalDays: 1,
      attempts: 1,
      reason: "Napraw granicę odczytu.",
    },
  ];
  await seedState(page, state);

  await page
    .locator(".review-row")
    .filter({ hasText: "Wybór naprawy własności" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Powtórka: napraw granicę odczytu" }),
  ).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Kod Rust" });
  await expect(editor).toBeVisible();
  const starter = await editor.inputValue();

  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect(page.getByText("Błąd kompilacji")).toBeVisible();
  await expect(page.getByText(/E0382/)).toBeVisible();
  await expect(editor).toHaveValue(starter);

  const solution = starter
    .replace("show(text);", "show(&text);")
    .replace("fn show(value: String)", "fn show(value: &str)");
  await editor.fill(solution);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Powtórka: napraw granicę odczytu" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveValue(
    solution,
  );
  await expect(
    page.getByText(/Output pochodzi z poprzedniej wersji/),
  ).toBeVisible();
  await expect(page.getByText(/E0382/)).toBeVisible();

  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect(page.getByText("Kod działa.")).toBeVisible();
  const runButton = page.getByRole("button", { name: "Uruchom testy" });
  await expect(runButton).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Kod Rust" }),
  ).not.toBeEditable();
  await expect(
    page.getByRole("button", { name: "Zakończ powtórkę" }),
  ).toBeVisible();
  await expect(
    page.getByText("Wszystkie testy zakończyły się powodzeniem."),
  ).toBeVisible();
  await expect(runButton).toBeDisabled();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveValue(
    solution,
  );
  await expect(
    page.getByText("Wszystkie testy zakończyły się powodzeniem."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zakończ powtórkę" }).click();
  await expect(
    page.getByRole("heading", { name: "Po przerwie" }),
  ).toBeVisible();
  await expect(
    page.locator(".upcoming").getByText("Wybór naprawy własności"),
  ).toBeVisible();
});

test("runs an executable macro coding review from an empty editor", async ({
  page,
}) => {
  await mockReviewRunner(page);
  await seedState(page, readyReviewState());

  await page
    .locator(".review-concept")
    .filter({ hasText: "Przechwycenie wyrażenia i dokładnie jedno obliczenie" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Powtórka: pojedynczy odczyt",
    }),
  ).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Kod Rust" });
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue("");
  await editor.fill(reviewExercises["macros-exactly-once"].solution!);
  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect(page.getByText("Kod działa.")).toBeVisible();
  await expect(
    page.getByText("Wszystkie testy zakończyły się powodzeniem."),
  ).toBeVisible();
});

test("runs an executable API release retrieval from an empty editor", async ({
  page,
}) => {
  await mockReviewRunner(page);
  await seedState(page, readyReviewState());

  await page
    .locator(".review-concept")
    .filter({ hasText: "Stara publiczna ścieżka i obserwowalne zachowanie" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Powtórka: status sondy" }),
  ).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Kod Rust" });
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue("");
  await editor.fill(reviewExercises["api-release-old-contracts"].solution!);
  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect(page.getByText("Kod działa.")).toBeVisible();
  await expect(
    page.getByText("Wszystkie testy zakończyły się powodzeniem."),
  ).toBeVisible();
});

test("defaults I/O practice to a short probe and preserves an unrated queue", async ({
  page,
}) => {
  await mockReviewRunner(page);
  const state = readyReviewState();
  const now = Date.now();
  state.review = [
    {
      conceptId: "io-format-roundtrip",
      dueAt: now + DAY,
      intervalDays: 2,
      attempts: 3,
      reason: "Pełny kontrakt wróci później.",
    },
  ];
  await seedState(page, state);

  await page
    .locator(".review-concept")
    .filter({ hasText: "Wersjonowany format i pełny round trip" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rozpoznaj dokładną flagę zakończenia" }),
  ).toBeVisible();
  await expect(page.getByText("Krótka decyzja — cel 1–3 min")).toBeVisible();

  const editor = page.getByRole("textbox", { name: "Kod Rust" });
  await editor.fill(shortReviewExercises["io-format-roundtrip"].solution!);
  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect(page.getByText("Kod działa.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Again|Hard|Good|Easy/ }),
  ).toHaveCount(4);

  await page.getByRole("button", { name: "← Do kolejki" }).click();
  await expect(
    page
      .locator(".upcoming")
      .getByText("Wersjonowany format i pełny round trip"),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator(".upcoming")
      .getByText("Wersjonowany format i pełny round trip"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rozpoznaj dokładną flagę zakończenia" }),
  ).toHaveCount(0);
});

test("keeps the extended I/O review reachable by explicit selection", async ({
  page,
}) => {
  await seedState(page, readyReviewState());
  const choice = page
    .locator(".review-choice")
    .filter({ hasText: "Wersjonowany format i pełny round trip" });
  await choice
    .getByRole("button", { name: "Dłuższe odtworzenie kontraktu" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Odtwórz format notatnika po przerwie" }),
  ).toBeVisible();
  await expect(page.getByText("Dłuższe odtworzenie kontraktu")).toBeVisible();
});

test("keeps a failed short exposure queued after a later pass and unrated exit", async ({
  page,
}) => {
  await mockReviewRunner(page);
  await seedState(page, readyReviewState());
  await page
    .locator(".review-concept")
    .filter({ hasText: "Wersjonowany format i pełny round trip" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rozpoznaj dokładną flagę zakończenia" }),
  ).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Kod Rust" });
  await editor.fill(shortReviewExercises["io-format-roundtrip"].code!);
  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect(page.getByText("Błąd kompilacji")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Rozpoznaj dokładną flagę zakończenia" }),
  ).toBeVisible();
  const afterFailure = await readStoredState(page);
  expect(afterFailure.events.at(-1)).toMatchObject({
    conceptIds: ["io-format-roundtrip"],
    kind: "exposure",
    passed: false,
    delayed: false,
  });
  expect(afterFailure.review).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ conceptId: "io-format-roundtrip" }),
    ]),
  );
  await page
    .getByRole("textbox", { name: "Kod Rust" })
    .fill(shortReviewExercises["io-format-roundtrip"].solution!);
  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect(page.getByText("Kod działa.")).toBeVisible();
  await page.getByRole("button", { name: "← Do kolejki" }).click();
  const afterUnratedExit = await readStoredState(page);
  expect(afterUnratedExit.review).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ conceptId: "io-format-roundtrip" }),
    ]),
  );
  await page.reload();
  const afterReload = await readStoredState(page);
  expect(afterReload.review).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ conceptId: "io-format-roundtrip" }),
    ]),
  );
});

test("requires an explicit rating before scheduling a short probe", async ({
  page,
}) => {
  await mockReviewRunner(page);
  await seedState(page, readyReviewState());
  await page
    .locator(".review-concept")
    .filter({ hasText: "Błąd odczytu i etapowany zapis" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Odróżnij brak pliku od awarii" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Kod Rust" })
    .fill(shortReviewExercises["io-safe-persistence"].solution!);
  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect(page.getByText("Kod działa.")).toBeVisible();
  await page.getByRole("button", { name: "Good · Dobrze" }).click();
  await expect(
    page.locator(".upcoming").getByText("Błąd odczytu i etapowany zapis"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Again|Hard|Good|Easy/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator(".upcoming").getByText("Błąd odczytu i etapowany zapis"),
  ).toBeVisible();
});
