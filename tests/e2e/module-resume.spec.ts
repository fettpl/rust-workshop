import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules } from "../../src/content/course";
import { stepKey } from "../../src/persistence/state";

async function readStoredPacketState(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{
        steps: Record<string, { completed?: boolean }>;
        events: Array<{
          lessonId: string;
          stepId: string;
          kind: string;
          gate?: boolean;
        }>;
      }>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction("user-state", "readonly")
            .objectStore("user-state")
            .get("current");
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
          read.onsuccess = () => {
            db.close();
            const state = read.result;
            resolve({
              steps: state?.steps ?? {},
              events: state?.events ?? [],
            });
          };
        };
      }),
  );
}

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
  "unsafe-miri-contracts",
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
    const initializedPrefix =
      moduleId === "unsafe-miri-contracts"
        ? lesson.steps.find(
            (item) => item.id === "byte-view-initialized-prefix",
          )
        : undefined;
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
    if (moduleId === "async-lending-contracts") {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        page.getByText(stage.exitGate.join(" "), { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(stage.exitGate.join(" "), { exact: true }),
      ).toContainText(
        "Receiver, callback, adapter dyn, Send i cancellation/commit mają po dwie opisane rodziny primary",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.locator(".gate-action").first().click();
    if (moduleId === "async-lending-contracts") {
      // Keep the established editor flow desktop-sized after mobile map navigation.
      await page.setViewportSize({ width: 1280, height: 720 });
    }
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
      if (moduleId === "unsafe-miri-contracts") {
        expect(initializedPrefix).toBeDefined();
        await expect(page.locator(".task-pane h1")).toHaveText(
          initializedPrefix!.title,
        );
        // The historical blank remains directly navigable, but it is no
        // longer the fresh gate recovery after the initialized-prefix family.
        await page
          .getByLabel("Kroki lekcji")
          .getByRole("button")
          .nth(lesson.steps.findIndex((item) => item.id === blank.id))
          .click();
      }
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

      const browser = page.context().browser();
      expect(browser).toBeDefined();
      const baseURL = test.info().project.use.baseURL;
      if (typeof baseURL !== "string" || baseURL.length === 0) {
        throw new Error(
          "production module-resume config must provide project.use.baseURL",
        );
      }
      const isolatedContext = await browser!.newContext({ baseURL });
      const isolatedPage = await isolatedContext.newPage();
      try {
        await isolatedPage.goto("/");
        await isolatedPage
          .getByRole("button", { name: "Sprawdź punkt startowy" })
          .click();
        await isolatedPage
          .getByRole("button", { name: "Przejdź do nauki" })
          .click();
        await isolatedPage
          .getByRole("button", { name: "Mapa nauki", exact: true })
          .click();
        await isolatedPage
          .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
          .fill(stage.title);
        await isolatedPage
          .locator(".module-picker > button")
          .filter({ hasText: stage.title })
          .click();

        const isolatedCallbackRef = stage.gateCriteria![1].taskRefs[0];
        const isolatedCallbackStep = lessons
          .find((item) => item.id === isolatedCallbackRef.lessonId)!
          .steps.find((item) => item.id === isolatedCallbackRef.stepId)!;
        await isolatedPage.locator(".gate-action").first().click();
        await isolatedPage
          .getByRole("button", { name: "Pomóż mi to zrozumieć" })
          .click();
        await isolatedPage
          .getByRole("button", { name: "Pokaż drugą wskazówkę" })
          .click();
        await isolatedPage
          .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
          .click();
        await isolatedPage
          .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
          .click();
        await isolatedPage
          .getByRole("button", { name: stage.title, exact: true })
          .click();
        await isolatedPage.locator(".gate-action").first().click();
        await expect(isolatedPage.locator(".task-pane h1")).toHaveText(
          batchStep!.title,
        );
        await isolatedPage
          .getByRole("button", { name: "Pomóż mi to zrozumieć" })
          .click();
        await isolatedPage
          .getByRole("button", { name: "Pokaż drugą wskazówkę" })
          .click();
        await isolatedPage
          .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
          .click();
        await isolatedPage
          .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
          .click();
        await isolatedPage
          .getByRole("button", { name: stage.title, exact: true })
          .click();
        await isolatedPage.locator(".gate-action").first().click();
        await expect(isolatedPage.locator(".task-pane h1")).toHaveText(
          isolatedCallbackStep.title,
        );
        await isolatedPage
          .getByRole("button", { name: "Pomóż mi to zrozumieć" })
          .click();
        await isolatedPage
          .getByRole("button", { name: "Pokaż drugą wskazówkę" })
          .click();
        await isolatedPage
          .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
          .click();
        await isolatedPage
          .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
          .click();
        await isolatedPage
          .getByRole("button", { name: stage.title, exact: true })
          .click();
        const callbackCriterion = stage.gateCriteria![1];
        const newCallbackRef = callbackCriterion.taskRefs[2];
        expect(newCallbackRef.stepId).toBe(
          "async-lending-callbacks-bounded-transform",
        );
        const newCallbackStep = lessons
          .find((item) => item.id === newCallbackRef.lessonId)!
          .steps.find((item) => item.id === newCallbackRef.stepId)!;
        const callbackRow = isolatedPage
          .locator(".gate-panel li")
          .filter({ hasText: callbackCriterion.label });
        await expect(callbackRow).not.toContainText(
          "Brak świeżego samodzielnego wariantu",
        );
        await callbackRow
          .getByRole("button", { name: "Sprawdź w zadaniu" })
          .click();
        await expect(isolatedPage.locator(".task-pane h1")).toHaveText(
          newCallbackStep.title,
        );
        await isolatedPage
          .getByRole("button", { name: "Pomóż mi to zrozumieć" })
          .click();
        await isolatedPage
          .getByRole("button", { name: "Pokaż drugą wskazówkę" })
          .click();
        await isolatedPage
          .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
          .click();
        await expect(isolatedPage.locator(".solution-warning")).toContainText(
          "potwierdzenie samodzielności poczeka na inne świeże zadanie",
        );
        await isolatedPage
          .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
          .click();
        await isolatedPage
          .getByRole("button", { name: stage.title, exact: true })
          .click();
        await expect(isolatedPage.locator(".module-connections")).toContainText(
          "Brak świeżego samodzielnego wariantu",
        );
        await expect(callbackRow).toContainText(
          "Brak świeżego samodzielnego wariantu",
        );
        await expect(
          callbackRow.getByRole("button", { name: "Sprawdź w zadaniu" }),
        ).toHaveCount(0);
        const nextCriterionRef = stage.gateCriteria![2].taskRefs[0];
        const nextCriterionStep = lessons
          .find((item) => item.id === nextCriterionRef.lessonId)!
          .steps.find((item) => item.id === nextCriterionRef.stepId)!;
        await isolatedPage.locator(".gate-action").first().click();
        await expect(isolatedPage.locator(".task-pane h1")).toHaveText(
          nextCriterionStep.title,
        );
      } finally {
        await isolatedContext.close();
      }
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

test("packet 005 stop boundary preserves workspace state and gives a pause point", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const stage = modules.find((item) => item.id === "todo-project")!;
  const lesson = lessons.find((item) => item.id === "todo-command-parser")!;
  const editableStep = lesson.steps.find((item) => item.id === "parser-debug")!;
  const stop = lesson.sessionStops!.find(
    (item) => item.afterStepId === "parser-explain",
  )!;
  const editableIndex = lesson.steps.findIndex(
    (item) => item.id === editableStep.id,
  );
  const stopIndex = lesson.steps.findIndex(
    (item) => item.id === stop.afterStepId,
  );
  const finalStop = lesson.sessionStops!.at(-1)!;
  const finalStage =
    lesson.steps[
      lesson.steps.findIndex((item) => item.id === finalStop.afterStepId) + 1
    ];
  const draft = `${editableStep.code}\n// szkic zachowany po przerwie\n`;
  const note = "Reguła pierwszej spacji wymaga osobnego sprawdzenia.";

  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: new RegExp(stage.title) })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(editableIndex)
    .click();
  await expect(
    page.getByRole("heading", { name: editableStep.title, exact: true }),
  ).toBeVisible();
  const stagePlan = page.getByRole("region", { name: "Plan etapów lekcji" });
  await expect(stagePlan).toBeVisible();
  await expect(stagePlan.locator("li")).toHaveCount(3);
  await expect(stagePlan).toContainText(stop.title);
  const firstBoundaryIndex = lesson.steps.findIndex(
    (item) => item.id === stop.afterStepId,
  );
  await expect(stagePlan.locator("li").nth(0)).toContainText(
    `kroku ${firstBoundaryIndex + 1} „${lesson.steps[firstBoundaryIndex].title}”`,
  );
  const secondStop = lesson.sessionStops![1];
  const secondBoundaryIndex = lesson.steps.findIndex(
    (item) => item.id === secondStop.afterStepId,
  );
  await expect(stagePlan.locator("li").nth(1)).toContainText(
    `kroku ${secondBoundaryIndex + 1} „${lesson.steps[secondBoundaryIndex].title}”`,
  );
  await expect(stagePlan).toContainText(finalStage.title);

  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(draft);
  await page.getByText("Twój notatnik", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Notatki do lekcji", exact: true })
    .fill(note);
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#workspace-panel-lesson")).toBeHidden();
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );

  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: `${editableStep.title} · Kod`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByRole("tab", { name: "Kod", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await expect(
    page.getByText("WSKAZÓWKA 2 · REGUŁA", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toBeVisible();
  await page.getByText("Twój notatnik", { exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Notatki do lekcji", exact: true }),
  ).toHaveValue(note);

  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await editor.focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Monaco Editor", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(editor).toBeFocused();

  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(stopIndex)
    .click();
  await expect(
    page.getByRole("heading", {
      name: lesson.steps[stopIndex].title,
      exact: true,
    }),
  ).toBeVisible();
  const pauseNote = page.getByRole("complementary", {
    name: "Miejsce na przerwę",
  });
  await expect(pauseNote).toContainText(stop.title);
  await expect(pauseNote).toContainText(stop.nextGoal);
  await expect(pauseNote).toContainText("możesz zrobić przerwę");
  await expect(
    page.getByLabel("Kroki lekcji").getByRole("button").nth(stopIndex),
  ).toContainText(String(stopIndex + 1).padStart(2, "0"));
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  const persisted = await readStoredPacketState(page);
  const stopKey = stepKey(lesson.id, stop.afterStepId);
  expect(persisted.steps[stopKey]?.completed ?? false).toBe(false);
  expect(
    persisted.events.filter(
      (event) =>
        event.lessonId === lesson.id &&
        event.stepId === stop.afterStepId &&
        event.kind !== "exposure",
    ),
  ).toEqual([]);
  expect(
    persisted.events.some(
      (event) =>
        event.lessonId === lesson.id &&
        event.stepId === stop.afterStepId &&
        event.gate === true,
    ),
  ).toBe(false);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
