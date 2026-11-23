import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules } from "./polish-course.helper";

test("keeps a generic draft and moves from revealed help to an independent gate", async ({
  page,
}, testInfo) => {
  const stage = modules.find((item) => item.id === "generics");
  expect(stage).toBeDefined();
  const criterion = stage!.gateCriteria![0];
  const firstRef = criterion.taskRefs[0];
  const secondRef = criterion.taskRefs[1];
  const lesson = lessons.find((item) => item.id === firstRef.lessonId)!;
  const step = lesson.steps.find((item) => item.id === firstRef.stepId)!;
  const alternative = lessons
    .find((item) => item.id === secondRef.lessonId)!
    .steps.find((item) => item.id === secondRef.stepId)!;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: new RegExp(stage!.title) })
    .click();
  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: step.title, exact: true }),
  ).toBeInViewport();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = `${step.code ?? ""}\n// moja próba parametru typu`;
  await editor.fill(draft);
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toBeVisible();
  await expect(editor).toHaveValue(draft);
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: alternative.title, exact: true }),
  ).toBeInViewport();
  await expect(editor).toHaveValue(alternative.code ?? "");
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  const traits = modules.find((item) => item.id === "traits")!;
  await page
    .locator(".module-picker")
    .getByRole("button", { name: new RegExp(traits.title) })
    .click();
  await expect(
    page.getByRole("heading", { name: traits.title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await expect(page.locator("#main-content")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("traits-map-mobile.png"),
    fullPage: true,
  });
});
