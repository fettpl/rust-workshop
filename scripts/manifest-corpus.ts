/** Fixed maintainer-authored parser probes; never derived from learner state. */
const base = `[package]
name = "syntax-probe"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
publish = false

[package.metadata.probe]
`;

export const manifestSyntaxCorpus = [
  {
    id: "inline-table",
    source: `${base}entry = { name = "value", enabled = true }\n`,
    accepted: true,
  },
  {
    id: "quoted-dotted-key",
    source: `${base}"a.b" = { "c.d" = 7 }\n`,
    accepted: true,
  },
  {
    id: "multiline-array",
    source: `${base}items = [\n "a",\n 'b',\n]\n`,
    accepted: true,
  },
  {
    id: "date-and-comments",
    source: `${base}date = 1979-05-27T07:32:00Z\ntext = "constructor prototype __proto__" # words are harmless\n`,
    accepted: true,
  },
  {
    id: "duplicate-key",
    source: `${base}name = "one"\nname = "two"\n`,
    accepted: false,
  },
  {
    id: "inline-newline",
    source: `${base}entry = {\n name = "value"\n}\n`,
    accepted: false,
    toml11: true,
  },
  {
    id: "inline-trailing-comma",
    source: `${base}entry = { name = "value", }\n`,
    accepted: false,
    toml11: true,
  },
  {
    id: "escape-e",
    source: `${base}text = "\\e"\n`,
    accepted: false,
    toml11: true,
  },
  {
    id: "escape-x",
    source: `${base}text = "\\x41"\n`,
    accepted: false,
    toml11: true,
  },
] as const;
