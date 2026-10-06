import { parseArgs } from "node:util";
import { runApiReleaseVerification } from "./api-release-verifier";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    stable: { type: "boolean", default: false },
    msrv: { type: "boolean", default: false },
  },
  allowPositionals: true,
  strict: true,
});
if (positionals.length || values.stable === values.msrv)
  throw new Error("Choose exactly one verifier mode: --stable or --msrv");

const mode = values.msrv ? "msrv" : "stable";
const report = runApiReleaseVerification(mode);
console.log(`API release verifier: ${report.status} (${mode})`);
if (report.error) console.error(report.error.message);
if (report.status !== "passed") process.exitCode = 1;
