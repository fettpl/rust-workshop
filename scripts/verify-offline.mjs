import { chromium, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    const readLearningState = () =>
      page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open("rust-workshop-state");
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction("user-state", "readonly");
              const read = transaction.objectStore("user-state").get("current");
              read.onerror = () => reject(read.error);
              read.onsuccess = () => resolve(read.result);
            };
          }),
      );
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
    await page.goto(process.env.OFFLINE_BASE_URL ?? "http://127.0.0.1:3002");
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
    ).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.waitForTimeout(2500);
    const monacoNoticeUrls = ["/monaco/LICENSE", "/monaco/ThirdPartyNotices.txt"];
    for (const noticeUrl of monacoNoticeUrls) {
      expect(
        await page.evaluate(async (url) => !!(await caches.match(url)), noticeUrl),
        `${noticeUrl} is in the app-shell cache`,
      ).toBe(true);
    }
    await context.setOffline(true);
    for (const noticeUrl of monacoNoticeUrls) {
      const notice = await page.evaluate(async (url) => {
        const response = await fetch(url);
        return { ok: response.ok, text: await response.text() };
      }, noticeUrl);
      expect(notice.ok, `${noticeUrl} available offline`).toBe(true);
      expect(notice.text.trim(), `${noticeUrl} has content offline`).not.toBe("");
    }
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
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill("Makra deklaratywne jako publiczne API");
    await page
      .locator(".module-picker > button")
      .filter({ hasText: "Makra deklaratywne jako publiczne API" })
      .click();
    await page.locator(".gate-action").first().click();
    const macroHeading = await page.locator(".task-pane h1").innerText();
    const macroEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    const macroDraft =
      "// Makro zachowane offline; zaufany verifier Cargo działa osobno.\n";
    await macroEditor.fill(macroDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await page
      .getByLabel("Notatki do lekcji")
      .fill("Oddzielić dowód browserowy od klienta zewnętrznego.");
    await expect(
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(macroHeading);
    await expect(macroEditor).toHaveValue(macroDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(
      "Oddzielić dowód browserowy od klienta zewnętrznego.",
    );
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await expect(
      page.getByText("Kompilator niedostępny", { exact: true }),
    ).toBeVisible();
    await expect(macroEditor).toHaveValue(macroDraft);
    console.log(
      "Macros lesson draft and note resume offline; compiler boundary stays honest",
    );
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      /Projekt: bezpieczny właściciel bufora FFI/,
      /Projekt: operacje serwisu Tokio/,
      /Warsztat bezpieczeństwa z Miri/,
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
      .getByRole("button", { name: /Projekt: ograniczony Mini grep/ })
      .click();
    const miniGrepPanel = page.getByRole("region", { name: "Pakiet Cargo" });
    const miniGrepStarterLink = miniGrepPanel.getByRole("link", {
      name: "Pobierz pakiet startowy",
    });
    const miniGrepStarterUrl = await miniGrepStarterLink.getAttribute("href");
    await page.waitForFunction(
      async (path) => !!(await caches.match(path)),
      miniGrepStarterUrl,
    );
    const miniGrepStarterBytes = await page.evaluate(
      async (path) =>
        Array.from(new Uint8Array(await (await fetch(path)).arrayBuffer())),
      miniGrepStarterUrl,
    );
    let miniGrepSolutionBytes;
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    const fuzzTitle = "Fuzz evidence: od bajtów do audytowalnej regresji";
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(fuzzTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: fuzzTitle })
      .click();
    await page.locator(".gate-action").first().click();
    await page
      .getByLabel("Kroki lekcji")
      .getByRole("button", { name: /^(?:\d{2} )?Przewidź$/ })
      .click();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Sprawdź odpowiedź", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Zadanie" }).getByRole("status"),
    ).toBeVisible();
    await page
      .getByLabel("Kroki lekcji")
      .getByRole("button", { name: /^(?:\d{2} )?Zmień$/ })
      .click();
    const fuzzPrimaryEditor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    const fuzzPrimaryCode = "// Mocked primary run before the assisted reveal.\n";
    await fuzzPrimaryEditor.fill(fuzzPrimaryCode);
    await page.route("**/api/run", async (route) => {
      const request = route.request().postDataJSON();
      const accepted = request.code === fuzzPrimaryCode;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "success", stdout: accepted ? "primary mock: ok" : "unexpected assisted source", stderr: "", diagnostics: [], durationMs: 1, tests: { passed: accepted ? 1 : 0, failed: accepted ? 0 : 1 } }) });
    });
    await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
    await expect(page.getByRole("region", { name: "Wynik kompilatora" })).toContainText("primary mock: ok");
    await page.unroute("**/api/run");
    let fuzzAssistedPrimaryCode = "";
    const independentBeforeAssisted = await readLearningState();
    const scopedPrimaryEvents = independentBeforeAssisted.events.filter(
      (event) => event.lessonId === "fuzz-input-domain" && event.stepId === "fuzz-input-domain-gate",
    );
    const independentPrimaryEvents = scopedPrimaryEvents.filter(
      (event) => event.passed && event.evaluator === "tests" && event.hints === 0 && !event.revealed,
    );
    const independentCountBeforeAssisted = independentPrimaryEvents.length;
    expect(independentCountBeforeAssisted).toBe(1);
    expect(independentPrimaryEvents.at(-1)?.evaluator).toBe("tests");
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    const fuzzRevealSummary = page
      .locator("#workspace-panel-lesson")
      .locator("details.solution-warning > summary")
      .filter({ hasText: /^Potrzebuję pełnego rozwiązania$/ });
    await expect(fuzzRevealSummary).toBeVisible();
    await fuzzRevealSummary.click();
    await page.getByRole("button", { name: "Pokaż rozwiązanie", exact: true }).click();
    await expect(page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true })).toBeVisible();
    fuzzAssistedPrimaryCode = await page.locator(".revealed-solution pre").innerText();
    expect(fuzzAssistedPrimaryCode).toContain("decode_case");
    await page.getByRole("button", { name: "Projekt", exact: true }).click();
    await page.getByRole("navigation", { name: "Wybierz projekt" }).getByRole("button", { name: /Projekt: ograniczony Mini grep/ }).click();
    const assistedPackage = page.getByRole("region", { name: "Pakiet Cargo" });
    await assistedPackage.getByRole("button", { name: "Pokaż rozwiązanie pakietu" }).click();
    const assistedDownload = page.waitForEvent("download");
    await assistedPackage.getByRole("link", { name: "Pobierz rozwiązanie" }).click();
    const assistedArchive = await assistedDownload;
    expect(await assistedArchive.failure()).toBeNull();
    miniGrepSolutionBytes = Array.from(await readFile(await assistedArchive.path()));
    expect(miniGrepSolutionBytes.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page.getByRole("searchbox", { name: "Znajdź moduł lub temat" }).fill(fuzzTitle);
    await page.locator(".module-picker > button").filter({ hasText: fuzzTitle }).click();
    await page.locator(".lesson-list-item").first().click();
    await page
      .getByLabel("Kroki lekcji")
      .getByRole("button", { name: /^(?:\d{2} )?Zmień$/ })
      .click();
    await page.route("**/api/run", async (route) => {
      const request = route.request().postDataJSON();
      const accepted = request.code === fuzzAssistedPrimaryCode;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "success", stdout: accepted ? "primary mock: ok" : "unexpected assisted source", stderr: "", diagnostics: [], durationMs: 1, tests: { passed: accepted ? 1 : 0, failed: accepted ? 0 : 1 } }) });
    });
    await fuzzPrimaryEditor.fill(fuzzAssistedPrimaryCode);
    await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
    await expect(page.getByRole("region", { name: "Wynik kompilatora" })).toContainText("primary mock: ok");
    await page.unroute("**/api/run");
    const independentAfterAssisted = await readLearningState();
    const scopedAssistedEvents = independentAfterAssisted.events.filter(
      (event) => event.lessonId === "fuzz-input-domain" && event.stepId === "fuzz-input-domain-gate",
    );
    const primaryTestIds = new Set(
      scopedPrimaryEvents
        .filter((event) => event.evaluator === "tests")
        .map((event) => event.id),
    );
    const newAssistedTestEvents = scopedAssistedEvents.filter(
      (event) => event.evaluator === "tests" && !primaryTestIds.has(event.id),
    );
    expect(newAssistedTestEvents).toHaveLength(1);
    expect(newAssistedTestEvents[0]).toMatchObject({
      passed: true,
      evaluator: "tests",
      hints: 2,
      revealed: true,
    });
    const independentCountAfterAssisted = scopedAssistedEvents.filter(
      (event) => event.passed && event.evaluator === "tests" && event.hints === 0 && !event.revealed,
    ).length;
    expect(independentCountAfterAssisted).toBe(independentCountBeforeAssisted);
    await page
      .getByLabel("Kroki lekcji")
      .getByRole("button", { name: /^(?:\d{2} )?Od pustej kartki$/ })
      .click();
    const fuzzHeading = await page.locator(".task-pane h1").innerText();
    const fuzzEditor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    await expect(fuzzEditor).toHaveValue("");
    const fuzzDraft = "// Bounded fuzz domain draft.\n";
    await fuzzEditor.fill(fuzzDraft);
    await page.route("**/api/run", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "success", stdout: "test result: ok", stderr: "", diagnostics: [], durationMs: 1, tests: { passed: 1, failed: 0 } }) });
    });
    await context.setOffline(true);
    await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
    await expect(page.getByRole("region", { name: "Wynik kompilatora" })).toContainText("test result: ok");
    await page.unroute("**/api/run");
    await page.getByText("Twój notatnik", { exact: true }).click();
    await page.getByLabel("Notatki do lekcji").fill("Blank i replay mają osobne dowody.");
    await expect(page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" })).toBeVisible();
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(fuzzHeading);
    await expect(fuzzEditor).toHaveValue(fuzzDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue("Blank i replay mają osobne dowody.");
    await fuzzEditor.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Monaco Editor", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(fuzzEditor).toBeFocused();
    console.log("Fuzz evidence prediction, independent blank, draft and note resume offline");
    // The first solution preview above exposed the package after the primary
    // reveal. Return to the project while offline and verify both cached ZIPs.
    await context.setOffline(true);
    await page.reload();
    await page.getByRole("button", { name: "Projekt", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Wybierz projekt" })
      .getByRole("button", { name: /Projekt: ograniczony Mini grep/ })
      .click();
    const offlineMiniGrepPanel = page.getByRole("region", { name: "Pakiet Cargo" });
    const offlineMiniGrepStarter = offlineMiniGrepPanel.getByRole("link", {
      name: "Pobierz pakiet startowy",
    });
    const offlineMiniGrepStarterDownload = page.waitForEvent("download");
    await offlineMiniGrepStarter.click();
    const offlineMiniGrepStarterFile = await offlineMiniGrepStarterDownload;
    expect(await offlineMiniGrepStarterFile.failure()).toBeNull();
    expect(Array.from(await readFile(await offlineMiniGrepStarterFile.path()))).toEqual(
      miniGrepStarterBytes,
    );
    await offlineMiniGrepPanel
      .getByRole("button", { name: "Pokaż rozwiązanie pakietu" })
      .click();
    const offlineMiniGrepSolution = offlineMiniGrepPanel.getByRole("link", {
      name: "Pobierz rozwiązanie",
    });
    const offlineMiniGrepSolutionDownload = page.waitForEvent("download");
    await offlineMiniGrepSolution.click();
    const offlineMiniGrepSolutionFile = await offlineMiniGrepSolutionDownload;
    expect(await offlineMiniGrepSolutionFile.failure()).toBeNull();
    expect(Array.from(await readFile(await offlineMiniGrepSolutionFile.path()))).toEqual(
      miniGrepSolutionBytes,
    );
    console.log("Mini grep starter and solution downloads preserve bytes offline");
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
    const archiveApacheExceptionPackageIds = new Set([
      "mini-grep-workshop",
      "frame-protocol-workspace",
      "durable-log-service-workspace",
    ]);
    const capstoneAuthoredPaths = [
      "CHANGE-REVIEW.md",
      "CHANGELOG.md",
      "Cargo.lock",
      "Cargo.toml",
      "PERFORMANCE.md",
      "PROTOCOL.md",
      "README.md",
      "RELEASE.md",
      "RUNBOOK.md",
      "THREAT_MODEL.md",
      "adr/0001-transaction-and-retry.md",
      "adr/0002-storage-owner-and-shutdown.md",
      "crates/ingest-core/Cargo.toml",
      "crates/ingest-core/src/domain.rs",
      "crates/ingest-core/src/lib.rs",
      "crates/ingest-core/src/protocol.rs",
      "crates/ingest-core/tests/protocol_properties.rs",
      "crates/ingest-core/tests/public_api.rs",
      "crates/ingest-service/Cargo.toml",
      "crates/ingest-service/examples/fixed_workload.rs",
      "crates/ingest-service/src/bin/ingest-client.rs",
      "crates/ingest-service/src/config.rs",
      "crates/ingest-service/src/lib.rs",
      "crates/ingest-service/src/main.rs",
      "crates/ingest-service/src/server.rs",
      "crates/ingest-service/src/telemetry.rs",
      "crates/ingest-service/src/worker.rs",
      "crates/ingest-service/tests/lifecycle.rs",
      "crates/ingest-service/tests/loopback.rs",
      "crates/ingest-service/tests/process.rs",
      "crates/ingest-service/tests/restart.rs",
      "crates/ingest-store/Cargo.toml",
      "crates/ingest-store/src/lib.rs",
      "crates/ingest-store/src/store.rs",
      "crates/ingest-store/tests/migrations.rs",
      "crates/ingest-store/tests/stream_capacity.rs",
      "crates/ingest-store/tests/transactions.rs",
    ];
    const capstoneOriginalAuthoredEntryCount = 37;
    expect(capstoneAuthoredPaths).toHaveLength(
      capstoneOriginalAuthoredEntryCount,
    );
    const readArchiveNoticeBytes = async (projectId) => {
      const includesApacheNotice = archiveApacheExceptionPackageIds.has(projectId);
      const scope = (await readFile("docs/licensing.md", "utf8"))
        .replace(
          /\]\((rights-assessment\.md|oss-provenance\.md)(#[^)]*)?\)/g,
          "](https://github.com/fettpl/rustcrushcourse/blob/main/docs/$1$2)",
        )
        .replace(
          /\]\(\.\.\/(LICENSE|LICENSE-CONTENT|THIRD-PARTY-NOTICES\.md)\)/g,
          "]($1)",
        )
        .replace(
          /\]\(\.\.\/LICENSE-APACHE\)/g,
          includesApacheNotice
            ? "](LICENSE-APACHE)"
            : "](https://www.apache.org/licenses/LICENSE-2.0.txt)",
        );
      const notices = {
        LICENSE: await readFile("LICENSE"),
        "LICENSE-CONTENT": await readFile("LICENSE-CONTENT"),
        "LICENSE-SCOPE.md": Buffer.from(scope),
        "THIRD-PARTY-NOTICES.md": Buffer.from(
          (await readFile("THIRD-PARTY-NOTICES.md", "utf8")).replaceAll(
            "](docs/licensing.md)",
            "](LICENSE-SCOPE.md)",
          ),
        ),
      };
      if (includesApacheNotice)
        notices["LICENSE-APACHE"] = await readFile("LICENSE-APACHE");
      return notices;
    };
    const assertArchiveNoticeContract = async (files, root, projectId) => {
      const notices = await readArchiveNoticeBytes(projectId);
      const noticePaths = Object.keys(notices);
      const relativePaths = Object.keys(files).map((path) =>
        path.startsWith(root) ? path.slice(root.length) : path,
      );
      const expectedPaths = [...capstoneAuthoredPaths, ...noticePaths].sort();
      expect(relativePaths, `${projectId} archive entry names`).toEqual(
        expectedPaths,
      );
      expect(
        relativePaths.filter((path) => noticePaths.includes(path)),
        `${projectId} archive notice names`,
      ).toEqual([...noticePaths].sort());
      expect(
        relativePaths.filter((path) => !noticePaths.includes(path)),
        `${projectId} authored payload names`,
      ).toEqual([...capstoneAuthoredPaths].sort());
      expect(Object.keys(files), `${projectId} archive entry count`).toHaveLength(
        capstoneOriginalAuthoredEntryCount + noticePaths.length,
      );
      for (const [noticePath, expectedBytes] of Object.entries(notices)) {
        const actualBytes = files[root + noticePath];
        expect(actualBytes, `${projectId}/${noticePath} exists`).toBeDefined();
        expect(
          Array.from(actualBytes),
          `${projectId}/${noticePath} exact canonical bytes`,
        ).toEqual(Array.from(expectedBytes));
      }
    };
    for (const [variant, bytes] of [
      ["starter", capstoneStarterBytes],
      ["solution", capstoneSolutionBytes],
    ]) {
      const files = unzipSync(Uint8Array.from(bytes));
      const root = "durable-log-service-workspace/";
      await assertArchiveNoticeContract(
        files,
        root,
        "durable-log-service-workspace",
      );
      const worksheet = strFromU8(files[root + "CHANGE-REVIEW.md"]);
      const capacity = strFromU8(
        files[root + "crates/ingest-store/tests/stream_capacity.rs"],
      );
      expect(worksheet).toContain("K=2 → K=1 → K=3");
      expect(worksheet).toContain("Wcześniejsza ekspozycja");
      if (variant === "starter") {
        expect(worksheet).not.toContain("open_with_stream_limit");
        expect(capacity).not.toContain("open_with_stream_limit");
      } else {
        expect(worksheet).toContain("Store::open_with_stream_limit");
        expect(capacity).toContain("open_with_stream_limit");
      }
    }
    const beforeOfflineCapstoneMaterials = await readLearningState();
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
    const afterOfflineCapstoneMaterials = await readLearningState();
    for (const key of [
      "steps",
      "events",
      "mastery",
      "review",
      "reviewSession",
      "notes",
      "bookmarks",
    ]) {
      expect(afterOfflineCapstoneMaterials[key], key).toEqual(
        beforeOfflineCapstoneMaterials[key],
      );
    }
    console.log(
      "Capstone worksheet/test files and both ZIP bytes preserve parity offline without new credit",
    );
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("button", { name: "Rozszerzenia", exact: true })
      .click();
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
        page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pokaż drugą wskazówkę" }).click();
    await page
      .getByText("Potrzebuję pełnego rozwiązania", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pokaż rozwiązanie", exact: true })
      .click();
    await expect(
      page.getByText("ROZWIĄZANIE DO PORÓWNANIA", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(asyncLendingTitle);
    await page
      .locator(".module-picker > button")
      .filter({ hasText: asyncLendingTitle })
      .click();
    await page.locator(".gate-action").first().click();
    await expect(page.locator(".task-pane h1")).not.toHaveText(
      asyncPrimaryHeading,
    );
    await asyncEditor.focus();
    await asyncEditor.press("ControlOrMeta+End");
    const asyncLendingHeading = await page.locator(".task-pane h1").innerText();
    const asyncLendingDraft =
      "// Niezależny async transfer: Pending nie zapisuje efektu przed Ready.\n";
    await asyncEditor.fill(asyncLendingDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
    await expect(
      page.getByText("Tryb offline.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Uruchom", exact: true }),
    ).toHaveCount(0);
    console.log("Async lending gate, keyboard focus and draft resume offline");
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    // Explicit new Send path; the established receiver/offline coverage above stays intact.
    await page.getByRole("searchbox", { name: "Znajdź moduł lub temat" }).fill(asyncLendingTitle);
    await page.locator(".module-picker > button").filter({ hasText: asyncLendingTitle }).click();
    await page.locator(".lesson-list-item").filter({ hasText: "Granica Send i spawn" }).click();
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(6).click();
    await expect(page.locator(".task-pane")).toContainText("prepare_handoff");
    const handoffHeading = await page.locator(".task-pane h1").innerText();
    const handoffEditor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    const handoffDraft = "// Lokalne przygotowanie przed Pending; szkic zachowany offline.\n";
    await handoffEditor.fill(handoffDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await page.getByLabel("Notatki do lekcji").fill("Formatowanie jest synchroniczne; pause zachowuje owned wynik.");
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect.poll(async () => {
      const state = await readLearningState();
      const progress = state.steps["async-lending-send-boundary:async-lending-send-boundary-prepared-handoff"];
      return { code: progress?.code, hints: progress?.hints, note: state.notes["async-lending-send-boundary"], lessonId: state.resume.lessonId, stepIndex: state.resume.stepIndex };
    }).toEqual({ code: handoffDraft, hints: 1, note: "Formatowanie jest synchroniczne; pause zachowuje owned wynik.", lessonId: "async-lending-send-boundary", stepIndex: 6 });
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(handoffHeading);
    await expect(handoffEditor).toHaveValue(handoffDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue("Formatowanie jest synchroniczne; pause zachowuje owned wynik.");
    const handoffState = await readLearningState();
    expect(handoffState.resume).toMatchObject({ lessonId: "async-lending-send-boundary", stepIndex: 6 });
    expect(handoffState.steps["async-lending-send-boundary:async-lending-send-boundary-prepared-handoff"]).toMatchObject({ code: handoffDraft, hints: 1, completed: false });
    expect(handoffState.events.some((event) => event.lessonId === "async-lending-send-boundary" && event.stepId === "async-lending-send-boundary-prepared-handoff" && event.passed && event.evaluator === "tests")).toBe(false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await expect(handoffEditor).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await handoffEditor.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Monaco Editor", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(handoffEditor).toBeFocused();
    await expect(page.getByText("Tryb offline.", { exact: false })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    console.log("Prepared Send handoff draft, note, help, exact resume and keyboard work offline; no compiler credit");
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    // Explicit A2 cancellation path; durable state is inspected before and after reload.
    await page.getByRole("searchbox", { name: "Znajdź moduł lub temat" }).fill(asyncLendingTitle);
    await page.locator(".module-picker > button").filter({ hasText: asyncLendingTitle }).click();
    await page.locator(".lesson-list-item").filter({ hasText: "Anulowanie przed commit" }).click();
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(6).click();
    await expect(page.locator(".task-pane h1")).toHaveText(
      "Zachowaj commit po utracie odpowiedzi",
    );
    const cancellationHeading = await page.locator(".task-pane h1").innerText();
    const cancellationEditor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    const cancellationDraft = "// Commit zachowany po Pending odpowiedzi; szkic offline.\n";
    await cancellationEditor.fill(cancellationDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await page.getByLabel("Notatki do lekcji").fill("Drop przed odpowiedzią nie cofa commit.");
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect.poll(async () => {
      const state = await readLearningState();
      const progress = state.steps["async-lending-cancel-commit:async-lending-cancel-commit-lost-reply"];
      return { code: progress?.code, hints: progress?.hints, note: state.notes["async-lending-cancel-commit"], lessonId: state.resume.lessonId, stepIndex: state.resume.stepIndex };
    }).toEqual({ code: cancellationDraft, hints: 1, note: "Drop przed odpowiedzią nie cofa commit.", lessonId: "async-lending-cancel-commit", stepIndex: 6 });
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(cancellationHeading);
    await expect(cancellationEditor).toHaveValue(cancellationDraft);
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue("Drop przed odpowiedzią nie cofa commit.");
    const cancellationState = await readLearningState();
    expect(cancellationState.resume).toMatchObject({ lessonId: "async-lending-cancel-commit", stepIndex: 6 });
    expect(cancellationState.steps["async-lending-cancel-commit:async-lending-cancel-commit-lost-reply"]).toMatchObject({ code: cancellationDraft, hints: 1, completed: false });
    expect(cancellationState.events.some((event) => event.lessonId === "async-lending-cancel-commit" && event.stepId === "async-lending-cancel-commit-lost-reply" && event.passed && event.evaluator === "tests")).toBe(false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await expect(cancellationEditor).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await cancellationEditor.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Monaco Editor", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(cancellationEditor).toBeFocused();
    await expect(page.getByText("Tryb offline.", { exact: false })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    console.log("Cancellation transfer draft, note, help, exact resume and keyboard work offline; no compiler credit");
    // Initialized-prefix source path: both new lesson panels are inspected
    // before switching to Kod; only durable browser state is asserted offline.
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    const unsafeMiriTitle = "Miri i pure-Rust unsafe: inicjalizacja, aliasowanie oraz wariancja";
    await page.getByRole("searchbox", { name: "Znajdź moduł lub temat" }).fill(unsafeMiriTitle);
    await page.locator(".module-picker > button").filter({ hasText: unsafeMiriTitle }).click();
    await page.locator(".lesson-list-item").filter({ hasText: "Zbuduj ByteView z jawne inicjalizacją" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(7).click();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Od storage do zainicjalizowanego prefiksu", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(8).click();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Zainicjalizuj prefiks i pożycz wynik", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const prefixEditor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    const prefixDraft = "// Prefiks zapisany lokalnie bez uruchamiania runnera.\n";
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await expect(page.locator("#workspace-panel-code")).toBeVisible();
    const simplePrefixEditor = page.getByRole("button", { name: "Prosty edytor", exact: true });
    if (await simplePrefixEditor.count() && await simplePrefixEditor.isVisible()) {
      await simplePrefixEditor.click();
    }
    await expect(prefixEditor).toBeVisible();
    await prefixEditor.fill(prefixDraft);
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await expect(page.locator("#workspace-panel-lesson")).toBeVisible();
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toBeVisible();
    const prefixNote = "Zapisz tylko zainicjalizowane elementy i zachowaj sufiks.";
    await page.getByLabel("Notatki do lekcji").fill(prefixNote);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect.poll(async () => {
      const state = await readLearningState();
      const progress = state.steps["unsafe-miri-byte-view:byte-view-initialized-prefix"];
      return {
        code: progress?.code,
        hints: progress?.hints,
        note: state.notes["unsafe-miri-byte-view"],
        panel: state.resume.panel,
        view: state.resume.view,
        lessonId: state.resume.lessonId,
        stepIndex: state.resume.stepIndex,
      };
    }).toEqual({
      code: prefixDraft,
      hints: 1,
      note: prefixNote,
      panel: "lesson",
      view: "lesson",
      lessonId: "unsafe-miri-byte-view",
      stepIndex: 8,
    });
    const prefixState = await readLearningState();
    expect(prefixState.events.filter((event) => event.lessonId === "unsafe-miri-byte-view" && event.stepId === "byte-view-initialized-prefix" && event.kind === "transfer" && event.evaluator === "tests")).toEqual([]);
    await page.reload();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await expect(page.locator("#workspace-panel-lesson")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Zainicjalizuj prefiks i pożycz wynik", exact: true })).toBeVisible();
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toBeVisible();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(prefixNote);
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await expect(prefixEditor).toBeVisible();
    await expect(prefixEditor).toHaveValue(prefixDraft);
    await prefixEditor.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Monaco Editor", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(prefixEditor).toBeFocused();
    await expect(page.getByText("Tryb offline.", { exact: false })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    console.log("Initialized-prefix model/primary, draft, note, help, exact resume and keyboard work offline; no compiler credit");
    // Disjoint-range model/primary path: inspect the appended model, then
    // preserve a real draft, note, hint and exact index-8 resume offline.
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(unsafeMiriTitle);
    await page.locator(".module-picker > button").filter({ hasText: unsafeMiriTitle }).click();
    await page.locator(".lesson-list-item").filter({ hasText: "Rozdziel mutowalne regiony" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(7).click();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Model: dwa zakresy i kolejność argumentów", exact: true })).toBeVisible();
    await expect(page.locator(".task-pane")).toContainText("0..2");
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(8).click();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Przenieś dowód na dwa zakresy", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const disjointEditor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    const simpleDisjointEditor = page.getByRole("button", { name: "Prosty edytor", exact: true });
    if (await simpleDisjointEditor.count() && await simpleDisjointEditor.isVisible()) {
      await simpleDisjointEditor.click();
    }
    await expect(disjointEditor).toBeVisible();
    const disjointDraft = "// Zakresy zapisane offline bez transferu.\n";
    await disjointEditor.fill(disjointDraft);
    await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
    await page.getByRole("tab", { name: "Output", exact: false }).click();
    await expect(page.getByText("Kompilator niedostępny", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await page.getByText("Twój notatnik", { exact: true }).click();
    const disjointNote = "Półotwarte zakresy zachowują kolejność caller'a offline.";
    await page.getByLabel("Notatki do lekcji").fill(disjointNote);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć", exact: true }).click();
    await expect.poll(async () => {
      const state = await readLearningState();
      const progress = state.steps["unsafe-miri-disjoint-regions:disjoint-regions-range-transfer"];
      return {
        code: progress?.code,
        hints: progress?.hints,
        note: state.notes["unsafe-miri-disjoint-regions"],
        lessonId: state.resume.lessonId,
        stepIndex: state.resume.stepIndex,
      };
    }).toEqual({
      code: disjointDraft,
      hints: 1,
      note: disjointNote,
      lessonId: "unsafe-miri-disjoint-regions",
      stepIndex: 8,
    });
    const disjointOfflineState = await readLearningState();
    expect(disjointOfflineState.events.filter((event) =>
      event.lessonId === "unsafe-miri-disjoint-regions" &&
      event.stepId === "disjoint-regions-range-transfer" &&
      event.kind === "transfer" &&
      event.passed,
    )).toEqual([]);
    await page.reload();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Przenieś dowód na dwa zakresy", exact: true })).toBeVisible();
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(disjointNote);
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await expect(disjointEditor).toBeVisible();
    await expect(disjointEditor).toHaveValue(disjointDraft);
    await disjointEditor.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Monaco Editor", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(disjointEditor).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const disjointReloadState = await readLearningState();
    expect(disjointReloadState.resume).toMatchObject({
      lessonId: "unsafe-miri-disjoint-regions",
      stepIndex: 8,
    });
    expect(disjointReloadState.events.filter((event) =>
      event.lessonId === "unsafe-miri-disjoint-regions" &&
      event.stepId === "disjoint-regions-range-transfer" &&
      event.kind === "transfer" &&
      event.passed,
    )).toEqual([]);
    await page.setViewportSize({ width: 1280, height: 900 });
    console.log("Disjoint-range model/primary draft, note, help, exact index-8 resume and keyboard work offline; no compiler or transfer credit");
    // Slot lazy-init model/primary path: the historical seven-step prefix is
    // followed by the exposure model and a fresh transfer family.
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill(unsafeMiriTitle);
    await page.locator(".module-picker > button").filter({ hasText: unsafeMiriTitle }).click();
    await page
      .locator(".lesson-list-item")
      .filter({ hasText: "Utrzymaj stan Slot<T> z MaybeUninit" })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(7).click();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    const slotModelHeading = await page.locator(".task-pane h1").innerText();
    expect(slotModelHeading).toMatch(/model|Empty|Full/i);
    await expect(page.locator(".task-pane")).toContainText("Option");
    await expect(page.locator(".task-pane")).toContainText("pusty");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(8).click();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    const slotHeading = await page.locator(".task-pane h1").innerText();
    await expect(page.locator(".task-pane")).toContainText("get_or_try_init");
    await expect(page.locator(".task-pane")).toContainText("FnOnce");
    await expect(page.locator(".task-pane")).toContainText("Empty");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const slotEditor = page.getByRole("textbox", { name: "Kod Rust", exact: true });
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    const simpleSlotEditor = page.getByRole("button", { name: "Prosty edytor", exact: true });
    if (await simpleSlotEditor.count() && await simpleSlotEditor.isVisible()) {
      await simpleSlotEditor.click();
    }
    await expect(slotEditor).toBeVisible();
    const slotDraft = "// Lazy init zapisany offline bez uruchamiania runnera.\n";
    await slotEditor.fill(slotDraft);
    await page.getByRole("button", { name: "Uruchom testy", exact: true }).click();
    await page.getByRole("tab", { name: "Output", exact: false }).click();
    await expect(page.getByText("Kompilator niedostępny", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await page.getByText("Twój notatnik", { exact: true }).click();
    const slotNote = "Full pomija inicjalizator; Empty po błędzie pozostaje pusty.";
    await page.getByLabel("Notatki do lekcji").fill(slotNote);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć", exact: true }).click();
    await expect.poll(async () => {
      const state = await readLearningState();
      const progress = state.steps["unsafe-miri-slot-state:slot-state-lazy-init-transfer"];
      return {
        code: progress?.code,
        hints: progress?.hints,
        note: state.notes["unsafe-miri-slot-state"],
        lessonId: state.resume.lessonId,
        stepIndex: state.resume.stepIndex,
      };
    }).toEqual({
      code: slotDraft,
      hints: 1,
      note: slotNote,
      lessonId: "unsafe-miri-slot-state",
      stepIndex: 8,
    });
    const slotOfflineState = await readLearningState();
    expect(slotOfflineState.events.filter((event) =>
      event.lessonId === "unsafe-miri-slot-state" &&
      event.stepId === "slot-state-lazy-init-transfer" &&
      event.kind === "transfer" &&
      event.passed,
    )).toEqual([]);
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(slotHeading);
    await page.getByRole("tab", { name: "Zadanie", exact: true }).click();
    await page.getByText("Twój notatnik", { exact: true }).click();
    await expect(page.getByLabel("Notatki do lekcji")).toHaveValue(slotNote);
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await expect(slotEditor).toBeVisible();
    await expect(slotEditor).toHaveValue(slotDraft);
    await slotEditor.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Monaco Editor", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(slotEditor).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const slotReloadState = await readLearningState();
    expect(slotReloadState.resume).toMatchObject({
      lessonId: "unsafe-miri-slot-state",
      stepIndex: 8,
    });
    expect(slotReloadState.events.filter((event) =>
      event.lessonId === "unsafe-miri-slot-state" &&
      event.stepId === "slot-state-lazy-init-transfer" &&
      event.kind === "transfer" &&
      event.passed,
    )).toEqual([]);
    await page.setViewportSize({ width: 1280, height: 900 });
    console.log("Slot lazy-init model/primary draft, note, help, exact index-8 resume and keyboard work offline; no compiler or transfer credit");
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
      page.locator(".save-status").filter({ hasText: "Zapisano na tym urządzeniu" }),
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
    const apiReleaseFirstBlankHeading = await page
      .locator(".task-pane h1")
      .innerText();
    await page
      .getByRole("button", { name: apiReleaseMatrixTitle, exact: true })
      .click();
    await expect(page.getByLabel("Potwierdzone")).toHaveCount(0);
    await expect(page.locator(".gate-action")).toHaveCount(2);
    await page.locator(".gate-action").nth(1).click();
    const apiReleaseSecondPrimaryHeading = await page
      .locator(".task-pane h1")
      .innerText();
    expect(apiReleaseSecondPrimaryHeading).not.toBe(
      apiReleaseFirstBlankHeading,
    );
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    const apiReleaseSecondEditor = page.locator(
      'textarea[aria-label="Kod Rust"]',
    );
    const apiReleaseSecondDraft =
      "// Macierz konfiguracji i MSRV zachowana offline.\n";
    await apiReleaseSecondEditor.fill(apiReleaseSecondDraft);
    await apiReleaseSecondEditor.blur();
    await expect(page.locator(".save-status")).toHaveText(
      "Zapisano na tym urządzeniu",
    );
    await page.reload();
    await expect(page.locator(".task-pane h1")).toHaveText(
      apiReleaseSecondPrimaryHeading,
    );
    await page.getByRole("tab", { name: "Kod", exact: true }).click();
    await expect(apiReleaseSecondEditor).toHaveValue(apiReleaseSecondDraft);
    await context.setOffline(true);
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await page.getByRole("tab", { name: "Output", exact: false }).click();
    await expect(
      page.getByText("Kompilator niedostępny", { exact: true }),
    ).toBeVisible();
    await expect(apiReleaseSecondEditor).toHaveValue(apiReleaseSecondDraft);
    await expect(
      page.getByText("Tryb offline.", { exact: false }),
    ).toBeVisible();
    await context.setOffline(false);
    console.log(
      "API release matrix navigation, both gate criteria, notes, keyboard and exact resume work offline",
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("button", { name: "Mapa nauki", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Znajdź moduł lub temat" })
      .fill("Własność");
    await page
      .locator(".module-picker > button")
      .filter({ hasText: "Własność: pokaż odpowiedzialność" })
      .click();
    await expect(page.locator(".module-summary")).toContainText(
      "Historia i ukończone kroki pozostają zapisane",
    );
    await page
      .locator(".lesson-list-item")
      .filter({ hasText: "Pożycz, zanim zduplikujesz" })
      .click();
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(5).click();
    await page.getByRole("radio", { name: "&mut String", exact: true }).check();
    await page
      .getByRole("button", { name: "Sprawdź odpowiedź", exact: true })
      .click();
    await page.getByLabel("Kroki lekcji").getByRole("button").nth(2).click();
    const ownershipEditor = page.getByRole("textbox", {
      name: "Kod Rust",
      exact: true,
    });
    const ownershipDraft =
      "// Wersjonowany szkic ownership, bez wykonania kompilatora.\n";
    await ownershipEditor.fill(ownershipDraft);
    await page.getByRole("button", { name: "Pomóż mi to zrozumieć" }).click();
    await expect(page.locator(".task-pane")).toContainText(
      "samodzielne zadania kodowe 0/2",
    );
    await expect(page.locator(".save-status")).toHaveText(
      "Zapisano na tym urządzeniu",
    );
    const ownershipBefore = await readLearningState();
    const ownershipChoice = ownershipBefore.events.findLast(
      (event) =>
        event.lessonId === "borrow-intro" &&
        event.stepId === "borrow-transfer" &&
        event.evaluator === "choice",
    );
    expect(ownershipChoice).toMatchObject({
      evidenceVersion: 2,
      passed: true,
      conceptIds: ["mutable-borrow"],
    });
    const ownershipRawTests = ownershipBefore.events.filter(
      (event) =>
        event.lessonId === "borrow-intro" && event.evaluator === "tests",
    );
    expect(ownershipRawTests).toEqual([]);
    await context.setOffline(true);
    await page.reload();
    await expect(ownershipEditor).toHaveValue(ownershipDraft);
    await expect(
      page.getByText("WSKAZÓWKA 1 · OBSZAR", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".task-pane")).toContainText(
      "samodzielne zadania kodowe 0/2",
    );
    await page
      .getByRole("button", { name: "Uruchom testy", exact: true })
      .click();
    await expect(
      page.getByText("Kompilator niedostępny", { exact: true }),
    ).toBeVisible();
    await expect(ownershipEditor).toHaveValue(ownershipDraft);
    const ownershipAfter = await readLearningState();
    expect(
      ownershipAfter.events.slice(0, ownershipBefore.events.length),
    ).toEqual(ownershipBefore.events);
    expect(
      ownershipAfter.events
        .slice(ownershipBefore.events.length)
        .every(
          (event) =>
            event.kind === "exposure" &&
            event.passed &&
            !event.gate &&
            event.evidenceVersion === undefined,
        ),
    ).toBe(true);
    expect(
      ownershipAfter.events.filter(
        (event) =>
          event.lessonId === "borrow-intro" && event.evaluator === "tests",
      ),
    ).toEqual([]);
    expect(ownershipAfter.steps["borrow-intro:borrow-conflict"]).toMatchObject({
      code: ownershipDraft,
      hints: 1,
      revealed: false,
      completed: false,
    });
    expect(
      ownershipAfter.steps["borrow-intro:borrow-conflict"].attempts.at(-1),
    ).toMatchObject({
      passed: false,
      result: { status: "infrastructure-error" },
    });
    await page.reload();
    await expect(ownershipEditor).toHaveValue(ownershipDraft);
    await expect(page.locator(".task-pane")).toContainText(
      "samodzielne zadania kodowe 0/2",
    );
    await context.setOffline(false);
    console.log(
      "Ownership versioned choice/history, assisted draft and current 0/2 resume offline; unavailable runner awards no assessment",
    );
    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    console.log(
      "Expected offline transport console errors",
      expectedOfflineConsoleErrors,
    );
    console.log("Page errors", errors);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
