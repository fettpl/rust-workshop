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
  await expect(
    browser.getByRole("button", { name: "Podstawy", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(browser.locator(".module-picker > button")).toHaveCount(17);
  await browser
    .getByRole("button", { name: "Rozszerzenia", exact: true })
    .click();
  await expect(browser.locator(".module-picker > button")).toHaveCount(32);
  await expect(browser.locator(".module-group-heading")).toHaveCount(4);
  await browser.getByRole("button", { name: "Cały kurs", exact: true }).click();
  await expect(browser.locator(".module-picker > button")).toHaveCount(
    modules.length,
  );
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const request = indexedDB.open("rust-workshop-state", 1);
        return await new Promise<unknown>((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const get = request.result
              .transaction("user-state", "readonly")
              .objectStore("user-state")
              .get("current");
            get.onerror = () => reject(get.error);
            get.onsuccess = () => resolve(get.result?.routePreference);
          };
        });
      }),
    )
    .toBe("all");
  await page.reload();
  await expect(
    browser.getByRole("button", { name: "Cały kurs", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(browser.locator(".module-picker > button")).toHaveCount(
    modules.length,
  );
  await browser.getByRole("button", { name: "Podstawy", exact: true }).click();
  await expect(browser.locator(".module-picker > button")).toHaveCount(17);
  const coreMode = browser.getByRole("button", {
    name: "Podstawy",
    exact: true,
  });
  const extensionMode = browser.getByRole("button", {
    name: "Rozszerzenia",
    exact: true,
  });
  await coreMode.focus();
  await page.keyboard.press("Enter");
  await extensionMode.focus();
  await page.keyboard.press("Space");
  await expect(extensionMode).toHaveAttribute("aria-pressed", "true");
  await coreMode.focus();
  await page.keyboard.press("Enter");
  await expect(coreMode).toHaveAttribute("aria-pressed", "true");
  await search.fill("rust");
  await expect(browser.getByRole("status")).toContainText(
    `Moduły: 6 z ${modules.length}`,
  );
  await expect(browser.getByRole("status")).toContainText(
    "zakres: cały kurs (Podstawy: 1, Rozszerzenia: 5)",
  );
  await expect(browser.locator(".module-picker")).toContainText("PODSTAWY");
  await expect(browser.locator(".module-picker")).toContainText("ROZSZERZENIE");
  await search.fill("   ");
  await expect(browser.locator(".module-picker > button")).toHaveCount(17);
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
  await expect(browser.locator(".module-picker > button")).toHaveCount(17);
  await expect(browser).toContainText(`Poniżej wybrany moduł: ${shared.title}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await search.fill("POZYCZ");
  await expect(
    browser.locator(".module-picker > button").first(),
  ).toBeVisible();
  const mobileResult = browser.locator(".module-picker > button").first();
  await search.press("Tab");
  await expect(
    browser.getByRole("button", { name: "Wyczyść wyszukiwanie" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(mobileResult).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".module-summary h2")).not.toHaveText(initialTitle);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await search.fill("brak_tematu");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await browser
    .getByRole("button", { name: "Pokaż wszystkie moduły", exact: true })
    .click();
  await expect(browser.locator(".module-picker > button")).toHaveCount(
    modules.length,
  );
  await expect(
    browser.getByRole("button", { name: "Cały kurs", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
