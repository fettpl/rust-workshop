"use client";

import Link from "next/link";
import { LanguagePicker, useLocale } from "@/components/locale-provider";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <main className="loading">
      <LanguagePicker />
      <h1>{t("Nie znaleziono strony")}</h1>
      <Link className="primary" href="/">
        {t("Wróć do kursu")}
      </Link>
    </main>
  );
}
