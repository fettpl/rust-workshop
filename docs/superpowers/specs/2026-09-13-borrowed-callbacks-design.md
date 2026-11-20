# Borrowed callbacks: variance and HRTB

The course already covers basic lifetimes, closures and callable contracts, but has no executable variance or HRTB material. This milestone adds four lessons within the existing single-file Rust runner. It is the next bounded curriculum stage in the approved autonomous course goal. It introduces practical safe-Rust API behavior; unsafe variance, PhantomData, GATs and async lending remain future topics.

## Integration

- Module `borrowed-callbacks`, title `Pożyczone API: wariancja i HRTB`, registered after `closures`, prerequisite module `closures`.
- Four ordered lesson/concept IDs: `variance-shared-views`, `variance-mutable-slots`, `hrtb-local-visitors`, `hrtb-borrowed-projections`.
- First lesson prerequisite `closure-contracts`, first concept prerequisite `callable-contracts`. Each following lesson/concept depends on the previous new ID.
- Each lesson has prediction, runnable observation, precise explanation, primary `${id}-gate`, independent `${id}-blank` without starter or supplied signature, and a separately authored coding review. Eight lesson gate tasks total: four primary tasks and four blanks. Coding reviews are four separate retrieval exercises, not additional module gate criteria.
- All snippets std-only Rust 2024 using trusted fixture target `rustc-2024`. Existing runner/persistence/learner evidence remain unchanged. No new package is necessary; project count remains eight.
- Hidden tests compile real client code using short-lived non-static owners and exercise behavior. Intentional compiler errors are discovery steps with a verified error code or diagnostic. Do not fabricate errors or grade a source regex as proof of a type property.
- Keep old lesson/project IDs and saved progress. Showing the primary solution must leave the blank challenge independent. The review engine already schedules retrieval; do not claim a learner has completed a 24-hour retrieval merely because the task exists.

## Lesson 1: shared views and subtyping

Teach `'long: 'short`, covariance of shared references and a struct containing a shared reference. Shortening the usable borrow does not shorten or extend the actual owner's lifetime. `T: 'static` differs from a value being kept alive forever. Explain function input/output variance with a small compiler-checked function-pointer example, using elided `fn(&str)` before the later explicit `for` syntax; do not equate subtyping with class inheritance.

Primary contract: public `Label<'data>` with public `text: &'data str`, and `shorten_label<'long: 'short, 'short>(Label<'long>, &'short ()) -> Label<'short>`. Preserve the same view, including empty and Unicode input. The token only bounds the returned type and is not stored. Hidden client code must additionally compile a generic covariance conversion of the public Label type itself; testing only text equality is not evidence of covariance.

Fresh blank: a borrowed numeric `Samples<'data>` view with public `values: &'data [i32]` and checked `prefix_samples` consuming that view, a count and a borrowed unit token, returning an Option of a shortened prefix tied to the token scope. Zero count succeeds with an empty slice; oversize count returns None; full length succeeds; slice pointer is preserved. Describe API names, fields and behavior in prose; let learner write signature and implementation. Hidden client code checks generic lifetime conversion, local data, and boundaries.

Fresh review changes structure and behavior again: `FrameSplit<'data>` with public `left` and `right` fields of type `&'data [u8]`; `split_frame` takes the borrowed input bytes, an offset and a borrowed unit token and returns an Option of FrameSplit shortened to the token scope. Offsets 0 and len are valid, offsets above len return None. Both views retain original storage. Include a generic covariance witness for FrameSplit itself and pointer checks of both public views. Give these names and the complete behavior in the learner prompt.

## Lesson 2: mutable slots are invariant in their contents

Distinguish `&'loan mut T` being covariant in the outer loan lifetime from invariant in T. Show why treating a mutable slot containing a long-lived reference as a slot of short-lived references would permit invalid assignment. No unsafe demonstration is run. Diagnose a real rejected assignment, then fix the API by separating the outer reborrow from the stored reference lifetime.

Primary `replace_label<'data>(slot: &mut &'data str, next: &'data str) -> &'data str` returns the old view and stores next. It must work on repeated short mutable reborrows and local non-static strings; no allocation or clone is required. Hidden tests verify alias/pointer identity, same-value replacement, empty strings and later reuse of slot and original owner. The function must not tie the lifetime of &mut slot to the lifetime of the stored text.

Fresh blank `replace_window` operates on a mutable slot holding a borrowed byte slice. Given a candidate slice plus start/end indices, validate start <= end <= len; on success store that subrange and return Some(previous slice), otherwise return None and leave the slot untouched. Zero-length ranges are valid. Hidden tests require repeated short loans, exact old/new view provenance and non-static data. Learner writes the signature from prose.

Fresh review: `replace_at` takes a mutable slice of borrowed text views (`&mut [&'data str]`), an index and the next `&'data str`. Replace the chosen reference and return Some(old view), or None for invalid index with no effects. The outer slice loan stays independent of the stored reference lifetime. This is a slice API, not Vec-specific. Do not require unrelated Copy/Clone bounds. Give all names, parameter roles and behavior in the learner prompt.

## Lesson 3: universally callable local visitors

Teach `F: for<'a> FnMut(&'a str) -> R`: the caller supplies F, the producer creates short borrows at each invocation, and R is one fixed type independent of those borrows. A single caller-chosen lifetime or `&'static str` input cannot describe this producer. HRTB is not a `'static` requirement on F or on captured state. The FnMut shorthand with elided argument lifetime is valid and must be accepted.

Primary `inspect_owned<F, R>(items: Vec<String>, inspect: F) -> Vec<R>` visits each owned item once, in input order, borrowing the current text only during its callback and collecting results. Empty input makes zero calls. A non-Clone owned R is allowed; callbacks may borrow and mutate local state, and may capture non-static data. Hidden tests use function items, FnMut capture, Unicode and empty strings, non-Clone R and separate local owners. Compile-fail discovery demonstrates a single chosen lifetime failing on producer-local data, with an actual checked diagnostic.

Fresh blank: `inspect_until` borrows each owned byte packet for a callback returning Result<R, E>; stop on first error, do not visit later packets, return that exact owned E or all R values on success. R/E need no Clone. Empty input is Ok(empty). Contract uses Vec<Vec<u8>> and universal &[u8] borrows. Include tests for failing first/middle/last and an external mutable call trace.

Fresh review: `select_owned` takes Vec<String> and a visitor returning Option<R>, skips None but retains order and visits every record exactly once; stateful closure with non-static capture and non-Clone outputs. This adds filtering rather than repeating the main map contract.

## Lesson 4: projections with a borrowed result

Teach `F: for<'a> FnMut(&'a str) -> &'a str`: the returned view lifetime varies with the input borrow. A generic fixed R in the preceding lesson cannot model arbitrary per-input borrowed results. A lifetime relationship guarantees validity, not that the result must be a substring of the input; a static fallback can also satisfy this bound. Avoid claiming pointer provenance follows from lifetime annotations alone.

Primary `project_lengths<F>(items: Vec<String>, project: F) -> Vec<usize>` invokes project once per item and immediately records the returned view's byte length before the current item disappears. Empty input means no calls. Accept named generic projection functions and stateful closures with suitable lifetime inference, non-static captured configuration, Unicode views, empty strings and a legitimate static fallback. Explicitly contrast an inline closure at the generic call with a separately assigned closure variable: the latter can fail with an insufficiently general inferred signature. Use inline `|s: &str| s.trim()`, a named lifetime-generic function, or an explicit `fn(&str) -> &str` pointer. A function returning `&'static str` can require that pointer cast before trait-bound matching; do not claim trait resolution automatically performs every covariance coercion. A non-static captured suffix can influence the selected input view; returning the captured suffix itself is not the same universally borrowed-output contract.

Fresh blank: `find_projected_size` owns byte packets, uses a callback with universal input lifetime and an Option of a borrowed byte-slice output. Return the length of the first Some view, including Some(0); return None if all are None. Stop immediately at first Some and never call later packets. This changes data type, optional output and call policy. No view escapes the producer.

Fresh review: `try_project_lengths` takes Vec<String> and a borrowed text projection returning Result<&str, E> for each owned record, returning all byte lengths or the first exact owned E, and stopping later calls after failure. E is one fixed owned type; do not require Clone or `'static`. Distinguish output lifetime quantification from the fixed error type.

## Sources and evidence

Use official reviewed sources (reviewedAt 2026-09-13) with narrow explanations and source IDs:
- Rust Reference, subtyping and variance: https://doc.rust-lang.org/reference/subtyping.html
- Rust Reference, lifetime and higher-ranked bounds: https://doc.rust-lang.org/reference/trait-bounds.html
- Rustonomicon, HRTB: https://doc.rust-lang.org/nomicon/hrtb.html
- Rust Reference, function lifetime elision: https://doc.rust-lang.org/reference/lifetime-elision.html
- Rust Book lifetime and closure chapters, and exact Error Index entries for codes actually observed.

Write tests first and observe intended starter failure; references must compile and pass all nonempty test suites. Test type compatibility through generic client functions and local owner scopes, not only equivalent runtime values. Format every authored Rust snippet. Independent reviews must inspect learner-facing contracts, transfer novelty, actual diagnostic evidence and test strength. Root runs integration/content/Rust checks, production build/E2E/offline, updates source/coverage reports, commits and releases after all CI jobs pass for the exact head. No learner-code execution, external Playground POST, dependency install or deployment is part of this stage.

## Technical design review

Independent Luna high review compiled the core interfaces on Rust 1.98.1 in edition 2024. Mutable assignment rejection has a message without an E code; fixed caller lifetime visitor fails E0597. Closure inference, public split fields and mutable-slice review contracts were clarified before implementation. Ruling: module criteria remain the stated primary/blank pairs; retrieval exercises are separate, correcting a reviewer misreading of the gate count.
