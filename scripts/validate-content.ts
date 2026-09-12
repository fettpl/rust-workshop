import {
  concepts,
  competencies,
  lessons,
  modules,
  reviewExercises,
  project,
  projects,
  roadmap,
  sources,
  traces,
} from "../src/content/course";
import { validateContent, type ContentBundle } from "../src/content/validate";

export const contentBundle: ContentBundle = {
  lessons,
  concepts,
  competencies,
  modules,
  reviewExercises,
  sources,
  traces,
  project,
  projects,
  roadmap,
};

export function assertValidContent(
  bundle: ContentBundle = contentBundle,
): void {
  const errors = validateContent(bundle);
  if (errors.length > 0)
    throw new Error(
      `Content validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
}

if (process.argv[1]?.endsWith("validate-content.ts")) {
  assertValidContent();
  console.log(
    `Content valid: ${lessons.length} lessons, ${concepts.length} concepts, ${Object.keys(traces).length} traces.`,
  );
}
