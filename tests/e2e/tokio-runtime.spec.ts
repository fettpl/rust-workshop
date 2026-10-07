import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules } from "../../src/content/course";

async function openTokio(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  const stage = modules.find((item) => item.id === "tokio-runtime-tasks")!;
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

test("accepts the actual code-less Send diagnostic and preserves it through hints and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openTokio(page);
  const lesson = lessons.find((item) => item.id === "tokio-task-boundaries")!;
  const stepIndex = lesson.steps.findIndex((step) => !!step.expectedDiagnostic);
  expect(stepIndex).toBeGreaterThanOrEqual(0);
  const step = lesson.steps[stepIndex];
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(stepIndex)
    .click();
  const diagnostic = step.expectedDiagnostic!;
  const raw = `error: ${diagnostic}\n  --> src/main.rs:8:16\nhelp: Rc<Cell<usize>> is not Send`;
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: step.code,
      mode: "run",
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "compile-error",
        stdout: "",
        stderr: raw,
        diagnostics: [{ message: diagnostic, level: "error" }],
        durationMs: 1,
      }),
    });
  });
  await page.getByRole("button", { name: "Uruchom", exact: true }).click();
  const output = page.getByRole("region", { name: "Wynik kompilatora" });
  await expect(output).toContainText(raw);
  await expect(page.locator(".feedback.passed")).toContainText(diagnostic);
  await expect(
    page.getByRole("button", { name: "Dalej", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await expect(output).toContainText(raw);
  await expect(
    page.locator(".save-status"),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: step.title, exact: true }),
  ).toBeVisible();
  await expect(output).toContainText(raw);
  await expect(page.locator(".feedback.passed")).toContainText(diagnostic);
  expect(errors).toEqual([]);
});

test("sends a Tokio gate through the existing code-only runner contract", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const stage = await openTokio(page);
  const ref = stage.gateCriteria![0].taskRefs[0];
  const step = lessons
    .find((item) => item.id === ref.lessonId)!
    .steps.find((item) => item.id === ref.stepId)!;
  expect(step.trustedFixtureTarget).toBe("cargo-tokio-runtime-1.53.1");
  expect(step.evaluator?.kind).toBe("tests");
  await page.locator(".gate-action").first().click();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Kod Rust", exact: true })
    .fill(step.solution!);
  const stdout = "test result: ok. 1 passed; 0 failed;";
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      code: step.solution,
      mode: "test",
      tests:
        step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout,
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 1, failed: 0 },
      }),
    });
  });
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText(stdout);
  await expect(
    page.locator(".save-status"),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  // The compact mobile header hides this status, but its text tracks the save.
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Kod Rust", exact: true }),
  ).toHaveValue(step.solution!);
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
