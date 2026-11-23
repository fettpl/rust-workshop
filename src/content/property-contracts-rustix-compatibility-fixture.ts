/** Reconstructs the archived Property Contracts lock inside test projections. */
const fixedRustix = `name = "rustix"
version = "1.1.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e5e76742e5294153d4dde1207dbec5bdd81eef6fabdc0d2118babadabfd858aa"`;

const historicalRustix = `name = "rustix"
version = "1.1.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "891efababe418670775f199f0d233d84843c227a0949a883ce15b37c78d6629d"`;

function beforeCargoUpdate(lock: string): string {
  // The previous authored lock also lacked the trailing newline Cargo added.
  return lock.replace(fixedRustix, historicalRustix).slice(0, -1);
}

export const propertyContractsRustixRestoration = {
  registry: "projects",
  selector: "property-contracts",
  path: ["package", "files", "1"],
  before(value: unknown) {
    const { path, starter, solution } = value as {
      path: string;
      starter: string;
      solution: string;
    };
    return {
      path,
      starter: beforeCargoUpdate(starter),
      solution: beforeCargoUpdate(solution),
    };
  },
  beforeSha256:
    "c42bafade3cadaa167f4ec853852122248e14909556050c115432bc46a652ecc",
  successorSha256:
    "27e01fc79b8e22e81c5477d9f6f0754f26006fad4aa0ebffdf6c1c0a20eb7602",
};
