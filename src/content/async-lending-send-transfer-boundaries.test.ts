import { expect, it } from "vitest";
import {
  discardSendNativeDirectory,
  sendNativeDirectory,
  verifySendHandoffBoundaries,
} from "./async-lending-send-native";

it("rejects retained generic, Rc and borrowed state at authored spans and runs every corrected twin", () => {
  const directory = sendNativeDirectory("send-handoff-boundaries-");
  try {
    expect(verifySendHandoffBoundaries(directory)).toHaveLength(12);
  } finally {
    discardSendNativeDirectory(directory);
  }
}, 240_000);

import { verifySendHandoffConsumerBounds } from "./async-lending-send-native";

it("proves the public formatter is genuinely non-Clone and the pause is genuinely !Unpin", () => {
  const directory = sendNativeDirectory("send-handoff-consumer-bounds-");
  try {
    expect(verifySendHandoffConsumerBounds(directory)).toHaveLength(2);
  } finally {
    discardSendNativeDirectory(directory);
  }
}, 120_000);
