import {
  runMacroContractVerification,
  type MacroContractMode,
} from "./macro-contract-verifier";

const args = process.argv.slice(2);
if (args.length !== 1 || (args[0] !== "--stable" && args[0] !== "--msrv"))
  throw new Error("Choose exactly one verifier mode: --stable or --msrv");

const mode: MacroContractMode = args[0] === "--msrv" ? "msrv" : "stable";
const report = runMacroContractVerification(mode);
console.log(`Macro contract verifier: ${report.status} (${mode})`);
if (report.status !== "passed") process.exitCode = 1;
