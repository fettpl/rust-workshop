import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules } from "../../src/content/course";
import { moduleGate } from "../../src/engine/learning";

type LearningEvent = {
  lessonId: string;
  stepId: string;
  kind: string;
  passed: boolean;
  hints: number;
  revealed: boolean;
};

type LearningState = {
  mastery: Record<string, { level?: string; reason?: string }>;
  events: LearningEvent[];
};

const readLearningState = (page: Page) =>
  page.evaluate(async (): Promise<LearningState> => {
    const request = indexedDB.open("rust-workshop-state", 1);
    return await new Promise<LearningState>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction(
          "user-state",
          "readonly",
        );
        const get = transaction.objectStore("user-state").get("current");
        get.onerror = () => reject(get.error);
        get.onsuccess = () =>
          resolve({
            mastery: (get.result?.mastery ?? {}) as LearningState["mastery"],
            events: (get.result?.events ?? []) as LearningEvent[],
          });
      };
    });
  });

const macroModule = modules.find((item) => item.id === "macros-as-api")!;

test.describe("macros-as-api production contracts", () => {
  for (const [criterionIndex, criterion] of (
    macroModule.gateCriteria ?? []
  ).entries()) {
    test(`${criterion.id}: exact runner, independent blank and resume`, async ({
      page,
    }) => {
      const errors: string[] = [];
      const consoleErrors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      const primaryRef = criterion.taskRefs[0];
      const blankRef = criterion.taskRefs.at(-1)!;
      const primaryLesson = lessons.find(
        (lesson) => lesson.id === primaryRef.lessonId,
      )!;
      const primary = primaryLesson.steps.find(
        (step) => step.id === primaryRef.stepId,
      )!;
      const blankLesson = lessons.find(
        (lesson) => lesson.id === blankRef.lessonId,
      )!;
      const blank = blankLesson.steps.find(
        (step) => step.id === blankRef.stepId,
      )!;
      expect(primary.kind).toBe("modify");
      expect(blank.solution?.trim()).not.toBe(primary.solution?.trim());
      expect(blank.kind).toBe("blank");
      expect(blank.code).toBeUndefined();

      const expectedTests = (step: typeof primary) =>
        step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined;
      const acceptedSolutions = new Set(
        [primary, blank].map(
          (step) => `${step.solution}\u0000${expectedTests(step) ?? ""}`,
        ),
      );

      await page.route("**/api/run", async (route) => {
        const request = route.request().postDataJSON() as {
          code?: string;
          mode?: string;
          tests?: string;
        };
        const isAuthoredSolution =
          request.mode === "test" &&
          acceptedSolutions.has(
            `${request.code ?? ""}\u0000${request.tests ?? ""}`,
          );
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            isAuthoredSolution
              ? {
                  status: "success",
                  stdout: "test result: ok",
                  stderr: "",
                  diagnostics: [],
                  durationMs: 1,
                  tests: { passed: 1, failed: 0 },
                }
              : {
                  status: "test-failure",
                  stdout: "test result: FAILED\nunexpected authored solution",
                  stderr: "",
                  diagnostics: [],
                  durationMs: 1,
                  tests: { passed: 0, failed: 1 },
                },
          ),
        });
      });

      await page.goto("/");
      await page
        .getByRole("button", { name: "Sprawdź punkt startowy" })
        .click();
      await page.getByRole("button", { name: "Przejdź do nauki" }).click();
      await page
        .getByRole("button", { name: "Mapa nauki", exact: true })
        .click();
      await page
        .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
        .fill(macroModule.title);
      await page
        .locator(".module-picker > button")
        .filter({ hasText: macroModule.title })
        .click();
      await page
        .locator(".gate-panel li")
        .filter({ hasText: criterion.label })
        .getByRole("button", { name: /Sprawdź w zadaniu/ })
        .click();
      await expect(page.locator(".task-pane h1")).toHaveText(primary.title);

      await page
        .getByRole("button", { name: "Prosty edytor", exact: true })
        .click();
      const editor = page.getByRole("textbox", {
        name: "Kod Rust",
        exact: true,
      });
      const unexpectedCode = `${primary.solution}\n// unexpected mutation\n`;
      await editor.fill(unexpectedCode);
      await page
        .getByRole("button", { name: "Uruchom testy", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Wynik kompilatora" }),
      ).toContainText("test result: FAILED");

      const stateBeforeReveal = await readLearningState(page);
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

      const stateAfterReveal = await readLearningState(page);
      const primaryMastery = (state: LearningState) =>
        state.mastery[primaryLesson.conceptIds[0]];
      expect(primaryMastery(stateAfterReveal)?.level).toBe(
        primaryMastery(stateBeforeReveal)?.level,
      );
      expect(primaryMastery(stateAfterReveal)?.reason).toBe(
        primaryMastery(stateBeforeReveal)?.reason,
      );
      expect(
        stateAfterReveal.events.some(
          (event) =>
            event.lessonId === primaryLesson.id &&
            event.stepId === primary.id &&
            event.revealed,
        ),
      ).toBe(true);

      await page
        .getByRole("button", { name: macroModule.title, exact: true })
        .click();
      await expect(page.getByLabel("Potwierdzone")).toHaveCount(0);
      await page
        .locator(".gate-panel li")
        .filter({ hasText: criterion.label })
        .getByRole("button", { name: /Sprawdź w zadaniu/ })
        .click();
      await expect(page.locator(".task-pane h1")).toHaveText(blank.title);
      await expect(editor).toHaveValue("");

      await editor.fill(blank.solution!);
      await page
        .getByRole("button", { name: "Uruchom testy", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Wynik kompilatora" }),
      ).toContainText("test result: ok");
      await expect(
        page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
      ).toBeVisible();
      await expect
        .poll(async () => {
          const state = await readLearningState(page);
          return state.events.filter(
            (event) =>
              event.lessonId === blankLesson.id && event.stepId === blank.id,
          );
        })
        .toContainEqual(
          expect.objectContaining({ passed: true, hints: 0, revealed: false }),
        );
      const stateAfterBlank = await readLearningState(page);
      expect(
        moduleGate(
          stateAfterBlank as Parameters<typeof moduleGate>[0],
          lessons,
          macroModule,
        ).criteria[criterionIndex].passed,
      ).toBe(true);

      const independentDraft = `${blank.solution}\n// independent blank draft\n`;
      await editor.fill(independentDraft);
      await page.getByText("Twój notatnik", { exact: true }).click();
      const note = `Makra API: ${criterion.id} zapisane lokalnie.`;
      await page.getByLabel("Notatki do lekcji").fill(note);
      await expect(
        page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
      ).toBeVisible();
      const blankHeading = await page.locator(".task-pane h1").innerText();

      await page.reload();
      await expect(page.locator(".task-pane h1")).toHaveText(blankHeading);
      await expect(editor).toHaveValue(independentDraft);
      await page.getByText("Twój notatnik", { exact: true }).click();
      await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(note);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("tab", { name: "Kod", exact: true }).click();
      await editor.focus();
      await expect(editor).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: "Monaco Editor", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Shift+Tab");
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
});
