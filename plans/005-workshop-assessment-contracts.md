# Repair the workshop assessment contracts

Start from local release candidate `7d803e4`. Address the four findings from the 18 November course audit in one local change set. Keep the Polish learner-facing copy and the existing lesson, exercise and project identities. Preserve saved drafts and the meaning of earlier attempts. Hosted integration follows a separate publication decision.

| Work | Acceptance evidence |
| --- | --- |
| 1. Make authored coding tasks usable without a starter. Derive editor availability from the activity and evaluator for both lesson and review workspaces. Keep code observations read-only and retain text and manifest exercises. | Check all 22 affected review definitions and six recall steps. In the browser enter a program on a fresh state, submit, inspect feedback, and resume a saved draft. Cover both screens and one unaffected exercise. |
| 2. Align the four diagnostic observations in generics and closures with the action the screen supports. Teach how the faulty and corrected programs differ, and direct the learner to an editable repair. | The displayed starter produces its stated diagnostic. The observation describes that result. Actual repairs take place in editable steps whose evaluator expects success. Verify E0308, E0507, E0369 and E0596 using the authored examples. |
| 3. Strengthen five Rust assessments: capture-gate, join-report-blank, loom-evidence-assertions-gate, property-invariants-gate and property-generated-inputs-gate. | Each authored solution passes. Tests reject clearing existing output, reversing thread IDs, accepting contradictory observations, and the two single-case property helpers. Judge behavior without prescribing a particular function body. |
| 4. Reconcile inconsistent task specifications, examples and expected results. Prioritize Drop counter semantics, the weak parent representation, and the filtered generator. Cover the adjacent empty timestamp, EOF/CR policy and absolute deadline text. | Nonzero counter input, the promised representation, displayed generator output, timestamp boundary and EOF handling have matching descriptions and checks. Confirm the intended timeout outcome in the associated scenario. |

## Integration and local acceptance

1. Run focused regressions against the predecessor to establish the original failure where practical. Keep browser transport doubles labelled separately from actual Rust compilation.
2. Check immutable historical fixtures and distinguish intentional current-content changes from regressions. Preserve ordered resume positions. Update the finite source inventory only for reviewed content.
3. Run catalog validation, lint, TypeScript, the relevant Rust tests, the unit suite, the production build and browser regressions. Record actual failures or skips.
4. Have a separate GPT-6.1-Sol high reviewer inspect the combined diff, acceptance coverage and compatibility. Commit the locally verified repair in English.
