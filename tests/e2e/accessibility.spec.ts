import { test, expect, type Browser, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function freshLessonPage(
  browser: Browser,
  viewport = { width: 390, height: 844 },
): Promise<{
  page: Page;
  setOffline: (offline: boolean) => Promise<void>;
  close: () => Promise<void>;
}> {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string" || baseURL.length === 0) {
    throw new Error("production accessibility config must provide project.use.baseURL");
  }
  const context = await browser.newContext({ baseURL, viewport });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).click();
  return {
    page,
    setOffline: (offline: boolean) => context.setOffline(offline),
    close: () => context.close(),
  };
}

test("mobile workspace tabs resolve tabpanels and expose only the selected panel", async ({
  browser,
}) => {
  test.setTimeout(45_000);
  const { page, close } = await freshLessonPage(browser);
  try {
    for (const tab of await page.getByRole("tab").all()) {
      const tabId = await tab.getAttribute("id");
      const panelId = await tab.getAttribute("aria-controls");
      expect(tabId).toMatch(/^workspace-tab-/);
      expect(panelId).toMatch(/^workspace-panel-/);
      const panel = page.locator(`#${panelId}`);
      await expect(panel).toHaveAttribute("role", "tabpanel");
      await expect(panel).toHaveAttribute("aria-labelledby", tabId!);
    }
    await page.route("**/api/run", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          stdout: "workspace mocked stdout\n",
          stderr: "workspace mocked stderr\n",
          diagnostics: [],
          durationMs: 7,
        }),
      });
    });
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(1).click();
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await page.getByRole("button", { name: "Uruchom", exact: true }).click();
    await expect(page.locator("#workspace-output")).toContainText(
      "Wykonano poprawnie",
    );
    await expect(page.locator("#workspace-output")).toContainText(
      "workspace mocked stdout",
    );
    await expect(page.locator("#workspace-output")).toContainText(
      "workspace mocked stderr",
    );
    await expect(page.locator("#workspace-panel-code")).toBeVisible();
    await expect(page.locator("#workspace-panel-lesson")).toBeHidden();
    for (const [selector, expected] of [
      ["#workspace-panel-lesson", false],
      ["#workspace-panel-code", true],
      ["#workspace-panel-output", false],
    ] as const) {
      const rect = await page.locator(selector).evaluate((element) => {
        const { width, height } = element.getBoundingClientRect();
        return width > 0 && height > 0;
      });
      expect(rect, selector).toBe(expected);
    }
    await page.getByRole("tab", { name: /Output/ }).click();
    await expect(page.locator("#workspace-output")).toBeVisible();
    await expect(
      page.locator(".output-content[aria-live='polite']"),
    ).toHaveCount(1);
    await expect(page.locator("#workspace-panel-code")).toBeHidden();
    for (const [selector, expected] of [
      ["#workspace-panel-lesson", false],
      ["#workspace-panel-code", false],
      ["#workspace-panel-output", true],
    ] as const) {
      const rect = await page.locator(selector).evaluate((element) => {
        const { width, height } = element.getBoundingClientRect();
        return width > 0 && height > 0;
      });
      expect(rect, selector).toBe(expected);
    }
  } finally {
    await close();
  }
});

test("desktop workspace keeps three visible named panels with the hidden tablist relation", async ({
  browser,
}) => {
  test.setTimeout(45_000);
  const { page, close } = await freshLessonPage(browser, {
    width: 1280,
    height: 900,
  });
  try {
    await expect(page.locator(".mobile-workspace-tabs")).toBeHidden();
    for (const [panelId, tabLabel] of [
      ["workspace-panel-lesson", "Zadanie"],
      ["workspace-panel-code", "Kod"],
      ["workspace-panel-output", /Output/],
    ] as const) {
      const panel = page.locator(`#${panelId}`);
      const tabId = await panel.getAttribute("aria-labelledby");
      expect(tabId).toBeTruthy();
      await expect(page.locator(`#${tabId!}`)).toContainText(tabLabel);
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("role", "tabpanel");
      await expect(panel).toHaveAccessibleName(tabLabel);
      const rect = await panel.evaluate((element) => {
        const { width, height } = element.getBoundingClientRect();
        return width > 0 && height > 0;
      });
      expect(rect, panelId).toBe(true);
    }
    await expect(page.locator("#workspace-output")).toBeVisible();
  } finally {
    await close();
  }
});

test("no-code workspace step omits the tabpanel relation without a dangling tab", async ({ browser }) => {
  test.setTimeout(45_000);
  const { page, close } = await freshLessonPage(browser);
  try {
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(2).click();
    await expect(page.locator(".mobile-workspace-tabs")).toHaveCount(0);
    const lessonPanel = page.locator("#workspace-panel-lesson");
    await expect(lessonPanel).toBeVisible();
    await expect(lessonPanel).toHaveAttribute("aria-label", "Zadanie");
    await expect(lessonPanel).not.toHaveAttribute("role", "tabpanel");
    await expect(lessonPanel).not.toHaveAttribute("aria-labelledby");
  } finally {
    await close();
  }
});

test("key screens have no automated accessibility violations", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).waitFor();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  for (const name of [
    "Twój warsztat",
    "Mapa nauki",
    "Powtórki",
    "Projekt",
    "Notatnik",
    "Ustawienia i postęp",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations, name).toEqual(
      [],
    );
  }
});

test("skip navigation and mobile workspace work with keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).waitFor();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Przejdź do treści" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Zadanie", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Output", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Włącz ciemny motyw" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("mobile navigation enters and cycles the complete sidebar-trigger perimeter", async ({ browser }) => {
  test.setTimeout(45_000);
  const { page, close } = await freshLessonPage(browser);
  try {
    const trigger = page.locator("button.mobile-menu");
    const sidebar = page.locator("#mobile-navigation");
    await trigger.focus();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveAttribute("aria-controls", "mobile-navigation");
    await expect(trigger).toHaveAccessibleName("Zamknij nawigację");
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator("nav button").first()).toBeFocused();
    for (const selector of ["#main-content", ".skip-link"]) {
      await expect(page.locator(selector).first()).toHaveAttribute("inert", "");
    }
    for (const action of await page.locator(".topbar-actions > button").all()) {
      await expect(action).toHaveAttribute("inert", "");
    }
    await expect(page.locator("button.mobile-menu")).not.toHaveAttribute("inert", "");
    const lastSidebarButton = sidebar.locator("button").last();
    await lastSidebarButton.focus();
    await page.keyboard.press("Tab");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(sidebar.locator("button").first()).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(trigger).toBeFocused();
    await trigger.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(lastSidebarButton).toBeFocused();
  } finally {
    await close();
  }
});

test("mobile persistence exposes one quiet save status live node", async ({
  browser,
}) => {
  test.setTimeout(45_000);
  const { page, setOffline, close } = await freshLessonPage(browser);
    const savedText = "Zapisano na tym urządzeniu";
  try {
    const live = page.locator(".save-live");
    await expect(live).toHaveCount(1);
    await expect(live).toHaveAttribute("role", "status");
    await expect(live).toHaveAttribute("aria-live", "polite");
    await expect(live).toHaveAttribute("aria-atomic", "true");

    await page.locator("button.mobile-menu").click();
    await expect(live).not.toHaveAttribute("inert", "");
    for (const selector of [".save-status", ".save-live", ".offline-banner"]) {
      const node = page.locator(selector);
      if (await node.count()) {
        expect(
          await node.first().evaluate((element) => element.closest("[inert]")),
          selector,
        ).toBeNull();
      }
    }
    await setOffline(true);
    await expect(page.locator(".offline-banner")).toBeVisible();
    expect(
      await page
        .locator(".offline-banner")
        .evaluate((element) => element.closest("[inert]")),
    ).toBeNull();
    await setOffline(false);
    await page.keyboard.press("Escape");

    const radios = page.getByRole("radio");
    expect(await radios.count()).toBeGreaterThan(1);
    const initiallyChecked = await radios.first().isChecked();
    await radios.nth(initiallyChecked ? 1 : 0).check();
    await expect(live).toHaveText(savedText, { timeout: 5_000 });

    await page.evaluate(() => {
      const target = document.querySelector<HTMLElement>(".save-live");
      if (!target) throw new Error("save live node missing");
      const values: string[] = [];
      const observer = new MutationObserver(() => {
        values.push(target.textContent ?? "");
      });
      observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      (
        window as typeof window & { __saveLiveValues?: string[] }
      ).__saveLiveValues = values;
    });
    await radios.nth(initiallyChecked ? 0 : 1).check();
    await expect
      .poll(
        () =>
          page.evaluate(
            () => {
              const values =
                (window as typeof window & { __saveLiveValues?: string[] })
                  .__saveLiveValues ?? [];
              const clearIndex = values.indexOf("");
              const savedIndex = values.indexOf("Zapisano na tym urządzeniu");
              return clearIndex >= 0 && savedIndex > clearIndex;
            },
          ),
        { timeout: 5_000 },
      )
      .toBe(true);
    const liveValues = await page.evaluate(
      () =>
        (window as typeof window & { __saveLiveValues?: string[] })
          .__saveLiveValues ?? [],
    );
    const clearIndex = liveValues.indexOf("");
    const savedIndex = liveValues.indexOf(savedText);
    expect(clearIndex).toBeGreaterThanOrEqual(0);
    expect(savedIndex).toBeGreaterThan(clearIndex);
    await expect(page.locator(".save-status")).toHaveText(savedText, {
      timeout: 5_000,
    });
    await expect(live).toHaveText(savedText, { timeout: 5_000 });
  } finally {
    await setOffline(false);
    await close();
  }
});

test("persistence error clears the live save status without a lifecycle warning", async ({
  browser,
}) => {
  test.setTimeout(45_000);
  const { page, close } = await freshLessonPage(browser);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    const savedText = "Zapisano na tym urządzeniu";
    const live = page.locator(".save-live");
    await expect(page.locator(".save-status")).toHaveText(savedText, {
      timeout: 5_000,
    });
    const radios = page.getByRole("radio");
    const initiallyChecked = await radios.first().isChecked();
    await radios.nth(initiallyChecked ? 1 : 0).check();
    await expect(live).toHaveText(savedText, { timeout: 5_000 });
    await page.evaluate(() => {
      const quotaError = new DOMException(
        "Quota exceeded for test",
        "QuotaExceededError",
      );
      Object.defineProperty(IDBObjectStore.prototype, "put", {
        configurable: true,
        value: () => {
          throw quotaError;
        },
        writable: true,
      });
    });
    await radios.nth(initiallyChecked ? 0 : 1).check();
    await expect(page.locator(".global-alert")).toContainText(
      "Brak dostępu do lokalnego zapisu",
      { timeout: 5_000 },
    );
    await expect(page.locator(".global-alert")).toHaveAttribute(
      "role",
      "alert",
    );
    await expect(page.locator(".global-alert")).toBeVisible();
    await expect(live).toHaveText("", { timeout: 5_000 });
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  } finally {
    await close();
  }
});

test("Escape closes mobile navigation and returns focus to the trigger", async ({ browser }) => {
  test.setTimeout(45_000);
  const { page, close } = await freshLessonPage(browser);
  try {
    const trigger = page.locator("button.mobile-menu");
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-navigation")).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveAccessibleName("Otwórz nawigację");
    await expect(trigger).toBeFocused();
  } finally {
    await close();
  }
});

test("route selection closes the drawer before the existing main focus reset", async ({ browser }) => {
  test.setTimeout(45_000);
  const { page, close } = await freshLessonPage(browser);
  try {
    await page.locator("button.mobile-menu").click();
    await page.locator("#mobile-navigation").getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await expect(page.locator("button.mobile-menu")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#main-content")).toBeFocused();
  } finally {
    await close();
  }
});

test("lesson-trail selection closes the drawer before openLesson focus reset", async ({ browser }) => {
  test.setTimeout(45_000);
  const { page, close } = await freshLessonPage(browser);
  try {
    const sidebar = page.locator("#mobile-navigation");
    await page.locator("button.mobile-menu").click();
    const lessonChoice = sidebar.locator(".sidebar-trail button:not(.current)").first();
    await expect(lessonChoice).toBeVisible();
    await lessonChoice.click();
    await expect(page.locator("button.mobile-menu")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#main-content")).toBeFocused();
  } finally {
    await close();
  }
});

test("crossing 850px closes the drawer and avoids hidden focus-mode navigation", async ({ browser }) => {
  test.setTimeout(45_000);
  const { page, close } = await freshLessonPage(browser);
  try {
    await page.locator("button.mobile-menu").click();
    await page.setViewportSize({ width: 851, height: 844 });
    await expect(page.locator("button.mobile-menu")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".sidebar nav button").first()).toBeFocused();
    await page.setViewportSize({ width: 850, height: 844 });
    await page.locator("button.mobile-menu").click();
    await expect(page.locator("button.mobile-menu")).toHaveAttribute("aria-expanded", "true");
    await page.setViewportSize({ width: 851, height: 844 });
    await expect(page.locator("button.mobile-menu")).toHaveAttribute("aria-expanded", "false");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Skupienie", exact: true }).click();
    await page.locator("button.mobile-menu").click();
    await page.setViewportSize({ width: 851, height: 844 });
    await expect(page.locator("#main-content")).toBeFocused();
  } finally {
    await close();
  }
});

type StoredDiagnostic = { answers?: Record<string, string> } | null;

async function readStoredDiagnostic(page: Page): Promise<StoredDiagnostic> {
  return page.evaluate(
    () =>
      new Promise<StoredDiagnostic>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        let database: IDBDatabase | undefined;
        const fail = (error: unknown) => {
          database?.close();
          reject(error);
        };
        request.onerror = () => fail(request.error);
        request.onsuccess = () => {
          database = request.result;
          const transaction = database.transaction("user-state", "readonly");
          const read = transaction.objectStore("user-state").get("current");
          read.onerror = () => fail(read.error);
          transaction.onerror = () => fail(transaction.error);
          read.onsuccess = () => {
            const state = read.result as
              | { diagnostic?: StoredDiagnostic }
              | undefined;
            database?.close();
            resolve(state?.diagnostic ?? null);
          };
        };
      }),
  );
}

async function activeElementSnapshot(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    return {
      tag: active?.tagName ?? null,
      role: active?.getAttribute("role") ?? null,
      ariaLabel: active?.getAttribute("aria-label") ?? null,
      text: active?.textContent?.trim().slice(0, 160) ?? null,
    };
  });
}

for (const [viewportName, viewport] of [
  ["desktop", { width: 1440, height: 1000 }],
  ["narrow", { width: 390, height: 844 }],
] as const) {
  test(`onboarding keyboard focus after user transitions preserves passive focus [${viewportName}]`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(45_000);
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== "string" || baseURL.length === 0) {
      throw new Error(
        "onboarding accessibility config must provide project.use.baseURL",
      );
    }
    const context = await browser.newContext({
      baseURL,
      viewport,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const runRequests: Array<{ method: string; url: string }> = [];
    const observations: Array<{
      stage: string;
      active: Awaited<ReturnType<typeof activeElementSnapshot>>;
    }> = [];
    try {
      await context.route("**/api/run", async (route) => {
        runRequests.push({
          method: route.request().method(),
          url: route.request().url(),
        });
        await route.abort("blockedbyclient");
      });
      await page.goto("/");
      const start = page.getByRole("button", {
        name: "Sprawdź punkt startowy",
        exact: false,
      });
      await expect(start).toBeVisible();
      await expect
        .soft(page.getByRole("heading", { level: 1 }).first())
        .not.toBeFocused();
      observations.push({
        stage: "initial",
        active: await activeElementSnapshot(page),
      });

      await start.focus();
      await page.keyboard.press("Enter");
      const firstHeading = page.getByRole("heading", {
        name: "Przeczytaj i przewidź",
        exact: true,
      });
      await expect(firstHeading).toBeVisible();
      await expect.soft(firstHeading).toBeFocused();
      observations.push({
        stage: "after-start",
        active: await activeElementSnapshot(page),
      });

      const answer = page.getByRole("textbox", {
        name: "Twoja odpowiedź",
        exact: true,
      });
      await answer.fill("12");
      await expect
        .poll(
          async () => (await readStoredDiagnostic(page))?.answers?.read ?? null,
          {
            timeout: 5_000,
          },
        )
        .toBe("12");
      await expect(answer).toBeFocused();
      observations.push({
        stage: "after-answer-persisted",
        active: await activeElementSnapshot(page),
      });

      await answer.press("Enter");
      await expect(page.locator(".feedback")).toContainText("Zgadza się.", {
        timeout: 5_000,
      });
      await expect
        .poll(
          async () =>
            (await readStoredDiagnostic(page))?.answers?.["read:done"] ?? null,
          { timeout: 5_000 },
        )
        .toBe("true");
      await expect(answer).toBeFocused();
      observations.push({
        stage: "after-local-check-persisted",
        active: await activeElementSnapshot(page),
      });

      const next = page.getByRole("button", { name: "Dalej", exact: true });
      await next.focus();
      await page.keyboard.press("Enter");
      const secondHeading = page.getByRole("heading", {
        name: "Napraw granicę",
        exact: true,
      });
      await expect(secondHeading).toBeVisible();
      await expect.soft(secondHeading).toBeFocused();
      observations.push({
        stage: "after-next",
        active: await activeElementSnapshot(page),
      });

      await page.reload();
      await expect(secondHeading).toBeVisible();
      await expect.soft(secondHeading).not.toBeFocused();
      observations.push({
        stage: "after-reload",
        active: await activeElementSnapshot(page),
      });
    } finally {
      await testInfo.attach("focus-observations.json", {
        body: JSON.stringify({ viewportName, viewport, observations }, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach("api-run-requests.json", {
        body: JSON.stringify({ viewportName, viewport, runRequests }, null, 2),
        contentType: "application/json",
      });
      expect
        .soft(runRequests, `${viewportName} unexpected /api/run requests`)
        .toEqual([]);
      await context.close();
    }
  });
}
