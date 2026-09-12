import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
