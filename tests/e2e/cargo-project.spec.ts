import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { projects } from "../../src/content/course";

test("downloads the Cargo starter, separates reference help and preserves it after reload", async ({
  page,
}, testInfo) => {
  const project = projects.find((item) => item.package)!;
  expect(project, "Course must offer a real Cargo package").toBeDefined();
  const archive = project.package!;
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: new RegExp(project.title) })
    .click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  await expect(
    panel.getByRole("heading", { name: archive.title }),
  ).toBeVisible();
  await panel.getByLabel("Plik w pakiecie").selectOption("Cargo.toml");
  await expect(panel.getByLabel("Zawartość pliku")).toContainText(
    'edition = "2024"',
  );
  const started = page.waitForEvent("download");
  await panel.getByRole("link", { name: "Pobierz pakiet startowy" }).click();
  const download = await started;
  expect(download.suggestedFilename()).toBe(`${archive.id}-starter.zip`);
  const path = testInfo.outputPath("starter.zip");
  await download.saveAs(path);
  const contents = unzipSync(await readFile(path));
  expect(Object.keys(contents).sort()).toEqual(
    archive.files.map((file) => `${archive.id}/${file.path}`).sort(),
  );
  for (const file of archive.files)
    expect(strFromU8(contents[`${archive.id}/${file.path}`])).toBe(
      file.starter,
    );
  const readState = () =>
    page.evaluate(
      async () =>
        new Promise<{
          steps: Record<string, { revealed: boolean }>;
          events: { kind: string }[];
        }>((resolve, reject) => {
          const request = indexedDB.open("rust-workshop-state", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const current = db
              .transaction("user-state")
              .objectStore("user-state")
              .get("current");
            current.onsuccess = () => {
              resolve(current.result);
              db.close();
            };
            current.onerror = () => reject(current.error);
          };
        }),
    );
  const before = await readState();
  expect(
    Object.keys(before.steps).some((key) =>
      archive.revealStepRefs.some(
        (ref) => key === `${ref.lessonId}:${ref.stepId}`,
      ),
    ),
  ).toBe(false);
  await panel
    .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
    .click();
  await expect(
    panel.getByRole("link", { name: "Pobierz rozwiązanie" }),
  ).toBeVisible();
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const after = await readState();
  const helped = Object.entries(after.steps).filter(([key]) =>
    archive.revealStepRefs.some(
      (ref) => key === `${ref.lessonId}:${ref.stepId}`,
    ),
  );
  expect(helped.length).toBeGreaterThan(0);
  expect(helped.every(([, progress]) => progress.revealed)).toBe(true);
  expect(
    after.events
      .slice(before.events.length)
      .every((event) => event.kind === "exposure"),
  ).toBe(true);
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: new RegExp(project.title) })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.getByLabel("Plik w pakiecie").selectOption("src/storage.rs");
  await panel.getByLabel("Zawartość pliku").focus();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("cargo-package-mobile.png"),
    fullPage: true,
  });
});
