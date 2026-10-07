import { expect, test } from "@playwright/test";
import { lessons, modules } from "../../src/content/course";

test("shows the lifetime diagnostic and resumes an independent iterator draft", async ({
  page,
}) => {
  const lifetime = lessons.find((lesson) => lesson.id === "lifetime-relations");
  expect(lifetime).toBeDefined();
  const brokenIndex = lifetime!.steps.findIndex(
    (step) => step.expectedStatus === "compile-error" && step.expectedError,
  );
  expect(brokenIndex).toBeGreaterThanOrEqual(0);
  const broken = lifetime!.steps[brokenIndex];
  const iterator = lessons.find(
    (lesson) => lesson.id === "iterator-contracts",
  )!;
  const blankIndex = iterator.steps.findIndex((step) => step.kind === "blank");
  expect(blankIndex).toBeGreaterThanOrEqual(0);
  const blank = iterator.steps[blankIndex];
  const stderr = `error[${broken.expectedError}]: lifetime relationship requires a decision\n --> main.rs:1:1`;
  await page.route("**/api/run", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "compile-error",
        stdout: "",
        stderr,
        diagnostics: [
          {
            code: broken.expectedError,
            message: "lifetime relationship requires a decision",
            level: "error",
            line: 1,
          },
        ],
        durationMs: 1,
      }),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  const lifetimeModule = modules.find((module) => module.id === "lifetimes")!;
  await page
    .locator(".module-picker")
    .getByRole("button", { name: new RegExp(lifetimeModule.title) })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lifetime!.title })
    .click();
  await page
    .locator('[aria-label="Kroki lekcji"]')
    .getByRole("button")
    .nth(brokenIndex)
    .click();
  await expect(
    page.getByRole("heading", { name: broken.title, exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: /^Uruchom(?: testy)?$/ }).click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }).locator("pre"),
  ).toHaveText(stderr);
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }).locator("pre"),
  ).toHaveText(stderr);
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  const iteratorModule = modules.find((module) => module.id === "iterators")!;
  await page
    .locator(".module-picker")
    .getByRole("button", { name: new RegExp(iteratorModule.title) })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: iterator.title })
    .click();
  await page
    .locator('[aria-label="Kroki lekcji"]')
    .getByRole("button")
    .nth(blankIndex)
    .click();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toHaveValue("");
  const draft = "// Mój iterator: najpierw określę stan i warunek końca.\n";
  await editor.fill(draft);
  await expect(
    page.locator(".save-status"),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: blank.title, exact: true }),
  ).toBeVisible();
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toHaveCount(0);
});
