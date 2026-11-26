import { expect, test } from "@playwright/test";
import { projects } from "../../src/content/course";
import { LOCALE_STORAGE_KEY } from "../../src/i18n/ui-locale";

test.use({ locale: "en-GB" });

test("uses the browser language on a new visit and preserves drafts across language changes", async ({
  page,
}) => {
  const draft = 'fn main() { println!("Witaj, Rust!"); }';
  const note = "Zapisano na tym urządzeniu";
  const name = "Twój warsztat";
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText("01 PREDICT", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Understand the code/ }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Language" }).selectOption("pl");
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  await expect(page.getByText("01 PRZEWIDŹ", { exact: true })).toBeVisible();
  await page.getByPlaceholder("Twoje imię").fill(name);
  await page.getByRole("combobox", { name: "Język" }).selectOption("en");
  await expect(page.getByPlaceholder("Your name")).toHaveValue(name);
  await page.getByRole("button", { name: "Check your starting point" }).click();

  await page.getByLabel("Your answer").fill("12");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("That’s right.");
  await page.getByRole("combobox", { name: "Language" }).selectOption("pl");
  await expect(page.getByLabel("Twoja odpowiedź")).toHaveValue("12");
  await expect(page.getByRole("status")).toContainText("Zgadza się.");
  await page.getByRole("combobox", { name: "Język" }).selectOption("en");
  await page.getByRole("button", { name: "Continue to the lessons" }).click();
  await expect(
    page.getByRole("heading", { name: `Hello, ${name}.` }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Main navigation" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Settings and progress" }).click();
  await page
    .getByRole("checkbox", { name: "Use the plain-text editor" })
    .check();
  await page.getByRole("button", { name: "Your workshop" }).click();
  await page.getByRole("button", { name: "Open lesson" }).click();
  await expect(page.locator(".task-pane h1")).toHaveText(/entry point/i);
  await page
    .getByRole("navigation", { name: "Lesson steps" })
    .getByRole("button")
    .nth(1)
    .click();
  const editor = page.getByRole("textbox", { name: "Rust code" });
  await expect(editor).toHaveValue(/Witaj, Rust!/);
  await editor.fill(draft);
  await page.getByText("Your journal", { exact: true }).click();
  await page.getByRole("textbox", { name: "Lesson notes" }).fill(note);
  await page.getByRole("button", { name: "Add bookmark" }).click();
  await page.getByRole("button", { name: "Focus mode" }).click();

  await page.getByRole("combobox", { name: "Language" }).selectOption("pl");
  await expect(
    page.getByRole("button", { name: "Wyjdź ze skupienia" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Kod Rust" })).toHaveValue(
    draft,
  );
  await expect(
    page.getByRole("textbox", { name: "Notatki do lekcji" }),
  ).toHaveValue(note);
  await expect(
    page.getByRole("button", { name: "Usuń zakładkę" }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Język" }).selectOption("en");
  await expect(page.locator(".save-status")).toHaveText("Saved on this device");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("combobox", { name: "Language" })).toHaveValue(
    "en",
  );
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByRole("button", { name: "Remove bookmark" }),
  ).toBeVisible();
  await page.getByText("Your journal", { exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Lesson notes" })).toHaveValue(
    note,
  );
  await expect(
    page.getByRole("button", { name: "Exit focus mode" }),
  ).toBeVisible();
});

test("searches localized topics and keeps Polish for a legacy profile", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Check your starting point" }).click();
  await page.getByRole("button", { name: "Continue to the lessons" }).click();
  await page.getByRole("button", { name: "Learning map" }).click();
  const englishBrowser = page.getByRole("region", { name: "Course modules" });
  await englishBrowser
    .getByRole("searchbox", { name: "Find a module or topic" })
    .fill("ownership");
  await expect(englishBrowser.getByRole("status")).toContainText(
    /Modules: [1-9]\d* of/,
  );
  await expect(englishBrowser.getByRole("status")).toContainText(
    "entire course",
  );

  await page.getByRole("combobox", { name: "Language" }).selectOption("pl");
  const polishBrowser = page.getByRole("region", { name: "Moduły kursu" });
  await polishBrowser
    .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
    .fill("własność");
  await expect(polishBrowser.getByRole("status")).toContainText(
    /Moduły: [1-9]\d* z/,
  );
  await expect(polishBrowser.getByRole("status")).toContainText(
    "zakres: cały kurs",
  );
  await expect(page.locator(".save-status")).toHaveText(
    "Zapisano na tym urządzeniu",
  );

  await page.evaluate(
    (key) => localStorage.removeItem(key),
    LOCALE_STORAGE_KEY,
  );
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Język" })).toHaveValue("pl");
  await expect(polishBrowser).toBeVisible();
});

test("localizes the ownership lesson phase and its navigation across language changes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Check your starting point" }).click();
  await page.getByRole("button", { name: "Continue to the lessons" }).click();
  await page.getByRole("button", { name: "Learning map" }).click();
  await page
    .getByRole("button", { name: /Ownership: who is responsible for a value/ })
    .click();
  await page.getByRole("button", { name: /Borrow before duplicating/ }).click();

  const phase = page.locator(".task-pane > .eyebrow");
  const englishSteps = page.getByRole("navigation", { name: "Lesson steps" });
  await expect(phase).toHaveText("STEP 1 OF 6 · Predict");
  const remainingPhases = ["Trace", "Fix", "Modify", "Explain", "Apply"];
  for (const [index, label] of remainingPhases.entries()) {
    await englishSteps
      .getByRole("button", { name: new RegExp(`${label}$`) })
      .click();
    await expect(phase).toHaveText(`STEP ${index + 2} OF 6 · ${label}`);
  }

  await page.getByRole("combobox", { name: "Language" }).selectOption("pl");
  await expect(phase).toHaveText("KROK 6 Z 6 · Zastosuj");
  await page
    .getByRole("navigation", { name: "Kroki lekcji" })
    .getByRole("button", { name: /Napraw$/ })
    .click();
  await expect(phase).toHaveText("KROK 3 Z 6 · Napraw");

  await page.getByRole("combobox", { name: "Język" }).selectOption("en");
  await expect(phase).toHaveText("STEP 3 OF 6 · Fix");
});

test("localizes Monaco accessibility and connection feedback while preserving raw compiler text", async ({
  page,
}) => {
  const connectionMessage =
    "Nie udało się połączyć z kompilatorem. Kod pozostaje zapisany. Spróbuj ponownie po odzyskaniu połączenia.";
  let connectionFailed = true;
  await page.route("**/api/run", async (route) => {
    if (connectionFailed) return route.abort("internetdisconnected");
    return route.fulfill({
      json: {
        status: "compile-error",
        stdout: "Zapisano na tym urządzeniu",
        stderr: connectionMessage,
        diagnostics: [],
        durationMs: 1,
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Check your starting point" }).click();
  await page.getByRole("button", { name: "Continue to the lessons" }).click();
  await page.getByRole("button", { name: "Open lesson" }).click();
  await page
    .getByRole("navigation", { name: "Lesson steps" })
    .getByRole("button")
    .nth(1)
    .click();

  const monaco = page.locator(".monaco-editor");
  await expect(monaco).toBeVisible();
  await expect(monaco.locator('[aria-label^="Rust code"]')).toBeAttached();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  const englishOutput = page.getByRole("region", { name: "Compiler output" });
  await expect(englishOutput).toContainText(
    "Could not connect to the compiler.",
  );
  await expect(englishOutput).not.toContainText(connectionMessage);
  await expect(englishOutput.locator("header")).toContainText("OUTPUT");

  await page.getByRole("combobox", { name: "Language" }).selectOption("pl");
  await expect(monaco.locator('[aria-label^="Kod Rust"]')).toBeAttached();
  await expect(
    page.getByRole("region", { name: "Wynik kompilatora" }),
  ).toContainText(connectionMessage);

  connectionFailed = false;
  await page.getByRole("button", { name: "Uruchom", exact: true }).click();
  await expect(page.getByRole("region", { name: "Wynik kompilatora" }).locator("header")).toContainText("WYJŚCIE");
  await page.getByRole("combobox", { name: "Język" }).selectOption("en");
  await expect(englishOutput).toContainText("Compilation error");
  await expect(englishOutput.locator("pre")).toHaveText([
    "Zapisano na tym urządzeniu",
    connectionMessage,
  ]);
});

test("localizes package names and a saved retrospective review reason", async ({
  page,
}) => {
  const project = projects.find(
    (item) => item.package?.id === "todo-cli-workshop",
  )!;
  await page.goto("/");
  await page.getByRole("button", { name: "Check your starting point" }).click();
  await page.getByRole("button", { name: "Continue to the lessons" }).click();
  await page.getByRole("combobox", { name: "Language" }).selectOption("pl");
  await page.getByRole("button", { name: "Projekt", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Wybierz projekt" })
    .getByRole("button", { name: project.title })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Pakiet Cargo" })
      .getByRole("combobox", { name: "Plik w pakiecie" }),
  ).toBeVisible();

  await page.getByRole("combobox", { name: "Język" }).selectOption("en");
  const file = page
    .getByRole("region", { name: "Cargo package" })
    .getByRole("combobox", { name: "File in package" });
  await file.selectOption("Cargo.toml");
  await expect(file).toHaveValue("Cargo.toml");
  await page
    .getByRole("button", { name: /^Review:/ })
    .first()
    .click();
  await page
    .locator(".sidebar nav")
    .getByRole("button", { name: /^Reviews/ })
    .click();
  await expect(
    page.getByText("Uncertainty noted in the project retrospective"),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Language" }).selectOption("pl");
  await expect(
    page.getByText("Niepewność zaznaczona w retrospektywie projektu"),
  ).toBeVisible();
});

test("uses the device language on a missing page and carries an explicit choice back into the course", async ({ page }) => {
  const response = await page.goto("/missing-workshop-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("combobox", { name: "Language" }).selectOption("pl");
  await page.getByRole("link", { name: "Wróć do kursu" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  await expect(page.getByRole("button", { name: "Sprawdź punkt startowy" })).toBeVisible();
});
