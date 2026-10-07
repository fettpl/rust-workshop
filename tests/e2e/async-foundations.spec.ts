import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules } from "../../src/content/course";

async function openAsync(page: Page) {
  const stage = modules.find((item) => item.id === "async-foundations")!;
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(stage.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: stage.title })
    .click();
  return stage;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
});

test("keeps an async test failure and draft when the learner asks for a hint", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const stage = await openAsync(page);
  const ref = stage.gateCriteria![0].taskRefs[0];
  const step = lessons
    .find((item) => item.id === ref.lessonId)!
    .steps.find((item) => item.id === ref.stepId)!;
  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: step.title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = `${step.code ?? ""}\n// Sprawdzam efekty przed pierwszym poll.\n`;
  await editor.fill(draft);
  const rawOutput =
    "assertion failed: effect before first poll\ntest result: FAILED. 1 passed; 1 failed;";
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON().code).toBe(draft);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "test-failure",
        stdout: rawOutput,
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 1, failed: 1 },
      }),
    });
  });
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  const output = page.getByRole("region", { name: "Wynik kompilatora" });
  await expect(output).toContainText(rawOutput);
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await expect(output).toContainText(rawOutput);
  await expect(editor).toHaveValue(draft);
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(draft);
  await expect(output).toContainText(rawOutput);
  expect(errors).toEqual([]);
});

test("offers a fresh async gate after reveal and resumes its blank draft on mobile", async ({
  page,
}) => {
  const stage = await openAsync(page);
  await page.locator(".gate-action").first().click();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const firstDraft = await editor.inputValue();
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await expect(editor).toHaveValue(firstDraft);
  await openAsync(page);
  await page.locator(".gate-action").first().click();
  const ref = stage.gateCriteria![0].taskRefs[1];
  const step = lessons
    .find((item) => item.id === ref.lessonId)!
    .steps.find((item) => item.id === ref.stepId)!;
  expect(step.kind).toBe("blank");
  await expect(
    page.getByRole("heading", { name: step.title, exact: true }),
  ).toBeVisible();
  await expect(editor).toHaveValue("");
  const draft = "// Najpierw ustalę, kto jest właścicielem przyszłości.\n";
  await editor.fill(draft);
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toHaveCount(0);
  await editor.focus();
  await expect(editor).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
