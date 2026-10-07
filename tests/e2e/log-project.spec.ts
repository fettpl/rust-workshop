import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { lessons, modules, projects } from "../../src/content/course";

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
    page.locator(".save-status"),
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
  expect(Object.keys(files).sort()).toEqual(
    archive.files.map((file) => `${archive.id}/${file.path}`).sort(),
  );
  for (const file of archive.files)
    expect(strFromU8(files[`${archive.id}/${file.path}`])).toBe(file.starter);
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
  ).toHaveAttribute("href", "/projects/todo-cli-workshop/starter.zip");
  await expect(
    page.locator(".save-status"),
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
    page.locator(".save-status"),
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
