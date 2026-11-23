"use client";
import { LanguagePicker, useLocale } from "@/components/locale-provider";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return (
    <main className="loading">
      <LanguagePicker />
      <h1>{t("Warsztat napotkał problem.")}</h1>
      <p>{t("Twój lokalny zapis pozostaje na urządzeniu.")}</p>
      <button className="primary" onClick={reset}>
        {t("Spróbuj ponownie")}
      </button>
    </main>
  );
}
