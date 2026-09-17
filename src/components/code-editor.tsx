"use client";
import { useEffect, useRef, useState } from "react";
import Editor, { loader, type BeforeMount } from "@monaco-editor/react";
loader.config({ paths: { vs: "/monaco/vs" } });

const LIGHT_THEME = "rust-workshop-light";
const DARK_THEME = "rust-workshop-dark";

const defineWorkshopThemes: BeforeMount = (monaco) => {
  if (
    !monaco.languages
      .getLanguages()
      .some(({ id }: { id: string }) => id === "toml")
  ) {
    monaco.languages.register({ id: "toml", extensions: [".toml"] });
    // Highlighting only; the bounded TOML adapter performs validation.
    monaco.languages.setMonarchTokensProvider("toml", {
      tokenizer: {
        root: [
          [/#.*$/, "comment"],
          [/"""/, "string", "@multilineBasic"],
          [/'''/, "string", "@multilineLiteral"],
          [/"([^"\\]|\\.)*"/, "string"],
          [/'[^']*'/, "string"],
          [/\b(?:true|false)\b/, "keyword"],
          [/[+-]?(?:\d[\w.:+-]*|inf|nan)/, "number"],
          [/[\[\]{},.=]/, "delimiter"],
          [/[\w-]+/, "identifier"],
        ],
        multilineBasic: [
          [/"""/, "string", "@pop"],
          [/\\./, "string.escape"],
          [/[^"\\]+/, "string"],
          [/"/, "string"],
        ],
        multilineLiteral: [
          [/'''/, "string", "@pop"],
          [/[^']+/, "string"],
          [/'/, "string"],
        ],
      },
    });
  }
  monaco.editor.defineTheme(LIGHT_THEME, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5D6D83", fontStyle: "italic" },
      { token: "keyword", foreground: "1D4ED8" },
      { token: "string", foreground: "15803D" },
      { token: "number", foreground: "7C3AED" },
      { token: "type", foreground: "0F4C81" },
      { token: "delimiter", foreground: "334155" },
      { token: "identifier", foreground: "17243A" },
      { token: "operator", foreground: "1E40AF" },
    ],
    colors: {
      "editor.background": "#F7FAFF",
      "editor.foreground": "#17243A",
      "editorLineNumber.foreground": "#8DA0B8",
      "editorLineNumber.activeForeground": "#2563EB",
      "editorCursor.foreground": "#2563EB",
      "editor.selectionBackground": "#CFE0FF",
      "editor.inactiveSelectionBackground": "#E8F0FF",
      "editor.lineHighlightBackground": "#EFF5FF",
      "editorIndentGuide.background1": "#D6E0EB",
      "editorIndentGuide.activeBackground1": "#A7BEEA",
      "editorWhitespace.foreground": "#D6E0EB",
      "editorBracketMatch.background": "#E8F0FF",
      "editorBracketMatch.border": "#2563EB",
      "editorGutter.background": "#F7FAFF",
    },
  });
  monaco.editor.defineTheme(DARK_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "AAB9CE", fontStyle: "italic" },
      { token: "keyword", foreground: "82ADFF" },
      { token: "string", foreground: "78D6A4" },
      { token: "number", foreground: "C4B5FD" },
      { token: "type", foreground: "7DD3FC" },
      { token: "delimiter", foreground: "C6D5EA" },
      { token: "identifier", foreground: "EDF4FF" },
      { token: "operator", foreground: "A7C4FF" },
    ],
    colors: {
      "editor.background": "#09111E",
      "editor.foreground": "#EDF4FF",
      "editorLineNumber.foreground": "#6E85A3",
      "editorLineNumber.activeForeground": "#82ADFF",
      "editorCursor.foreground": "#A7C4FF",
      "editor.selectionBackground": "#274D86",
      "editor.inactiveSelectionBackground": "#18345E",
      "editor.lineHighlightBackground": "#10213A",
      "editorIndentGuide.background1": "#203653",
      "editorIndentGuide.activeBackground1": "#41658F",
      "editorWhitespace.foreground": "#203653",
      "editorBracketMatch.background": "#18345E",
      "editorBracketMatch.border": "#82ADFF",
      "editorGutter.background": "#09111E",
    },
  });
};

export default function CodeEditor({
  code,
  onChange,
  readOnly = false,
  fontSize = 16,
  theme = "light",
  accessible = false,
  language = "rust",
}: {
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
  fontSize?: number;
  theme?: "light" | "dark";
  accessible?: boolean;
  language?: "rust" | "toml";
}) {
  const [fallback, setFallback] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timer.current = setTimeout(() => setFallback(true), 12000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  if (accessible || fallback)
    return (
      <textarea
        className="code-textarea"
        aria-label={language === "toml" ? "Kod TOML" : "Kod Rust"}
        value={code}
        readOnly={readOnly}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontSize }}
      />
    );
  return (
    <Editor
      height="100%"
      language={language}
      value={code}
      theme={theme === "dark" ? DARK_THEME : LIGHT_THEME}
      onChange={(value) => onChange(value ?? "")}
      beforeMount={defineWorkshopThemes}
      onMount={() => {
        if (timer.current) clearTimeout(timer.current);
        setFallback(false);
      }}
      loading={
        <div className="editor-loading">
          Wczytywanie edytora…{" "}
          <button onClick={() => setFallback(true)}>
            Otwórz prosty edytor
          </button>
        </div>
      }
      options={{
        readOnly,
        fontSize,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbersMinChars: 3,
        padding: { top: 20, bottom: 20 },
        fontFamily: '"SFMono-Regular", Consolas, monospace',
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 4,
        ariaLabel: language === "toml" ? "Kod TOML" : "Kod Rust",
        accessibilitySupport: "on",
        tabFocusMode: true,
        renderLineHighlight: "none",
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        contextmenu: false,
      }}
    />
  );
}
