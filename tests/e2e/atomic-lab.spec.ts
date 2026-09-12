import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { lessons, modules, projects } from "../../src/content/course";

const project = projects.find((item) => item.id === "concurrency-lab")!;

test("downloads the actual Loom lab and keeps project work separate after viewing a reference", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const picker = page.getByRole("navigation", { name: "Wybierz projekt" });
  await picker.getByRole("button", { name: new RegExp(project.title) }).click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  const notes = page.getByRole("textbox", { name: "Twoje obserwacje" });
  await notes.fill("Publikację sprawdzam przed join; None pozostaje legalne.");
  for (const variant of ["starter", "solution"] as const) {
    if (variant === "solution")
      await panel
        .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
        .click();
    const started = page.waitForEvent("download");
    await panel
      .getByRole("link", {
        name:
          variant === "starter"
            ? "Pobierz pakiet startowy"
            : "Pobierz rozwiązanie",
        exact: true,
      })
      .click();
    const download = await started;
    expect(await download.failure()).toBeNull();
    const files = unzipSync(await readFile((await download.path())!));
    const archive = project.package!;
    expect(Object.keys(files).sort()).toEqual(
      archive.files.map((file) => `${archive.id}/${file.path}`).sort(),
    );
    for (const file of archive.files)
      expect(strFromU8(files[`${archive.id}/${file.path}`])).toBe(
        variant === "solution" ? (file.solution ?? file.starter) : file.starter,
      );
  }
  const todo = projects.find((item) => item.id === "todo-command-session")!;
  await picker.getByRole("button", { name: new RegExp(todo.title) }).click();
  await expect(notes).toHaveValue("");
  await expect(
    panel.getByRole("link", { name: "Pobierz pakiet startowy" }),
  ).toBeVisible();
  await page.reload();
  await picker.getByRole("button", { name: new RegExp(project.title) }).click();
  await expect(notes).toHaveValue(
    "Publikację sprawdzam przed join; None pozostaje legalne.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.getByLabel("Plik w pakiecie").selectOption("tests/models.rs");
  await expect(panel.getByLabel("Zawartość pliku")).toContainText(
    "builder.max_permutations = None",
  );
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

test("resumes a fresh atomic task through its lab project without revealing code", async ({
  page,
}) => {
  const lesson = lessons.find((item) => item.id === "atomic-cas")!;
  const index = lesson.steps.findIndex((step) => step.kind === "blank");
  const stage = modules.find((item) => item.id === lesson.moduleId)!;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill("atomic");
  await page
    .locator(".module-picker")
    .getByRole("button", { name: new RegExp(stage.title) })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: lesson.title })
    .click();
  await page.locator('[aria-label="Kroki lekcji"] button').nth(index).click();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toHaveValue("");
  await editor.fill("// Po konflikcie ponownie sprawdzę limit.\n");
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page.getByRole("button", { name: "Pracuj nad projektem" }).click();
  await expect(
    page.getByRole("heading", { name: lesson.steps[index].title, exact: true }),
  ).toBeVisible();
  await expect(editor).toHaveValue(
    "// Po konflikcie ponownie sprawdzę limit.\n",
  );
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toHaveCount(0);
});
