import { expect, test, type Page } from "@playwright/test";
import { lessons, modules, reviewExercises } from "../../src/content/course";
import {
  assistanceForLessonStep,
  courseModuleGate,
  courseGateRecovery,
  evidenceForLessonStep,
} from "../../src/content/learning-context";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../../src/persistence/state";
import { reviewSessionKey } from "../../src/engine/review-session";
import type { EvidenceEvent, UserState } from "../../src/domain/types";

const sourceLesson = lessons.find(
  (lesson) => lesson.id === "todo-terminal-cli",
)!;
const source = sourceLesson.steps.find((step) => step.id === "cli-gate")!;
const formatLesson = lessons.find(
  (lesson) => lesson.id === "todo-storage-format",
)!;
const format = formatLesson.steps.find((step) => step.id === "format-gate")!;
const fileLesson = lessons.find(
  (lesson) => lesson.id === "todo-file-persistence",
)!;
const file = fileLesson.steps.find((step) => step.id === "file-gate")!;

function ready(): UserState {
  const state = createInitialState();
  state.onboarding = { completed: true, name: "Ada", minutes: 15 };
  state.diagnostic = {
    completed: true,
    answers: {},
    score: 0,
    recommendation: "",
  };
  state.settings.accessibleEditor = true;
  state.resume = {
    ...state.resume,
    view: "lesson",
    lessonId: sourceLesson.id,
    stepIndex: sourceLesson.steps.indexOf(source),
    panel: "lesson",
  };
  return state;
}

async function seed(page: Page, state: UserState) {
  await page.goto("/");
  await page.evaluate(async (value) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("rust-workshop-state", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("user-state");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("user-state", "readwrite");
        transaction.objectStore("user-state").put(value, "current");
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, state);
  await page.reload();
}

async function saved(page: Page): Promise<UserState> {
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );
  return page.evaluate(
    () =>
      new Promise<UserState>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const read = database
            .transaction("user-state", "readonly")
            .objectStore("user-state")
            .get("current");
          read.onsuccess = () => {
            database.close();
            resolve(read.result as UserState);
          };
          read.onerror = () => reject(read.error);
        };
      }),
  );
}

function helped(state: UserState) {
  return [
    assistanceForLessonStep(state, formatLesson, format).revealed,
    assistanceForLessonStep(state, fileLesson, file).revealed,
  ];
}

test("hidden mobile starter stays fresh; showing it assists supplied components and preserves earlier success", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = ready();
  // Historical fixture: this browser check proves exposure/state behavior, not Rust execution.
  const earlier: EvidenceEvent = {
    id: "earlier-format-independent",
    lessonId: formatLesson.id,
    stepId: format.id,
    ...evidenceForLessonStep(formatLesson, format),
    kind: format.evidenceKind,
    evaluator: format.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    gate: true,
    at: Date.now() - 10_000,
  };
  state.events = [earlier];
  await seed(page, state);
  await expect(
    page.getByRole("heading", { name: source.title, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toBeHidden();
  expect(helped(await saved(page))).toEqual([false, false]);

  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveValue(
    source.code!,
  );
  await expect
    .poll(async () => helped(await saved(page)))
    .toEqual([true, true]);
  const exposed = await saved(page);
  expect(exposed.events.find((event) => event.id === earlier.id)).toEqual(
    earlier,
  );
  const io = modules.find((module) => module.id === "todo-io")!;
  expect(courseModuleGate(exposed, lessons, io).criteria[0].passed).toBe(true);
  expect(courseModuleGate(exposed, lessons, io).criteria[1].passed).toBe(false);

  await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  const revisited = await saved(page);
  expect(revisited.events).toEqual(exposed.events);
  expect(revisited.steps[stepKey(formatLesson.id, format.id)]).toEqual(
    exposed.steps[stepKey(formatLesson.id, format.id)],
  );
});

test("restored custom draft does not disclose components until authored starter is restored visibly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = ready();
  state.resume.panel = "code";
  const draft = "// własny przywrócony szkic\nfn main() {}";
  state.steps[stepKey(sourceLesson.id, source.id)] = {
    ...createStepProgress(source.code),
    code: draft,
  };
  await seed(page, state);
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveValue(
    draft,
  );
  expect(helped(await saved(page))).toEqual([false, false]);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Przywróć kod początkowy" }).click();
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveValue(
    source.code!,
  );
  await expect
    .poll(async () => helped(await saved(page)))
    .toEqual([true, true]);
});

test("review reminder card does not disclose the hidden executable starter", async ({
  page,
}) => {
  const state = ready();
  const step = reviewExercises["io-safe-persistence"];
  const sessionId = "supplied-review-visibility";
  state.resume.view = "review";
  state.reviewSession = {
    conceptId: "io-safe-persistence",
    exerciseId: step.id,
    sessionId,
    startedAt: Date.now(),
    wasDue: false,
    mode: "card",
  };
  state.steps[reviewSessionKey(sessionId)] = createStepProgress(step.code);
  await seed(page, state);
  await expect(
    page.getByRole("button", { name: "Mały eksperyment", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveCount(0);
  expect(
    assistanceForLessonStep(await saved(page), formatLesson, format).revealed,
  ).toBe(false);
  await page
    .getByRole("button", { name: "Mały eksperyment", exact: true })
    .click();
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveValue(
    step.code!,
  );
  await page
    .getByRole("textbox", { name: "Kod Rust" })
    .scrollIntoViewIfNeeded();
  await expect
    .poll(
      async () =>
        assistanceForLessonStep(await saved(page), formatLesson, format)
          .revealed,
    )
    .toBe(true);
});

test("revealing the authored solution discloses its supplied components while keeping normal coach assistance", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = ready();
  state.steps[stepKey(sourceLesson.id, source.id)] = {
    ...createStepProgress(source.code),
    code: "// własny szkic zamiast startera",
  };
  await seed(page, state);
  await expect(
    page.getByRole("heading", { name: source.title, exact: true }),
  ).toBeVisible();
  expect(helped(await saved(page))).toEqual([false, false]);
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  const sourceSolutionFacts = (value: UserState) =>
    value.events.filter(
      (event) =>
        event.lessonId === sourceLesson.id &&
        event.stepId === source.id &&
        event.id.startsWith("supplied-solution:"),
    );
  expect(sourceSolutionFacts(await saved(page))).toHaveLength(0);
  const revealedAt = Date.now();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await expect(page.locator(".revealed-solution pre")).toHaveText(
    source.solution!,
  );
  await expect
    .poll(async () => helped(await saved(page)))
    .toEqual([true, true]);
  const after = await saved(page);
  expect(after.steps[stepKey(sourceLesson.id, source.id)]).toMatchObject({
    hints: 2,
    revealed: true,
  });
  const facts = sourceSolutionFacts(after);
  expect(facts).toHaveLength(1);
  expect(facts[0]).toMatchObject({
    kind: "exposure",
    revealed: true,
    gate: false,
  });
  expect(facts[0].at).toBeGreaterThanOrEqual(revealedAt);
});

test("an editor loading placeholder does not disclose code before the fallback displays it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = ready();
  state.settings.accessibleEditor = false;
  state.resume.panel = "code";
  await page.route("**/monaco/**", (route) => route.abort());
  await seed(page, state);
  const fallback = page.getByRole("button", {
    name: "Otwórz prosty edytor",
    exact: true,
  });
  await expect(fallback).toBeVisible();
  await expect(page.locator("textarea.code-textarea")).toHaveCount(0);
  expect(helped(await saved(page))).toEqual([false, false]);
  await fallback.click();
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveValue(
    source.code!,
  );
  await expect
    .poll(async () => helped(await saved(page)))
    .toEqual([true, true]);
});

for (const display of [
  "code",
  "restored-solution",
  "explicit-reveal",
] as const) {
  test(`viewing ${display} records current facts when all supplied refs have inherited flags`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const state = ready();
    for (const [lesson, step] of [
      [formatLesson, format],
      [fileLesson, file],
    ] as const) {
      state.steps[stepKey(lesson.id, step.id)] = {
        ...createStepProgress(step.code),
        revealed: true,
      };
    }
    if (display !== "code") {
      state.steps[stepKey(sourceLesson.id, source.id)] = {
        ...createStepProgress(source.code),
        code: "// restored custom draft",
        hints: 2,
        revealed: display === "restored-solution",
      };
    }
    const helperFacts = (value: UserState) =>
      value.events.filter(
        (event) =>
          event.id.startsWith("supplied-solution:") &&
          ((event.lessonId === formatLesson.id && event.stepId === format.id) ||
            (event.lessonId === fileLesson.id && event.stepId === file.id)),
      );
    await seed(page, state);
    await expect(
      page.getByRole("heading", { name: source.title, exact: true }),
    ).toBeVisible();
    expect(helperFacts(await saved(page))).toHaveLength(0);
    const displayedAt = Date.now();
    if (display === "code") {
      await page.getByRole("tab", { name: "Kod", exact: true }).click();
      await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveValue(
        source.code!,
      );
    } else if (display === "explicit-reveal") {
      await page
        .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
        .click();
      await page
        .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
        .click();
    } else {
      await page.locator(".revealed-solution pre").scrollIntoViewIfNeeded();
    }
    await expect
      .poll(async () => helperFacts(await saved(page)).length)
      .toBe(2);
    const exposed = await saved(page);
    const facts = helperFacts(exposed);
    for (const fact of facts) {
      expect(fact).toMatchObject({
        kind: "exposure",
        revealed: true,
        gate: false,
      });
      expect(fact.at).toBeGreaterThanOrEqual(displayedAt);
    }
    if (display === "explicit-reveal") {
      expect(
        exposed.events.filter(
          (event) =>
            event.lessonId === sourceLesson.id &&
            event.stepId === source.id &&
            event.id.startsWith("supplied-solution:"),
        ),
      ).toHaveLength(1);
    }
    await page
      .getByRole("tab", {
        name: display === "code" ? "Zadanie" : "Kod",
        exact: true,
      })
      .click();
    await page
      .getByRole("tab", {
        name: display === "code" ? "Kod" : "Zadanie",
        exact: true,
      })
      .click();
    expect(helperFacts(await saved(page))).toEqual(facts);
    await page.reload();
    await expect(page.locator(".lesson-workspace")).toBeVisible();
    expect(helperFacts(await saved(page))).toEqual(facts);
  });
}

test("a later lifecycle solution keeps both earlier gates assisted after reloading", async ({
  page,
}) => {
  const lesson = lessons.find((item) => item.id === "service-readiness-drain")!;
  const replay = lesson.steps.find(
    (step) => step.id === "readiness-drain-replay-transfer",
  )!;
  const stage = modules.find((item) => item.id === lesson.moduleId)!;
  const criteria = stage.gateCriteria!.filter((item) =>
    item.taskRefs.some((ref) => ref.stepId === replay.id),
  );
  expect(criteria).toHaveLength(2);
  const state = ready();
  state.resume.lessonId = lesson.id;
  state.resume.stepIndex = lesson.steps.indexOf(replay);
  const key = stepKey(lesson.id, replay.id);
  const draft = "// własny szkic historii zamykania";
  state.steps[key] = createStepProgress(draft);
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, state);
  await expect(
    page.getByRole("heading", { name: replay.title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await expect(page.locator(".revealed-solution pre")).toHaveText(
    replay.solution!,
  );
  await expect
    .poll(async () => (await saved(page)).steps[key]?.revealed)
    .toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: replay.title, exact: true }),
  ).toBeVisible();
  const restored = await saved(page);
  expect(restored.steps[key].code).toBe(draft);
  for (const criterion of criteria) {
    const first = lesson.steps.find(
      (step) => step.id === criterion.taskRefs[0].stepId,
    )!;
    expect(assistanceForLessonStep(restored, lesson, first).revealed).toBe(
      true,
    );
    expect(courseGateRecovery(restored, criterion, lessons)).toEqual({
      status: "available",
      task: { lessonId: lesson.id, stepId: "readiness-job-ledger-transfer" },
    });
  }
});
