import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { lessons, modules, projects } from "../../src/content/course";
import { reviewSessionKey } from "../../src/engine/review-session";
import { createStepProgress } from "../../src/persistence/state";
import type { ReviewSession, UserState } from "../../src/domain/types";

async function registerReviewSessions(
  page: import("@playwright/test").Page,
  sessions: ReviewSession[],
): Promise<void> {
  const records = sessions.map((session) => ({
    key: reviewSessionKey(session.sessionId),
    progress: createStepProgress(),
    session,
  }));
  await page.evaluate(async (next) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const read = database
          .transaction("user-state", "readonly")
          .objectStore("user-state")
          .get("current");
        read.onerror = () => reject(read.error);
        read.onsuccess = () => {
          const state = read.result;
          const transaction = database.transaction("user-state", "readwrite");
          transaction.objectStore("user-state").put(
            {
              ...state,
              reviewSession: next[0].session,
              steps: {
                ...state.steps,
                ...Object.fromEntries(
                  next.map(({ key, progress }) => [key, progress]),
                ),
              },
            },
            "current",
          );
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      };
    });
  }, records);
  await page.reload();
}

test("capstone search, mocked gate attempt, resume and package exposure", async ({
  page,
}) => {
  const requests: { code: string; mode: string; tests?: string }[] = [];
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON();
    requests.push(request);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "test-failure",
        stdout:
          "test result: FAILED. 0 passed; 1 failed; assertion failed: domain boundary",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 0, failed: 1 },
      }),
    });
  });

  const capstoneModule = modules.find(
    (item) => item.id === "capstone-integration",
  )!;
  const capstoneTitle = "Capstone: trwały serwis logów";
  expect(capstoneModule).toBeTruthy();
  const lesson = lessons.find(
    (item) => item.id === "capstone-domain-boundary",
  )!;
  const gate = lesson.steps.find(
    (step) => step.id === "capstone-domain-validate",
  )!;
  const gateIndex = lesson.steps.indexOf(gate);
  const project = projects.find((item) => item.id === "durable-log-service")!;
  const archive = project.package!;
  const reviewSessions: ReviewSession[] = (project.reviewConceptIds ?? []).map(
    (conceptId, index) => ({
      conceptId,
      mode: "challenge",
      sessionId: `capstone-review-${index + 1}`,
      startedAt: 1_000_000 + index,
      wasDue: false,
    }),
  );
  expect(reviewSessions).toHaveLength(6);

  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await registerReviewSessions(page, reviewSessions);
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  const search = page.getByRole("searchbox", {
    name: "Znajdź moduł lub temat",
  });
  await search.fill("trwaly serwis");
  await expect(
    page.locator(".module-picker > button").filter({ hasText: capstoneTitle }),
  ).toHaveCount(1);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: capstoneTitle })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(gateIndex)
    .click();
  await page
    .getByRole("button", { name: /Monaco Editor|Prosty edytor/ })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(gate.code!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByText("Testy ujawniły problem", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ mode: "test", code: gate.code });
  expect(requests[0].tests).toContain("validates_domain_boundaries");

  const draft = `${gate.code}\n// szkic granicy zachowany po próbie runnera.\n`;
  await editor.fill(draft);
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page
    .getByLabel("Notatki do lekcji")
    .fill("Najpierw waliduję bajty i alfabet, potem zapisuję zdarzenie.");
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(gate.title);
  await expect(editor).toHaveValue(draft);
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(
    "Najpierw waliduję bajty i alfabet, potem zapisuję zdarzenie.",
  );

  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const picker = page.getByRole("navigation", { name: "Wybierz projekt" });
  await picker.getByRole("button", { name: project.title }).click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  const starterDownload = page.waitForEvent("download");
  await panel.getByRole("link", { name: "Pobierz pakiet startowy" }).click();
  const starter = await starterDownload;
  expect(await starter.failure()).toBeNull();
  expect(
    Object.keys(unzipSync(await readFile((await starter.path())!))).sort(),
  ).toEqual(archive.files.map((file) => `${archive.id}/${file.path}`).sort());

  await panel
    .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
    .click();
  await expect(
    panel.getByRole("link", { name: "Pobierz rozwiązanie" }),
  ).toBeVisible();
  const solutionDownload = page.waitForEvent("download");
  await panel.getByRole("link", { name: "Pobierz rozwiązanie" }).click();
  const solution = await solutionDownload;
  expect(await solution.failure()).toBeNull();
  expect(
    Object.keys(unzipSync(await readFile((await solution.path())!))).sort(),
  ).toEqual(archive.files.map((file) => `${archive.id}/${file.path}`).sort());
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  const primaryKeys = archive.revealStepRefs.map(
    (ref) => `${ref.lessonId}:${ref.stepId}`,
  );
  const blankKeys = [
    "capstone-domain-boundary:capstone-domain-blank",
    "capstone-idempotent-commit:capstone-commit-blank",
    "capstone-bounded-lifecycle:capstone-lifecycle-blank",
    "capstone-protocol-evolution:capstone-protocol-blank",
    "capstone-incident-recovery:capstone-incident-blank",
    "capstone-release-evidence:capstone-release-blank",
  ];
  const persistedExposure = await page.evaluate(
    async ({ primary, blank, sessions }) => {
      const state = await new Promise<UserState>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const get = request.result
            .transaction("user-state", "readonly")
            .objectStore("user-state")
            .get("current");
          get.onerror = () => reject(get.error);
          get.onsuccess = () => resolve(get.result);
        };
      });
      return {
        primary: primary.map((key) => Boolean(state.steps?.[key]?.revealed)),
        blank: blank.map((key) => Boolean(state.steps?.[key]?.revealed)),
        reviews: sessions.map(({ key, session }) => ({
          exposure: state.events?.some(
            (event: {
              lessonId?: string;
              stepId?: string;
              revealed?: boolean;
            }) =>
              event.lessonId === "review" &&
              event.stepId === key &&
              event.revealed === true,
          ),
          progressExists: Boolean(state.steps?.[key]),
          revealed: Boolean(state.steps?.[key]?.revealed),
          sessionId: session.sessionId,
        })),
        activeReviewSessionId: state.reviewSession?.sessionId,
      };
    },
    {
      primary: primaryKeys,
      blank: blankKeys,
      sessions: reviewSessions.map((session) => ({
        key: reviewSessionKey(session.sessionId),
        session,
      })),
    },
  );
  expect(persistedExposure.primary).toEqual(primaryKeys.map(() => true));
  expect(persistedExposure.blank).toEqual(blankKeys.map(() => false));
  expect(persistedExposure.activeReviewSessionId).toBe(
    reviewSessions[0].sessionId,
  );
  expect(persistedExposure.reviews).toEqual(
    reviewSessions.map((session) => ({
      exposure: false,
      progressExists: true,
      revealed: false,
      sessionId: session.sessionId,
    })),
  );
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await search.fill("trwaly serwis");
  await page
    .locator(".module-picker > button")
    .filter({ hasText: capstoneTitle })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(gateIndex)
    .click();
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .filter({ hasText: "Od pustej kartki" })
    .click();
  await expect(page.locator("textarea.code-textarea")).toHaveValue("");
});
