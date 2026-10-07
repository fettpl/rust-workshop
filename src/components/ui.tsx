import type { ReactNode } from "react";
import type { MasteryLevel } from "@/domain/types";
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
  scope?: "ownership";
}) {
  const label =
    scope === "ownership" && level === "understood"
      ? "Potwierdzone w zadaniach"
      : scope === "ownership" && level === "retained"
        ? "Odtworzone po czasie"
        : masteryLabels[level];
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

export function OwnershipPolicyNote() {
  return (
    <p className="footnote">
      Historia i ukończone kroki pozostają zapisane. Bieżące potwierdzenie zadań
      ownership wymaga dwóch różnych rozwiązań kodowych bez podpowiedzi. Starsze
      wyniki pozostają w historii.
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
  if (required === undefined) return null;
  return (
    <small>
      Samodzielne zadania kodowe: {count}/{required}
      {legacy && " · Starsze wyniki nie spełniają bieżącego wymagania."}
    </small>
  );
}
