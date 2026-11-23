import documents from "./package-documents.json";
import type { Locale } from "./ui-locale";

/** Only repository-authored Markdown is localized. Executable payloads are shared. */
export function localizedPackageMarkdown(source: string, locale: Locale): string {
  const catalog: Readonly<Record<string, Partial<Record<Locale, string>>>> = documents;
  return Object.hasOwn(catalog, source) ? catalog[source][locale] ?? source : source;
}

export function localizedPackageFile(path: string, content: string, locale: Locale): string {
  return path.endsWith(".md") ? localizedPackageMarkdown(content, locale) : content;
}
