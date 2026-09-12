/** Uses only authored curriculum fixtures, never learner/imported code. */
import { smokeLessons } from "./smoke-abstractions";

void smokeLessons(
  [
    "lifetime-relations",
    "lifetime-structs",
    "lifetime-api",
    "closure-captures",
    "closure-ownership",
    "closure-contracts",
    "iterator-ownership",
    "iterator-pipelines",
    "iterator-laziness",
    "iterator-contracts",
  ],
  ["lifetime-relations", "closure-captures", "iterator-ownership"],
).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
