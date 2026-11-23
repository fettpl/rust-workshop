import { expect, test } from "@playwright/test";
import { concepts, lessons, reviewExercises } from "./polish-course.helper";

test("keeps reordered choices and selected meaning through reload", async ({
  page,
}) => {
  const lesson = lessons.find((item) => item.id === "first-program")!;
  const step = lesson.steps.find((item) => item.id === "entry-discover")!;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).click();
  const radios = page
    .getByRole("group", { name: "Twoja decyzja" })
    .getByRole("radio");
  await expect(radios).toHaveCount(step.choices!.length);
  const order = await radios.evaluateAll((inputs) =>
    inputs.map((input) => (input as HTMLInputElement).value),
  );
  expect(order).not.toEqual(step.choices!.map((choice) => choice.id));
  const correct = page.locator('input[type="radio"][value="main"]');
  await correct.check();
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await expect(correct).toBeChecked();
  expect(
    await radios.evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value),
    ),
  ).toEqual(order);
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dalej", exact: true }),
  ).toBeEnabled();
});

test("resumes a reordered review choice by its meaning", async ({ page }) => {
  const concept = concepts.find((item) => item.id === "bindings-mutability")!;
  const step = reviewExercises[concept.id];
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Powtórki", exact: true }).click();
  await page.getByRole("button", { name: concept.title, exact: true }).click();
  await page
    .getByRole("button", { name: "Mały eksperyment", exact: true })
    .click();
  const group = page.getByRole("group", { name: "Twoja decyzja" });
  const labels = group.locator("label");
  await expect(labels).toHaveCount(step.choices!.length);
  const order = (await labels.allTextContents()).map((text) => text.trim());
  expect(order).not.toEqual(step.choices!.map((choice) => choice.label));
  const answer = group.getByRole("radio", {
    name: "mut w deklaracji",
    exact: true,
  });
  await answer.check();
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await expect(answer).toBeChecked();
  expect((await labels.allTextContents()).map((text) => text.trim())).toEqual(
    order,
  );
  await page.getByRole("button", { name: "Sprawdź", exact: true }).click();
  await expect(group).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Po przerwie", exact: true }),
  ).toBeVisible();
  await expect(page.locator("time")).toHaveCount(1);
});
