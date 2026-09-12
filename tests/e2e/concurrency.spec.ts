import { test, expect, type Page } from "@playwright/test";
import { lessons, modules } from "../../src/content/course";

async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
}

async function openModule(page: Page, id: string) {
  const stage = modules.find((item) => item.id === id)!;
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

test("keeps a concurrency draft after reveal and offers the fresh gate alternative", async ({
  page,
}) => {
  await start(page);
  const stage = await openModule(page, "threads");
  const [first, second] = stage.gateCriteria![0].taskRefs.map((ref) => ({
    lesson: lessons.find((lesson) => lesson.id === ref.lessonId)!,
    step: lessons
      .find((lesson) => lesson.id === ref.lessonId)!
      .steps.find((step) => step.id === ref.stepId)!,
  }));
  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: first.step.title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = `${first.step.code ?? ""}\n// Tu zbieram wszystkie wyniki dzieci.\n`;
  await editor.fill(draft);
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toBeVisible();
  await openModule(page, "threads");
  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: second.step.title, exact: true }),
  ).toBeVisible();
  await expect(editor).toHaveValue(second.step.code ?? "");
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toHaveCount(0);
});

test("finds Mutex and keeps the raw Send diagnostic beside the coach", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await start(page);
  const stage = await openModule(page, "synchronized-state");
  const lesson = lessons.find((item) => item.id === stage.lessonIds[0])!;
  const stepIndex = lesson.steps.findIndex(
    (step) => step.kind === "observe" && step.expectedError === "E0277",
  );
  expect(stepIndex).toBeGreaterThanOrEqual(0);
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await expect(
    page.getByRole("button", { name: "Uruchom", exact: true }),
  ).toBeDisabled();
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(stepIndex)
    .click();
  const diagnostic =
    "error[E0277]: Rc<String> cannot be sent between threads safely\nhelp: the trait Send is not implemented for Rc<String>";
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON().code).toBe(
      lesson.steps[stepIndex].code,
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "compile-error",
        stdout: "",
        stderr: diagnostic,
        diagnostics: [
          {
            code: "E0277",
            message: "Rc<String> cannot be sent between threads safely",
            level: "error",
          },
        ],
        durationMs: 1,
      }),
    });
  });
  await page.getByRole("button", { name: "Uruchom", exact: true }).click();
  const output = page.getByRole("region", { name: "Wynik kompilatora" });
  await expect(output).toContainText(diagnostic);
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await expect(output).toContainText(diagnostic);
  expect(errors).toEqual([]);
});
