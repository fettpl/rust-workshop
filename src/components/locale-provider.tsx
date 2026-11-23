"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  initialLocale,
  LOCALE_STORAGE_KEY,
  translateUi,
  type Locale,
} from "@/i18n/ui-locale";
import { translateCourseText } from "@/i18n/course";

const polishUi = translateUi.bind(null, "pl");

const LocaleContext = createContext({
  locale: "pl" as Locale,
  t: polishUi,
  courseText: (text: string | undefined) => text ?? "",
  initializeLocale: (() => {}) as (hasSavedProgress: boolean) => void,
  setLocale: (() => {}) as (locale: Locale) => void,
});

function deviceLocale(hasSavedProgress: boolean): Locale {
  let preference = null;
  try {
    preference = localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    // A blocked preference store still allows switching for this visit.
  }
  return initialLocale(
    preference,
    hasSavedProgress,
    navigator.languages ?? [navigator.language],
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setActiveLocale] = useState<Locale>("pl");

  const choiceApplied = useRef(false);
  useEffect(() => {
    // Error and not-found routes render without opening the learning database.
    if (!choiceApplied.current) setActiveLocale(deviceLocale(false));
  }, []);

  const setLocale = useCallback((choice: Locale) => {
    choiceApplied.current = true;
    setActiveLocale(choice);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, choice);
    } catch {
      // The switch still works for this visit when storage is blocked.
    }
  }, []);

  const initializeLocale = useCallback(
    (hasSavedProgress: boolean) => {
      if (!choiceApplied.current) setLocale(deviceLocale(hasSavedProgress));
    },
    [setLocale],
  );

  const t = useCallback<typeof polishUi>(
    (source, ...values) => translateUi(locale, source, ...values),
    [locale],
  );

  const courseText = useCallback(
    (text: string | undefined) =>
      text === undefined ? "" : translateCourseText(text, locale),
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("Rust Workshop — zrozum kod");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        t(
          "Twój lokalny warsztat Rust. Przewiduj, eksperymentuj i rozwiąż nowy problem.",
        ),
      );
    document
      .querySelector('link[rel="manifest"]')
      ?.setAttribute(
        "href",
        locale === "en" ? "/manifest.en.webmanifest" : "/manifest.webmanifest",
      );
  }, [locale, t]);

  return (
    <LocaleContext.Provider
      value={{ locale, t, courseText, initializeLocale, setLocale }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LanguagePicker({ inert }: { inert?: boolean }) {
  const { locale, t, setLocale } = useLocale();
  return (
    <label className="language-picker" inert={inert}>
      <span className="sr-only">{t("Język")}</span>
      <select
        value={locale}
        onChange={(event) =>
          setLocale(event.target.value === "en" ? "en" : "pl")
        }
      >
        <option value="pl" lang="pl">
          Polski
        </option>
        <option value="en" lang="en">
          English
        </option>
      </select>
    </label>
  );
}
