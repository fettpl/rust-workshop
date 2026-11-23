import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import {
  contract,
  sha256,
  inspectOriginal,
  verifyGenerated,
} from "../../scripts/monaco-sanitizer.mjs";

// Instrumentation exists only in this routed test response, never in public output.
function exposeSanitizer(source: string, stock: boolean) {
  if (stock) inspectOriginal(source);
  else verifyGenerated(source);
  const file = ts.createSourceFile(
    "probe.js",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const call = (file.statements[0] as ts.ExpressionStatement)
    .expression as ts.CallExpression;
  const wrapped = call.arguments[2] as ts.ParenthesizedExpression;
  const callback = wrapped.expression as ts.FunctionExpression;
  const at = callback.body.end - 1;
  return source.slice(0, at) + ";C.__securitySanitizer=Ku;" + source.slice(at);
}
async function probe(page: Page, stock: boolean, trustedTypes: boolean) {
  const source = await readFile(
    join(
      stock ? "node_modules/monaco-editor/min/vs" : "public/monaco/vs",
      contract.chunk,
    ),
    "utf8",
  );
  if (stock) expect(sha256(source)).toBe(contract.source);
  const instrumented = exposeSanitizer(source, stock);
  await page.route("**/__dependency_probe", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><body><script src="/monaco/vs/loader.js"></script></body></html>',
    }),
  );
  await page.route(`**/monaco/vs/${contract.chunk}`, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: instrumented,
    }),
  );
  await page.goto("/__dependency_probe");
  return page.evaluate(
    async ({ stock, trustedTypes }) => {
      type Purifier = {
        version: string;
        sanitize: (
          value: Node | string,
          config?: Record<string, unknown>,
        ) => unknown;
        addHook: (name: string, hook: () => void) => void;
        removeAllHooks: () => void;
        isSupported: boolean;
      };
      type AMDRequire = ((
        ids: string[],
        resolve: (...args: unknown[]) => void,
        reject: (error: unknown) => void,
      ) => void) & { config: (config: unknown) => void };
      const amd = (window as unknown as { require: AMDRequire }).require;
      if (!trustedTypes)
        Object.defineProperty(window, "trustedTypes", { value: undefined });
      amd.config({ paths: { vs: "/monaco/vs" } });
      const [editor, fixed] = await new Promise<
        [{ __securitySanitizer: Purifier }, Purifier]
      >((resolve, reject) =>
        amd(
          ["vs/editor-BdtEMBbM", "vs/dompurify-fixed"],
          (...modules) =>
            resolve(modules as [{ __securitySanitizer: Purifier }, Purifier]),
          reject,
        ),
      );
      const purifier = editor.__securitySanitizer;
      const host = document.createElement("div");
      const shadow = host.attachShadow({ mode: "open" });
      shadow.append(
        document.createTextNode("$"),
        document.createElement("object"),
        document.createTextNode("{workshopSecurityProbe}"),
      );
      purifier.sanitize(host, { IN_PLACE: true, SAFE_FOR_TEMPLATES: true });
      shadow.normalize();
      let hooks = 0;
      purifier.addHook("uponSanitizeElement", () => {
        hooks++;
      });
      const fragment = purifier.sanitize(
        '<b>safe</b><img src="x" onerror="inertMarker">',
        { RETURN_DOM_FRAGMENT: true },
      ) as DocumentFragment;
      purifier.removeAllHooks();
      const hookCount = hooks;
      purifier.sanitize("<i>again</i>");
      const trusted = purifier.sanitize("<b>trusted</b>", {
        RETURN_TRUSTED_TYPE: true,
      });
      return {
        stock,
        version: purifier.version,
        singleton: purifier === fixed,
        supported: purifier.isSupported,
        reconstructed: shadow.textContent,
        fragment: fragment instanceof DocumentFragment,
        safe: fragment.querySelector("b")?.textContent,
        eventAttribute: fragment.querySelector("img")?.getAttribute("onerror"),
        hooks: hookCount,
        cleanedHooks: hooks === hookCount,
        trusted: String(trusted),
        trustedObject: typeof trusted === "object",
        trustedTypesAvailable: !!(
          window as unknown as { trustedTypes?: unknown }
        ).trustedTypes,
      };
    },
    { stock, trustedTypes },
  );
}
for (const trustedTypes of [true, false]) {
  test(`actual AMD sanitizer instance repairs inert shadow-root regression (Trusted Types ${trustedTypes})`, async ({
    page,
  }, testInfo) => {
    const old = await probe(page, true, trustedTypes);
    await testInfo.attach("actual-stock-runtime-security-RED", {
      body: JSON.stringify(old, null, 2),
      contentType: "application/json",
    });
    expect(old.version).toBe("3.4.15");
    expect(old.reconstructed).toBe("${workshopSecurityProbe}");
    await page.unrouteAll();
    const fixed = await probe(page, false, trustedTypes);
    await testInfo.attach("actual-fixed-runtime-security-GREEN", {
      body: JSON.stringify(fixed, null, 2),
      contentType: "application/json",
    });
    expect(fixed.version).toBe("3.4.18");
    expect(fixed.singleton).toBe(true);
    expect(fixed.reconstructed).not.toContain("${workshopSecurityProbe}");
    expect(fixed.supported).toBe(true);
    expect(fixed.fragment).toBe(true);
    expect(fixed.safe).toBe("safe");
    expect(fixed.eventAttribute).toBeNull();
    expect(fixed.hooks).toBeGreaterThan(0);
    expect(fixed.cleanedHooks).toBe(true);
    expect(fixed.trusted).toBe("<b>trusted</b>");
    expect(fixed.trustedObject).toBe(
      trustedTypes && fixed.trustedTypesAvailable,
    );
  });
}

test("a new-worker-controlled reload ignores recreated old runtime caches and works offline", async ({
  page,
  context,
}) => {
  // Seed the outgoing cache before the application can register a worker.
  await page.goto("/icon.svg");
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations())
      await registration.unregister();
    for (const name of await caches.keys()) await caches.delete(name);
    const old = await caches.open("rust-workshop-v31");
    await old.put(
      "/monaco/vs/dompurify-fixed.js",
      new Response("stale-vulnerable-runtime"),
    );
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await page.goto("/");
  const migration = await page.evaluate(async () => {
    const names = await caches.keys();
    const repaired = await fetch("/monaco/vs/dompurify-fixed.js").then((r) =>
      r.text(),
    );
    // Model an older in-flight handler reopening its deleted generation after activation.
    const old = await caches.open("rust-workshop-v31");
    await old.put(
      "/monaco/vs/dompurify-fixed.js",
      new Response("stale-vulnerable-runtime"),
    );
    const current = await fetch("/monaco/vs/dompurify-fixed.js").then((r) =>
      r.text(),
    );
    return {
      names,
      repaired,
      current,
      controlled: !!navigator.serviceWorker.controller,
    };
  });
  expect(migration.controlled).toBe(true);
  expect(migration.names).toContain("rust-workshop-v32");
  expect(migration.names).not.toContain("rust-workshop-v31");
  expect(migration.repaired).toContain("DOMPurify 3.4.18");
  expect(migration.current).toBe(migration.repaired);
  await context.setOffline(true);
  try {
    await page.reload();
    expect(
      await page.evaluate(() =>
        fetch("/monaco/vs/dompurify-fixed.js").then((r) => r.text()),
      ),
    ).toBe(migration.repaired);
  } finally {
    await context.setOffline(false);
  }
});
