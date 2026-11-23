import type { ReactNode } from "react";
import type { MasteryLevel } from "@/domain/types";
import { useLocale } from "./locale-provider";
export const masteryLabels: Record<MasteryLevel, string> = {
  new: "Nowe",
  exposed: "Poznane",
  practiced: "Ćwiczone",
  understood: "Rozumiane",
  retained: "Utrwalone",
};
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}
export function MasteryBadge({
  level = "new",
  scope,
}: {
  level?: MasteryLevel;
  scope?: "ownership" | "calibrated";
}) {
  const { t } = useLocale();
  const label =
    scope !== undefined && level === "understood"
      ? t("Potwierdzone w zadaniach")
      : scope !== undefined && level === "retained"
        ? t("Odtworzone po czasie")
        : t(masteryLabels[level]);
  return (
    <span className={`mastery-badge ${level}`}>
      <span aria-hidden="true">
        {level === "retained" ? "◆" : level === "understood" ? "◈" : "○"}
      </span>
      {label}
    </span>
  );
}
export function ProgressLine({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="progress-line"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function OwnershipPolicyNote({
  scope = "ownership",
}: {
  scope?: "ownership" | "calibrated";
}) {
  const { t } = useLocale();
  return (
    <p className="footnote">
      {t(
        "Historia i ukończone kroki pozostają zapisane. Bieżące potwierdzenie zadań",
      )}
      {scope === "ownership"
        ? t(
            " ownership wymaga dwóch różnych rozwiązań kodowych bez podpowiedzi.",
          )
        : t(
            " jest oparte na opisanych rodzinach primary: gate i blank mogą być dwiema formami jednej rodziny, a pomoc nie otwiera nowego wariantu.",
          )}{" "}
      {t("Starsze wyniki pozostają w historii.")}
    </p>
  );
}
export function OwnershipEvidenceCount({
  count,
  required,
  legacy,
}: {
  count: number;
  required?: number;
  legacy: boolean;
}) {
  const { t } = useLocale();
  if (required === undefined) return null;
  return (
    <small>
      {t("Samodzielne zadania kodowe: ")}
      {count}/{required}
      {legacy && t(" · Starsze wyniki nie spełniają bieżącego wymagania.")}
    </small>
  );
}
