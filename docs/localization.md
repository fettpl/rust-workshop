# Polish and English editions

[Polski](localization.pl.md)

## Scope and implementation plan

1. Inventory the public workshop at commit `17a768f`. The baseline contains 51 modules, 204 lessons, 1,436 steps and 92 tracked Markdown files. Include diagnostics, independent practice, review, project downloads, help, recovery and offline use.
2. Provide a visible language control throughout the workshop. Keep the choice on the device. Switching languages should keep the learner on the same screen with the same draft and evidence.
3. Translate navigation, accessibility announcements and course content. Identify technical output separately. Code to execute, commands to type, file names, protocol values and compiler diagnostics must retain their exact spelling.
4. Translate assessment instructions and feedback. Match answers against the actual task. Preserve the original choice IDs, ordering and rubric keys for stored answers, and test earlier backups in both languages.
5. Provide localized teaching documents in starter and solution downloads. Use the same executable files and evidence policy for both languages.
6. Keep the canonical Markdown at its historical path in English, link to a Polish sibling and provide a return link. Preserve examples, paths, original licenses and the distinction between historical records and current instructions.

## Acceptance checks

- Change language from onboarding and within the workshop. Check reload, offline navigation, search, keyboard access, focus, screen-reader labels and date formatting.
- Compare content inventories and assessment behavior across languages. Check that drafts, notes, attempts, independent work and solution exposure survive the switch.
- Inspect both download variants in each language. Compare executable bytes and verify that instructions, notices and links remain usable after extraction.
- Check document pairs and links. Review representative lessons for technical meaning, then record any remaining gaps separately from automated results.

Translation drafts can be prepared locally using the Argos-packaged English–Polish and Polish–English OPUS-MT models (Jörg Tiedemann and Santhosh Thottingal, 2020). The workshop serves stored text and does not send learners' material to a translation service.

## Maintaining translations

Keep the canonical activity IDs, answer keys, rubric selections and executable snippets in the course registry. Add the English teaching text to `src/i18n/course.en.json`. Use `src/i18n/course.pl.json` when the original text needs a Polish display equivalent. Preserve inline code and code blocks verbatim, including the spaces, delimiters and sample output that the task asks the learner to reproduce.

Add interface translations in `src/i18n/ui-en.ts`. Application messages, placeholders, button names and live announcements should follow the selected language. Saved notes, edited programs and raw compiler output belong to the learner. A language switch must never rewrite these values.

For downloadable projects, update the text lookup in `src/i18n/package-documents.json` when an authored Markdown file changes. Run `npm run content:packages` to generate the original native-verification fixtures and both language editions. Run `npm run content:check` and `npm test` to check catalog coverage, documentation pairs, links, code spans, exercise contracts and archive payloads.

## Findings from the first bilingual audit

| Area | What the review found | How to verify it |
| --- | --- | --- |
| Interface and saved work | A single screen combines application labels, course text, learner input and compiler output. Only the first two follow the language choice. | Switch languages while editing a lesson and again after a reload. Check the current step, draft, notes, bookmarks, focus mode and editor accessibility labels. |
| Instructions and grading | A literal can occur in ordinary prose. Translating the output `ok 42`, changing the range `2..5`, or treating an argument pair like a decimal changes the answer to an otherwise unchanged test. | Read each rendered choice together with its evaluator. Check the values and displayed labels against the Rust program, including hints and independent reviews. |
| Rust terminology | “Heap” and “stack” identify different places in the memory model. Crate names, feature paths and error codes carry exact technical meaning. | Compare both the diagram and its caption. Verify that Cargo examples reference the actual package and features, and that diagnostic codes match the exercise. |
| Project packages | A translated README can change a byte limit or troubleshooting step even when the project still compiles. | Compare the displayed README with the extracted download. Compare executable files byte for byte across languages, then check instructional examples and limits against the program. |
| Documentation and offline use | Historical reports include identifiers, failed-run evidence and release conditions. A working language link alone cannot establish that the translation preserves those facts. Offline navigation also needs both editions of each package. | Check links in both directions, code fences, commands and identifiers. Read the conclusions against the original report. In a production build, disconnect the browser, change languages and open a previously unvisited project. |

The initial catalog contains 51 modules, 204 lessons and 16 downloadable projects. All 93 Markdown pairs and 32 pairs of project archives were included in the structural comparison. Independent editorial reviews sampled beginner and advanced material and produced corrections across the catalog. Automated coverage establishes that an edition exists and checks specific technical invariants. Editorial review remains necessary when instructions, examples or assessments change.
