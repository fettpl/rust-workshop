import { expect, test, type Page } from "@playwright/test";

async function chooseCode(page: Page, code: string): Promise<void> {
  const plainEditor = page.locator(
    'textarea.code-textarea[aria-label="Kod Rust"]',
  );
  if (await plainEditor.count()) {
    await plainEditor.fill(code);
    return;
  }
  const fallback = page.getByRole("button", { name: "Otwórz prosty edytor" });
  if (await fallback.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await fallback.click();
    await plainEditor.fill(code);
    return;
  }
  const monaco = page.locator(".monaco-editor").first();
  await expect(monaco).toBeVisible({ timeout: 20_000 });
  await monaco.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(code);
}

async function completeOnboarding(page: Page, name = "Ada"): Promise<void> {
  await expect(page.getByRole("heading", { name: /Zrozum kod/ })).toBeVisible();
  await page.getByPlaceholder("Twoje imię").fill(name);
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
}

async function answerDiagnostic(page: Page, answer: string): Promise<void> {
  await page.getByLabel("Twoja odpowiedź").fill(answer);
  await page.getByRole("button", { name: /Sprawdź$/ }).click();
  await expect(
    page.getByRole("button", { name: /Dalej|Otwórz warsztat/ }),
  ).toBeVisible();
}

async function completeBasicsDiagnosticAndRustCheck(page: Page): Promise<void> {
  await answerDiagnostic(page, "12");
  await page.getByRole("button", { name: "Dalej" }).click();
  await answerDiagnostic(page, "age >= 18");
  await page.getByRole("button", { name: "Dalej" }).click();
  await answerDiagnostic(page, "bool");
  await page.getByRole("button", { name: "Dalej" }).click();

  await chooseCode(
    page,
    `fn double(n: i32) -> i32 {
    n * 2
}`,
  );
  await page.getByRole("button", { name: "Uruchom testy" }).click();
  await expect(page.getByText("Testy przeszły.")).toBeVisible();
  const openWorkshop = page.getByRole("button", { name: "Otwórz warsztat" });
  await openWorkshop.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeVisible();
  await expect.soft(page.locator("#main-content")).toBeFocused();
}

async function mockRunner(page: Page): Promise<void> {
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON() as { mode?: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: request.mode === "test" ? "" : "3\n",
        stderr: "",
        diagnostics: [],
        durationMs: 3,
        ...(request.mode === "test" ? { tests: { passed: 3, failed: 0 } } : {}),
      }),
    });
  });
}

async function openSettings(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Ustawienia i postęp" })
    .dispatchEvent("click");
}

test("keeps onboarding, lesson work, settings, notes, and exports across reloads", async ({
  page,
}) => {
  await mockRunner(page);
  await page.goto("/");
  await completeOnboarding(page);
  await completeBasicsDiagnosticAndRustCheck(page);

  await expect(
    page.getByRole("heading", { name: "Cześć, Ada." }),
  ).toBeVisible();
  await openSettings(page);
  await page
    .getByRole("checkbox", { name: "Używaj prostego edytora tekstowego" })
    .check();
  await expect(page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" })).toBeVisible();
  await page.getByRole("button", { name: "Twój warsztat" }).click();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).click();
  await expect(
    page.getByRole("heading", { name: "Znajdź punkt wejścia" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Własność/ })
    .click();
  await page.locator(".lesson-list-item").first().click();
  await expect(
    page.getByRole("heading", { name: "Przewidź liczbę" }),
  ).toBeVisible();

  const steps = page.locator('[aria-label="Kroki lekcji"] button');
  await steps.nth(1).click();
  await expect(
    page.locator('textarea.code-textarea[aria-label="Kod Rust"]'),
  ).toBeVisible();
  await page
    .locator('textarea.code-textarea[aria-label="Kod Rust"]')
    .fill('fn main() { println!("saved"); }');
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await expect(page.getByText("WSKAZÓWKA 1 · OBSZAR")).toBeVisible();
  await page.getByRole("button", { name: "Dodaj zakładkę" }).click();
  await page.getByText("Twój notatnik").click();
  await page
    .getByLabel("Notatki do lekcji")
    .fill("Własność przechodzi razem z wartością.");
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Uruchom przykład" }),
  ).toBeVisible();
  await expect(
    page.locator('textarea.code-textarea[aria-label="Kod Rust"]'),
  ).toHaveValue('fn main() { println!("saved"); }');
  await expect(page.getByText("WSKAZÓWKA 1 · OBSZAR")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Usuń zakładkę" }),
  ).toBeVisible();
  await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(
    "Własność przechodzi razem z wartością.",
  );

  await page.getByRole("button", { name: "Skupienie" }).click();
  await expect(page.locator(".app-shell")).toHaveClass(/focus-mode/);
  await page.getByRole("button", { name: "Wyjdź ze skupienia" }).click();
  await openSettings(page);
  await page.getByRole("button", { name: "Ciemny", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksportuj postęp" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  const importInput = page.getByLabel("Importuj postęp");
  await importInput.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.getByText(/Plik ma niepoprawny format/)).toBeVisible();
  await importInput.setInputFiles(downloadPath!);
  await expect(page.getByText("Gotowy do importu")).toBeVisible();
  await page.getByRole("button", { name: "Zastąp postęp tym plikiem" }).click();
  await expect(page.getByText(/Wersja danych:/)).toBeVisible();
});

test("exposes lesson, code, and output tabs on a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await completeOnboarding(page, "Maja");
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).click();

  await expect(page.getByRole("tab", { name: "Zadanie" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: "Kod" }).click();
  await expect(page.getByRole("tab", { name: "Kod" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: /Output/ }).click();
  await expect(page.getByRole("tab", { name: /Output/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".lesson-workspace")).toHaveClass(
    /mobile-panel-output/,
  );
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`shows the first task and resumes the selected exercise with the keyboard at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockRunner(page);
    await page.goto("/");
    await expect(page.getByText("Ile czasu masz na jedną sesję?")).toHaveCount(0);
    await completeOnboarding(page);
    await completeBasicsDiagnosticAndRustCheck(page);

    const mobile = viewport.width < 600;
    const menu = page.getByRole("button", { name: "Otwórz nawigację" });
    async function openDashboard() {
      if (mobile) await menu.press("Enter");
      await page.getByRole("button", { name: "Twój warsztat", exact: true }).press("Enter");
    }
    if (mobile) await menu.press("Enter");
    await page.getByRole("button", { name: "Ustawienia i postęp" }).press("Enter");
    await page.getByRole("checkbox", { name: "Używaj prostego edytora tekstowego" }).check();
    await openDashboard();

    const entry = page.getByRole("button", { name: "Wejdź do lekcji" });
    const lessonCard = page.getByRole("region", { name: "Pierwszy program i pierwszy przebieg" });
    await expect(lessonCard.getByText("Rozpoznasz", { exact: false })).toBeVisible();
    await expect(lessonCard.locator(".continue-meta").getByText("Znajdź punkt wejścia")).toBeVisible();
    await entry.press("Enter");
    await expect(page.getByRole("heading", { name: "Znajdź punkt wejścia" })).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "Kroki lekcji" });
    const firstControl = navigation.getByRole("button", { name: "Znajdź punkt wejścia" });
    const secondControl = navigation.getByRole("button", { name: "Uruchom minimalny program" });
    await expect(firstControl).toHaveAttribute("aria-current", "step");
    await page.getByRole("button", { name: "Dodaj zakładkę" }).focus();
    await page.keyboard.press("Tab");
    await expect(firstControl).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(secondControl).toBeFocused();
    await expect(secondControl).toBeInViewport();
    await page.keyboard.press("Enter");
    const secondStep = page.getByRole("heading", { name: "Uruchom minimalny program" });
    await expect(secondStep).toBeVisible();
    await page.getByText("Twój notatnik", { exact: true }).click();
    await page.getByLabel("Notatki do lekcji").fill("Najpierw uruchamia się main.");
    if (mobile) await page.getByRole("tab", { name: "Zadanie" }).press("ArrowRight");
    const editor = page.getByRole("textbox", { name: "Kod Rust" });
    const draft = 'fn main() { println!("Mój szkic"); }';
    await editor.fill(draft);
    await expect(page.getByRole("status").filter({ hasText: "Zapisano na tym urządzeniu" })).toBeVisible();

    await page.reload();
    await expect(editor).toHaveValue(draft);
    if (mobile) await expect(page.getByRole("tab", { name: "Kod" })).toHaveAttribute("aria-selected", "true");
    await openDashboard();
    const resume = page.getByRole("button", { name: "Kontynuuj naukę" });
    await expect(resume).toBeVisible();
    await expect(lessonCard.locator(".continue-meta").getByText("Uruchom minimalny program")).toBeVisible();
    await resume.press("Enter");
    await expect(editor).toHaveValue(draft);
    if (mobile) {
      await expect(page.getByRole("tab", { name: "Kod" })).toHaveAttribute("aria-selected", "true");
      await page.getByRole("tab", { name: "Kod" }).press("ArrowLeft");
    }
    await expect(secondStep).toBeVisible();
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue("Najpierw uruchamia się main.");
  });
}
