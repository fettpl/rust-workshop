import {
  autoTraitsCanonical, autoTraitsEquivalent, autoTraitsMutant, autoTraitsTests,
  borrowedBytesCanonical, borrowedBytesEquivalent, borrowedBytesMutant, borrowedBytesTests,
  compileFailCellSync, compileFailInvariant, compileFailLifetime, compileFailRcBounds,
  invariantBorrowCanonical, invariantBorrowEquivalent, invariantBorrowMutant, invariantBorrowTests,
  maybeUninitEquivalent, maybeUninitNegative, maybeUninitPositive,
  rawBorrowedEquivalent, rawBorrowedNegative, rawBorrowedPositive,
  safeSlotCanonical, safeSlotEquivalent, safeSlotMutant, safeSlotTests,
  splitBorrowedCanonical, splitBorrowedEquivalent, splitBorrowedMutant, splitBorrowedTests,
} from "./unsafe-borrowed-memory-contracts";

export type BorrowedMemoryFixtureMode = "safe-behavior" | "compile-fail" | "miri-positive" | "miri-negative";
export interface UnsafeBorrowedMemoryAssessmentFixture {
  id: string;
  canonical: string;
  equivalent: string;
  mutant: string;
  tests: string;
  mode: BorrowedMemoryFixtureMode;
  expectedDiagnostic?: string;
}

export const unsafeBorrowedMemoryAssessmentFixtures: UnsafeBorrowedMemoryAssessmentFixture[] = [
  { id: "unsafe-borrowed-provenance-boundary-gate", canonical: borrowedBytesCanonical, equivalent: borrowedBytesEquivalent, mutant: borrowedBytesMutant, tests: borrowedBytesTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-provenance-soundness-gate", canonical: borrowedBytesCanonical, equivalent: borrowedBytesEquivalent, mutant: borrowedBytesMutant, tests: borrowedBytesTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-provenance-blank", canonical: borrowedBytesCanonical, equivalent: borrowedBytesEquivalent, mutant: borrowedBytesMutant, tests: borrowedBytesTests, mode: "safe-behavior" },
  { id: "review-unsafe-borrowed-provenance", canonical: borrowedBytesCanonical, equivalent: borrowedBytesEquivalent, mutant: borrowedBytesMutant, tests: borrowedBytesTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-reborrow-boundary-gate", canonical: splitBorrowedCanonical, equivalent: splitBorrowedEquivalent, mutant: splitBorrowedMutant, tests: splitBorrowedTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-reborrow-blank", canonical: splitBorrowedCanonical, equivalent: splitBorrowedEquivalent, mutant: splitBorrowedMutant, tests: splitBorrowedTests, mode: "safe-behavior" },
  { id: "review-unsafe-borrowed-reborrow", canonical: splitBorrowedCanonical, equivalent: splitBorrowedEquivalent, mutant: splitBorrowedMutant, tests: splitBorrowedTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-reborrow-soundness-gate", canonical: invariantBorrowCanonical, equivalent: invariantBorrowEquivalent, mutant: invariantBorrowMutant, tests: invariantBorrowTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-slot-boundary-gate", canonical: safeSlotCanonical, equivalent: safeSlotEquivalent, mutant: safeSlotMutant, tests: safeSlotTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-slot-soundness-gate", canonical: safeSlotCanonical, equivalent: safeSlotEquivalent, mutant: safeSlotMutant, tests: safeSlotTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-slot-blank", canonical: safeSlotCanonical, equivalent: safeSlotEquivalent, mutant: safeSlotMutant, tests: safeSlotTests, mode: "safe-behavior" },
  { id: "review-unsafe-borrowed-slot", canonical: safeSlotCanonical, equivalent: safeSlotEquivalent, mutant: safeSlotMutant, tests: safeSlotTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-auto-traits-boundary-gate", canonical: autoTraitsCanonical, equivalent: autoTraitsEquivalent, mutant: autoTraitsMutant, tests: autoTraitsTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-auto-traits-soundness-gate", canonical: autoTraitsCanonical, equivalent: autoTraitsEquivalent, mutant: autoTraitsMutant, tests: autoTraitsTests, mode: "safe-behavior" },
  { id: "unsafe-borrowed-auto-traits-blank", canonical: autoTraitsCanonical, equivalent: autoTraitsEquivalent, mutant: autoTraitsMutant, tests: autoTraitsTests, mode: "safe-behavior" },
  { id: "review-unsafe-borrowed-auto-traits", canonical: autoTraitsCanonical, equivalent: autoTraitsEquivalent, mutant: autoTraitsMutant, tests: autoTraitsTests, mode: "safe-behavior" },
  { id: "raw-borrowed-positive", canonical: rawBorrowedPositive, equivalent: rawBorrowedEquivalent, mutant: rawBorrowedNegative, tests: "", mode: "miri-positive" },
  { id: "maybe-uninit-positive", canonical: maybeUninitPositive, equivalent: maybeUninitEquivalent, mutant: maybeUninitNegative, tests: "", mode: "miri-positive" },
  { id: "raw-borrowed-negative", canonical: rawBorrowedPositive, equivalent: rawBorrowedEquivalent, mutant: rawBorrowedNegative, tests: "", mode: "miri-negative", expectedDiagnostic: "Undefined Behavior" },
  { id: "maybe-uninit-negative", canonical: maybeUninitPositive, equivalent: maybeUninitEquivalent, mutant: maybeUninitNegative, tests: "", mode: "miri-negative", expectedDiagnostic: "uninitialized" },
];

export const unsafeBorrowedMemoryCompileFailFixtures = [
  { id: "borrowed-memory-lifetime-escape", source: `${borrowedBytesCanonical}\n${compileFailLifetime}`, expectedDiagnostic: "lifetime" },
  { id: "borrowed-memory-invariant-write", source: `${invariantBorrowCanonical}\n${compileFailInvariant}`, expectedDiagnostic: "lifetime" },
  { id: "borrowed-memory-cell-sync", source: `${invariantBorrowCanonical}\n${compileFailCellSync}`, expectedDiagnostic: "Sync" },
  { id: "borrowed-memory-rc-bounds", source: `${invariantBorrowCanonical}\n${compileFailRcBounds}`, expectedDiagnostic: "Send|Sync" },
] as const;
