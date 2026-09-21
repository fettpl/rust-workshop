import { expect, test } from "@playwright/test";
import { lessons, modules } from "../../src/content/course";

type State = {
  mastery: Record<string, { level?: string; reason?: string; updatedAt?: number }>;
  events: Array<{
    lessonId: string;
    stepId: string;
    kind: string;
    passed: boolean;
    hints: number;
    revealed: boolean;
  }>;
};

const stableMastery = (state: State, conceptId: string) => {
  const record = state.mastery[conceptId];
  return record
    ? { level: record.level, reason: record.reason }
    : undefined;
};

test("borrowed memory keeps assisted evidence separate from an independent blank", async ({
  page,
}) => {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const stage = modules.find(
    (item) => item.id === "unsafe-borrowed-memory-soundness",
  )!;
  const primary = lessons.find((lesson) => lesson.id === stage.lessonIds[0])!;
  const gate = primary.steps.find(
    (step) => step.id === "unsafe-borrowed-provenance-boundary-gate",
  )!;
  const blank = primary.steps.find(
    (step) => step.id === "unsafe-borrowed-provenance-blank",
  )!;
  const gateIndex = primary.steps.findIndex((step) => step.id === gate.id);
  const blankIndex = primary.steps.findIndex((step) => step.id === blank.id);
  const readState = () =>
    page.evaluate(async (): Promise<State> => {
      const request = indexedDB.open("rust-workshop-state", 1);
      return await new Promise<State>((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const get = request.result
            .transaction("user-state", "readonly")
            .objectStore("user-state")
            .get("current");
          get.onsuccess = () =>
            resolve({
              mastery: get.result?.mastery ?? {},
              events: get.result?.events ?? [],
            });
          get.onerror = () => reject(get.error);
        };
      });
    });
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
  await page.getByLabel("Kroki lekcji").getByRole("button").first().click();
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
    .click();
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(gateIndex)
    .click();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = `${gate.code}\n// Assisted authored run.\n`;
  await editor.fill(draft);
  await page.route(
    "**/api/run",
    async (route) =>
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          stdout: "test result: ok",
          stderr: "",
          diagnostics: [],
          durationMs: 1,
          tests: { passed: 2, failed: 0 },
        }),
      }),
  );
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  const beforeReveal = await readState();
  await page
    .getByRole("button", { name: "Pomóż mi to zrozumieć", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż drugą wskazówkę", exact: true })
    .click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  const beforeAssisted = await readState();
  const beforeMastery = stableMastery(beforeAssisted, primary.conceptIds[0]);
  const assistedCountBefore = beforeAssisted.events.filter(
    (event) =>
      event.lessonId === primary.id &&
      event.stepId === gate.id &&
      event.kind !== "exposure",
  ).length;
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(gateIndex)
    .click();
  await editor.fill(gate.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await readState()).events.filter(
        (event) =>
          event.lessonId === primary.id &&
          event.stepId === gate.id &&
          event.kind !== "exposure",
      ),
    )
    .toHaveLength(assistedCountBefore + 1);
  const afterAssisted = await readState();
  const assisted = afterAssisted.events
    .filter(
      (event) =>
        event.lessonId === primary.id &&
        event.stepId === gate.id &&
        event.kind !== "exposure",
    )
    .at(-1)!;
  expect(assisted).toMatchObject({ passed: true, hints: 2, revealed: true });
  expect(assisted.hints === 0 && !assisted.revealed).toBe(false);
  expect(stableMastery(afterAssisted, primary.conceptIds[0])).toEqual(
    beforeMastery,
  );
  const blankCountBefore = afterAssisted.events.filter(
    (event) =>
      event.lessonId === primary.id &&
      event.stepId === blank.id &&
      event.kind !== "exposure",
  ).length;
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(blankIndex)
    .click();
  const blankEditor = page.getByRole("textbox", {
    name: "Kod Rust",
    exact: true,
  });
  const blankDraft = "// Independent borrowed-memory blank.\n";
  await blankEditor.fill(blankDraft);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await readState()).events.filter(
        (event) =>
          event.lessonId === primary.id &&
          event.stepId === blank.id &&
          event.kind !== "exposure" &&
          event.passed &&
          event.hints === 0 &&
          !event.revealed,
      ).length,
    )
    .toBe(blankCountBefore + 1);
  const afterBlank = await readState();
  expect(afterBlank.mastery[primary.conceptIds[0]]).toBeDefined();
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page
    .getByLabel("Notatki do lekcji")
    .fill("Owner lifetime and state remain independent evidence.");
  const heading = await page.locator(".task-pane h1").innerText();
  await blankEditor.focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Monaco Editor", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator(".task-pane h1")).toHaveText(heading);
  await expect(blankEditor).toHaveValue(blankDraft);
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(
    "Owner lifetime and state remain independent evidence.",
  );
  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
