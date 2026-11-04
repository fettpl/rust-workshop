import {expect,it} from "vitest";
import {mkdtempSync,mkdirSync,writeFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {unzipSync,strFromU8} from "fflate";
import {serviceAuthorizationPackage,serviceAuthorizationProject} from "../service-authorization";
import {validateProjectPackage,projectFiles} from "../../../domain/project-package";
import {buildProjectArchive} from "../../../../scripts/project-archive";
import {appendHiddenTests} from "../../../runner";
import {authorizationOperations,authorizationOrdinaryReviews} from "../../service-authorization-contracts";
const paths=["Cargo.toml","Cargo.lock","src/lib.rs","tests/policy.rs","tests/attenuation.rs","tests/binding.rs","tests/admission.rs","README.md","THREAT_MODEL.md","WORKSHEET.md"];
it("ships_exact_ten_authored_members_and_four_canonical_notices",()=>{
 expect(validateProjectPackage(serviceAuthorizationPackage)).toEqual([]);expect(serviceAuthorizationPackage.files.map(f=>f.path)).toEqual(paths);
 for(const variant of ["starter","solution"] as const){const entries=unzipSync(buildProjectArchive(serviceAuthorizationPackage,variant));expect(Object.keys(entries).sort()).toEqual([...paths,"LICENSE","LICENSE-CONTENT","LICENSE-SCOPE.md","THIRD-PARTY-NOTICES.md"].map(p=>"service-authorization-workshop/"+p).sort());for(const [path,source] of Object.entries(projectFiles(serviceAuthorizationPackage,variant)))expect(strFromU8(entries["service-authorization-workshop/"+path])).toBe(source);}
 expect(projectFiles(serviceAuthorizationPackage,"solution")["Cargo.toml"]).toContain('license = "MIT"');expect(serviceAuthorizationProject.reviewConceptIds).toEqual(["service-scoped-authority","service-bound-authorization-use"]);
});
it("binds_exact_eight_solution_refs_and_no_starter_refs",()=>{
 expect(serviceAuthorizationPackage.revealStepRefs).toEqual(["policy","attenuation","binding","admission"].flatMap(op=>["apply","blank"].map(kind=>({lessonId:`service-authorization-${op}`,stepId:`authorization-${op}-${kind}`}))));expect(serviceAuthorizationPackage.starterRevealStepRefs).toEqual([]);expect(serviceAuthorizationPackage).not.toHaveProperty("workspaceMembers");
});
const allowed:Record<string,string[]>={policy:["PrincipalId","TenantId","ResourceId","Principal","Resource","Action","ActionSet","Scope","GrantSpec","Request","Denial","Authority","new","contains","subset_of","decide","main"],attenuation:["PrincipalId","TenantId","ResourceId","Action","ActionSet","Scope","GrantSpec","AttenuationError","new","contains","subset_of","attenuate","main"],binding:["PrincipalId","TenantId","ResourceId","Principal","Resource","Action","Request","Denial","Authority","Authorized","fixture","decide","authorize","principal","request","main"],admission:["PrincipalId","TenantId","ResourceId","Principal","Resource","Action","Request","Authority","Authorized","Limits","AdmissionState","Accepted","AdmissionRejection","admit","principal","request","main"]};
it("each_scoped_source_contains_only_its_allowed_declarations",()=>{
 for(const [op,record] of Object.entries(authorizationOperations))for(const source of [record.canonical,record.equivalent,record.starter,record.promptScaffold,...record.semanticMutants.map(m=>m.source)]){const declarations=[...source.matchAll(/\b(?:struct|enum|fn)\s+([A-Za-z_][A-Za-z_0-9]*)/g)].map(m=>m[1]);for(const name of declarations)expect(allowed[op],`${op}: ${name}`).toContain(name);expect(source).not.toMatch(/\bpub\s/);}
});
function exercise(id:string,source:string,tests:string,want:"pass"|"semantic"|"starter") {
 const base=join(process.cwd(),"test-results/authorization-models");mkdirSync(base,{recursive:true});const directory=mkdtempSync(join(base,id+"-"));const file=join(directory,"model.rs"),binary=join(directory,"model");const appended=appendHiddenTests(source,tests);writeFileSync(file,appended);
 const compiler=process.env.RUSTC_BIN ?? "rustc",args=["--edition=2024","--test",file,"-o",binary];const start=new Date().toISOString();const compiled=spawnSync(compiler,args,{cwd:directory,encoding:"utf8",timeout:60000});
 const executed=compiled.status===0?spawnSync(binary,["--test-threads=1"],{cwd:directory,encoding:"utf8",timeout:8000}):undefined;
 writeFileSync(join(directory,"receipt.json"),JSON.stringify({id,cwd:directory,compiler,args,startedAt:start,sourceSha256:createHash("sha256").update(appended).digest("hex"),compile:{status:compiled.status,signal:compiled.signal,stdout:compiled.stdout,stderr:compiled.stderr,error:compiled.error?.message},execute:executed?{status:executed.status,signal:executed.signal,stdout:executed.stdout,stderr:executed.stderr,error:executed.error?.message}:null},null,2));
 expect(compiled.error,`${id}: compiler startup`).toBeUndefined();expect(compiled.status,`${id}: ${compiled.stderr}`).toBe(0);expect(executed?.error).toBeUndefined();expect(executed?.signal).toBeNull();expect(executed?.status,`${id}: ${executed?.stdout}`).toBe(want==="pass"?0:101);expect(executed?.stdout).toContain(want==="pass"?"test result: ok. 1 passed; 0 failed; 0 ignored":"test result: FAILED. 0 passed; 1 failed; 0 ignored");if(want==="semantic")expect(executed?.stdout).toMatch(/assertion .*failed|assertion failed:/);
}
for(const [op,record] of Object.entries(authorizationOperations))it(`real_root_child_harness_${op}`,()=>{
 exercise(op+"-scaffold-red",record.starter,record.tests,"starter");exercise(op+"-canonical",record.canonical,record.tests,"pass");exercise(op+"-equivalent",record.equivalent,record.tests,"pass");exercise(op+"-recall",record.canonical,record.recallTests,"pass");exercise(op+"-equivalent-recall",record.equivalent,record.recallTests,"pass");for(const mutant of record.semanticMutants){exercise(op+"-"+mutant.name,mutant.source,record.tests,"semantic");exercise(op+"-recall-"+mutant.name,mutant.source,record.recallTests,"semantic");}
},120000);
for(const [key,record] of Object.entries(authorizationOrdinaryReviews))it(`real_root_child_review_${key}`,()=>{
 exercise(key+"-scaffold-red",record.starter,record.tests,"starter");exercise(key+"-canonical",record.canonical,record.tests,"pass");exercise(key+"-equivalent",record.equivalent,record.tests,"pass");for(const mutant of record.semanticMutants)exercise(key+"-"+mutant.name,mutant.source,record.tests,"semantic");
},120000);

for(const kind of ["primary","recall"] as const)for(const name of ["resourceScopeIgnored","rejectAllRead"] as const)it(`policy_gate_${kind}_rejects_${name}`,()=>{
 const policy=authorizationOperations.policy;
 const mutant=policy.semanticMutants.find(mutant=>mutant.name===name);
 expect(mutant,`fixed control ${name}`).toBeDefined();
 const source=mutant!.source;
 expect(source).not.toBe(policy.canonical);
 exercise(`policy-review-${kind}-${name}`,source,kind==="primary"?policy.tests:policy.recallTests,"semantic");
},60000);
