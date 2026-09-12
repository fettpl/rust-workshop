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
export function MasteryBadge({ level = "new" }: { level?: MasteryLevel }) {
  return (
    <span className={`mastery-badge ${level}`}>
      <span aria-hidden="true">
        {level === "retained" ? "◆" : level === "understood" ? "◈" : "○"}
      </span>
      {masteryLabels[level]}
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
