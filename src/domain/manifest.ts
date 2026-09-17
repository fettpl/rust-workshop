export type ManifestPath = readonly [string, ...string[]];

export type ManifestValue = string | number | boolean | readonly string[];

export interface ManifestSetExpectation {
  values: readonly string[];
  mode?: "equals" | "contains";
}

export type ManifestDependencySource =
  | { kind: "registry"; registry?: string }
  | { kind: "path"; path: string }
  | { kind: "workspace" };

export interface ManifestDependencyExpectation {
  name: string;
  package?: string;
  /** Full stable caret requirement; a leading ^ is optional. */
  version?: string;
  source?: ManifestDependencySource;
  optional?: boolean;
  defaultFeatures?: boolean;
  features?: ManifestSetExpectation;
}

export type ManifestAssertion =
  | {
      kind: "dependency-package-absent";
      table:
        | "dependencies"
        | "dev-dependencies"
        | "build-dependencies"
        | "workspace.dependencies";
      package: string;
    }
  | { kind: "path-present"; path: ManifestPath }
  | { kind: "path-absent"; path: ManifestPath }
  | { kind: "path-nonempty-string"; path: ManifestPath }
  | {
      kind: "path-equals";
      path: ManifestPath;
      value: ManifestValue;
      arrayMode?: "ordered" | "set";
    }
  | {
      kind: "dependency";
      table:
        | "dependencies"
        | "dev-dependencies"
        | "build-dependencies"
        | "workspace.dependencies";
      dependency: ManifestDependencyExpectation;
    }
  | {
      kind: "feature-forwarding";
      package: string;
      feature: string;
      enables: ManifestSetExpectation;
    };

export interface ManifestContract {
  document: "workspace-root" | "package";
  assertions: readonly ManifestAssertion[];
}
