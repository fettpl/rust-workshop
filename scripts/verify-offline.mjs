import { chromium, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    const errors = [];
    const consoleErrors = [];
    const expectedOfflineConsoleErrors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (text.includes("net::ERR_INTERNET_DISCONNECTED")) {
        expectedOfflineConsoleErrors.push(text);
      } else {
        consoleErrors.push(text);
      }
    });
    await page.goto("http://127.0.0.1:3002");
    await page.getByRole("button", { name: "Sprawdź punkt startowy" }).click();
    await page.getByRole("button", { name: "Przejdź do nauki" }).click();
    await page.getByRole("button", { name: "Wejdź do lekcji" }).click();
    await page.locator('[aria-label="Kroki lekcji"] button').nth(1).click();
    await page
      .getByRole("button", { name: "Prosty edytor", exact: true })
      .click();
    const editor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    await editor.fill('fn main() { println!("offline draft"); }');
    await page.getByText("Twój notatnik", { exact: true }).click();
    await page
      .getByLabel("Notatki do lekcji")
      .fill("Właściciel pozostaje zapisany offline.");
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.waitForTimeout(2500);
    console.log(
      "Cache entries",
      await page.evaluate(async () => {
        const names = await caches.keys();
        return Promise.all(
          names.map(async (name) => ({
            name,
            entries: (await (await caches.open(name)).keys()).length,
          })),
        );
      }),
    );
    await context.setOffline(true);
    await page.reload();
    await expect(editor).toHaveValue(
      'fn main() { println!("offline draft"); }',
    );
    await expect(
      page.getByText("Tryb offline.", { exact: false }),
    ).toBeVisible();
    console.log("Offline reload code and exact lesson restored");
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(
      "Właściciel pozostaje zapisany offline.",
    );
    await page.getByRole("button", { name: "Uruchom", exact: true }).click();
    await expect(
      page.getByText("Kompilator niedostępny", { exact: true }),
    ).toBeVisible();
    await expect(editor).toHaveValue(
      'fn main() { println!("offline draft"); }',
    );
    console.log("Offline runner honest, draft preserved");
    await context.setOffline(false);
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill("trwaly serwis");
    await page
      .locator(".module-picker > button")
      .filter({ hasText: "Capstone: trwały serwis logów" })
      .click();
    await page
      .locator(".lesson-list-item")
      .filter({ hasText: "Wartość przyjęta to nie dowolny tekst" })
      .click();
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(2).click();
    const simpleEditor = page.getByRole("button", {
      name: "Prosty edytor",
      exact: true,
    });
    if (await simpleEditor.count()) await simpleEditor.click();
    const capstoneEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    const capstoneHeading = await page.locator(".task-pane h1").innerText();
    const capstoneDraft =
      "// Granica domeny zachowana lokalnie bez wykonywania runnera.\n";
    await capstoneEditor.fill(capstoneDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await page
      .getByLabel("Notatki do lekcji")
      .fill("Sprawdzić limity bajtów przed zapisem do magazynu.");
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(capstoneHeading);
    await expect(capstoneEditor).toHaveValue(capstoneDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(
      "Sprawdzić limity bajtów przed zapisem do magazynu.",
    );
    console.log("Capstone draft, note and exact gate resume work offline");
    await context.setOffline(false);
    await page.getByRole("button", { name: "Projekt", exact: true }).click();
    for (const projectName of [
      /Number Guessing\+/,
      /Todo CLI/,
      /Log Analyzer/,
      /Laboratorium: protokoły atomowe/,
      /Laboratorium: pipeline Tokio/,
      /Laboratorium: serwis TCP/,
      /Laboratorium: publiczne API i workspace/,
      /Projekt: ograniczony Mini grep/,
      /Projekt: kontrakty własności/,
      /Project: safe FFI buffer owner/,
      /Projekt: operacje serwisu Tokio/,
      /Miri Safety Workshop/,
    ]) {
      await context.setOffline(false);
      await page
        .getByRole("navigation", { name: "Wybierz projekt" })
        .getByRole("button", { name: projectName })
        .click();
      const downloadLink = page.getByRole("link", {
        name: "Pobierz pakiet startowy",
      });
      await expect(downloadLink).toBeVisible();
      const archiveUrl = await downloadLink.getAttribute("href");
      await page.waitForFunction(
        async (path) => !!(await caches.match(path)),
        archiveUrl,
      );
      const onlineBytes = await page.evaluate(
        async (path) =>
          Array.from(new Uint8Array(await (await fetch(path)).arrayBuffer())),
        archiveUrl,
      );
      expect(onlineBytes.slice(0, 4)).toEqual([80, 75, 3, 4]);
      await context.setOffline(true);
      await page.reload();
      await page
        .getByRole("navigation", { name: "Wybierz projekt" })
        .getByRole("button", { name: projectName })
        .click();
      const started = page.waitForEvent("download");
      await downloadLink.click();
      const download = await started;
      expect(await download.failure()).toBeNull();
      expect(Array.from(await readFile(await download.path()))).toEqual(
        onlineBytes,
      );
      console.log(
        `${archiveUrl}: starter download works offline after reload, bytes unchanged`,
      );
    }
    await context.setOffline(false);
    await page
      .getByRole("navigation", { name: "Wybierz projekt" })
      .getByRole("button", { name: /Projekt: trwały serwis logów/ })
      .click();
    const capstonePanel = page.getByRole("region", { name: "Pakiet Cargo" });
    const capstoneStarterLink = capstonePanel.getByRole("link", {
      name: "Pobierz pakiet startowy",
    });
    const capstoneStarterUrl = await capstoneStarterLink.getAttribute("href");
    await page.waitForFunction(
      async (path) => !!(await caches.match(path)),
      capstoneStarterUrl,
    );
    const capstoneStarterBytes = await page.evaluate(
      async (path) =>
        Array.from(new Uint8Array(await (await fetch(path)).arrayBuffer())),
      capstoneStarterUrl,
    );
    expect(capstoneStarterBytes.slice(0, 4)).toEqual([80, 75, 3, 4]);
    await capstonePanel
      .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
      .click();
    const capstoneSolutionLink = capstonePanel.getByRole("link", {
      name: "Pobierz rozwiązanie",
    });
    const capstoneSolutionUrl = await capstoneSolutionLink.getAttribute("href");
    await page.waitForFunction(
      async (path) => !!(await caches.match(path)),
      capstoneSolutionUrl,
    );
    const capstoneSolutionBytes = await page.evaluate(
      async (path) =>
        Array.from(new Uint8Array(await (await fetch(path)).arrayBuffer())),
      capstoneSolutionUrl,
    );
    expect(capstoneSolutionBytes.slice(0, 4)).toEqual([80, 75, 3, 4]);
    await context.setOffline(true);
    await page.reload();
    await page
      .getByRole("navigation", { name: "Wybierz projekt" })
      .getByRole("button", { name: /Projekt: trwały serwis logów/ })
      .click();
    const offlineCapstonePanel = page.getByRole("region", {
      name: "Pakiet Cargo",
    });
    const offlineStarterLink = offlineCapstonePanel.getByRole("link", {
      name: "Pobierz pakiet startowy",
    });
    const offlineStarterDownload = page.waitForEvent("download");
    await offlineStarterLink.click();
    const offlineStarter = await offlineStarterDownload;
    expect(await offlineStarter.failure()).toBeNull();
    expect(Array.from(await readFile(await offlineStarter.path()))).toEqual(
      capstoneStarterBytes,
    );
    await offlineCapstonePanel
      .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
      .click();
    const offlineSolutionLink = offlineCapstonePanel.getByRole("link", {
      name: "Pobierz rozwiązanie",
    });
    const offlineSolutionDownload = page.waitForEvent("download");
    await offlineSolutionLink.click();
    const offlineSolution = await offlineSolutionDownload;
    expect(await offlineSolution.failure()).toBeNull();
    expect(Array.from(await readFile(await offlineSolution.path()))).toEqual(
      capstoneSolutionBytes,
    );
    console.log(
      "Capstone starter and solution ZIP bytes are unchanged offline",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .locator(".module-picker")
      .getByRole("button", { name: /Współdzielenie: Rc, RefCell i Weak/ })
      .click();
    await page
      .locator(".lesson-list-item")
      .filter({ hasText: "Weak: graf bez silnego cyklu" })
      .click();
    await page.locator('[aria-label="Kroki lekcji"] button').nth(2).click();
    const visualizer = page.locator(".visualizer");
    for (let i = 0; i < 4; i++) {
      await visualizer.getByRole("button", { name: "Następna linia" }).click();
    }
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(visualizer).toContainText("Jawne uchwyty Rc: 0 · Weak: 1");
    await expect(visualizer).toContainText(
      "Wartość zakończyła życie; alokacja pozostaje",
    );
    await expect(visualizer).not.toContainText("Zwolniono pamięć");
    await visualizer.getByRole("button", { name: "Następna linia" }).click();
    await visualizer.getByRole("button", { name: "Następna linia" }).click();
    await expect(visualizer).toContainText("Zwolniono pamięć");
    console.log(
      "New Weak lesson opens offline and resumes the exact trace frame",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill("mutex");
    await page
      .locator(".module-picker")
      .getByRole("button", { name: /Wspólny stan: Send, Arc i Mutex/ })
      .click();
    await page
      .locator(".lesson-list-item")
      .filter({ hasText: "Send i Sync: granice wątku" })
      .click();
    await page
      .locator('[aria-label="Kroki lekcji"]')
      .getByRole("button", { name: "02 Zaobserwuj", exact: true })
      .click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Zobacz E0277 dla Rc", exact: true }),
    ).toBeVisible();
    await expect(editor).toHaveValue(/use std::rc::Rc;/);
    console.log(
      "Module topic search and an unvisited concurrency lesson work offline; exact step resumes",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill("async");
    const asyncModule = page.locator(".module-picker > button").filter({
      hasText: "Podstawy async: Future, await i anulowanie",
    });
    await expect(asyncModule).toHaveCount(1);
    await asyncModule.click();
    await page.locator(".gate-action").first().click();
    const asyncHeading = await page.locator(".task-pane h1").innerText();
    const asyncDraft = `${await editor.inputValue()}\n// Szkic Future zachowany bez sieci.\n`;
    await editor.fill(asyncDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(asyncHeading);
    await expect(editor).toHaveValue(asyncDraft);
    await expect(
      page.getByRole("button", { name: "Pokaż drugą wskazówkę" }),
    ).toBeVisible();
    console.log(
      "Previously unvisited async gate, draft and hint resume offline",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill("Tokio");
    const tokioModule = page.locator(".module-picker > button").filter({
      hasText: "Tokio: runtime i odpowiedzialność za zadania",
    });
    await expect(tokioModule).toHaveCount(1);
    await tokioModule.click();
    await page.locator(".gate-action").first().click();
    const tokioHeading = await page.locator(".task-pane h1").innerText();
    const tokioDraft = `${await editor.inputValue()}\n// Lokalny szkic runtime Tokio, bez uruchamiania kodu.\n`;
    await editor.fill(tokioDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(tokioHeading);
    await expect(editor).toHaveValue(tokioDraft);
    await expect(
      page.getByRole("button", { name: "Pokaż drugą wskazówkę" }),
    ).toBeVisible();
    console.log(
      "Previously unvisited Tokio gate, draft and hint resume offline",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill("Tokio");
    await page
      .locator(".module-picker > button")
      .filter({ hasText: "Tokio: przepływ i zamknięcie" })
      .click();
    await page.locator(".gate-action").first().click();
    const flowHeading = await page.locator(".task-pane h1").innerText();
    const flowDraft = `${await editor.inputValue()}\n// Zachowany szkic bounded mpsc, bez wykonania.\n`;
    await editor.fill(flowDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(flowHeading);
    await expect(editor).toHaveValue(flowDraft);
    await expect(
      page.getByRole("button", { name: "Pokaż drugą wskazówkę" }),
    ).toBeVisible();
    console.log(
      "Previously unvisited Tokio flow gate, draft and hint resume offline",
    );
    for (const title of [
      "Tokio: I/O i strumienie",
      "Tokio: praca blokująca",
      "Tokio: sieć i serwis",
      "Publiczne API i workspace Cargo",
      "Mini grep: wyszukaj, ogranicz, wyjaśnij wynik",
      "Number Guessing+: od komunikatu do pełnej gry",
      "Pożyczone API: wariancja i HRTB",
    ]) {
      await page
        .getByRole("button", { name: "Mapa nauki", exact: true })
        .click();
      await page
        .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
        .fill(title);
      await page
        .locator(".module-picker > button")
        .filter({ hasText: title })
        .click();
      await page.locator(".gate-action").first().click();
      const heading = await page.locator(".task-pane h1").innerText();
      const draft = `${await editor.inputValue()}\n// Szkic ${title}, zachowany offline.\n`;
      await editor.fill(draft);
      await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
      await expect(
        page.getByText("Zapisano na tym urządzeniu", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(page.locator(".task-pane h1")).toHaveText(heading);
      await expect(editor).toHaveValue(draft);
      await expect(
        page.getByRole("button", { name: "Pokaż drugą wskazówkę" }),
      ).toBeVisible();
      console.log(
        `${title}: previously unvisited gate, draft and hint resume offline`,
      );
    }
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill("Cargo: zależności, features i pakowanie");
    await page
      .locator(".module-picker > button")
      .filter({ hasText: "Cargo: zależności, features i pakowanie" })
      .click();
    // Earlier Frame preview/download exposed the primary manifests. The map
    // must select the independent standalone declaration task instead.
    await page.locator(".gate-action").first().click();
    const tomlEditor = page.getByRole("textbox", {
      name: "Kod TOML",
      exact: true,
    });
    await expect(tomlEditor).toHaveValue("");
    const manifestDraft = `[package]
name = "catalog-tool"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "Offline dependency declaration exercise."
license = "MIT"
publish = false

[dependencies]
wire_serde = { package = "serde", version = "1.0.229", default-features = false }

[dev-dependencies]
wire_serde = { package = "serde", version = "1.0.229", default-features = false, features = ["alloc"] }
`;
    await tomlEditor.fill(manifestDraft);
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(tomlEditor).toHaveValue(manifestDraft);
    await expect(page.getByRole("button", { name: /^Uruchom/ })).toHaveCount(0);
    await page
      .getByRole("button", { name: "Sprawdź manifest", exact: true })
      .click();
    await expect(page.locator(".feedback.passed")).toBeVisible();
    console.log(
      "Previously unvisited TOML blank resumes and passes locally while offline",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    const gatTitle = "GAT i lending iterators: pożyczone elementy";
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(gatTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: gatTitle })
      .click();
    await page.locator(".gate-action").first().click();
    await page
      .getByLabel("Kroki lekcji")
      .getByRole("button", { name: /Od pustej kartki/ })
      .click();
    const gatEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    await expect(gatEditor).toHaveValue("");
    const gatHeading = await page.locator(".task-pane h1").innerText();
    const gatDraft =
      "// Własny producent pożyczanych wartości, zapisany offline.\n";
    await gatEditor.fill(gatDraft);
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(gatHeading);
    await expect(gatEditor).toHaveValue(gatDraft);
    console.log(
      "Previously unvisited GAT blank and its exact draft resume offline",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    const asyncLendingTitle =
      "Async lending: pożyczone futures i granice dispatchu";
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(asyncLendingTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: asyncLendingTitle })
      .click();
    await page.locator(".gate-action").first().click();
    const asyncEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    const asyncPrimaryHeading = await page.locator(".task-pane h1").innerText();
    const asyncPrimaryDraft =
      "// Async primary draft revealed before the independent transfer.\n";
    await asyncEditor.fill(asyncPrimaryDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    await page.getByText("Potrzebuję pełnego rozwiązania", { exact: true }).click();
    await page.getByRole("button", { name: "Pokaż rozwiązanie", exact: true }).click();
    await expect(page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(asyncLendingTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: asyncLendingTitle })
      .click();
    await page.locator(".gate-action").first().click();
    await expect(page.locator(".task-pane h1")).not.toHaveText(asyncPrimaryHeading);
    await asyncEditor.focus();
    await asyncEditor.press("ControlOrMeta+End");
    const asyncLendingHeading = await page.locator(".task-pane h1").innerText();
    const asyncLendingDraft =
      "// Niezależny async transfer: Pending nie zapisuje efektu przed Ready.\n";
    await asyncEditor.fill(asyncLendingDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(asyncLendingHeading);
    await expect(asyncEditor).toHaveValue(asyncLendingDraft);
    await asyncEditor.focus();
    await expect(asyncEditor).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Monaco Editor", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(asyncEditor).toBeFocused();
    await expect(page.getByText("Tryb offline.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Uruchom", exact: true })).toHaveCount(0);
    console.log("Async lending gate, keyboard focus and draft resume offline");
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    const propertyTitle =
      "Property testing: kontrakty, generatory i kontrprzykłady";
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(propertyTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: propertyTitle })
      .click();
    await page.locator(".gate-action").first().click();
    await page
      .getByLabel("Kroki lekcji")
      .getByRole("button", { name: /Od pustej kartki/ })
      .click();
    const propertyEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    await expect(propertyEditor).toHaveValue("");
    const propertyHeading = await page.locator(".task-pane h1").innerText();
    const propertyDraft =
      "// Własność z niezależnym oracle, zachowana offline.\n";
    await propertyEditor.fill(propertyDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(propertyHeading);
    await expect(propertyEditor).toHaveValue(propertyDraft);
    await expect(
      page.getByRole("button", { name: "Pokaż drugą wskazówkę" }),
    ).toBeVisible();
    console.log(
      "Previously unvisited property-contracts blank and draft resume offline",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    const performanceTitle = "Performance Evidence: workload, pamięć i decyzje";
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(performanceTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: performanceTitle })
      .click();
    await page.locator(".gate-action").first().click();
    await page
      .getByLabel("Kroki lekcji")
      .getByRole("button", { name: /Od pustej kartki/ })
      .click();
    const performanceEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    await expect(performanceEditor).toHaveValue("");
    const performanceHeading = await page.locator(".task-pane h1").innerText();
    const performanceDraft =
      "// Workload, bufor i proxy zapisane bez zegara.\n";
    await performanceEditor.fill(performanceDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(performanceHeading);
    await expect(performanceEditor).toHaveValue(performanceDraft);
    await expect(
      page.getByRole("button", { name: "Pokaż drugą wskazówkę" }),
    ).toBeVisible();
    console.log(
      "Previously unvisited performance blank and draft resume offline",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    const ffiTitle = "Unsafe i FFI: kontrakty raw pointerów oraz RAII";
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(ffiTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: ffiTitle })
      .click();
    await page.locator(".gate-action").first().click();
    const ffiEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    await expect(ffiEditor).toHaveValue(/checked_view/);
    const ffiHeading = await page.locator(".task-pane h1").innerText();
    const ffiDraft = `${await ffiEditor.inputValue()}\n// Kontrakt FFI zachowany offline.\n`;
    await ffiEditor.fill(ffiDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(ffiHeading);
    await expect(ffiEditor).toHaveValue(ffiDraft);
    console.log("Unsafe/FFI gate and draft resume offline");
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    const operationsTitle =
      "Service Operations: zaufanie, telemetryka i incydenty";
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(operationsTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: operationsTitle })
      .click();
    await page.locator(".gate-action").first().click();
    const operationsEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    const operationsHeading = await page.locator(".task-pane h1").innerText();
    const operationsDraft = `${await operationsEditor.inputValue()}\n// Evidence-first operations, preserved offline.\n`;
    await operationsEditor.fill(operationsDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(operationsHeading);
    await expect(operationsEditor).toHaveValue(operationsDraft);
    await expect(
      page.getByRole("button", { name: "Pokaż drugą wskazówkę" }),
    ).toBeVisible();
    console.log("Service Operations gate and draft resume offline");
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    const apiReleaseMatrixTitle = "API Release Matrix: klient, features i MSRV";
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(apiReleaseMatrixTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: apiReleaseMatrixTitle })
      .click();
    await page.locator(".gate-action").first().click();
    const apiReleaseEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    const apiReleasePrimaryHeading = await page
      .locator(".task-pane h1")
      .innerText();
    const apiReleasePrimaryDraft =
      "// Klient, features i exact MSRV zapisane lokalnie.\n";
    await apiReleaseEditor.fill(apiReleasePrimaryDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await page
      .getByLabel("Notatki do lekcji")
      .fill("Stable nie zastępuje uruchomienia Rust 1.85.0.");
    await expect(
      page.getByText("Zapisano na tym urządzeniu", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    await page
      .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
      .click();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(
      apiReleasePrimaryHeading,
    );
    await expect(apiReleaseEditor).toHaveValue(apiReleasePrimaryDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(
      "Stable nie zastępuje uruchomienia Rust 1.85.0.",
    );
    await page
      .getByRole("button", { name: apiReleaseMatrixTitle, exact: true })
      .click();
    await expect(page.getByLabel("Potwierdzone")).toHaveCount(0);
    await page.locator(".gate-action").first().click();
    const apiReleaseBlankHeading = await page
      .locator(".task-pane h1")
      .innerText();
    await expect(apiReleaseEditor).toHaveValue("");
    const apiReleaseBlankDraft =
      "// Niezależny rekord release zachowany bez sieci.\n";
    await apiReleaseEditor.fill(apiReleaseBlankDraft);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: "Kod", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Output", exact: false }),
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("tab", { name: "Kod", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await apiReleaseEditor.focus();
    await expect(apiReleaseEditor).toBeFocused();
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await page.getByRole("tab", { name: "Output", exact: false }).click();
    await expect(
      page.getByText("Kompilator niedostępny", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(
      apiReleaseBlankHeading,
    );
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await expect(apiReleaseEditor).toHaveValue(apiReleaseBlankDraft);
    await expect(
      page.getByText("Tryb offline.", { exact: false }),
    ).toBeVisible();
    console.log(
      "API release matrix navigation, revealed gate, blank, note, keyboard and resume work offline",
    );
    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    console.log("Expected offline transport console errors", expectedOfflineConsoleErrors);
    console.log("Page errors", errors);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
