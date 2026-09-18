import { describe, expect, it } from "vitest";
import {
  projectFiles,
  validateProjectPackage,
} from "../../../domain/project-package";
import {
  serviceOperationsPackage,
  serviceOperationsProject,
} from "../service-operations";

describe("Service Operations authored package contract", () => {
  it("ships a bounded Tokio fixture with the reviewed operations artifacts", () => {
    expect(validateProjectPackage(serviceOperationsPackage)).toEqual([]);
    expect(serviceOperationsProject.id).toBe("service-operations");
    expect(serviceOperationsPackage.id).toBe("service-operations-workshop");
    expect(serviceOperationsPackage.description).toContain(
      "authored Tokio Cargo package",
    );

    const solution = projectFiles(serviceOperationsPackage, "solution");
    expect(Object.keys(solution)).toEqual(
      expect.arrayContaining([
        "Cargo.toml",
        "Cargo.lock",
        "README.md",
        "src/lib.rs",
        "src/operations.rs",
        "tests/operations_contract.rs",
        "tests/operations_mutants.rs",
        "THREAT_MODEL.md",
        "RUNBOOK.md",
      ]),
    );
    expect(solution["Cargo.toml"]).toContain('tokio = { version = "=1.53.1"');
    expect(solution["src/operations.rs"]).toContain("StructuredEvent");
    expect(solution["src/operations.rs"]).toContain("DuplicateRequest");
    expect(solution["src/operations.rs"]).toContain(
      "incident worker joins before timeout",
    );
    expect(solution["tests/operations_contract.rs"]).toContain(
      "incident_drill_joins_worker_when_it_finishes_before_timeout",
    );
    expect(solution["tests/operations_contract.rs"]).toContain(
      "Err(LifecycleError::DuplicateRequest)",
    );
    expect(solution["THREAT_MODEL.md"]).toContain("allowlist");
    expect(solution["RUNBOOK.md"]).toContain("accepted");
  });

  it("keeps the starter unfinished while preserving the contract tests", () => {
    const starter = projectFiles(serviceOperationsPackage, "starter");
    expect(starter["src/operations.rs"]).toContain("todo!");
    expect(starter["tests/operations_contract.rs"]).toContain(
      "bounded_admission_checks_trust_proof_and_limits",
    );
    expect(starter["tests/operations_contract.rs"]).toContain(
      "incident_drill_keeps_timeout_and_completion_accounting_distinct",
    );
  });
});
