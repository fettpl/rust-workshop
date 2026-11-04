import {expect,it} from "vitest";
import {parseAuthorizationArgs,assertNativePositive,assertProbeDiagnostic,expectedNativeTests,assertAuthorizationArchiveSnapshot,classifyAuthorizationCommand,authorizationArchiveSnapshot} from "./verify-authorization";
import {classifyRetryCommand} from "./verify-client-retry";
it("rejects_unknown_and_duplicate_flags_before_execution",()=>{expect(parseAuthorizationArgs([])).toEqual({msrv:false});expect(parseAuthorizationArgs(["--msrv"])).toEqual({msrv:true});for(const args of [["--msrv","--msrv"],["--fetch"],["--path","x"],["--toolchain","nightly"]])expect(()=>parseAuthorizationArgs(args)).toThrow();});
it("requires_all_fourteen_named_tests_and_zero_ignored",()=>{
 const stdout=expectedNativeTests.map(name=>`test ${name} ... ok`).join("\n")+"\ntest result: ok. 14 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out;";
 expect(()=>assertNativePositive({status:0,stdout,stderr:""})).not.toThrow();
 for(const output of ["",stdout.replace(expectedNativeTests[0],"different"),stdout.replace("0 ignored","1 ignored"),stdout.replace("14 passed","13 passed")])expect(()=>assertNativePositive({status:0,stdout:output,stderr:""})).toThrow();
 expect(()=>assertNativePositive({status:101,stdout,stderr:""})).toThrow();
});
it("compiler_rejection_requires_expected_code_and_operation_span",()=>{
 const diagnostic=(code:string,line:number,text:string)=>JSON.stringify({level:"error",code:{code},spans:[{is_primary:true,file_name:"probe.rs",line_start:line,text:[{text}]}]});
 expect(()=>assertProbeDiagnostic(diagnostic("E0382",12,"let _=w.request();"),"E0382",12,"w")).not.toThrow();
 for(const bad of [diagnostic("E0451",12,"w"),diagnostic("E0382",1,"w"),diagnostic("E0382",12,"other"),diagnostic("E0382",12,"w")+"\n"+diagnostic("E0425",2,"missing"),"not JSON"])expect(()=>assertProbeDiagnostic(bad,"E0382",12,"w")).toThrow();
});
it("semantic_compile_errors_timeouts_and_signals_are_not_kills",()=>{
 expect(classifyRetryCommand({status:101,signal:null,stdout:"",stderr:"error[E0502]"})).toBe("compile-error");expect(classifyRetryCommand({status:null,signal:null,stdout:"",stderr:"",error:{code:"ETIMEDOUT"}})).toBe("timeout");expect(classifyRetryCommand({status:null,signal:"SIGKILL",stdout:"",stderr:""})).toBe("signal");
});

it("binds_every_present_legacy_archive_to_authored_bytes",async()=>{
 const {projects}=await import("../src/content/course");const {serviceAuthorizationPackage}=await import("../src/content/projects/service-authorization");const {buildProjectArchive}=await import("./project-archive");const {createHash}=await import("node:crypto");
 const snapshot:Record<string,string>={};for(const p of [...projects.map(p=>p.package).filter(p=>p!==undefined),serviceAuthorizationPackage])for(const variant of ["starter","solution"] as const)snapshot[`${p.id}/${variant}.zip`]=createHash("sha256").update(buildProjectArchive(p,variant)).digest("hex");
 expect(assertAuthorizationArchiveSnapshot(snapshot)).toBe("post-authorization-generation");
 for(const name of Object.keys(snapshot)){const changed={...snapshot,[name]:"tampered"};expect(()=>assertAuthorizationArchiveSnapshot(changed),name).toThrow();}
 expect(assertAuthorizationArchiveSnapshot({})).toBe("empty");
});
it("timeout_is_classified_before_the_termination_signal",()=>{expect(classifyAuthorizationCommand({status:null,signal:"SIGTERM",stdout:"",stderr:"",error:{code:"ETIMEDOUT"}})).toBe("timeout");});

it("rejects_symlinked_public_archive_entries",async()=>{
 const {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync}=await import("node:fs");const {join}=await import("node:path");const {tmpdir}=await import("node:os");const root=mkdtempSync(join(tmpdir(),"authorization-symlink-"));try{mkdirSync(join(root,"public/projects"),{recursive:true});writeFileSync(join(root,"outside.zip"),"fixed nonexecuted bytes");symlinkSync(join(root,"outside.zip"),join(root,"public/projects","unknown.zip"));expect(()=>authorizationArchiveSnapshot(root)).toThrow();}finally{rmSync(root,{recursive:true,force:true});}
});
