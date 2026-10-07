import { expect, test, type Browser, type Page } from "@playwright/test";
import { lessons } from "../../src/content/course";
import {
  createInitialState,
  createStepProgress,
} from "../../src/persistence/state";

type BrowserEvents = {
  console: string[];
  pageErrors: string[];
  requestFailed: string[];
};

function captureBrowserEvents(page: Page): BrowserEvents {
  const events: BrowserEvents = {
    console: [],
    pageErrors: [],
    requestFailed: [],
  };
  page.on("console", (message) =>
    events.console.push(`${message.type()}: ${message.text()}`),
  );
  page.on("pageerror", (error) => events.pageErrors.push(error.message));
  page.on("requestfailed", (request) =>
    events.requestFailed.push(
      `${request.url()} ${request.failure()?.errorText ?? ""}`,
    ),
  );
  return events;
}

function assertIntentionalMonacoBlock(events: BrowserEvents): void {
  const hasBlockedLoader = events.requestFailed.some(
    (item) =>
      item.includes("/monaco/vs/loader.js") && item.includes("net::ERR_FAILED"),
  );
  expect(hasBlockedLoader).toBe(true);
  const unexpectedRequestFailures = events.requestFailed.filter(
    (item) =>
      !(
        item.includes("/monaco/vs/loader.js") &&
        item.includes("net::ERR_FAILED")
      ),
  );
  expect(unexpectedRequestFailures).toEqual([]);
  expect(events.pageErrors.filter((message) => message !== "Event")).toEqual(
    [],
  );
  const unexpected = events.console.filter(
    (item) =>
      !item.includes("Service Worker registration blocked by Playwright") &&
      !(
        hasBlockedLoader &&
        item.includes("Failed to load resource: net::ERR_FAILED")
      ) &&
      !(
        hasBlockedLoader && item.includes("Monaco initialization: error: Event")
      ),
  );
  expect(unexpected).toEqual([]);
  if (events.pageErrors.includes("Event")) expect(hasBlockedLoader).toBe(true);
}

async function freshLesson(
  browser: Browser,
  { blockMonaco = true }: { blockMonaco?: boolean } = {},
): Promise<{ page: Page; events: BrowserEvents; close: () => Promise<void> }> {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string" || baseURL.length === 0) {
    throw new Error(
      "production fallback config must provide project.use.baseURL",
    );
  }
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const events = captureBrowserEvents(page);
  if (blockMonaco) await page.route("**/monaco/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).click();
  await page.getByLabel("Kroki lekcji").getByRole("button").nth(1).click();
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  return { page, events, close: () => context.close() };
}

async function freshTomlLesson(
  browser: Browser,
): Promise<{
  page: Page;
  events: BrowserEvents;
  draft: string;
  close: () => Promise<void>;
}> {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string" || baseURL.length === 0) {
    throw new Error(
      "production fallback config must provide project.use.baseURL",
    );
  }
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const lesson = lessons.find(
    (item) => item.id === "cargo-dependency-contract",
  );
  if (!lesson) throw new Error("cargo-dependency-contract fixture is missing");
  const stepIndex = lesson.steps.findIndex((step) => step.id.endsWith("-gate"));
  const step = lesson.steps[stepIndex];
  if (!step || step.editorMode !== "toml")
    throw new Error("TOML gate fixture is missing");
  const draft = `${step.code ?? ""}\n# fallback-owned draft\n`;
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 3,
    recommendation: "memory-intro",
  };
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: lesson.id,
    stepIndex,
    panel: "code",
  };
  state.steps[`${lesson.id}:${step.id}`] = {
    ...createStepProgress(step.code),
    code: draft,
  };
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sprawdź punkt startowy", exact: true }),
  ).toBeVisible();
  await page.evaluate(async (next) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("user-state");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("user-state", "readwrite");
        transaction.objectStore("user-state").put(next, "current");
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, state);
  const events = captureBrowserEvents(page);
  await page.route("**/monaco/**", (route) => route.abort());
  await page.reload();
  return { page, events, draft, close: () => context.close() };
}

test("manual fallback focuses the labeled textarea and preserves the draft", async ({
  browser,
}) => {
  test.setTimeout(45_000);
  const { page, events, close } = await freshLesson(browser);
  try {
    const button = page.getByRole("button", { name: "Otwórz prosty edytor" });
    await button.focus();
    await button.click();
    await expect(
      page.getByRole("textbox", { name: "Kod Rust", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("textbox", { name: "Kod Rust", exact: true }),
    ).toHaveValue(/fn main/);
    assertIntentionalMonacoBlock(events);
  } finally {
    await close();
  }
});

test("clean Monaco path has no console errors, page errors, or failed requests", async ({
  browser,
}) => {
  test.setTimeout(45_000);
  const { page, events, close } = await freshLesson(browser, {
    blockMonaco: false,
  });
  try {
    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 12_000,
    });
    expect(events.console.filter((item) => item.startsWith("error:"))).toEqual(
      [],
    );
    expect(events.pageErrors).toEqual([]);
    expect(events.requestFailed).toEqual([]);
  } finally {
    await close();
  }
});

test("automatic fallback moves focus only when the loading button is removed", async ({
  browser,
}) => {
  test.setTimeout(45_000);
  const { page, events, close } = await freshLesson(browser);
  try {
    await page.getByRole("button", { name: "Otwórz prosty edytor" }).focus();
    await expect(
      page.getByRole("textbox", { name: "Kod Rust", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("textbox", { name: "Kod Rust", exact: true }),
    ).toBeFocused();
    await expect(page.locator(".monaco-fallback-status")).toHaveText(
      "Edytor ładuje się długo. Otworzono prosty edytor tekstowy. Twój szkic został zachowany.",
    );
    assertIntentionalMonacoBlock(events);
  } finally {
    await close();
  }
});

test("automatic fallback preserves outside focus", async ({ browser }) => {
  test.setTimeout(45_000);
  const { page, events, close } = await freshLesson(browser);
  try {
    const outside = page.getByRole("button", {
      name: "Fundamenty Rust",
      exact: true,
    });
    await outside.focus();
    await expect(
      page.getByRole("textbox", { name: "Kod Rust", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(outside).toBeFocused();
    await expect(page.locator(".monaco-fallback-status")).toHaveText(
      /Edytor ładuje się długo/,
    );
    assertIntentionalMonacoBlock(events);
  } finally {
    await close();
  }
});

test("automatic TOML fallback preserves the owned draft and language label", async ({
  browser,
}) => {
  test.setTimeout(45_000);
  const { page, events, draft, close } = await freshTomlLesson(browser);
  try {
    await expect(
      page.getByRole("textbox", { name: "Kod TOML", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("textbox", { name: "Kod TOML", exact: true }),
    ).toHaveValue(draft);
    await expect(page.locator(".monaco-fallback-status")).toHaveText(
      /Edytor ładuje się długo/,
    );
    assertIntentionalMonacoBlock(events);
  } finally {
    await close();
  }
});
