import { expect, test } from "@playwright/test";
import { lessons, modules } from "./polish-course.helper";

type State = {
  notes: Record<string, string>;
  mastery: Record<
    string,
    { level?: string; reason?: string; updatedAt?: number }
  >;
  events: Array<{
    id?: string;
    lessonId: string;
    stepId: string;
    kind: string;
    passed: boolean;
    hints: number;
    revealed: boolean;
    gate?: boolean;
    delayed?: boolean;
    evaluator?: string;
  }>;
};

const stableMastery = (state: State, conceptId: string) => {
  const record = state.mastery[conceptId];
  return record ? { level: record.level, reason: record.reason } : undefined;
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
              notes: get.result?.notes ?? {},
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
  const authoredGateDraft = `${gate.code}\n// Assisted authored run.\n`;
  let expectedSource = authoredGateDraft;
  let expectedPhase = "authored gate";
  let expectedTests =
    gate.evaluator?.kind === "tests" ? gate.evaluator.tests : undefined;
  const requests: Array<{ code: string; mode: string; tests?: string }> = [];
  await editor.fill(authoredGateDraft);
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON() as {
      code: string;
      mode: string;
      tests?: string;
    };
    expect(request).toEqual({
      code: expect.any(String),
      mode: "test",
      tests: expectedTests,
    });
    requests.push(request);
    const accepted = request.code === expectedSource;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: accepted ? "success" : "test-failure",
        stdout: accepted ? `${expectedPhase}: ok` : "",
        stderr: accepted ? "" : `unexpected ${expectedPhase} source`,
        diagnostics: [],
        durationMs: 1,
        tests: { passed: accepted ? 2 : 0, failed: accepted ? 0 : 1 },
      }),
    });
  });
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
  expectedSource = gate.solution!;
  expectedPhase = "revealed gate";
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
  expect(requests.at(-1)?.code).toBe(gate.solution);
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
  expectedSource = blank.solution!;
  expectedTests =
    blank.evaluator?.kind === "tests" ? blank.evaluator.tests : undefined;
  expectedPhase = "independent blank";
  const rejectedBlankDraft = "// Unexpected borrowed-memory blank source.\n";
  await blankEditor.fill(rejectedBlankDraft);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("unexpected independent blank source");
  const blankDraft = blank.solution!;
  await blankEditor.fill(blankDraft);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect
    .poll(
      async () =>
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
  expect(requests.at(-1)?.code).toBe(blank.solution);
  const afterBlank = await readState();
  expect(afterBlank.mastery[primary.conceptIds[0]]).toBeDefined();
  await page.getByText("Twój notatnik", { exact: true }).click();
  const note = "Owner lifetime and state remain independent evidence.";
  await page.getByLabel("Notatki do lekcji").fill(note);
  await expect
    .poll(async () => (await readState()).notes[primary.id])
    .toBe(note);
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
  await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(note);
  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("auto-traits recall stays editable and records one independent event", async ({
  page,
}) => {
  const stage = modules.find(
    (item) => item.id === "unsafe-borrowed-memory-soundness",
  )!;
  const lesson = lessons.find(
    (item) => item.id === "unsafe-borrowed-auto-traits",
  )!;
  const recall = lesson.steps.find(
    (step) => step.id === "unsafe-borrowed-auto-traits-recall",
  )!;
  const recallIndex = lesson.steps.findIndex((step) => step.id === recall.id);
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
              notes: get.result?.notes ?? {},
              mastery: get.result?.mastery ?? {},
              events: get.result?.events ?? [],
            });
          get.onerror = () => reject(get.error);
        };
      });
    });

  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON() as {
      code: string;
      mode: string;
      tests?: string;
    };
    expect(request.mode).toBe("test");
    expect(request.tests).toBe(
      recall.evaluator?.kind === "tests" ? recall.evaluator.tests : undefined,
    );
    const accepted = request.code === recall.solution;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: accepted ? "success" : "test-failure",
        stdout: accepted ? "recall: ok" : "",
        stderr: accepted ? "" : "starter rejected by independent bounds",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: accepted ? 2 : 0, failed: accepted ? 0 : 1 },
      }),
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
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(recallIndex)
    .click();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toBeEditable();
  await expect(editor).toHaveValue(recall.code!);

  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dalej", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("starter rejected by independent bounds");
  expect(
    (await readState()).events.filter(
      (event) =>
        event.lessonId === lesson.id &&
        event.stepId === recall.id &&
        event.kind !== "exposure" &&
        event.passed,
    ),
  ).toHaveLength(0);

  await editor.fill(recall.solution!);
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(recallIndex)
    .click();
  await expect(editor).toHaveValue(recall.solution!);
  await page.reload();
  await expect(editor).toHaveValue(recall.solution!);
  const beforeSuccessfulRun = await readState();
  const priorEventIds = new Set(
    beforeSuccessfulRun.events
      .filter(
        (event) => event.lessonId === lesson.id && event.stepId === recall.id,
      )
      .map((event) => event.id),
  );
  expect(
    beforeSuccessfulRun.events.filter(
      (event) =>
        event.lessonId === lesson.id &&
        event.stepId === recall.id &&
        event.kind !== "exposure" &&
        event.passed,
    ),
  ).toHaveLength(0);

  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await readState()).events.filter(
        (event) =>
          event.lessonId === lesson.id &&
          event.stepId === recall.id &&
          event.kind !== "exposure" &&
          event.passed,
      ),
    )
    .toHaveLength(1);
  const passed = (await readState()).events.filter(
    (event) =>
      event.lessonId === lesson.id &&
      event.stepId === recall.id &&
      event.kind !== "exposure" &&
      event.passed,
  );
  expect(passed[0]).toMatchObject({
    kind: "recall",
    hints: 0,
    revealed: false,
    gate: false,
    evaluator: "tests",
  });
  expect(passed[0].id).toBeTruthy();
  expect(priorEventIds.has(passed[0].id)).toBe(false);
  expect(passed[0].delayed).toBeUndefined();

  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Kod Rust", exact: true }),
  ).toHaveAttribute("readonly", "");
});
