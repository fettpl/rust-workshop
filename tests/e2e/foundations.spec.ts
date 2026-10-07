import { test, expect } from "@playwright/test";

test("starts with Rust foundations and keeps code while moving between modules", async ({
  page,
}) => {
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON();
    const correct = request.code.includes('println!("Rust działa!")');
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: correct ? "Rust działa!\n" : "Witaj, Rust!\n",
        stderr: "",
        diagnostics: [],
        durationMs: 2,
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  await page
    .getByRole("checkbox", { name: "Używaj prostego edytora tekstowego" })
    .check();
  await page
    .getByRole("button", { name: "Twój warsztat", exact: true })
    .click();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).click();
  await expect(
    page.getByRole("heading", { name: "Znajdź punkt wejścia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Uruchom", exact: true }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: /fn main\(\), a potem/ }).check();
  await page.getByRole("button", { name: "Sprawdź odpowiedź" }).click();
  await expect(
    page.getByRole("button", { name: "Uruchom", exact: true }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Fundamenty Rust/ })
    .click();
  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: "Zmień komunikat" }),
  ).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = 'fn main() { println!("Rust działa!"); }';
  await editor.fill(draft);
  await page.getByRole("button", { name: "Uruchom", exact: true }).click();
  await expect(
    page.getByText("Dane wyjściowe są zgodne.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByRole("heading", { name: "Zmień komunikat" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Własność/ })
    .click();
  await page.locator(".lesson-list-item").first().click();
  await expect(
    page.getByRole("heading", { name: "Przewidź liczbę" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Fundamenty Rust/ })
    .click();
  await page.locator(".lesson-list-item").first().click();
  await page.locator('[aria-label="Kroki lekcji"] button').nth(4).click();
  await expect(editor).toHaveValue(draft);
});
