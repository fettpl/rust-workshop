import { describe, expect, it } from "vitest";
import { initialLocale, translateUi } from "./ui-locale";

describe("workshop locale preference", () => {
  it("uses a saved choice for a returning learner", () => {
    expect(initialLocale("en", true, ["pl-PL"])).toBe("en");
    expect(initialLocale("pl", false, ["en-US"])).toBe("pl");
  });

  it("keeps Polish for legacy saves and uses a supported browser language for new users", () => {
    expect(initialLocale(null, true, ["en-US"])).toBe("pl");
    expect(initialLocale(null, false, ["de-DE", "en-GB"])).toBe("en");
    expect(initialLocale(null, false, ["pl-PL", "en-US"])).toBe("pl");
    expect(initialLocale("unsupported", false, ["fr-FR"])).toBe("pl");
  });

  it("interpolates learner input without interpreting it as a translation template", () => {
    expect(translateUi("en", "Cześć, {0}.", "{0}")).toBe("Hello, {0}.");
    expect(translateUi("pl", "Cześć, {0}.", "Ala")).toBe("Cześć, Ala.");
  });
});
