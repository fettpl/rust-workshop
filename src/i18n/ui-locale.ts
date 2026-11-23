import { englishUi } from "./ui-en";

export const sourceClassificationLabels = {
  stable: "Źródło stabilne",
  dynamic: "Źródło zmienne",
  versioned: "Źródło wersjonowane",
} as const;

export type Locale = "pl" | "en";

export const LOCALE_STORAGE_KEY = "rust-workshop-locale";

export function initialLocale(
  preference: string | null,
  hasSavedProgress: boolean,
  browserLanguages: readonly string[],
): Locale {
  if (preference === "pl" || preference === "en") return preference;
  if (hasSavedProgress) return "pl";
  for (const language of browserLanguages) {
    const code = language.toLowerCase().split("-")[0];
    if (code === "pl" || code === "en") return code;
  }
  return "pl";
}

type MessageValue = string | number | undefined;

export function translateUi(
  locale: Locale,
  source: string,
  ...values: MessageValue[]
): string {
  const message =
    locale === "en" && Object.hasOwn(englishUi, source)
      ? englishUi[source]
      : source;
  return values.length
    ? message.replace(/\{(\d+)\}/g, (_, index: string) =>
        String(values[Number(index)] ?? ""),
      )
    : message;
}
