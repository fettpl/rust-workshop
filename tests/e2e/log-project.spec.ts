import { localizedPackageFile } from "../../src/i18n/package-markdown";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { lessons, modules, projects } from "./polish-course.helper";
import type { UserState } from "../../src/domain/types";
import { stepKey } from "../../src/persistence/state";
import {
  assertArchiveNotices,
  expectedArchivePaths,
} from "./archive-notices.helper";

test("shows a failed assertion as test feedback and preserves the corrected test", async ({
  page,
}) => {
  const lesson = lessons.find((item) => item.id === "testing-contracts")!;
  const step = lesson.steps.find((item) => item.id === "contracts-run")!;
  await page.route("**/api/run", async (route) => {
    const passed = route.request().postDataJSON().code === step.solution;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: passed ? "success" : "test-failure",
        stdout: passed
          ? "test result: ok. 2 passed; 0 failed;"
          : "assertion failed: left == right\n  left: 1\n right: 0\ntest result: FAILED. 1 passed; 1 failed;",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: passed ? 2 : 1, failed: passed ? 0 : 1 },
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Testowanie, regresje/ })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(lesson.steps.indexOf(step))
    .click();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(
    page.getByText("Testy ujawniły problem", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText("left: 1");
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(step.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(page.getByText(/Testy: 2 poprawnych/)).toBeVisible();
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(step.solution!);
  await expect(page.getByText(/Testy: 2 poprawnych/)).toBeVisible();
});

test("switches Cargo projects without leaking solution view, notes or help", async ({
  page,
}) => {
  const log = projects.find(
    (item) => item.package?.id === "log-analyzer-workshop",
  );
  expect(log).toBeDefined();
  const todo = projects.find(
    (item) => item.package?.id === "todo-cli-workshop",
  )!;
  const archive = log!.package!;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const picker = page.getByRole("navigation", { name: "Wybierz projekt" });
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  const notes = page.getByRole("textbox", { name: "Twoje obserwacje" });
  await picker.getByRole("button", { name: new RegExp(todo.title) }).click();
  await notes.fill("Todo: potwierdzam dopiero po zapisie.");
  await picker.getByRole("button", { name: new RegExp(log!.title) }).click();
  const learnerInstruction = page.locator(".learner-instruction");
  await expect(
    learnerInstruction.getByRole("heading", {
      name: "Projekt końcowy: Study Session CLI od zera",
      exact: true,
    }),
  ).toBeVisible();
  await expect(learnerInstruction).toContainText("Pierwsza linia zaczyna się jedną spacją.");
  const followUp = learnerInstruction.locator(
    "details.learner-instruction-followup",
  );
  await expect(followUp).toBeVisible();
  await expect(followUp).toContainText("--min-total N");
  await expect(followUp).not.toHaveAttribute("open", "");
  const followUpSummary = followUp.locator("summary");
  await expect(followUpSummary).toContainText("--min-total N");
  await followUpSummary.focus();
  await expect(followUpSummary).toBeFocused();
  await followUpSummary.press("Enter");
  await expect(followUp).toHaveAttribute("open", "");
  await expect(followUp).toContainText("--min-total 10");
  await picker.getByRole("button", { name: new RegExp(todo.title) }).click();
  await expect(page.locator(".learner-instruction")).toHaveCount(0);
  await picker.getByRole("button", { name: new RegExp(log!.title) }).click();
  await expect(learnerInstruction).toBeVisible();
  await expect(notes).toHaveValue("");
  await notes.fill("Logi: błędny wiersz nie znika przez filtr.");
  const started = page.waitForEvent("download");
  await panel.getByRole("link", { name: "Pobierz pakiet startowy" }).click();
  const download = await started;
  expect(download.suggestedFilename()).toBe(
    "log-analyzer-workshop-starter.zip",
  );
  expect(await download.failure()).toBeNull();
  const files = unzipSync(await readFile((await download.path())!));
  expect(Object.keys(files).sort()).toEqual(expectedArchivePaths(archive));
  assertArchiveNotices(files, archive);
  for (const file of archive.files)
    expect(strFromU8(files[`${archive.id}/${file.path}`])).toBe(localizedPackageFile(file.path, file.starter, "pl"));
  await panel
    .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
    .click();
  await expect(
    panel.getByRole("link", { name: "Pobierz rozwiązanie" }),
  ).toBeVisible();
  await picker.getByRole("button", { name: new RegExp(todo.title) }).click();
  await expect(notes).toHaveValue("Todo: potwierdzam dopiero po zapisie.");
  await expect(
    panel.getByRole("button", { name: "Pliki startowe", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    panel.getByRole("link", { name: "Pobierz pakiet startowy" }),
  ).toHaveAttribute("href", "/localized-projects/pl/todo-cli-workshop/starter.zip");
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await picker.getByRole("button", { name: new RegExp(log!.title) }).click();
  await expect(notes).toHaveValue("Logi: błędny wiersz nie znika przez filtr.");
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.getByLabel("Plik w pakiecie").selectOption("src/lib.rs");
  await panel.getByLabel("Zawartość pliku").focus();
  await expect(panel.getByLabel("Zawartość pliku")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("resumes the blank log report from its project card without revealing a solution", async ({
  page,
}) => {
  const lesson = lessons.find((item) => item.id === "log-analyzer-project");
  expect(lesson).toBeDefined();
  const index = lesson!.steps.findIndex((step) => step.id === "report-blank");
  expect(index).toBeGreaterThanOrEqual(0);
  const stage = modules.find((item) => item.id === "log-analyzer")!;
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
    .filter({ hasText: lesson!.title })
    .click();
  await page.locator('[aria-label="Kroki lekcji"] button').nth(index).click();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toHaveValue("");
  await editor.fill("// Raport: stała kolejność i osobny licznik błędów.\n");
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page.getByRole("button", { name: "Pracuj nad projektem" }).click();
  await expect(
    page.getByRole("heading", {
      name: lesson!.steps[index].title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(editor).toHaveValue(
    "// Raport: stała kolejność i osobny licznik błędów.\n",
  );
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toHaveCount(0);
});

test("downloads the Log Analyzer benchmark and result contract", async ({
  page,
}) => {
  const log = projects.find(
    (item) => item.package?.id === "log-analyzer-workshop",
  );
  expect(log).toBeDefined();
  const archive = log!.package!;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: new RegExp(log!.title) })
    .click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  await panel.getByRole("button", { name: "Pokaż rozwiązanie pakietu" }).click();
  const downloading = page.waitForEvent("download");
  await panel.getByRole("link", { name: "Pobierz rozwiązanie" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(`${archive.id}-solution.zip`);
  expect(await download.failure()).toBeNull();
  const files = unzipSync(await readFile((await download.path())!));
  expect(
    strFromU8(files[`${archive.id}/benches/log_analyzer.rs`]),
  ).toContain("criterion_main!");
  expect(
    strFromU8(files[`${archive.id}/tests/performance_contract.rs`]),
  ).toContain("baseline_and_candidate_have_the_same_result_shape");
});

test("keeps the appended parcel self-rating separate from independent coding and retention evidence", async ({
  page,
}) => {
  const foundation = lessons.find((item) => item.id === "foundations-assessment");
  expect(foundation).toBeDefined();
  const parcel = foundation?.steps.find(
    (step) => step.id === "foundations-local-parcel-program",
  );
  expect(
    parcel,
    "foundations-assessment must append the parcel local-program step",
  ).toBeDefined();
  if (!foundation || !parcel) return;
  expect(parcel.evaluator?.kind).toBe("rubric");
  expect(parcel.evidenceGate).not.toBe(true);

  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Fundamenty Rust/ })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: foundation.title })
    .click();
  await page
    .locator('[aria-label="Kroki lekcji"] button')
    .nth(foundation.steps.indexOf(parcel))
    .click();
  await expect(page.getByRole("heading", { name: parcel.title })).toBeVisible();
  const rubric = page.locator("details.rubric");
  await expect(rubric).toBeVisible();
  await rubric.locator("summary").click();
  await expect(rubric).toHaveAttribute("open", "");
  await expect(
    rubric.getByText(/To samoocena wyjaśnienia, nie automatyczna ocena/),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Twoje wyjaśnienie" })
    .fill("Samodzielnie opisałem granice i sprawdziłem je lokalnie.");
  const criteria = rubric.locator('input[type="checkbox"]');
  const criterionCount = await criteria.count();
  expect(criterionCount).toBeGreaterThan(0);
  for (let index = 0; index < criterionCount; index += 1)
    await criteria.nth(index).check();
  await page.getByRole("button", { name: "Sprawdź odpowiedź", exact: true }).click();
  await expect(
    page.locator(".feedback").filter({ hasText: "Sprawdziłeś każde kryterium" }),
  ).toBeVisible();
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();

  const observed = await page.evaluate(
    async ({ key, lessonId, stepId, conceptIds }) => {
      const state = await new Promise<UserState>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const read = request.result
            .transaction("user-state", "readonly")
            .objectStore("user-state")
            .get("current");
          read.onerror = () => reject(read.error);
          read.onsuccess = () => {
            request.result.close();
            resolve(read.result);
          };
        };
      });
      return {
        events: state.events.filter(
          (event: { lessonId: string; stepId: string }) =>
            event.lessonId === lessonId && event.stepId === stepId,
        ),
        progress: state.steps?.[key],
        mastery: conceptIds.map(
          (conceptId: string) => state.mastery?.[conceptId]?.level ?? "new",
        ),
      };
    },
    {
      key: stepKey(foundation.id, parcel.id),
      lessonId: foundation.id,
      stepId: parcel.id,
      conceptIds: parcel.evidence?.conceptIds ?? foundation.conceptIds,
    },
  );
  expect(observed.progress).toMatchObject({ completed: true });
  expect(observed.events.at(-1)).toMatchObject({
    kind: "self-rating",
    evaluator: "rubric",
    passed: true,
    revealed: false,
  });
  expect(observed.events.some((event: { gate?: boolean }) => event.gate === true)).toBe(
    false,
  );
  expect(
    observed.events.filter((event: { kind: string }) =>
      ["fix", "transfer", "project"].includes(event.kind),
    ),
  ).toHaveLength(0);
  expect(observed.mastery).not.toContain("understood");
  expect(observed.mastery).not.toContain("retained");
});

for (const [lessonId, stepId, explanation] of [
  ["log-records", "records-recall", "Po nagłówku zachowuję tekst w oryginale. Pustą wiadomość i samą biel odrzucam."],
  ["log-streaming", "stream-recall", "Odcinam separator, o ile jest. Sprawdzam każdy wpis, błędny zliczam osobno. Z poprawnych liczę tylko ostrzeżenie."],
  ["log-analyzer-project", "report-recall", "Nagłówek, filtr i pola wypisuję zawsze tak samo, również z zerem. Każdą linię kończę znakiem nowej linii."],
]) {
  test(`${stepId} accepts a learner explanation and resumes its self-check`, async ({ page }) => {
    const lesson = lessons.find((item) => item.id === lessonId)!;
    const index = lesson.steps.findIndex((step) => step.id === stepId);
    await page.goto("/");
    await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
    await page.getByRole("button", { name: "Przejdź do nauki" }).click();
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page.locator(".module-picker").getByRole("button", { name: /Log Analyzer: rekord, strumień, raport/ }).click();
    await page.locator(".lesson-list-item").filter({ hasText: lesson.title }).click();
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(index).click();

    const answer = page.getByRole("textbox", { name: "Twoje wyjaśnienie" });
    await answer.fill(explanation);
    await page.getByText("Porównaj z kryteriami", { exact: true }).click();
    await expect(page.locator("details.rubric")).toContainText("To samoocena wyjaśnienia");
    const checks = page.locator("details.rubric").getByRole("checkbox");
    const submit = page.getByRole("button", { name: "Sprawdź odpowiedź", exact: true });
    await checks.first().check();
    await submit.click();
    await expect(page.locator(".feedback")).toContainText("zaznacz każde kryterium");
    for (const box of await checks.all()) await box.check();
    await submit.click();
    await expect(page.locator(".feedback.passed")).toContainText("Sprawdziłeś każde kryterium");
    await expect(page.locator(".save-status")).toContainText("Zapisano na tym urządzeniu");
    await page.reload();
    await expect(answer).toHaveValue(explanation);
    await page.getByText("Porównaj z kryteriami", { exact: true }).click();
    for (const box of await checks.all()) await expect(box).toBeChecked();
    await expect(page.locator(".feedback.passed")).toBeVisible();
  });
}
