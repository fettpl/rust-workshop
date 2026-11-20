/** Fixed native counterexamples for the unchanged attenuation/normalization promises. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lessons } from "./course";
import { appendHiddenTests } from "../runner";

const cases = [
  [
    "authorization-attenuation-intersection",
    `#[test]
fn every_requested_child_is_exact_or_explicitly_denied() {
    let parent=GrantSpec {subject:PrincipalId(1),tenant:TenantId(2),scope:Scope::Resource(ResourceId(3)),actions:ActionSet {read:true,append:false},max_cost:4};
    let allowed=GrantSpec {max_cost:0,..parent};
    let amplified=GrantSpec {scope:Scope::Tenant,max_cost:99,..parent};
    assert_eq!(restrict_many(&parent,&[allowed,amplified,parent]),vec![Ok(allowed),Err(AttenuationError::WouldAmplify),Ok(parent)]);
}`,
  ],
  [
    "schema-validate-current-snapshot",
    `#[test]
fn both_versions_normalize_without_losing_version_identity_or_next() {
    let migrated=normalize_snapshot(DecodedSnapshot::V1(vec![LegacyRow {done:true,title:" b ".into()},LegacyRow {done:false,title:" b ".into()}])).unwrap();
    assert_eq!(migrated,Loaded {version:Version::V1,snapshot:Snapshot {rows:vec![Row {id:1,done:true,title:" b ".into()},Row {id:2,done:false,title:" b ".into()}],next:NextId::Available(3)}});
    let current=normalize_snapshot(DecodedSnapshot::V2(Snapshot {rows:vec![Row{id:9,done:false,title:"🦀".into()},Row{id:2,done:true,title:"🦀".into()}],next:NextId::Available(40)})).unwrap();
    assert_eq!(current,Loaded {version:Version::V2,snapshot:Snapshot {rows:vec![Row{id:9,done:false,title:"🦀".into()},Row{id:2,done:true,title:"🦀".into()}],next:NextId::Available(40)}});
}`,
  ],
] as const;

it.each(cases)("retains the full gate domain in %s", (id, tests) => {
  const step = lessons.flatMap((l) => l.steps).find((s) => s.id === id)!;
  const dir = mkdtempSync(join(tmpdir(), "counted-required-domain-"));
  try {
    const file = join(dir, "fixed.rs"),
      binary = join(dir, "fixed");
    writeFileSync(file, appendHiddenTests(step.solution!, tests));
    const compiled = spawnSync(
      "rustc",
      ["--test", "--edition=2024", file, "-o", binary],
      { encoding: "utf8", timeout: 60_000 },
    );
    if (compiled.error) throw compiled.error;
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = spawnSync(binary, [], {
      encoding: "utf8",
      timeout: 10_000,
    });
    if (executed.error) throw executed.error;
    expect(executed.status, executed.stdout + executed.stderr).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
