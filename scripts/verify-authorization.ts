/** Closed authored-only typed-authorization verifier. Never executes imported learner source. */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,realpathSync,writeFileSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {homedir} from "node:os";
import {strFromU8,unzipSync} from "fflate";
import {serviceAuthorizationPackage} from "../src/content/projects/service-authorization";
import {libSource,compilerProbes,semanticMutations} from "../src/content/projects/service-authorization/fixtures";
import { fileSchemaEvolutionPackage } from "../src/content/projects/file-schema-evolution/package";
import {durableLogRetryPackage} from "../src/content/projects/durable-log-retry";
import {buildProjectArchive,projectArchiveFiles} from "./project-archive";
import {archiveSnapshot,assertRetryArchiveTopology,classifyRetryCommand,type RecordedCommand as RetryRecordedCommand} from "./verify-client-retry";
import {numberGuessingPackage} from "../src/content/projects/number-guessing";
import {propertyContractsPackage} from "../src/content/projects/property-contracts";
import {ffiBufferPackage} from "../src/content/projects/ffi-buffer";
import {miriSafetyPackage} from "../src/content/projects/miri-safety";
import {miniGrepPackage} from "../src/content/projects/mini-grep";
import {frameProtocolPackage} from "../src/content/projects/frame-protocol";
import {tokioServicePackage} from "../src/content/projects/tokio-service";
import {serviceOperationsPackage} from "../src/content/projects/service-operations";
import {tokioPipelinePackage} from "../src/content/projects/tokio-pipeline";
import {concurrencyLabPackage} from "../src/content/projects/concurrency-lab";
import {logAnalyzerPackage} from "../src/content/projects/log-analyzer";
import {todoCliPackage} from "../src/content/projects/todo-cli";
import {durableLogServicePackage} from "../src/content/projects/durable-log-service/archive";
type RecordedCommand=RetryRecordedCommand & {cwd:string;executable:string};
export const expectedNativeTests=["boundary::tests::accepted_overflow_is_not_capacity_or_wrap","boundary::tests::charged_cost_overflow_does_not_commit_accepted","boundary::tests::dropped_authorization_does_not_touch_ledger","exact_scope_is_tenant_bound","same_grant_and_tenant_are_required","grants_cannot_be_spliced","decision_boundaries","attenuation_rejects_amplification","child_is_exact_and_monotone","installing_child_changes_effective_policy","authorized_owns_exact_request_and_principal","policy_borrow_and_reissue_are_bounded","facade_checks_its_own_authority_before_admission","admission_is_atomic_and_budget_equality_is_allowed"] as const;
type ToolName = "cargo" | "rustc" | "rustdoc";
type ToolObservation = {
  path: string;
  bytes: number;
  mode: number;
  sha256: string;
  version: string;
};
type RetryToolProfile = {
  mode: "stable" | "msrv";
  toolchain: string;
  executables: Record<ToolName, ToolObservation>;
  rustup: ToolObservation;
  cargoHome: string;
};

function sha256(bytes: Uint8Array | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function repoRoot(): string { return resolve(process.cwd()); }
function assertRegularNoSymlink(path: string): void {
  const stat = lstatSync(path);
  assert(stat.isFile() && !stat.isSymbolicLink(), `expected regular file: ${path}`);
}
function canonicalExecutable(path: string): string {
  assertRegularNoSymlink(path);
  assert((lstatSync(path).mode & 0o111) !== 0, `expected executable tool: ${path}`);
  const canonical = realpathSync(path);
  assert.equal(canonical, resolve(path), `tool path must already be canonical: ${path}`);
  return canonical;
}

function canonicalRustup(path: string): string {
  const canonical = realpathSync(path);
  const stat = lstatSync(canonical);
  assert(stat.isFile() && (stat.mode & 0o111) !== 0, `resolved rustup must be an executable regular file: ${canonical}`);
  return canonical;
}

function hashFile(path: string): { bytes: number; mode: number; sha256: string } {
  const stat = lstatSync(path);
  assert(stat.isFile() && !stat.isSymbolicLink(), `expected regular executable: ${path}`);
  const bytes = readFileSync(path);
  return { bytes: bytes.byteLength, mode: stat.mode & 0o777, sha256: sha256(bytes) };
}

function commandText(path: string, args: string[], timeout = 30_000): string {
  const result = spawnSync(path, args, { encoding: "utf8", timeout, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(result.status, 0, `${path} ${args.join(" ")} failed: ${result.stderr ?? ""}`);
  assert.equal(result.signal, null, `${path} ${args.join(" ")} was signalled`);
  assert.equal(result.error, undefined, `${path} ${args.join(" ")} could not start`);
  return `${result.stdout ?? ""}`.trim();
}

function discoverRustup(): string {
  const result = spawnSync("which", ["rustup"], { encoding: "utf8", timeout: 30_000 });
  assert.equal(result.status, 0, "rustup must be discoverable on PATH");
  const candidates = `${result.stdout ?? ""}`.trim().split(/\r?\n/).filter(Boolean);
  assert.equal(candidates.length, 1, "rustup discovery must produce one path");
  return canonicalRustup(candidates[0]);
}

function profileFor(msrv: boolean): RetryToolProfile {
  const mode = msrv ? "msrv" : "stable";
  const toolchain = msrv ? "1.85.0" : "stable";
  const rustup = discoverRustup();
  const profileRoot = process.env.RUST_WORKSHOP_AUTHORIZATION_QUALIFICATION_ROOT ?? process.env.RUST_WORKSHOP_CLIENT_RETRY_QUALIFICATION_ROOT;
  let expected: { mode: string; toolchain: string; executables?: Record<string, { path: string; bytes: number; mode: number; sha256: string }>; versionContains?: Record<string, string>; } | undefined;
  if (profileRoot !== undefined) {
    assert(profileRoot.startsWith("/"), "qualification root must be an absolute path");
    const canonicalRoot = realpathSync(profileRoot);
    const profilePath = join(canonicalRoot, `${mode}.json`);
    assertRegularNoSymlink(profilePath);
    expected = JSON.parse(readFileSync(profilePath, "utf8")) as typeof expected;
    assert.equal(expected?.mode, mode);
    assert.equal(expected?.toolchain, toolchain);
  }
  const rustupObserved = { path: rustup, ...hashFile(rustup), version: commandText(rustup, ["--version"]) };
  const expectedRustup = expected?.executables?.rustup;
  if (expectedRustup) {
    assert.equal(rustupObserved.path, resolve(expectedRustup.path), "rustup path differs from qualification profile");
    assert.equal(rustupObserved.bytes, expectedRustup.bytes, "rustup byte length differs from qualification profile");
    assert.equal(rustupObserved.mode, expectedRustup.mode, "rustup mode differs from qualification profile");
    assert.equal(rustupObserved.sha256, expectedRustup.sha256, "rustup digest differs from qualification profile");
    assert.equal(rustupObserved.version, expected?.versionContains?.rustup, "rustup version output differs from qualification profile");
  }
  const tools = Object.fromEntries(([
    ["cargo", commandText(rustup, ["which", "--toolchain", toolchain, "cargo"])],
    ["rustc", commandText(rustup, ["which", "--toolchain", toolchain, "rustc"])],
    ["rustdoc", commandText(rustup, ["which", "--toolchain", toolchain, "rustdoc"])],
  ] as const).map(([name, path]) => {
    const canonical = canonicalExecutable(path);
    const observed = hashFile(canonical);
    const version = commandText(canonical, ["--version", "--verbose"]);
    const binding = expected?.executables?.[name];
    if (binding) {
      assert.equal(canonical, resolve(binding.path), `${name} path differs from qualification profile`);
      assert.equal(observed.bytes, binding.bytes, `${name} byte length differs from qualification profile`);
      assert.equal(observed.mode, binding.mode, `${name} mode differs from qualification profile`);
      assert.equal(observed.sha256, binding.sha256, `${name} digest differs from qualification profile`);
      assert.equal(version, expected?.versionContains?.[name], `${name} version output differs from qualification profile`);
    }
    if (msrv) assert(new RegExp(`\\b${toolchain.replace(".", "\\.")}\\b`).test(version), `${name} is not exact MSRV ${toolchain}`);
    return [name, { ...observed, path: canonical, version }] as const;
  }));
  const cargoHome = process.env.CARGO_HOME ? resolve(process.env.CARGO_HOME) : join(homedir(), ".cargo");
  assert(cargoHome.startsWith("/"), "CARGO_HOME must be absolute");
  return { mode, toolchain, executables: tools as Record<ToolName, ToolObservation>, rustup: rustupObserved, cargoHome };
}

function buildAuthorizationChildEnv(profile: Pick<RetryToolProfile, "cargoHome" | "toolchain" | "executables">, target: string): NodeJS.ProcessEnv {
  const toolDirs = Object.values(profile.executables).map((tool) => dirname(tool.path));
  return {
    HOME: process.env.HOME ?? homedir(),
    PATH: [...new Set([...toolDirs, "/usr/bin", "/bin"])].join(":"),
    CARGO_HOME: profile.cargoHome,
    CARGO_NET_OFFLINE: "true",
    CARGO_TARGET_DIR: target,
    RUSTUP_TOOLCHAIN: profile.toolchain,
    RUSTC: profile.executables.rustc.path,
    RUSTDOC: profile.executables.rustdoc.path,
    CARGO_TERM_COLOR: "never",
    NODE_ENV: "production",
  };
}

function run(profile: RetryToolProfile, cwd: string, args: string[], target: string): RecordedCommand {
  const started = Date.now();
  const startedAt = new Date().toISOString();
  const env = buildAuthorizationChildEnv(profile, target);
  const result = spawnSync(profile.executables.cargo.path, args, { cwd, env, encoding: "utf8", timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const errorCode = result.error ? (result.error as NodeJS.ErrnoException).code ?? "UNKNOWN" : null;
  return { args, status: result.status, signal: result.signal, cwd, executable: profile.executables.cargo.path, classification: classifyAuthorizationCommand({ status: result.status, signal: result.signal, stdout, stderr, error: result.error ? { code: errorCode ?? undefined } : undefined }), stdout, stderr, durationMs: Date.now() - started, startedAt, finishedAt: new Date().toISOString(), timedOut: errorCode === "ETIMEDOUT", errorCode };
}


export function parseAuthorizationArgs(args:readonly string[]):{msrv:boolean} {
 assert.equal(new Set(args).size,args.length,"flags must be unique");
 for(const arg of args)assert.equal(arg,"--msrv","only --msrv is accepted; no paths, fetch, or tool overrides");
 return {msrv:args.includes("--msrv")};
}
export function assertNativePositive(result:Pick<RecordedCommand,"status"|"stdout"|"stderr">):void {
 assert.equal(result.status,0,`native positive suite failed: ${result.stderr}`);
 const output=result.stdout+"\n"+result.stderr;
 const actual=[...output.matchAll(/^test (\S+) \.\.\. ok$/gm)].map(m=>m[1]).sort();
 assert.deepEqual(actual,[...expectedNativeTests].sort(),"exact fourteen named controls must pass once");
 const counts=[...output.matchAll(/test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored;/g)];
 assert.equal(counts.reduce((sum,m)=>sum+Number(m[1]),0),14);
 assert(counts.every(m=>m[2]==="0" && m[3]==="0"),"failed/ignored native tests");
 assert.doesNotMatch(output,/[1-9]\d* (?:ignored|skipped)|test result: FAILED/);
}
export function assertProbeDiagnostic(stderr:string,code:string,line:number,symbol:string):void {
 const errors=stderr.trim().split(/\r?\n/).filter(Boolean).map(text=>JSON.parse(text) as {level?:string;code?:{code:string}|null;spans?:Array<{is_primary:boolean;line_start:number;file_name:string;text:Array<{text:string}>}>}).filter(d=>d.level==="error" && (d.code || d.spans?.length));
 assert(errors.length>0,"missing structured compiler diagnostic");
 for(const error of errors){assert.equal(error.code?.code,code,"unrelated compiler diagnostic cannot prove rejection");assert(error.spans?.some(span=>span.is_primary && span.line_start===line && span.text.some(t=>t.text.includes(symbol))),"expected operation span/symbol missing");}
}
// Closed predecessor producer list: this guard never derives its allowlist from course registries.
const fixedArchivePackages = [numberGuessingPackage,propertyContractsPackage,ffiBufferPackage,miriSafetyPackage,miniGrepPackage,frameProtocolPackage,tokioServicePackage,serviceOperationsPackage,tokioPipelinePackage,concurrencyLabPackage,logAnalyzerPackage,todoCliPackage,durableLogServicePackage,durableLogRetryPackage,serviceAuthorizationPackage,fileSchemaEvolutionPackage] as const;
let cachedAuthoredArchiveHashes:Record<string,string>|undefined;
function authoredArchiveHashes():Record<string,string> {
 if(!cachedAuthoredArchiveHashes)cachedAuthoredArchiveHashes=Object.fromEntries(fixedArchivePackages.flatMap(p=>(["starter","solution"] as const).map(variant=>[`${p.id}/${variant}.zip`,sha256(buildProjectArchive(p,variant))])));
 return {...cachedAuthoredArchiveHashes};
}
export function assertAuthorizationArchiveSnapshot(snapshot:Record<string,string>) {
 const expected=authoredArchiveHashes();
 const hashes={starter:expected[serviceAuthorizationPackage.id+"/starter.zip"],solution:expected[serviceAuthorizationPackage.id+"/solution.zip"]};
 const retry={starter:expected[durableLogRetryPackage.id+"/starter.zip"],solution:expected[durableLogRetryPackage.id+"/solution.zip"]};
 const fileSchema={starter:expected[fileSchemaEvolutionPackage.id+"/starter.zip"],solution:expected[fileSchemaEvolutionPackage.id+"/solution.zip"]};
 const topology=assertRetryArchiveTopology(snapshot,retry,hashes,fileSchema);
 for(const [path,hash] of Object.entries(snapshot))assert.equal(hash,expected[path],`public archive differs from fixed authored bytes: ${path}`);
 return topology;
}
export function classifyAuthorizationCommand(result:Parameters<typeof classifyRetryCommand>[0]) {
 if(result.error?.code==="ETIMEDOUT" || result.status===124)return "timeout";
 return classifyRetryCommand(result);
}
export function authorizationArchiveSnapshot(root:string) {
 const base=join(root,"public/projects");
 const walk=(directory:string):void=>{assert(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(),"archive directory must not be a symlink");for(const name of readdirSync(directory)){const path=join(directory,name),stat=lstatSync(path);assert(!stat.isSymbolicLink(),`symlink archive entry rejected: ${path}`);if(stat.isDirectory())walk(path);else assert(stat.isFile(),"archive entry must be a regular file");}};
 // The catalog root may be the admitted owned-runtime alias; archive entries themselves may not be links.
 if(existsSync(base))walk(realpathSync(base));return archiveSnapshot(root);
}
function replaceOnce(source:string,marker:string,replacement:string):string {
 assert.equal(source.split(marker).length-1,1,"mutation/equivalent anchor must occur exactly once");return source.replace(marker,replacement);
}
function extract(archive:Uint8Array,destination:string,variant:"starter"|"solution"):string {
 const expectedBytes=buildProjectArchive(serviceAuthorizationPackage,variant);
 assert.equal(sha256(archive),sha256(expectedBytes),"only the fixed authored archive may execute");
 const expected=projectArchiveFiles(serviceAuthorizationPackage,variant);const entries=unzipSync(archive);const prefix=serviceAuthorizationPackage.id+"/";
 assert.equal(Object.keys(expected).length,14);assert.deepEqual(Object.keys(entries).sort(),Object.keys(expected).map(p=>prefix+p).sort());
 const root=join(destination,serviceAuthorizationPackage.id);assert(!existsSync(root),"extraction root must be fresh");
 for(const [path,content] of Object.entries(entries)){
  assert(path.startsWith(prefix));const relative=path.slice(prefix.length);assert(!relative.split("/").some(p=>p===".." || p==="." || p===""));assert(!relative.startsWith("/") && !relative.includes("\\"));
  assert.equal(strFromU8(content),expected[relative]);const target=join(root,relative);mkdirSync(dirname(target),{recursive:true});assert(!existsSync(target));writeFileSync(target,content,{flag:"wx"});assertRegularNoSymlink(target);
 }
 return root;
}
function pass(command:RecordedCommand,label:string):void {assert.equal(command.classification,"passed",`${label}: ${command.classification}\n${command.stdout}\n${command.stderr}`);assert.equal(command.signal,null);assert.equal(command.errorCode,null);}
function namedResult(command:RecordedCommand,name:string,success:boolean):void {
 assert.equal(command.status,success?0:101);assert.equal(command.classification,success?"passed":"test-failure");assert.equal(command.signal,null);assert.equal(command.errorCode,null);
 assert(command.stdout.includes(`test ${name} ... ${success?"ok":"FAILED"}`),`named target ${name} must execute`);
 assert.match(command.stdout,success?/test result: ok\. 1 passed; 0 failed; 0 ignored/:/test result: FAILED\. 0 passed; 1 failed; 0 ignored/);
 if(!success)assert.match(command.stdout,/assertion .*failed|assertion failed:/,"semantic kill must be an assertion failure");
}
function rustCommand(profile:RetryToolProfile,cwd:string,args:string[],target:string):RecordedCommand {
 const started=Date.now(),startedAt=new Date().toISOString();const result=spawnSync(profile.executables.rustc.path,args,{cwd,env:buildAuthorizationChildEnv(profile,target),encoding:"utf8",timeout:60_000,maxBuffer:8*1024*1024});
 const stdout=result.stdout??"",stderr=result.stderr??"",errorCode=result.error?(result.error as NodeJS.ErrnoException).code??"UNKNOWN":null;
 return {args,cwd,executable:profile.executables.rustc.path,status:result.status,signal:result.signal,classification:classifyAuthorizationCommand({status:result.status,signal:result.signal,stdout,stderr,error:result.error?{code:errorCode??undefined}:undefined}),stdout,stderr,durationMs:Date.now()-started,startedAt,finishedAt:new Date().toISOString(),timedOut:errorCode==="ETIMEDOUT",errorCode};
}
function memberRecord(variant:"starter"|"solution",bytes:Uint8Array){return {sha256:sha256(bytes),bytes:bytes.length,members:Object.fromEntries(Object.entries(projectArchiveFiles(serviceAuthorizationPackage,variant)).map(([path,content])=>[path,{sha256:sha256(content),bytes:Buffer.byteLength(content)}]))};}
export function runAuthorizationVerification(options:{msrv:boolean}):unknown {
 const root=repoRoot(),profile=profileFor(options.msrv),reportRoot=join(root,"test-results/authorization",profile.mode);mkdirSync(reportRoot,{recursive:true});const runRoot=mkdtempSync(join(reportRoot,"run-"));
 const archives={starter:buildProjectArchive(serviceAuthorizationPackage,"starter"),solution:buildProjectArchive(serviceAuthorizationPackage,"solution")};
 const hashes={starter:sha256(archives.starter),solution:sha256(archives.solution)};
 const before=authorizationArchiveSnapshot(root),topology=assertAuthorizationArchiveSnapshot(before);
 const commands:RecordedCommand[]=[],semantic:unknown[]=[],equivalents:unknown[]=[],probes:unknown[]=[];
 const report:Record<string,unknown>={schema:"rust-workshop.authorization.v1",status:"running",mode:profile.mode,toolchain:profile,runRoot,expectedNativeTestNames:[...expectedNativeTests],compilerProbeCategories:compilerProbes.cases.length,archive:{starter:memberRecord("starter",archives.starter),solution:memberRecord("solution",archives.solution)},beforeArchives:before,beforeTopology:topology,authoredArchiveHashes:authoredArchiveHashes(),verifierSha256:sha256(readFileSync(join(root,"scripts/verify-authorization.ts"))),commands,semantic,equivalents,probes};
 const save=()=>writeFileSync(join(runRoot,"receipt.json"),JSON.stringify(report,null,2));
 const record=(c:RecordedCommand)=>{commands.push(c);save();return c;};
 const cargo=(cwd:string,args:string[],target:string)=>record(run(profile,cwd,args,target));
 const rust=(cwd:string,args:string[])=>record(rustCommand(profile,cwd,args,join(cwd,"target")));
 const fixed=(label:string)=>{const dir=join(runRoot,label);mkdirSync(dir,{recursive:true});return extract(archives.solution,dir,"solution");};
 try {
  save();for(const variant of ["starter","solution"] as const)writeFileSync(join(runRoot,variant+".zip"),archives[variant]);
  const starterDir=join(runRoot,"starter");mkdirSync(starterDir);const starter=extract(archives.starter,starterDir,"starter");
  pass(cargo(starter,["check","--all-targets","--offline","--locked"],join(runRoot,"starter-target")),"starter compiles");
  const starterResult=cargo(starter,["test","--offline","--locked","--no-fail-fast"],join(runRoot,"starter-target"));assert.equal(starterResult.classification,"test-failure");assert.equal(starterResult.status,101);
  for(const release of [false,true]){
   const suffix=release?"release":"debug",flags=release?["--release"]:[];
   const canonical=fixed("canonical-"+suffix),target=join(runRoot,"target-canonical-"+suffix);
   assert.equal(readFileSync(join(canonical,"src/lib.rs"),"utf8"),libSource);
   assertNativePositive(cargo(canonical,["test","--offline","--locked","--no-fail-fast",...flags],target));
   for(const equivalent of compilerProbes.equivalents){
    const dir=fixed(`equivalent-${equivalent.name}-${suffix}`),source=replaceOnce(libSource,equivalent.marker,equivalent.replacement);writeFileSync(join(dir,"src/lib.rs"),source);
    const result=cargo(dir,["test","--offline","--locked","--no-fail-fast",...flags],join(runRoot,`target-equivalent-${equivalent.name}-${suffix}`));assertNativePositive(result);equivalents.push({id:equivalent.name,profile:suffix,beforeSha256:sha256(libSource),afterSha256:sha256(source),command:commands.length-1});save();
   }
   for(const mutation of semanticMutations){
    const dir=fixed(`mutant-${mutation.id}-${suffix}`),target=join(runRoot,`target-${mutation.id}-${suffix}`),file=join(dir,"src/lib.rs"),source=replaceOnce(libSource,mutation.marker,mutation.replacement);writeFileSync(file,source);
    const compile=cargo(dir,["test","--no-run","--offline","--locked",...flags],target);pass(compile,`${mutation.id} must compile`);
    const testArgs=["test","--offline","--locked",...flags,mutation.testName,"--","--exact","--test-threads=1"];
    const rejected=cargo(dir,testArgs,target);namedResult(rejected,mutation.testName,false);
    writeFileSync(file,libSource);const restored=cargo(dir,testArgs,target);namedResult(restored,mutation.testName,true);
    semantic.push({id:mutation.id,profile:suffix,expectedTest:mutation.testName,beforeSha256:sha256(libSource),afterSha256:sha256(source),compile,rejected,restored});save();
   }
  }
  // Compiler controls link the actual archive's library; API relaxations are separate fixed sources.
  const probeRoot=join(runRoot,"compiler");mkdirSync(probeRoot);const canonicalLib=join(probeRoot,"canonical.rs");writeFileSync(canonicalLib,libSource);const rlib=join(probeRoot,"libservice_authorization_workshop.rlib");
  const buildLib=(file:string,out:string)=>{const result=rust(probeRoot,["--edition=2024","--crate-type=rlib","--crate-name=service_authorization_workshop",file,"-o",out,"--error-format=json"]);pass(result,"probe library");};buildLib(canonicalLib,rlib);
  const consumer=(body:string,file:string)=>{const source=compilerProbes.helpers+"fn main() {\n"+body+"\n}\n";writeFileSync(file,source);return {source,line:compilerProbes.helpers.split("\n").length+1};};
  const compileConsumer=(file:string,library:string,out:string)=>rust(probeRoot,["--edition=2024",file,"--extern",`service_authorization_workshop=${library}`,"-o",out,"--error-format=json"]);
  const baseline=join(probeRoot,"baseline.rs"),baselineOut=join(probeRoot,"baseline");consumer(compilerProbes.baseline,baseline);pass(compileConsumer(baseline,rlib,baselineOut),"consumer baseline compile");
  const startedAt=new Date().toISOString(),start=Date.now();const ran=spawnSync(baselineOut,[],{cwd:probeRoot,env:buildAuthorizationChildEnv(profile,join(probeRoot,"target")),encoding:"utf8",timeout:10_000});const baselineRun=record({executable:baselineOut,args:[],cwd:probeRoot,startedAt,finishedAt:new Date().toISOString(),durationMs:Date.now()-start,status:ran.status,signal:ran.signal,stdout:ran.stdout??"",stderr:ran.stderr??"",classification:classifyAuthorizationCommand({status:ran.status,signal:ran.signal,stdout:ran.stdout??"",stderr:ran.stderr??"",error:ran.error?{code:(ran.error as NodeJS.ErrnoException).code}:undefined}),timedOut:false,errorCode:ran.error?(ran.error as NodeJS.ErrnoException).code??"UNKNOWN":null});pass(baselineRun,"consumer baseline run");
  const internalSource=(source:string,body:string)=>replaceOnce(source,"\n}\npub use boundary","\nmod fixed_consume_probe { use super::*; fn probe() {\n"+body+"\n} }\n}\npub use boundary");
  for(const probe of compilerProbes.cases){
   const file=join(probeRoot,probe.id.replaceAll("-","_")+".rs"),out=join(probeRoot,probe.id),relaxed=join(probeRoot,probe.id+"-relaxed.rs"),relaxedRlib=join(probeRoot,"lib"+probe.id.replaceAll("-","_")+".rlib");let line:number;
   if(probe.internal){const source=internalSource(libSource,probe.body);writeFileSync(file,source);line=source.split("\n").findIndex(x=>x===probe.body)+1;}else line=consumer(probe.body,file).line;
   const negative=probe.internal?rust(probeRoot,["--edition=2024","--crate-type=rlib","--crate-name=internal_probe",file,"-o",out+".rlib","--error-format=json"]):compileConsumer(file,rlib,out);
   assert.equal(negative.status,1);assert.equal(negative.classification,"compile-error");assert.equal(negative.errorCode,null);assert.equal(negative.signal,null);assertProbeDiagnostic(negative.stderr,probe.code,line,probe.symbol);
   let positive:RecordedCommand;
   if(probe.internal){writeFileSync(relaxed,internalSource(probe.relaxedSource,probe.positiveBody));positive=rust(probeRoot,["--edition=2024","--crate-type=rlib","--crate-name=internal_relaxed",relaxed,"-o",relaxedRlib,"--error-format=json"]);}
   else{writeFileSync(relaxed,probe.relaxedSource);buildLib(relaxed,relaxedRlib);const positiveFile=join(probeRoot,probe.id.replaceAll("-","_")+"_positive.rs");consumer(probe.positiveBody,positiveFile);positive=compileConsumer(positiveFile,relaxedRlib,out+"-positive");}
   pass(positive,probe.id+" API-relaxation/positive control");probes.push({id:probe.id,category:probe.internal?"internal-ownership":"external-compiler",expectedCode:probe.code,expectedLine:line,symbol:probe.symbol,canonicalSha256:sha256(libSource),relaxedSha256:sha256(probe.relaxedSource),negative,positive,consumerChanged:probe.positiveBody!==probe.body});save();
  }
  for(const [id,body,internal] of [["moved-fresh-positive",compilerProbes.movedFreshPositive,false],["internal-fresh-positive",compilerProbes.internalFreshPositive,true]] as const){const file=join(probeRoot,id.replaceAll("-","_")+".rs");let result:RecordedCommand;if(internal){writeFileSync(file,internalSource(libSource,body));result=rust(probeRoot,["--edition=2024","--crate-type=rlib","--crate-name=fresh_internal",file,"-o",join(probeRoot,"libfresh.rlib"),"--error-format=json"]);}else{consumer(body,file);result=compileConsumer(file,rlib,join(probeRoot,id));}pass(result,id);probes.push({id,category:"fresh-witness-positive",command:result});save();}
  const after=authorizationArchiveSnapshot(root);assert.equal(assertAuthorizationArchiveSnapshot(after),topology);assert.deepEqual(after,before,"public archives must remain byte identical");report.afterArchives=after;report.afterTopology=topology;report.status="diagnostic-passed-awaiting-root-freeze";save();
  return {status:report.status,mode:profile.mode,receipt:join(runRoot,"receipt.json"),nativePositiveTests:14,semanticRuns:semantic.length,equivalents:equivalents.length,compilerProbeCategories:compilerProbes.cases.length,freshWitnessPositiveControls:2,compilerControlRecords:probes.length,archiveHashes:hashes};
 }catch(error){report.status="failed";report.error=error instanceof Error?{name:error.name,message:error.message,stack:error.stack}:String(error);report.afterArchives=authorizationArchiveSnapshot(root);save();throw error;}
}
if(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url){console.log(JSON.stringify(runAuthorizationVerification(parseAuthorizationArgs(process.argv.slice(2)))));}
