import {
  sources,
  lessons,
  concepts,
  reviewExercises,
  modules,
  projects,
  project,
} from "../src/content/course";
import { auditLessonEvidence } from "../src/domain/lesson-evidence-role";
import { spawnSync } from "node:child_process";
async function main() {
const date = new Date().toISOString().slice(0, 10);
const dynamic = sources.filter((s) => s.classification === "dynamic");
const evidenceAudit = auditLessonEvidence({
  lessons,
  modules,
  projects: [...projects, project],
});
const report = {
  generatedAt: date,
  toolchain: spawnSync("rustc", ["--version"], {
    encoding: "utf8",
  }).stdout.trim(),
  dynamicSources: dynamic.map((source) => ({
    ...source,
    usedBy: lessons
      .filter((l) => l.sourceIds.includes(source.id))
      .map((l) => l.id),
  })),
  sources: sources.map((source) => ({
    id: source.id,
    url: source.url,
    reviewedAt: source.reviewedAt,
    recheckPolicy: source.recheckPolicy,
    classification: source.classification,
  })),
  practiceOnlyLessons: evidenceAudit.practiceOnlyLessons,
  lessonsWithoutEvidence: evidenceAudit.lessonsWithoutEvidence,
  evidenceRoleErrors: evidenceAudit.errors,
  conceptsWithoutActiveReview: concepts
    .filter((c) => !reviewExercises[c.id])
    .map((c) => c.id),
  brokenReferences: lessons.flatMap((l) =>
    l.sourceIds
      .filter((id) => !sources.some((s) => s.id === id))
      .map((id) => `${l.id}: ${id}`),
  ),
  linkStatus: [] as { url: string; status: number | string }[],
};
if (process.argv.includes("--check-links")) {
  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      });
      report.linkStatus.push({ url: source.url, status: response.status });
    } catch {
      report.linkStatus.push({ url: source.url, status: "unreachable" });
    }
  }
}
console.log(JSON.stringify(report, null, 2));
if (
  report.lessonsWithoutEvidence.length ||
  report.evidenceRoleErrors.length ||
  report.conceptsWithoutActiveReview.length ||
  report.brokenReferences.length ||
  report.linkStatus.some((s) => typeof s.status !== "number" || s.status >= 400)
)
  process.exitCode = 1;
}
void main();
