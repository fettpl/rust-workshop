import { courseTextInventory, hasEnglishCourseText } from "../src/i18n/course";

const strings = courseTextInventory();
if (process.argv.includes("--list")) {
  console.log(JSON.stringify(strings, null, 2));
} else {
  const missing = strings.filter((text) => !hasEnglishCourseText(text));
  for (const text of missing) console.error(JSON.stringify(text));
  console.log(
    `${strings.length - missing.length}/${strings.length} course strings have English entries.`,
  );
  process.exitCode = Number(missing.length > 0);
}
