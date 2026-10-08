import { test, expect } from "@playwright/test";

test("starts with Rust foundations and keeps code while moving between modules", async ({
  page,
}) => {
  await page.route("**/api/run", async (route) => {
    const request = route.request().postDataJSON();
    const correct = request.code.includes('println!("Rust działa!")');
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        stdout: correct ? "Rust działa!\n" : "Witaj, Rust!\n",
        stderr: "",
        diagnostics: [],
        durationMs: 2,
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Ustawienia i postęp" }).click();
  await page
    .getByRole("checkbox", { name: "Używaj prostego edytora tekstowego" })
    .check();
  await page
    .getByRole("button", { name: "Twój warsztat", exact: true })
    .click();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).click();
  await expect(
    page.getByRole("heading", { name: "Znajdź punkt wejścia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Uruchom", exact: true }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: /fn main\(\), a potem/ }).check();
  await page.getByRole("button", { name: "Sprawdź odpowiedź" }).click();
  await expect(
    page.getByRole("button", { name: "Uruchom", exact: true }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Fundamenty Rust/ })
    .click();
  await page.locator(".gate-action").first().click();
  await expect(
    page.getByRole("heading", { name: "Zmień komunikat" }),
  ).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
  const draft = 'fn main() { println!("Rust działa!"); }';
  await editor.fill(draft);
  await page.getByRole("button", { name: "Uruchom", exact: true }).click();
  await expect(
    page.getByText("Dane wyjściowe są zgodne.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toHaveValue(draft);
  await expect(
    page.getByRole("heading", { name: "Zmień komunikat" }),
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
  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Fundamenty Rust/ })
    .click();
  await page.locator(".lesson-list-item").first().click();
  await page.locator('[aria-label="Kroki lekcji"] button').nth(4).click();
  await expect(editor).toHaveValue(draft);
});

test("keeps foundation exposure tied to the authored step concept", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
  await page.getByRole("button", { name: "Przejdź do nauki" }).click();
  await page.getByRole("button", { name: "Twój warsztat", exact: true }).click();
  await page.getByRole("button", { name: "Wejdź do lekcji" }).click();
  await expect(
    page.getByRole("heading", { name: "Znajdź punkt wejścia" }),
  ).toBeVisible();

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(4)
    .click();
  await expect(
    page.getByRole("heading", { name: "Zmień komunikat" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page.getByText("Potrzebuję pełnego rozwiązania", { exact: true }).click();
  await page.getByRole("button", { name: "Pokaż rozwiązanie", exact: true }).click();
  await expect(page.locator(".revealed-solution")).toBeVisible();

  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Fundamenty Rust/ })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: "Wiązania i typy bez zgadywania" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Odkryj domyślną regułę" }),
  ).toBeVisible();

  await page
    .getByLabel("Kroki lekcji")
    .getByRole("button")
    .nth(2)
    .click();
  await expect(page.getByRole("heading", { name: "Napraw E0384" })).toBeVisible();
  await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
  await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
  await page.getByText("Potrzebuję pełnego rozwiązania", { exact: true }).click();
  await page.getByRole("button", { name: "Pokaż rozwiązanie", exact: true }).click();
  await expect(page.locator(".revealed-solution")).toBeVisible();

  await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
  await page
    .locator(".module-picker")
    .getByRole("button", { name: /Fundamenty Rust/ })
    .click();
  await page
    .locator(".lesson-list-item")
    .filter({ hasText: "Ocena fundamentów: reguła i granice" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ustal reguły przed kodem" }),
  ).toBeVisible();
  await expect(
    page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
  ).toBeVisible();

  const stored = await page.evaluate(async () => {
    const request = indexedDB.open("rust-workshop-state", 1);
    return await new Promise<{
      events: Array<{
        lessonId: string;
        stepId: string;
        conceptIds: string[];
        kind: string;
        passed: boolean;
        hints: number;
        revealed: boolean;
        evidenceVersion?: number;
        evaluator?: string;
        gate?: boolean;
      }>;
      steps: Record<string, { hints: number; revealed: boolean }>;
      mastery: Record<string, { level?: string }>;
    }>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const get = request.result
          .transaction("user-state", "readonly")
          .objectStore("user-state")
          .get("current");
        get.onerror = () => reject(get.error);
        get.onsuccess = () => {
          const state = get.result ?? {};
          resolve({
            events: state.events ?? [],
            steps: state.steps ?? {},
            mastery: state.mastery ?? {},
          });
        };
      };
    });
  });
  const eventsFor = (lessonId: string, stepId: string) =>
    stored.events.filter(
      (event) => event.lessonId === lessonId && event.stepId === stepId,
    );
  const assertNeutralExposure = (
    lessonId: string,
    stepId: string,
    conceptIds: string[],
  ) => {
    const events = eventsFor(lessonId, stepId);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.kind === "exposure")).toBe(true);
    expect(events.every((event) => event.conceptIds.length > 0)).toBe(true);
    expect(events.map((event) => event.conceptIds)).toEqual(
      events.map(() => conceptIds),
    );
    expect(events.every((event) => event.passed)).toBe(true);
    expect(events.every((event) => event.evidenceVersion === undefined)).toBe(
      true,
    );
    expect(events.every((event) => event.evaluator === undefined)).toBe(true);
    expect(events.every((event) => event.gate === false)).toBe(true);
  };

  assertNeutralExposure("first-program", "entry-discover", ["program-entry"]);
  assertNeutralExposure("first-program", "entry-modify", ["program-entry"]);
  assertNeutralExposure("bindings-types", "bindings-discover", [
    "bindings-mutability",
  ]);
  assertNeutralExposure("bindings-types", "mut-error", [
    "bindings-mutability",
  ]);
  assertNeutralExposure("foundations-assessment", "assessment-rules", [
    "rules-based-testing",
    "functions-expressions",
    "control-flow",
  ]);

  expect(stored.steps["first-program:entry-modify"]).toMatchObject({
    hints: 2,
    revealed: true,
  });
  expect(stored.steps["bindings-types:mut-error"]).toMatchObject({
    hints: 2,
    revealed: true,
  });
  expect(stored.mastery["cargo-workflow"]?.level ?? "new").toBe("new");
  expect(stored.mastery["scalar-types"]?.level ?? "new").toBe("new");
});
