import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules } from "../../src/content/course";

async function openReleaseMatrix(page: Page) {
  const moduleData = modules.find((item) => item.id === "api-release-matrix")!;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(moduleData.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: moduleData.title })
    .click();
  return moduleData;
}

function lessonStep(lessonId: string, stepId: string) {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  return lesson.steps.find((step) => step.id === stepId)!;
}

test("API release matrix keeps authored gate evidence independent offline", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const moduleData = await openReleaseMatrix(page);
  const primaryRef = moduleData.gateCriteria![0].taskRefs[0];
  const blankRef = moduleData.gateCriteria![0].taskRefs[1];
  const primary = lessonStep(primaryRef.lessonId, primaryRef.stepId);
  const blank = lessonStep(blankRef.lessonId, blankRef.stepId);
  const secondPrimaryRef = moduleData.gateCriteria![1].taskRefs[0];
  const secondBlankRef = moduleData.gateCriteria![1].taskRefs[1];
  const secondPrimary = lessonStep(
    secondPrimaryRef.lessonId,
    secondPrimaryRef.stepId,
  );
  const secondBlank = lessonStep(
    secondBlankRef.lessonId,
    secondBlankRef.stepId,
  );
  const gateTasks = [primary, blank, secondPrimary, secondBlank];
  for (const task of gateTasks) expect(task.evaluator?.kind).toBe("tests");
  expect(blank.code).toBeUndefined();
  expect(secondBlank.code).toBeUndefined();

  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON();
    const recognizedTask = gateTasks.find(
      (task) => task.solution === request.code,
    );
    const recognized = !!recognizedTask;
    expect(request.mode).toBe("test");
    expect(typeof request.tests).toBe("string");
    if (recognizedTask && recognizedTask.evaluator?.kind === "tests")
      expect(request.tests).toBe(recognizedTask.evaluator.tests);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        recognized
          ? {
              status: "success",
              stdout: "test result: ok. 1 passed; 0 failed;",
              stderr: "",
              diagnostics: [],
              durationMs: 1,
              tests: { passed: 1, failed: 0 },
            }
          : {
              status: "test-failure",
              stdout: "test result: FAILED. 0 passed; 1 failed;",
              stderr: "",
              diagnostics: [],
              durationMs: 1,
              tests: { passed: 0, failed: 1 },
            },
      ),
    });
  });

  await page.locator(".gate-action").first().click();
  await expect(page.locator(".task-pane h1")).toHaveText(primary.title);
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill("fn main() {}");
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByText("Testy ujawniły problem", { exact: true }),
  ).toBeVisible();
  const draft = `${primary.solution}\n// szkic provenance zachowany po sprawdzeniu.\n`;
  await editor.fill(draft);
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page
    .getByLabel("Notatki do lekcji")
    .fill("Stable nie zastępuje exact MSRV.");
  await expect(
    page.locator(".save-status"),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(primary.title);
  await expect(editor).toHaveValue(draft);
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(
    "Stable nie zastępuje exact MSRV.",
  );

  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await editor.fill(primary.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();
  await page
    .getByRole("button", { name: moduleData.title, exact: true })
    .click();
  await expect(page.getByLabel("Potwierdzone")).toHaveCount(0);

  await page.locator(".gate-action").first().click();
  await expect(page.locator(".task-pane h1")).toHaveText(blank.title);
  await expect(editor).toHaveValue("");
  await editor.fill("fn main() {}");
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByText("Testy ujawniły problem", { exact: true }),
  ).toBeVisible();
  await editor.fill(blank.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();

  await page
    .getByRole("button", { name: moduleData.title, exact: true })
    .click();
  await expect(page.getByLabel("Potwierdzone")).toHaveCount(1);
  await page.locator(".gate-action").first().click();
  await expect(page.locator(".task-pane h1")).toHaveText(secondPrimary.title);
  await editor.fill("fn main() {}");
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByText("Testy ujawniły problem", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await editor.fill(secondPrimary.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();
  await page
    .getByRole("button", { name: moduleData.title, exact: true })
    .click();
  await expect(page.getByLabel("Potwierdzone")).toHaveCount(1);

  await page.locator(".gate-action").first().click();
  await expect(page.locator(".task-pane h1")).toHaveText(secondBlank.title);
  await expect(editor).toHaveValue("");
  await editor.fill("fn main() {}");
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByText("Testy ujawniły problem", { exact: true }),
  ).toBeVisible();
  await editor.fill(secondBlank.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(page.locator(".feedback.passed")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Kod", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Output", exact: false }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("textbox", { name: "Kod Rust", exact: true }).focus();
  await expect(
    page.getByRole("textbox", { name: "Kod Rust", exact: true }),
  ).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("button", { name: moduleData.title, exact: true })
    .click();
  await expect(page.getByLabel("Potwierdzone")).toHaveCount(2);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
