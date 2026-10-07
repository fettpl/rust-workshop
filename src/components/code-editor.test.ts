import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import CodeEditor from "./code-editor";

it("labels the accessible manifest editor as TOML and preserves its draft", () => {
  const html = renderToStaticMarkup(
    createElement(CodeEditor, {
      code: '[package]\nname = "demo"',
      onChange: () => {},
      accessible: true,
      language: "toml",
    }),
  );
  expect(html).toContain('aria-label="Kod TOML"');
  expect(html).toContain("[package]");
  expect(html).not.toContain("Kod Rust");
});

it("keeps Rust as the default accessible editor language", () => {
  const html = renderToStaticMarkup(
    createElement(CodeEditor, {
      code: "fn main() {}",
      onChange: () => {},
      accessible: true,
    }),
  );
  expect(html).toContain('aria-label="Kod Rust"');
  expect(html).toContain("fn main() {}");
});

it("renders an empty polite fallback status without changing the Rust draft", () => {
  const html = renderToStaticMarkup(
    createElement(CodeEditor, { code: "fn main() {}", onChange: () => {} }),
  );
  expect(html).toContain("monaco-fallback-status");
  expect(html).toContain('role="status"');
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('aria-atomic="true"');
  expect(html).not.toContain("Edytor ładuje się długo.");
});
