import { test, expect, type Browser, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function freshLessonPage(
  browser: Browser,
  viewport = { width: 390, height: 844 },
): Promise<{ page: Page; close: () => Promise<void> }> {
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
  return { page, close: () => context.close() };
}

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
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
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
