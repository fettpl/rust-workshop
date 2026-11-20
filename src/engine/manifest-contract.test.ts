import { describe, expect, it } from "vitest";
import type {
  ManifestContract,
  ManifestDependencyExpectation,
} from "@/domain/manifest";
import {
  checkManifestContract,
  manifestContractIssues,
  manifestSyntaxIssues,
} from "./manifest-contract";

const dependency = (
  overrides: Partial<ManifestDependencyExpectation> = {},
): ManifestDependencyExpectation => ({
  name: "wire",
  package: "serde",
  source: { kind: "registry" },
  version: "1.0.229",
  defaultFeatures: false,
  features: { values: [] },
  ...overrides,
});

const contract = (
  assertion: ManifestContract["assertions"][number],
  document: ManifestContract["document"] = "package",
): ManifestContract => ({ document, assertions: [assertion] });

describe("manifest contracts", () => {
  it("accepts equivalent short, table and inline dependency forms", () => {
    for (const source of [
      '[package]\nname="demo"\n[dependencies]\nserde = "^1.0.229"',
      '[package]\nname="demo"\n[dependencies]\nserde={version="1.0.229"}',
      '[package]\nname="demo"\n[dependencies]\nserde={version="^1.0.229"}',
    ]) {
      expect(
        checkManifestContract(
          source,
          contract({
            kind: "dependency",
            table: "dependencies",
            dependency: dependency({
              name: "serde",
              package: "serde",
              defaultFeatures: true,
            }),
          }),
        ).passed,
      ).toBe(true);
    }
  });

  it("applies direct dependency defaults and distinguishes scope and aliases", () => {
    const source = `[package]\nname="demo"\n[dependencies]\nserde = { version = "1.0.229" }\n[dev-dependencies]\nwire = { package = "serde", version = "1.0.229", features = ["alloc"] }`;
    expect(
      checkManifestContract(source, {
        document: "package",
        assertions: [
          {
            kind: "dependency",
            table: "dependencies",
            dependency: {
              name: "serde",
              source: { kind: "registry" },
              version: "1.0.229",
              defaultFeatures: true,
              features: { values: [] },
            },
          },
          {
            kind: "dependency",
            table: "dev-dependencies",
            dependency: dependency({
              name: "wire",
              defaultFeatures: true,
              features: { values: ["alloc"] },
            }),
          },
        ],
      }).passed,
    ).toBe(true);
  });

  it("checks paths, inherited flags and set expectations", () => {
    const source = `[package]\nname="demo"\nversion.workspace=true\n[features]\ndefault=[]\nformat=["dep:serde", "serde/alloc", "serde/derive"]\n[dependencies]\nserde={workspace=true,optional=true}`;
    expect(
      checkManifestContract(source, {
        document: "package",
        assertions: [
          {
            kind: "path-equals",
            path: ["package", "version", "workspace"],
            value: true,
          },
          {
            kind: "path-equals",
            path: ["features", "default"],
            value: [],
            arrayMode: "set",
          },
          {
            kind: "feature-forwarding",
            package: "demo",
            feature: "format",
            enables: { values: ["dep:serde", "serde/alloc"], mode: "contains" },
          },
          {
            kind: "dependency",
            table: "dependencies",
            dependency: {
              name: "serde",
              source: { kind: "workspace" },
              optional: true,
            },
          },
        ],
      }).passed,
    ).toBe(true);
  });

  it("supports workspace roots but rejects package-only and optional root dependency fields", () => {
    const root = `[workspace]\nmembers=["crates/lib"]\nresolver="3"\n[workspace.package]\nrust-version="1.85.0"\npublish=false\n[workspace.dependencies]\nserde={version="1.0.229",default-features=false}`;
    expect(
      checkManifestContract(
        root,
        contract(
          { kind: "path-equals", path: ["workspace", "resolver"], value: "3" },
          "workspace-root",
        ),
      ).passed,
    ).toBe(true);
    expect(
      checkManifestContract(
        root,
        contract(
          {
            kind: "dependency",
            table: "workspace.dependencies",
            dependency: dependency({ name: "serde", optional: false }),
          },
          "workspace-root",
        ),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        '[package]\nname="demo"',
        contract(
          { kind: "path-present", path: ["workspace"] },
          "workspace-root",
        ),
      ).passed,
    ).toBe(false);
  });

  it("rejects optional fields on submitted workspace-root dependencies", () => {
    const root = `[workspace]\nmembers=["crates/lib"]\nresolver="3"\n[workspace.package]\nrust-version="1.85.0"\npublish=false\n[workspace.dependencies]\nserde={version="1.0.229",default-features=false}`;
    const assertion = {
      kind: "dependency",
      table: "workspace.dependencies",
      dependency: dependency({ name: "serde", defaultFeatures: false }),
    } as const;
    expect(
      checkManifestContract(root, contract(assertion, "workspace-root")).passed,
    ).toBe(true);
    for (const optional of ["true", "false"])
      expect(
        checkManifestContract(
          root.replace("}", `,optional=${optional}}`),
          contract(assertion, "workspace-root"),
        ).passed,
      ).toBe(false);
  });

  it("rejects malformed positive dependency entries instead of treating them as empty tables", () => {
    const assertion = contract({
      kind: "dependency",
      table: "dependencies",
      dependency: {
        name: "serde",
        source: { kind: "registry" },
        defaultFeatures: true,
        features: { values: [] },
      },
    });
    expect(
      checkManifestContract(
        '[package]\nname="demo"\n[dependencies]\nserde=123',
        assertion,
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        '[package]\nname="demo"\n[dependencies]\nserde={registry=123}',
        assertion,
      ).passed,
    ).toBe(false);
    for (const value of ["1979-05-27", "1979-05-27T07:32:00Z"])
      expect(
        checkManifestContract(
          `[package]\nname="demo"\n[dependencies]\nserde=${value}`,
          assertion,
        ).passed,
      ).toBe(false);
  });

  it("handles quoted dotted keys and rejects dangerous actual keys", () => {
    const source = `[package]\nname="demo"\n[features]\n"format.v2"=["dep:serde"]`;
    expect(
      checkManifestContract(
        source,
        contract({
          kind: "path-equals",
          path: ["features", "format.v2"],
          value: ["dep:serde"],
        }),
      ).passed,
    ).toBe(true);
    for (const source of [
      '[package]\n"__proto__" = "bad"',
      '[package]\n"constructor" = "bad"',
      '[package]\n[features."prototype"]\nvalue=[]',
    ])
      expect(manifestSyntaxIssues(source).length).toBeGreaterThan(0);
    expect(
      manifestSyntaxIssues(
        '# constructor and __proto__\n[package]\nname="safe"',
      ),
    ).toEqual([]);
  });

  it("rejects contradictory sources, type mismatches, invalid contracts and malformed TOML", () => {
    expect(
      checkManifestContract(
        '[package]\nname="demo"\n[dependencies]\nwire={package="serde",path="../serde",version="1.0.229"}',
        contract({
          kind: "dependency",
          table: "dependencies",
          dependency: dependency(),
        }),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        '[package]\nname="demo"\n[dependencies]\nwire={version=1}',
        contract({
          kind: "dependency",
          table: "dependencies",
          dependency: dependency(),
        }),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract('[package]\nname="demo"', {
        document: "package",
        assertions: [],
      }).passed,
    ).toBe(false);
    expect(
      manifestContractIssues({ document: "package", assertions: [] }).length,
    ).toBeGreaterThan(0);
    expect(
      manifestSyntaxIssues('[package]\nname = "unterminated').some((issue) =>
        issue.includes("Składnia TOML"),
      ),
    ).toBe(true);
  });

  it("does not invent omitted workspace-member defaults and rejects any source conflict", () => {
    const inherited = `[package]\nname="demo"\n[dependencies]\nserde={workspace=true}`;
    expect(
      checkManifestContract(
        inherited,
        contract({
          kind: "dependency",
          table: "dependencies",
          dependency: {
            name: "serde",
            source: { kind: "workspace" },
            defaultFeatures: true,
          },
        }),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        inherited,
        contract({
          kind: "dependency",
          table: "dependencies",
          dependency: { name: "serde", source: { kind: "workspace" } },
        }),
      ).passed,
    ).toBe(true);
    const contradictory = `[package]\nname="demo"\n[dependencies]\nserde={workspace=true,path="../serde"}`;
    expect(
      checkManifestContract(
        contradictory,
        contract({
          kind: "dependency",
          table: "dependencies",
          dependency: { name: "serde" },
        }),
      ).passed,
    ).toBe(false);
  });

  it("excludes a canonical dependency package across aliases while tolerating an absent table", () => {
    const absent = {
      kind: "dependency-package-absent",
      table: "dependencies",
      package: "serde",
    } as const;
    expect(
      checkManifestContract('[package]\nname="demo"', contract(absent)).passed,
    ).toBe(true);
    expect(
      checkManifestContract(
        '[package]\nname="demo"\n[dependencies]\nserde="1.0.229"',
        contract(absent),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        '[package]\nname="demo"\n[dependencies]\nwire={package="serde",version="1.0.229"}',
        contract(absent),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        '[package]\nname="demo"\n[dependencies]\nserde_json="1.0.0"',
        contract(absent),
      ).passed,
    ).toBe(true);
    expect(
      checkManifestContract(
        '[package]\nname="demo"\n[dev-dependencies]\nserde="1.0.229"',
        contract(absent),
      ).passed,
    ).toBe(true);
  });

  it("rejects malformed selected dependency tables for package exclusions", () => {
    const assertion = {
      kind: "dependency-package-absent",
      table: "dependencies",
      package: "serde",
    } as const;
    expect(
      checkManifestContract(
        'dependencies=1\n[package]\nname="demo"',
        contract(assertion),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        '[package]\nname="demo"\n[dependencies]\nwire={package=1}',
        contract(assertion),
      ).passed,
    ).toBe(false);
  });

  it("requires feature forwarding to name the current package and exact local feature", () => {
    const assertion = {
      kind: "feature-forwarding",
      package: "packet-cli",
      feature: "format",
      enables: { values: ["packet-lib/format"] },
    } as const;
    const source = `[package]\nname="packet-cli"\n[features]\nformat=["packet-lib/format"]`;
    expect(checkManifestContract(source, contract(assertion)).passed).toBe(
      true,
    );
    expect(
      checkManifestContract(
        source.replace("packet-cli", "other-cli"),
        contract(assertion),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        source.replace("format=[", "other=["),
        contract(assertion),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        source.replace("packet-lib/format", "packet-lib/diagnostics"),
        contract(assertion),
      ).passed,
    ).toBe(false);
  });

  it("accepts harmless metadata values and bounds oversized inputs", () => {
    expect(
      manifestSyntaxIssues(
        '[package]\nname="demo"\ndate=1979-05-27\nitems=[1,2,3]',
      ).length,
    ).toBe(0);
    expect(manifestSyntaxIssues("x".repeat(65537)).length).toBeGreaterThan(0);
    expect(
      manifestSyntaxIssues('[package]\n"' + "k".repeat(4097) + '"="x"').length,
    ).toBeGreaterThan(0);
    expect(
      manifestSyntaxIssues(
        '[package]\nname="demo"\n[package.metadata]\n""="allowed"',
      ),
    ).toEqual([]);
    expect(
      checkManifestContract(
        'package=[]\nname="demo"',
        contract({ kind: "path-present", path: ["package"] }),
      ).passed,
    ).toBe(false);
    expect(
      checkManifestContract(
        "workspace=[]",
        contract(
          { kind: "path-present", path: ["workspace"] },
          "workspace-root",
        ),
      ).passed,
    ).toBe(false);
    expect(
      manifestContractIssues({
        document: "package",
        assertions: [
          {
            kind: "path-equals",
            path: ["package", "name"],
            value: "x".repeat(4097),
          },
        ],
      }).length,
    ).toBeGreaterThan(0);
  });
});
