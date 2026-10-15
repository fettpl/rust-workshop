import { expect, it } from "vitest";
import { lessons } from "./course";

it("provides a separate prepared handoff primary contract after the existing Send steps", () => {
  const lesson = lessons.find(
    (item) => item.id === "async-lending-send-boundary",
  )!;
  expect(lesson.steps.map((step) => step.id)).toContain(
    "async-lending-send-boundary-prepared-handoff",
  );
});

import {
  discardSendNativeDirectory,
  sendNativeDirectory,
  verifySendHandoffBehavior,
  verifySendHandoffTokio,
} from "./async-lending-send-native";

it("executes all three valid handoffs and rejects seven compiling semantic mutants", () => {
  const directory = sendNativeDirectory("send-handoff-behavior-");
  try {
    expect(verifySendHandoffBehavior(directory)).toHaveLength(10);
  } finally {
    discardSendNativeDirectory(directory);
  }
}, 240_000);

it("joins the actual Tokio handoff only after its observed Pending pause is released", () => {
  const directory = sendNativeDirectory("send-handoff-tokio-");
  try {
    expect(verifySendHandoffTokio(directory)).toHaveLength(3);
  } finally {
    discardSendNativeDirectory(directory);
  }
}, 240_000);
