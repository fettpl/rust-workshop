import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { lessons, modules, projects } from "../../src/content/course";

async function startCourse(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
}

async function openTokioFlow(page: Page) {
  const stage = modules.find((item) => item.id === "tokio-flow-control")!;
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

test("keeps Tokio gate diagnostics and a hinted draft, while revealed success cannot pass the module", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startCourse(page);
  const stage = await openTokioFlow(page);
  const ref = stage.gateCriteria![0].taskRefs[0];
  const lesson = lessons.find((item) => item.id === ref.lessonId)!;
  const step = lesson.steps.find((item) => item.id === ref.stepId)!;
  expect(step.evaluator?.kind).toBe("tests");
  expect(step.trustedFixtureTarget).toBe("cargo-tokio-runtime-1.53.1");

  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: step.title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = `${step.code}\n// Najpierw czekam na capacity kanału.\n`;
  await editor.fill(draft);

  const failure =
    "assertion failed: sender must wait while the bounded queue is full\n  left: Ready(Ok(()))\n right: Pending";
  const success = "test result: ok. 4 passed; 0 failed;";
  let runs = 0;
  await page.route("**/api/run", async (route) => {
    const code = runs === 0 ? draft : step.solution;
    expect(route.request().postDataJSON()).toEqual({
      code,
      mode: "test",
      tests:
        step.evaluator?.kind === "tests" ? step.evaluator.tests : undefined,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: runs === 0 ? "test-failure" : "success",
        stdout: runs === 0 ? failure : success,
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: runs === 0 ? { passed: 3, failed: 1 } : { passed: 4, failed: 0 },
      }),
    });
    runs += 1;
  });
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  const output = page.getByRole("region", { name: "Wynik kompilatora" });
  await expect(output).toContainText(failure);
  await expect(
    page.getByText("Testy ujawniły problem", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(draft);
  await expect(output).toContainText(failure);
  await expect(
    page.getByText(step.hints![0].replaceAll("`", ""), { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page
    .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
    .click();
  await expect(editor).toHaveValue(draft);
  await editor.fill(step.solution!);
  await page
    .getByRole("button", { name: "Uruchom testy", exact: true })
    .click();
  await expect(output).toContainText(success);
  await expect(page.locator(".feedback.passed")).toBeVisible();
  expect(runs).toBe(2);

  await page.getByRole("button", { name: stage.title, exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Co pokaże, że rozumiesz?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Potwierdzone")).toHaveCount(0);
  await expect(page.getByLabel("Do sprawdzenia")).toHaveCount(
    stage.gateCriteria!.length,
  );
  expect(errors).toEqual([]);
});

test("downloads the Tokio pipeline starter and keeps an unexposed gate fresh after package help", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const project = projects.find(
    (item) => item.package?.id === "tokio-pipeline-workshop",
  )!;
  const archive = project.package!;
  const stage = modules.find((item) => item.id === "tokio-flow-control")!;
  const freshRef = stage.gateCriteria![0].taskRefs[0];
  const freshLesson = lessons.find((item) => item.id === freshRef.lessonId)!;
  const freshStep = freshLesson.steps.find(
    (item) => item.id === freshRef.stepId,
  )!;
  expect(archive.revealStepRefs).toContainEqual(
    stage.gateCriteria![0].taskRefs[1],
  );

  await startCourse(page);
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: new RegExp(project.title) })
    .click();
  const panel = page.getByRole("region", { name: "Pakiet Cargo" });
  const started = page.waitForEvent("download");
  await panel.getByRole("link", { name: "Pobierz pakiet startowy" }).click();
  const download = await started;
  expect(download.suggestedFilename()).toBe(
    "tokio-pipeline-workshop-starter.zip",
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
  await expect(
    page.getByText("Zapisano na tym urządzeniu", { exact: true }),
  ).toBeVisible();

  await openTokioFlow(page);
  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: freshStep.title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Prosty edytor", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  await expect(editor).toHaveValue(freshStep.code ?? "");
  await expect(
    page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
  ).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Kod", exact: true }).click();
  await editor.focus();
  await expect(editor).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
