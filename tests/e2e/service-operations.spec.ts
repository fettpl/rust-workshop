import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { lessons, modules, projects } from "../../src/content/course";

const moduleId = "service-operations";
const projectId = "service-operations";

async function openServiceOperations(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  const stage = modules.find((module) => module.id === moduleId)!;
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill(stage.title);
  await page
    .locator(".module-picker > button")
    .filter({ hasText: stage.title })
    .click();
  return stage;
}

test("navigates, resumes a Service Operations gate, and downloads its authored package", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const stage = await openServiceOperations(page);
  const ref = stage.gateCriteria![0].taskRefs[0];
  const lesson = lessons.find((candidate) => candidate.id === ref.lessonId)!;
  const step = lesson.steps.find((candidate) => candidate.id === ref.stepId)!;

  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: step.title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = `${step.code ?? ""}\n// Trust and accounting stay explicit.\n`;
  await editor.fill(draft);
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: step.title, exact: true })).toBeVisible();
  await expect(editor).toHaveValue(draft);

  const project = projects.find((candidate) => candidate.id === projectId)!;
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  const picker = page.getByRole("navigation", { name: "Wybierz projekt" });
  await picker
    .getByRole("button", { name: new RegExp(project.title) })
    .click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  const downloadStarted = page.waitForEvent("download");
  await panel
    .getByRole("link", { name: "Pobierz pakiet startowy", exact: true })
    .click();
  const download = await downloadStarted;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toBe(
    "service-operations-workshop-starter.zip",
  );
  const files = unzipSync(await readFile((await download.path())!));
  expect(Object.keys(files).sort()).toEqual(
    project.package!.files.map((file) => `${project.package!.id}/${file.path}`).sort(),
  );
  for (const file of project.package!.files)
    expect(strFromU8(files[`${project.package!.id}/${file.path}`])).toBe(file.starter);
  expect(errors).toEqual([]);
});
