import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  readInitializedPrefixObservedExpectations,
  validateInitializedPrefixObservationBytes,
} from "./unsafe-miri-initialized-prefix-observations";

const bundlePath = fileURLToPath(
  new URL("./fixtures/initialized-prefix-observations.json", import.meta.url),
);
const provenancePath = fileURLToPath(
  new URL(
    "./fixtures/initialized-prefix-observation-provenance.json",
    import.meta.url,
  ),
);
const bundleBytes = readFileSync(bundlePath);
const provenanceBytes = readFileSync(provenancePath);

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("trusted initialized-prefix observations loader", () => {
  it("selects each reviewed mode with its mode-specific inventory", () => {
    for (const [mode, recipes, sources] of [
      ["stable", 118, 48],
      ["msrv", 118, 48],
      ["miri", 122, 64],
    ] as const) {
      const observed = readInitializedPrefixObservedExpectations(mode);
      expect(observed?.schema).toBe("initialized-prefix-observations-v1");
      expect(observed?.recipes).toHaveLength(recipes);
      expect(Object.keys(observed?.sourceBindings ?? {})).toHaveLength(sources);
      expect(observed?.recipes.every((recipe) => recipe.mode === mode)).toBe(
        true,
      );
      expect(observed?.adjudication.provenance).toEqual([
        {
          path: provenancePath,
          bytes: 5154,
          sha256:
            "8b396f8d36a3f0004e0d856fc92becb2ea25c54e3edad803566d4153307843df",
        },
      ]);
    }
  });

  it("requires an explicit known mode", () => {
    expect(readInitializedPrefixObservedExpectations()).toBeUndefined();
    expect(
      readInitializedPrefixObservedExpectations("unknown" as never),
    ).toBeUndefined();
  });

  it("accepts the reviewed bytes and rejects raw byte corruption", () => {
    expect(sha256(bundleBytes)).toBe(
      "b3cc91ea1b4589047e456095cba412b785314fbd513b49eaa964bfa115bece69",
    );
    expect(sha256(provenanceBytes)).toBe(
      "8b396f8d36a3f0004e0d856fc92becb2ea25c54e3edad803566d4153307843df",
    );
    expect(
      validateInitializedPrefixObservationBytes(
        bundleBytes,
        provenanceBytes,
        "stable",
      ),
    ).toBeDefined();

    const corruptedBundle = Uint8Array.from(bundleBytes);
    corruptedBundle[corruptedBundle.length - 1] ^= 1;
    expect(
      validateInitializedPrefixObservationBytes(
        corruptedBundle,
        provenanceBytes,
        "stable",
      ),
    ).toBeUndefined();

    const corruptedProvenance = Uint8Array.from(provenanceBytes);
    corruptedProvenance[corruptedProvenance.length - 1] ^= 1;
    expect(
      validateInitializedPrefixObservationBytes(
        bundleBytes,
        corruptedProvenance,
        "stable",
      ),
    ).toBeUndefined();
  });

  it("rejects a mode payload whose canonical hash no longer matches provenance", () => {
    const bundle = JSON.parse(new TextDecoder().decode(bundleBytes)) as {
      modes: Record<string, { recipes: Array<Record<string, unknown>> }>;
    };
    bundle.modes.stable.recipes[0].id = "tampered";
    const mutatedBundle = new TextEncoder().encode(JSON.stringify(bundle));
    expect(
      validateInitializedPrefixObservationBytes(
        mutatedBundle,
        provenanceBytes,
        "stable",
      ),
    ).toBeUndefined();
  });

  it("rejects malformed or unreviewed provenance", () => {
    const provenance = JSON.parse(
      new TextDecoder().decode(provenanceBytes),
    ) as {
      adjudication: { status: string };
    };
    provenance.adjudication.status = "pending-root-review";
    const mutatedProvenance = new TextEncoder().encode(
      JSON.stringify(provenance),
    );
    expect(
      validateInitializedPrefixObservationBytes(
        bundleBytes,
        mutatedProvenance,
        "stable",
      ),
    ).toBeUndefined();
    expect(
      validateInitializedPrefixObservationBytes(
        bundleBytes,
        new TextEncoder().encode("{}"),
        "stable",
      ),
    ).toBeUndefined();
  });
});
