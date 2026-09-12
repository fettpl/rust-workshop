import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, modules, projects } from "../../src/content/course";

test("keeps separate project notes and schedules the selected project's concepts", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const todo = projects.find(
    (project) => project.id === "todo-command-session",
  )!;
  const picker = page.getByRole("navigation", { name: "Wybierz projekt" });
  const notes = page.getByRole("textbox", { name: "Twoje obserwacje" });
  await notes.fill("Własność: pożyczam dane do odczytu.");
  await picker.getByRole("button", { name: new RegExp(todo.title) }).click();
  await expect(notes).toHaveValue("");
  await notes.fill("Todo: po błędzie sprawdzam również stan.");
  await page
    .getByRole("button", { name: /^Powtórz:/ })
    .first()
    .click();
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(
    async () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = indexedDB.open("rust-workshop-state", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction("user-state")
            .objectStore("user-state")
            .get("current");
          read.onsuccess = () => {
            resolve(read.result);
            db.close();
          };
          read.onerror = () => reject(read.error);
        };
      }),
  );
  expect(saved.review).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ conceptId: todo.reviewConceptIds![0] }),
    ]),
  );
  await picker
    .getByRole("button", { name: new RegExp(projects[0].title) })
    .click();
  await expect(notes).toHaveValue("Własność: pożyczam dane do odczytu.");
  await page.reload();
  await picker.getByRole("button", { name: new RegExp(todo.title) }).click();
  await expect(notes).toHaveValue("Todo: po błędzie sprawdzam również stan.");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: todo.title, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("todo-project-mobile.png"),
    fullPage: true,
  });
});

test("opens the expanded map and retains a new collection solution", async ({
  page,
}, testInfo) => {
  const lesson = lessons.find((lesson) => lesson.id === "vec-and-borrowing")!;
  const step = lesson.steps.find((step) => step.id === "vec-repair")!;
  await page.route("**/api/run", async (route) => {
    const correct = route.request().postDataJSON().code === step.solution;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: correct ? "success" : "compile-error",
        stdout: "",
        stderr: correct ? "" : "E0502: conflicting borrow",
        diagnostics: correct
          ? []
          : [{ level: "error", code: "E0502", message: "conflicting borrow" }],
        durationMs: 1,
        ...(correct ? { tests: { passed: 1, failed: 0 } } : {}),
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  for (const stage of modules.filter((stage) =>
    ["collections", "error-handling", "todo-project"].includes(stage.id),
  )) {
    await page
      .locator(".module-picker")
      .getByRole("button", {
        name: new RegExp(stage.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .click();
    await expect(
      page.getByRole("heading", { name: stage.title, exact: true }),
    ).toBeVisible();
  }
  const collections = modules.find((stage) => stage.id === "collections")!;
  await page
    .locator(".module-picker")
    .getByRole("button", { name: new RegExp(collections.title) })
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
    page.getByText("Błąd kompilacji", { exact: true }),
  ).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await editor.fill(step.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(page.getByText(/Testy: 1 poprawnych/)).toBeVisible();
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(step.solution!);
  await page.screenshot({
    path: testInfo.outputPath("collections-repair.png"),
    fullPage: true,
  });
});

test("continues the current lesson of a multi-stage project", async ({
  page,
}) => {
  const lesson = lessons.find((item) => item.id === "todo-state-invariants")!;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Todo CLI: polecenia i sesje/ })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page.locator('[aria-label="Kroki lekcji"] button').nth(2).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page.getByRole("button", { name: "Pracuj nad projektem" }).click();
  await expect(
    page.getByRole("heading", { name: lesson.steps[2].title, exact: true }),
  ).toBeVisible();
});
