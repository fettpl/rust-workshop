import { localizedPackageFile } from "../../src/i18n/package-markdown";
import { test, expect, type Page } from "@playwright/test";
import type { UserState } from "../../src/domain/types";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { lessons, modules, projects } from "./polish-course.helper";
import {
  assertArchiveNotices,
  expectedArchivePaths,
} from "./archive-notices.helper";

const project = projects.find((item) => item.id === "concurrency-lab")!;

const labHelpKeys = [
  "atomic-cas:atomic-cas-conditional-blank",
  "release-acquire:release-acquire-publication-gate",
];

async function savedState(page: Page): Promise<UserState> {
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
          read.onerror = () => {
            database.close();
            reject(read.error);
          };
        };
      }),
  );
}

async function expectOnlyLabHelp(page: Page) {
  const state = await savedState(page);
  expect(
    Object.entries(state.steps)
      .filter(([, progress]) => progress.revealed)
      .map(([key]) => key)
      .sort(),
  ).toEqual([...labHelpKeys].sort());
  const supplied = state.events.filter((event) =>
    event.id.startsWith("supplied-solution:"),
  );
  expect(
    supplied.map((event) => `${event.lessonId}:${event.stepId}`).sort(),
  ).toEqual([...labHelpKeys].sort());
  for (const event of supplied)
    expect(event).toMatchObject({
      kind: "exposure",
      revealed: true,
      gate: false,
    });
  for (const key of labHelpKeys) expect(state.steps[key].completed).toBe(false);
  return state;
}

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
    // The worked ADR is present in both variants; viewing either supplies only
    // conditional CAS and publication, without completing either task.
    await expectOnlyLabHelp(page);
    const files = unzipSync(await readFile((await download.path())!));
    const archive = project.package!;
    expect(Object.keys(files).sort()).toEqual(expectedArchivePaths(archive));
    assertArchiveNotices(files, archive);
    for (const file of archive.files)
      expect(strFromU8(files[`${archive.id}/${file.path}`])).toBe(
        localizedPackageFile(file.path, variant === "solution" ? (file.solution ?? file.starter) : file.starter, "pl"),
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

for (const [stepId, assisted, title] of [
  [
    "atomic-cas-conditional-blank",
    true,
    "preserves the atomic blank draft while showing the ADR-supplied comparison",
  ],
  [
    "atomic-cas-retry-gate",
    false,
    "resumes a fresh atomic retry task through its lab project without revealing code",
  ],
] as const) {
  test(title, async ({ page }) => {
    const lesson = lessons.find((item) => item.id === "atomic-cas")!;
    const index = lesson.steps.findIndex((step) => step.id === stepId);
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
    await expect(editor).toHaveValue(lesson.steps[index].code ?? "");
    await expect(page.locator(".revealed-solution")).toHaveCount(0);
    await editor.fill("// Po konflikcie ponownie sprawdzę limit.\n");
    await expect(
      page
        .locator(".save-status")
        .filter({ hasText: "Zapisano na tym urządzeniu" }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Projekt", exact: true }).click();
    await expectOnlyLabHelp(page);
    await page.getByRole("button", { name: "Pracuj nad projektem" }).click();
    await expect(
      page.getByRole("heading", {
        name: lesson.steps[index].title,
        exact: true,
      }),
    ).toBeVisible();
    await expect(editor).toHaveValue(
      "// Po konflikcie ponownie sprawdzę limit.\n",
    );
    await expect(
      page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
    ).toHaveCount(assisted ? 1 : 0);
    if (assisted)
      await expect(page.locator(".revealed-solution pre")).toHaveText(
        lesson.steps[index].solution!,
      );
    const state = await expectOnlyLabHelp(page);
    expect(state.steps[`atomic-cas:${stepId}`].code).toBe(
      "// Po konflikcie ponownie sprawdzę limit.\n",
    );
    expect(state.steps[`atomic-cas:${stepId}`].completed).toBe(false);
  });
}
