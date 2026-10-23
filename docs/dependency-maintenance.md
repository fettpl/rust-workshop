# Monaco sanitizer dependency maintenance

The application uses Monaco 0.57.0 through its local AMD loader at `/monaco/vs`.
The package vendors an affected DOMPurify factory in the published editor chunk;
an npm override alone does not replace those embedded bytes. Asset preparation
removes the complete reviewed factory and imports the unchanged official
DOMPurify 3.4.17 UMD AMD singleton. All surrounding Monaco sanitizer hooks and
cleanup remain byte-identical. The direct dependency and parent-scoped override
also repair the package graph. Existing TypeScript is a production dependency
because the postinstall asset parser needs it, including with development
packages omitted; its version requirement is unchanged. The existing unchanged
`sharp` requirement is also a production dependency because postinstall generates
icons; both normal and development-omitted locked installations are verified.

`scripts/monaco-sanitizer.mjs` gates exact package versions, source/factory and
fixed-artifact hashes, AMD structure, references and allowed edit spans. Drift
fails installation rather than guessing new private boundaries. It validates a
complete staging tree, promotes via directory renames and rolls back ordinary
promotion failures. This is transactional promotion with a visibility window,
not a crash-safe atomic multi-directory swap. A failed rollback retains the
complete previous tree at the backup path reported in the error.

The generated relative-path-only `sanitizer-provenance.json` records source,
fixed and generated hashes. Official Monaco notices and DOMPurify license,
artifact headers and map are copied unchanged. Regeneration needs no network.
The exact frozen official artifact hash must receive review when updated.

This adaptation repairs the served AMD distribution only. Installed
`monaco-editor/esm` remains upstream stock and must not be consumed at runtime.
A source AST policy rejects static literal package/ESM value imports, re-exports,
`import()` and `require()`, including mixed imports and import-equals. Genuine
type-only imports are allowed. The policy does not prove the absence of arbitrary
computed imports; browser request evidence independently verifies delivery.

Remove the adaptation and scoped override only after a released Monaco version
ships a verified fixed sanitizer in the actual served distribution. Review new
upstream bytes and run graph audits, locked reinstall, asset mutation/rollback
checks, actual-instance browser probes, editor E2E and offline migration.
The harmless shadow-root probe establishes replacement of affected runtime; it
does not establish that the advisory configuration is reachable in this app.
Test instrumentation exists only in browser test route responses and never in
public production assets.

Service-worker reads use only the active cache generation. Activation removes
older generations, and stale in-flight handlers may recreate them without
influencing current reads. Already evaluated JavaScript in open tabs requires
a subsequent controlled reload; the repair never forces a reload or discards
learner drafts. Browser tests exercise controlled reload and offline repair.
