import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { lessons, modules, projects } from "../../src/content/course";
import {
  assertArchiveNotices,
  expectedArchivePaths,
} from "./archive-notices.helper";

for (const [projectId, moduleId] of [
  ["tokio-service", "tokio-network-service"],
  ["frame-protocol", "public-api-workspaces"],
  ["mini-grep", "mini-grep"],
  ["number-guessing-result-message", "number-guessing-plus"],
  ["ffi-buffer", "unsafe-ffi-contracts"],
]) {
  test(`${projectId}: downloads exact package files and preserves fresh gates after reveal`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const project = projects.find((item) => item.id === projectId)!;
    const archive = project.package!;
    const stage = modules.find((item) => item.id === moduleId)!;
    const fresh = stage.gateCriteria![0].taskRefs[1];
    const expectedStepRef =
      projectId === "ffi-buffer" || projectId === "tokio-service"
        ? stage.gateCriteria![0].taskRefs[0]
        : fresh;
    const expectedLesson = lessons.find(
      (item) => item.id === expectedStepRef.lessonId,
    )!;
    const expectedStep = expectedLesson.steps.find(
      (item) => item.id === expectedStepRef.stepId,
    )!;
    await page.goto("/");
    await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
    await page.getByRole("button", { name: "Przejdź do nauki" }).click();
    await page.getByRole("button", { name: "Projekt", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Wybierz projekt" })
      .getByRole("button", { name: project.title })
      .click();
    const panel = page.getByRole("region", { name: "Pakiet Cargo" });
    const downloading = page.waitForEvent("download");
    await panel.getByRole("link", { name: "Pobierz pakiet startowy" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(`${archive.id}-starter.zip`);
    expect(await download.failure()).toBeNull();
    const files = unzipSync(await readFile((await download.path())!));
    expect(Object.keys(files).sort()).toEqual(expectedArchivePaths(archive));
    assertArchiveNotices(files, archive);
    for (const file of archive.files)
      expect(strFromU8(files[`${archive.id}/${file.path}`])).toBe(file.starter);
    await panel
      .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
      .click();
    await expect(
      panel.getByRole("link", { name: "Pobierz rozwiązanie" }),
    ).toBeVisible();
    await expect(
      page
        .locator(".save-status")
        .filter({ hasText: "Zapisano na tym urządzeniu" }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole("navigation", { name: "Wybierz projekt" })
      .getByRole("button", { name: project.title })
      .click();
    // Project selection and package variant are view state. The saved exposure
    // must still direct the module criterion to its fresh alternative below.
    await expect(
      panel.getByRole("link", { name: "Pobierz pakiet startowy" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(stage.title);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: stage.title })
      .click();
    await expect(page.getByLabel("Potwierdzone")).toHaveCount(0);
    await page.locator(".gate-action").first().click();
    await expect(page.locator(".task-pane h1")).toHaveText(expectedStep.title);
    await page
      .getByRole("button", { name: "Prosty edytor", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Kod Rust", exact: true }),
    ).toHaveValue(expectedStep.code ?? "");
    await expect(
      page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
