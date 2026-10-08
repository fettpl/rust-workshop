import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules } from "../../src/content/course";

for (const moduleId of [
  "tokio-io-streams",
  "tokio-blocking-work",
  "tokio-network-service",
  "public-api-workspaces",
  "mini-grep",
  "number-guessing-plus",
  "borrowed-callbacks",
  "gat-lending-iterators",
  "async-lending-contracts",
  "performance-evidence",
  "profile-evidence",
  "unsafe-ffi-contracts",
  "fuzz-evidence-lifecycle",
]) {
  test(`${moduleId}: resume diagnostics and blank practice on mobile`, async ({
    page,
  }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const stage = modules.find((item) => item.id === moduleId)!;
    expect(stage).toBeDefined();
    const [first, fresh] = stage.gateCriteria![0].taskRefs;
    const lesson = lessons.find((item) => item.id === first.lessonId)!;
    const step = lesson.steps.find((item) => item.id === first.stepId)!;
    const blank = lesson.steps.find((item) => item.id === fresh.stepId)!;
    const batchRef =
      moduleId === "async-lending-contracts"
        ? stage.gateCriteria![0].taskRefs[2]
        : undefined;
    const batchStep = batchRef
      ? lessons
          .find((item) => item.id === batchRef.lessonId)!
          .steps.find((item) => item.id === batchRef.stepId)!
      : undefined;
    expect(blank.kind).toBe("blank");
    expect(blank.code).toBeUndefined();
    await page.goto("/");
    await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
    await page.getByRole("button", { name: "Przejdź do nauki" }).click();
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(stage.title);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: stage.title })
      .click();
    await page.locator(".gate-action").first().click();
    await expect(page.locator(".task-pane h1")).toHaveText(step.title);
    await page
      .getByRole("button", { name: "Prosty edytor", exact: true })
      .click();
    const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    const draft = `${step.code}\n// Mój szkic kontraktu.\n`;
    await editor.fill(draft);
    const diagnostic =
      "assertion failed: observable resource contract\ntest result: FAILED. 2 passed; 1 failed;";
    let runCount = 0;
    await page.route("**/api/run", async (route) => {
      runCount += 1;
      const request = route.request().postDataJSON();
      if (moduleId === "async-lending-contracts" && runCount === 2) {
        expect(request).toEqual({
          code: batchStep!.solution,
          mode: "test",
          tests:
            batchStep!.evaluator?.kind === "tests"
              ? batchStep!.evaluator.tests
              : undefined,
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "success",
            stdout: "batch transfer accepted",
            stderr: "",
            diagnostics: [],
            durationMs: 1,
            tests: { passed: 6, failed: 0 },
          }),
        });
        return;
      }
      expect(request).toEqual({
        code: draft,
        mode: "test",
        tests:
          step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined,
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "test-failure",
          stdout: diagnostic,
          stderr: "",
          diagnostics: [],
          durationMs: 1,
          tests: { passed: 2, failed: 1 },
        }),
      });
    });
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Wynik kompilatora" }),
    ).toContainText(diagnostic);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page
        .locator(".save-status")
        .filter({ hasText: "Zapisano na tym urządzeniu" }),
    ).toBeVisible();
    await page.reload();
    await expect(editor).toHaveValue(draft);
    await expect(page.locator(".task-pane h1")).toHaveText(step.title);
    await expect(
      page.getByRole("region", { name: "Wynik kompilatora" }),
    ).toContainText(diagnostic);
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    await page
      .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
      .click();
    await expect(editor).toHaveValue(draft);
    if (moduleId === "gat-lending-iterators") {
      await expect(
        page
          .locator(".save-status")
          .filter({ hasText: "Zapisano na tym urządzeniu" }),
      ).toBeVisible();
      await page.reload();
      await expect(page.locator(".task-pane h1")).toHaveText(step.title);
      await expect(editor).toHaveValue(draft);
    }

    await page.getByRole("button", { name: stage.title, exact: true }).click();
    await expect(page.getByLabel("Potwierdzone")).toHaveCount(0);
    if (moduleId === "async-lending-contracts") {
      expect(batchStep).toBeDefined();
      await page.locator(".gate-action").first().click();
      await expect(page.locator(".task-pane h1")).toHaveText(batchStep!.title);
      await editor.fill(batchStep!.solution!);
      await page
        .getByRole("button", { name: "Uruchom testy", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Wynik kompilatora" }),
      ).toContainText("batch transfer accepted");
      await expect(page.locator(".task-pane")).toContainText(
        "samodzielne zadania kodowe 1/2",
      );
      await page
        .getByRole("button", { name: stage.title, exact: true })
        .click();
      await expect(page.getByLabel("Potwierdzone")).toHaveCount(1);
      await page
        .locator(".lesson-list-item")
        .filter({ hasText: lesson.title })
        .click();
      await page
        .getByLabel("Kroki lekcji")
        .getByRole("button")
        .nth(lesson.steps.findIndex((item) => item.id === batchStep!.id))
        .click();
      await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
      await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
      await page
        .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
        .click();
      await page
        .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
        .click();
      await page
        .getByRole("button", { name: stage.title, exact: true })
        .click();
      const callbackRef = stage.gateCriteria![1].taskRefs[0];
      const callbackStep = lessons
        .find((item) => item.id === callbackRef.lessonId)!
        .steps.find((item) => item.id === callbackRef.stepId)!;
      await page.locator(".gate-action").first().click();
      await expect(page.locator(".task-pane h1")).toHaveText(
        callbackStep.title,
      );
      await page
        .getByRole("button", { name: stage.title, exact: true })
        .click();
      await expect(page.getByLabel("Potwierdzone")).toHaveCount(1);
      await page
        .locator(".lesson-list-item")
        .filter({ hasText: lesson.title })
        .click();
      await page
        .getByLabel("Kroki lekcji")
        .getByRole("button")
        .nth(lesson.steps.findIndex((item) => item.id === blank.id))
        .click();
    } else {
      // Other criteria expose their available blank through the gate action.
      await page.locator(".gate-action").first().click();
    }
    await expect(page.locator(".task-pane h1")).toHaveText(blank.title);
    await expect(editor).toHaveValue("");
    if (moduleId === "gat-lending-iterators") {
      const blankDraft =
        "// Samodzielny kontrakt GAT\ntrait LendingIterator {\n";
      await editor.fill(blankDraft);
      await expect(
        page
          .locator(".save-status")
          .filter({ hasText: "Zapisano na tym urządzeniu" }),
      ).toBeVisible();
      await page.reload();
      await expect(page.locator(".task-pane h1")).toHaveText(blank.title);
      await expect(editor).toHaveValue(blankDraft);
    }
    await expect(
      page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
    ).toHaveCount(0);
    if (moduleId === "async-lending-contracts") {
      await expect(page.locator(".task-pane")).toContainText(
        "Ten sam kontrakt ma zapisaną pomoc w innym kroku",
      );
      await expect(page.locator(".task-pane")).toContainText(
        "samodzielne zadania kodowe 1/2",
      );
      const asyncDraft = "// Assisted receiver practice saved after reveal.\n";
      await editor.fill(asyncDraft);
      await expect(
        page
          .locator(".save-status")
          .filter({ hasText: "Zapisano na tym urządzeniu" }),
      ).toBeVisible();
      await editor.focus();
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: "Monaco Editor", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(editor).toBeFocused();
      await page.reload();
      await expect(page.locator(".task-pane h1")).toHaveText(blank.title);
      await expect(editor).toHaveValue(asyncDraft);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await editor.focus();
    await expect(editor).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}
