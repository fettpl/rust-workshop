import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { modules } from "../../src/content/course";

test("searches lesson topics, keeps module identity and selection, and clears with the keyboard", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  const initialTitle = await page.locator(".module-summary h2").innerText();
  const search = page.getByRole("searchbox", {
    name: "Znajdź moduł lub temat",
  });
  const browser = page.getByRole("region", {
    name: "Moduły kursu",
    exact: true,
  });
  await expect(browser.locator(".module-picker > button")).toHaveCount(
    modules.length,
  );
  await search.fill("  REFCELL  ");
  const shared = modules.find((module) => module.id === "shared-ownership")!;
  const result = browser
    .locator(".module-picker > button")
    .filter({ hasText: shared.title });
  await expect(result).toContainText(
    `MODUŁ ${String(modules.indexOf(shared) + 1).padStart(2, "0")}`,
  );
  await expect(page.locator(".module-summary h2")).toHaveText(initialTitle);
  await expect(browser).toContainText(`Poniżej wybrany moduł: ${initialTitle}`);
  await result.click();
  await expect(page.locator(".module-summary h2")).toHaveText(shared.title);

  await search.fill("temat_ktorego_nie_ma");
  await expect(browser.getByRole("status")).toContainText(
    `Moduły: 0 z ${modules.length}`,
  );
  await expect(browser.getByRole("status")).toContainText(
    "Spróbuj krótszej nazwy",
  );
  await expect(page.locator(".module-summary h2")).toHaveText(shared.title);
  await search.press("Tab");
  await expect(
    browser.getByRole("button", { name: "Wyczyść wyszukiwanie" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await expect(browser.locator(".module-picker > button")).toHaveCount(
    modules.length,
  );
  await expect(result).toHaveAttribute("aria-pressed", "true");

  await page.setViewportSize({ width: 390, height: 844 });
  await search.fill("POZYCZ");
  await expect(
    browser.locator(".module-picker > button").first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await search.fill("brak_tematu");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
