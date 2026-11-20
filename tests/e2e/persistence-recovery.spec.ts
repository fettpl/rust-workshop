import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
} from "../../src/persistence/state";
import type { UserState } from "../../src/domain/types";

async function rawState(page: Page) {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("user-state", "readonly");
          const read = transaction.objectStore("user-state").get("current");
          read.onsuccess = () => resolve(read.result);
          read.onerror = () => reject(read.error);
          transaction.oncomplete = () => db.close();
        };
      }),
  );
}

async function seed(page: Page, state: unknown) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Zrozum kod/ })).toBeVisible();
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
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    state,
  );
  await page.reload();
}

function journalState(): UserState {
  const state = createInitialState();
  state.onboarding.completed = true;
  state.diagnostic.completed = true;
  state.resume.view = "journal";
  state.notes.personal = "original saved note";
  return state;
}

async function unloadIsGuarded(page: Page) {
  return page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

async function exported(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksportuj postęp" }).click();
  return importState(await readFile((await (await download).path())!, "utf8"));
}

test("stale tabs preserve both drafts and recover through deliberate import and reload", async ({
  page,
  context,
}) => {
  await seed(page, journalState());
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByLabel("Nowa myśl")).toHaveValue(
    "original saved note",
  );
  await page.getByLabel("Nowa myśl").fill("first tab draft");
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await other.getByLabel("Nowa myśl").fill("second tab unsaved draft");
  await expect(other.locator(".save-status")).toHaveText(
    "Zapis nie powiódł się",
  );
  expect(((await rawState(page)) as UserState).notes.personal).toBe(
    "first tab draft",
  );
  expect(await unloadIsGuarded(other)).toBe(true);
  await other.getByRole("button", { name: "Ustawienia i postęp" }).click();
  expect((await exported(other)).notes.personal).toBe(
    "second tab unsaved draft",
  );
  const replacement = journalState();
  replacement.notes.personal = "intentionally imported draft";
  await other.getByLabel("Importuj postęp").setInputFiles({
    name: "recovery.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportState(replacement)),
  });
  await other
    .getByRole("button", { name: "Zastąp postęp tym plikiem" })
    .click();
  await expect(other.getByLabel("Nowa myśl")).toHaveValue(
    "intentionally imported draft",
  );
  await expect(other.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  expect(await unloadIsGuarded(other)).toBe(false);
  await other.getByLabel("Nowa myśl").fill("continued imported draft");
  await expect(other.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(page.getByLabel("Nowa myśl")).toHaveValue(
    "continued imported draft",
  );
  await page.getByLabel("Nowa myśl").fill("edit after reload");
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  expect(((await rawState(page)) as UserState).notes.personal).toBe(
    "edit after reload",
  );
});

test("failed saves keep the unload guard and exact export until a later successful save", async ({
  page,
}) => {
  await seed(page, journalState());
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    const scope = window as typeof window & { failStateWrites: boolean };
    scope.failStateWrites = true;
    IDBObjectStore.prototype.put = function (...args) {
      if (scope.failStateWrites && this.name === "user-state")
        throw new DOMException("quota exhausted", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
  await page.getByLabel("Nowa myśl").fill("unsaved quota draft");
  await expect(page.locator(".save-status")).toHaveText(
    "Zapis nie powiódł się",
  );
  expect(await unloadIsGuarded(page)).toBe(true);
  expect(((await rawState(page)) as UserState).notes.personal).toBe(
    "original saved note",
  );
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  expect((await exported(page)).notes.personal).toBe("unsaved quota draft");
  await page.evaluate(() => {
    (window as typeof window & { failStateWrites: boolean }).failStateWrites =
      false;
  });
  await page.getByRole("button", { name: "Notatnik", exact: true }).click();
  await page.getByLabel("Nowa myśl").fill("recovered saved draft");
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  expect(await unloadIsGuarded(page)).toBe(false);
  expect(((await rawState(page)) as UserState).notes.personal).toBe(
    "recovered saved draft",
  );
});

test("read failure preserves raw records and guards edits made in the memory-only session", async ({
  page,
}) => {
  const future = {
    schemaVersion: 99,
    notes: { personal: "future saved draft" },
  };
  await seed(page, future);
  await expect(page.locator(".global-alert")).toContainText(
    "Nie udało się odczytać zapisu",
  );
  expect(await unloadIsGuarded(page)).toBe(false);
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  expect(await unloadIsGuarded(page)).toBe(true);
  expect(await rawState(page)).toEqual(future);
});

for (const schemaVersion of [1, 2, 3] as const) {
  test(`restores IndexedDB v${schemaVersion} and exports exact historical drafts and evidence`, async ({
    page,
  }) => {
    const state = journalState();
    state.resume.panel = "output";
    state.resume.focus = true;
    state.steps["historical:unknown-step"] = {
      ...createStepProgress("// exact historical draft\n"),
      answer: "exact historical answer",
      hints: 2,
      revealed: true,
      attempts: [
        {
          at: 10,
          code: "// old attempt",
          passed: false,
          feedback: "old feedback",
        },
      ],
    };
    state.events = [
      {
        id: "historical-independent-id",
        conceptIds: ["old-concept"],
        lessonId: "historical",
        stepId: "old-task",
        kind: "assessment",
        passed: true,
        hints: 0,
        revealed: false,
        at: 11,
        gate: true,
        evaluator: "tests",
        evidenceVersion: 1,
      },
      {
        id: "historical-assisted-id",
        conceptIds: ["old-concept"],
        lessonId: "historical",
        stepId: "assisted-task",
        kind: "fix",
        passed: true,
        hints: 2,
        revealed: true,
        at: 12,
      },
    ];
    state.bookmarks = ["historical:unknown-step"];
    state.reviewSession = {
      conceptId: "old-concept",
      mode: "challenge",
      sessionId: "historical-session",
      startedAt: 13,
      wasDue: true,
    };
    const raw: Record<string, unknown> = { ...state, schemaVersion };
    if (schemaVersion !== 3)
      raw.onboarding = { ...state.onboarding, background: "python" };
    if (schemaVersion === 1) delete raw.routePreference;
    await seed(page, raw);
    await expect(page.getByLabel("Nowa myśl")).toHaveValue(
      "original saved note",
    );
    // A read must not silently rewrite older data or manufacture evidence.
    expect(await rawState(page)).toEqual(raw);
    await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
    const backup = await exported(page);
    expect(backup.schemaVersion).toBe(3);
    expect(backup.steps).toEqual(state.steps);
    expect(backup.events).toEqual(state.events);
    expect(backup.notes).toEqual(state.notes);
    expect(backup.bookmarks).toEqual(state.bookmarks);
    expect(backup.reviewSession).toEqual(state.reviewSession);
    expect(backup.resume.panel).toBe("output");
    expect(backup.resume.focus).toBe(true);
    expect(backup.onboarding).not.toHaveProperty("background");
    await expect(page.locator(".save-status")).toHaveText(
      "Zapisano na tym urządzeniu",
    );
    const persisted = (await rawState(page)) as UserState;
    expect(persisted.schemaVersion).toBe(3);
    expect(persisted.events).toEqual(state.events);
    expect(persisted.steps).toEqual(state.steps);
  });
}
