# Cargo Dependency Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Teach dependency, feature, compiler-floor and package declarations through four independently assessed TOML lessons and a verified Frame Protocol archive.

**Architecture:** A bounded TOML adapter evaluates authored declaration contracts locally. Authored concept policies keep manifest and Rust evidence separate; a course facade supplies that policy to every UI path. The existing fixed Cargo archive verifier proves actual build/package behavior independently of learner answers.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Playwright, exact toml-eslint-parser 1.0.3, Cargo stable and Rust 1.85.0.

**Spec:** `docs/superpowers/specs/2026-09-13-cargo-dependency-lifecycle-design.md` (including its exact shared interfaces and learner contracts).

## Global Constraints

- Work on existing `feat/cargo-dependency-lifecycle`; preserve the existing dirty documentation from recovery. Base is `57c24f9` (merged PR #8).
- Polish learning content, English README/commits/PRs; basic programming prerequisites, Rust from zero.
- Exactly four new lessons/concepts, eight existing project identities, no deployment target.
- Use `toml-eslint-parser@1.0.3` with explicit TOML 1.0; project Node engine `^22.13.0 || >=24`.
- The complete shared type/function signatures in the spec are binding. Runner requests/results and execution API remain unchanged.
- Only fixed authored Cargo/Rust fixtures run locally. Never compile learner/imported code or manifests; never publish crates or POST to live Playground during verification.
- Use apply_patch for source/document edits. Generated lockfiles/assets must come from their actual generators.
- Authors use GPT-5.6-Luna high; reviews use GPT-6-Astra xhigh as explicitly requested in the current goal. No worker subagents. Disjoint file ownership permits parallel authors; no worker commits. Root owns milestone commit/PR/merge after reviewed verification.
- Run focused tests during iteration; final full regression once the integrated code is stable. Preserve exact outputs in task reports.

### Task 1: Safe manifest contracts and evaluator

**Files:** Create `src/domain/manifest.ts`, `src/engine/manifest-contract.ts`, `src/engine/manifest-contract.test.ts`; modify `src/domain/types.ts`, `src/engine/evaluate.ts`, `src/engine/evaluate.test.ts`, `package.json`, `package-lock.json`.

**Interfaces:** Produce the exact ManifestContract/assertion types and the three manifest functions in the spec. Add editorMode/editorFile, evidenceArtifact, starterRevealStepRefs and manifest-contract evaluator to domain types. No learning, persistence, content, UI or project helper changes in this task.

- [x] Add failing tests for semantic table/inline/short dependency equivalence, defaults, aliases/scopes, inherited flags, feature sets, quoted dotted keys, contradictory sources and package/workspace shape.

```ts
const contract: ManifestContract = { document: "package", assertions: [
  {kind: "dependency", table: "dependencies", dependency: {
    name: "wire", package: "serde", source: {kind: "registry"}, version: "1.0.229",
    defaultFeatures: false, features: {values: []},
  }},
] };
expect(checkManifestContract('[package]\nname="demo"\n[dependencies]\nwire={package="serde",version="^1.0.229",default-features=false}', contract).passed).toBe(true);
```

- [x] Run `npx vitest run src/engine/manifest-contract.test.ts` and record expected missing-module failure before implementation.
- [x] Install exact parser pin, inspect engines, and implement strict parsing. Check keys with official VisitorKeys before static conversion, with 65536 UTF-8 bytes, 64 AST depth, 20000 nodes; contracts allow 64 assertions, 12 path segments, 4096-character keys/strings. Catch parser/resource failures with bounded Polish feedback. Keep comments/string values containing dangerous words valid; reject dangerous actual key segments.
- [x] Implement own-property assertion matching, direct defaults false/true/empty, no unseen workspace defaults, no workspace-root optional field, narrow full stable caret equivalence, exact/contains string sets. Reject empty/ill-formed contracts and source conflicts. Treat features as named dependency forwarding declarations rather than evidence of Cargo execution.
- [x] Integrate `evaluate` without a fabricated RunResult:

```ts
case "manifest-contract":
  return { ...checkManifestContract(input.code ?? "", evaluator.contract), evaluator: evaluator.kind };
```

- [x] Test dangerous bare/quoted/dotted/table/inline keys, duplicate keys, TOML1.1-only forms, bounds, harmless extra dates/arrays, type mismatches and feedback. Run both focused evaluator suites and typecheck; report any downstream union errors without editing another owner's files.
- [x] Self-review and write task report; leave changes uncommitted for root review.

### Task 2: Authored Cargo archive and verifier

**Files:** Modify `src/content/projects/frame-protocol.ts`, `scripts/verify-workspace.ts`, `src/content/workspace-verification.test.ts`; add a focused archive test if needed. Root owns course registration and new starter reveal refs, CI and package.json.

**Interfaces:** Preserve exported `frameProtocolProject` and archive identity/paths. Existing workspaceManifest/libraryManifest/probeManifest remain full canonical answers read through package.files. Preserve fixed ZIP build/verification behavior and all existing API mutants.

- [x] Read current archive/verifier and add failing declaration tests for optional inherited serde, format forwarding and publish=false. Use `cargo metadata --no-deps --offline --format-version 1` in ordinary unit fixture tests so npm test never requires a registry cache.
- [x] Extend root dependency with serde version1.0.229/default-features=false; library optional workspace serde and format=[dep:serde,serde/alloc,serde/derive]; client format forwards frame-protocol/format. Default/diagnostics remain unchanged. Add only feature-gated Serialize on Frame and a genuine Serialize-bound consumer; never Deserialize or serde_json.
- [x] Generate the actual lockfile in a disposable authored workspace and embed it. Check nine packages, real source/checksums and stable/exact1.85 compatibility. Update Polish README/ADR commands and distinguish default std-only graph from optional locked dependencies.
- [x] Extend CLI to only accept --fetch/--msrv once each. Fetch uses `cargo fetch --locked`; all later commands offline/locked. Verify default selected graph2, all-features selected graph9, inherited declarations, separate library/client/workspace feature matrices, tests/fmt/clippy/doc, unchanged lock bytes and intended starter failures.
- [x] Package only frame-protocol, retain publish=false in source/metadata/normalized package, inspect exact six files Cargo.lock/Cargo.toml/Cargo.toml.orig/README.md/src/lib.rs/tests/public_consumer.rs, and verify extracted package stable/exact1.85. Retain ten API mutants and add feature/source/archive controls with infrastructure errors failing the verifier.
- [x] Run focused unit tests, regenerate assets, `npm run content:workspace -- --fetch`, and the exact MSRV command. Record commands/results and failures without claiming disposable feasibility equals final verification.
- [x] Self-review/report; no commit or edits to other owners' files.

### Task 3: Dependency and feature curriculum

**Files:** Create `src/content/cargo-dependencies.ts`, `src/content/cargo-dependencies.test.ts` only.

**Interfaces:** Export cargoDependencyLessons, cargoDependencyConcepts, cargoDependencyCompetencies, cargoDependencySources, cargoDependencyReviewExercises. Use exact IDs/contracts in spec for cargo-dependency-contract and cargo-resolver-feature-unification. Consume manifest types and canonical completed manifests from Frame project files; do not import course.ts or the other Cargo author file.

- [x] Read existing public-api-values.ts and borrowed-hrtb.ts for lesson shape. Read spec learner contracts and shared interfaces. Inspect official Cargo primary sources online and use actual reviewedAt date.
- [x] Write two 5–8-step Polish lessons: prediction, concrete observation, explanation, primary manifest task, genuinely distinct blank task, recall. Explain resolver3/unification/default feature boundaries without claiming parser runs Cargo. Include local commands with interpretation in the downloaded-project workflow.
- [x] Every graded value must be named in learner prose. Descriptions accept any nonempty string. Primary dependency and feature starters parse but fail intended contract; blank steps have no code. TOML steps set editorMode/editorFile and no compiler expectedStatus. Manifest concepts use evidenceArtifact=manifest; primary/blank assessment/transfer with evidenceGate=true; independent delayed review uses recall.
- [x] Build contracts using path arrays, dependency expectations and feature set assertions. Primary references derive from completed Frame files; standalone normal/dev wire_serde share the same alias with normal emptyfeatures/dev alloc. Feature blank forwards two library features; review forwards json/diagnostics through telemetry_core alias. No weak forwarding syntax or direct serde in client answers.
- [x] Test all references/reviews pass, all supplied gate starters fail, distinct blanks have no code, alternate TOML forms/order pass, omitted/wrong dependency scope/default/optional/alloc/derive/alias/path fields fail. Example test pattern:

```ts
for (const lesson of cargoDependencyLessons) {
  for (const step of lesson.steps.filter(s => s.evaluator?.kind === "manifest-contract")) {
    expect(evaluate(step.evaluator!, {code: step.solution})).toMatchObject({passed: true});
    if (step.code) expect(evaluate(step.evaluator!, {code: step.code}).passed).toBe(false);
  }
}
```

- [x] Run focused content tests after parser becomes available, self-review/report; no course registration, UI or package edits.

### Task 4: Evidence policy, persistence and exposure

**Files:** Modify `src/engine/learning.ts`, its tests, `src/domain/project-package.ts`, its tests, `src/persistence/state.ts`, its tests; create `src/content/learning-context.ts` and focused facade tests. Types are owned by Task1.

**Interfaces:** Exact EvidencePolicy/evidencePolicyForConcepts and optional policy parameters from spec; course facade recordCourseEvidence/recordCourseLessonExposure/revealCourseProjectPackageVariant. Raw revealProjectSolution remains compatible. Facade imports authored course concepts; engine never imports course.

- [x] Add failing tests for manifest understanding from two independent tasks, >24h retrieval retention and mismatched Rust/manifest evidence in both directions. Preserve neutral answer/choice/order/rubric rules and legacy undefined-evaluator Rust fix/project proof.
- [x] Filter artifact mismatches before strong task counts, verified artifact proof and all retention paths. Existing raw callers default to Rust. Unknown concept IDs default to Rust. No imported event can select its own concept policy.
- [x] Thread optional policy through recordEvidence, recordLessonExposure and project exposure, preserving existing timing/hint/reveal/draft/completion behavior. Starter exposes starter refs; solution exposes deduplicated union; repeated access idempotent. All refs validated. Keep blanks/reviews independent.
- [x] Add manifest-contract literal to strict persisted evidence enum, retain schema3 and unchanged v1/v2/v3 migration behavior. Test TOML draft+attempt import/export without RunResult.
- [x] Add facade and tests proving later lesson/review/package exposures cannot downgrade manifest understanding/retention, and that authored policy is used. Root later wires UI and integration refs.
- [x] Run learning/project-package/persistence/facade tests; self-review/report. No UI/content registration edits.

### Task 5: Compiler-floor and package curriculum

**Files:** Create `src/content/cargo-release-policy.ts`, `src/content/cargo-release-policy.test.ts` only.

**Interfaces:** Export cargoReleaseLessons, cargoReleaseConcepts, cargoReleaseCompetencies, cargoReleaseSources, cargoReleaseReviewExercises. Exact cargo-lock-msrv-policy/cargo-package-rehearsal IDs and spec contracts. Consume canonical Frame project files; no course import.

- [x] Read spec exact learner contracts/shared interfaces and existing lesson shape. Verify official Cargo primary sources online with actual reviewedAt date.
- [x] Author two 5–8-step lessons with prediction/observation/explanation/primary/fresh blank/recall and independent delayed reviews. Set manifest artifact and editorMode; do not set compiler status. Each prompt states every graded metadata/key/value/path/feature. Use nonempty descriptions, not memorized prose.
- [x] Primary floor starter differs from dependency lesson: restore resolver3/floor1.85, preserve supplied dependency. Blank inherits all named root metadata using nested .workspace=true paths; do not assert whole rust-version/version absent. Review restores standalone floor. Teach actual --locked/update behavior without fake metadata policy or manual Cargo.lock editing.
- [x] Package primary checks metadata/publishfalse/noincludeexclude. Fresh include/exclude variants match spec, explicitly explain generated Cargo.lock/Cargo.toml.orig and package --list observation. No learner assertion implies execution or publication; package library only.
- [x] Test all answers pass, all starters parse but fail, blanks omit code, and alternate TOML/order/descriptions pass. Mutate floor/resolver/inheritance/publish/metadata/include/exclude/librarypath to prove rejection. Run focused tests, self-review/report.

### Task 6: Course, UI and author-validation integration

**Files:** Root owns `src/content/course.ts`, new cargo-dependency-lifecycle-module.ts, `src/content/validate.ts`, `scripts/verify-rust.ts`, `scripts/verify-manifests.ts`, fixed manifest corpus, `.github/workflows/ci.yml`, `src/components/{code-editor,lesson-workspace,review,project-package}.tsx`, Cargo integration tests, Playwright tests, README and offline script/cache version. After Task2 report, root adds Frame metadata/refs. After Task1 report, root may add package script.

**Interfaces:** Consume all exports above. Module inserted after public-api-workspaces, prerequisite same; four criteria each primary+blank. All UI evidence/exposure paths use course facade.

- [x] Integrate content, concepts, sources, reviews and four primary starter refs into Frame project. Expand lesson/review IDs without dropping public-API ones. Fix prior public-API integration assertions to test their subset and independent gates after combined exposure.
- [x] Update content validation for safe TOML syntax/contracts/references/starters and both reveal lists. Trusted Rust verifier skips TOML (including choice observations) and never sends it to rustc. New fixed author manifest verifier compares strict parser and stable/exact1.85 Cargo in controlled fixture contexts; reject arbitrary CLI input. Include authored task solutions and semantic mutants.
- [x] Extend CodeEditor language default Rust with idempotent TOML Monarch registration, filename/aria/status labels. Manifest submit uses local evaluate, records code attempt and no RunResult; TOML observations use answer controls; no Rust run button/API call. Review uses same semantics.
- [x] Replace all production raw evidence/exposure callers with facade. Starter preview and both download actions record correct variant exposure before revealing files; preserve existing packages without starter refs.
- [x] Add integration tests for all four gates, revealed primary vs fresh blank/review, persistence/facade retention. Add Playwright flows for TOML good/bad answer, no /api/run, draft reload, review, preview/download exposure, textarea/keyboard and offline resume.
- [x] Wire CI explicit --fetch for both workspace toolchains and fixed manifest verifier. README English explains Node range, local TOML contract vs real Cargo verification and new commands. Update counts/progress/requirements audit; increment cache after build inputs settle.

### Task 7: Review, verification and milestone release

**Files:** Documentation/reports and reviewed changes only.

- [ ] Generate scoped diffs for completed author tasks and review with Astra xhigh; fix important findings with original authors and scoped re-review. Review final integrated branch once, including AST safety/evidence/UI boundaries.
- [ ] Run typecheck, lint, full Vitest, content validation, authored Rust, relevant Cargo/manifest stable+MSRV and source audit; build production, run production E2E with zero retries, verify offline and eight deterministic ZIP downloads. Run remaining existing CI suites once on final integration or via exact-head CI and record evidence accurately.
- [ ] Verify git diff/check, stage only intended work and commit in English. Push branch, open English PR describing final behavior/limitations/tests. Wait for all three CI jobs on exact latest PR head, fix failures if any, then merge per standing user authorization.
- [ ] Verify remote main merge and post-merge checks; record evidence. Keep broader course goal active; Cargo does not prove complete senior readiness or replace remaining unsafe/GAT/performance/operations/capstone/learner validation work.
