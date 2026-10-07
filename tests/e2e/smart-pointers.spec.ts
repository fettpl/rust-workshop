import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules } from "../../src/content/course";
import { mapModeForModule } from "../../src/engine/course-route";

async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
}

async function openLesson(page: Page, id: string) {
  const lesson = lessons.find((item) => item.id === id)!;
  const courseModule = modules.find((item) => item.id === lesson.moduleId)!;
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  if (mapModeForModule(courseModule.id) === "extensions") {
    await page.getByRole("button", { name: "Rozszerzenia", exact: true }).click();
  }
  await page
    .locator(".module-picker")
    .getByRole("button", {
      name: new RegExp(
        courseModule.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ),
    })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  return lesson;
}

test("keeps the Rc value and allocation lifetimes distinct while stepping and resuming the trace", async ({
  page,
}) => {
  await start(page);
  const lesson = await openLesson(page, "weak-links");
  const stepIndex = lesson.steps.findIndex(
    (step) => step.traceId === "trace-rc-weak",
  );
  expect(stepIndex).toBeGreaterThanOrEqual(0);
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(stepIndex)
    .click();
  const visualizer = page.locator(".visualizer");
  await expect(visualizer).toContainText("Jawne uchwyty Rc: 1 · Weak: 0");
  for (let i = 0; i < 4; i++)
    await visualizer.getByRole("button", { name: "Następna linia" }).click();
  await expect(visualizer).toContainText("Jawne uchwyty Rc: 0 · Weak: 1");
  await expect(visualizer).toContainText(
    "Wartość zakończyła życie; alokacja pozostaje",
  );
  await expect(visualizer).not.toContainText("Zwolniono pamięć");
  await expect(
    page.locator(".save-status"),
  ).toBeVisible();
  await page.reload();
  await expect(visualizer).toContainText(
    "Wartość zakończyła życie; alokacja pozostaje",
  );
  await visualizer.getByRole("button", { name: "Następna linia" }).click();
  await expect(visualizer).toContainText("upgrade zwraca None");
  await visualizer.getByRole("button", { name: "Następna linia" }).click();
  await expect(visualizer).toContainText("Zwolniono pamięć");
  await expect(
    visualizer.getByRole("button", { name: "Następna linia" }),
  ).toBeDisabled();
  await visualizer.getByRole("button", { name: "Wstecz", exact: true }).click();
  await expect(visualizer).not.toContainText("Zwolniono pamięć");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("preserves a new loop draft through old modules and shows raw Box diagnostic feedback", async ({
  page,
}) => {
  await start(page);
  const loop = await openLesson(page, "while-progress");
  await expect(
    page.getByRole("button", { name: "Uruchom", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("radio", { name: "Cztery razy, a current będzie równe 5" })
    .check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Uruchom", exact: true }),
  ).toBeEnabled();
  const blank = loop.steps.findIndex((step) => step.kind === "blank");
  expect(blank).toBeGreaterThanOrEqual(0);
  await page.locator('[aria-label="Kroki lekcji"] button').nth(blank).click();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toHaveValue("");
  await editor.fill(
    "// Mój warunek i krok postępu pozostają do uzupełnienia.\n",
  );
  await expect(
    page.locator(".save-status"),
  ).toBeVisible();
  await openLesson(page, "functions-expressions");
  await openLesson(page, "while-progress");
  await page.locator('[aria-label="Kroki lekcji"] button').nth(blank).click();
  await expect(editor).toHaveValue(
    "// Mój warunek i krok postępu pozostają do uzupełnienia.\n",
  );
  await expect(
    page.locator(".save-status"),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(
    "// Mój warunek i krok postępu pozostają do uzupełnienia.\n",
  );

  const box = await openLesson(page, "box-recursive");
  const errorIndex = box.steps.findIndex(
    (step) => step.expectedError === "E0072",
  );
  expect(errorIndex).toBeGreaterThanOrEqual(0);
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(errorIndex)
    .click();
  const diagnostic =
    "error[E0072]: recursive type has infinite size\nhelp: insert some indirection to break the cycle";
  await page.route("**/api/run", async (route) => {
    expect(route.request().postDataJSON().code).toBe(
      box.steps[errorIndex].code,
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
            code: "E0072",
            level: "error",
            message: "recursive type has infinite size",
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
});
