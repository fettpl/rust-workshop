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
    page.on("pageerror", (e) => errors.push(e.message));
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
    await page.getByRole("button", { name: "Projekt", exact: true }).click();
    for (const projectName of [
      /Todo CLI/,
      /Log Analyzer/,
      /Laboratorium: protokoły atomowe/,
      /Laboratorium: pipeline Tokio/,
      /Laboratorium: serwis TCP/,
      /Laboratorium: publiczne API i workspace/,
      /Projekt: ograniczony Mini grep/,
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
    expect(errors).toEqual([]);
    console.log("Page errors", errors);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
