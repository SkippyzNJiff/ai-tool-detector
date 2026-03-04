import { describe, expect, it } from "vitest";
import { parseAnalyzeRequest, validateText } from "@/lib/validation";

describe("validation", () => {
  it("accepts valid text", () => {
    const text = "A".repeat(100);
    expect(validateText(text)).toBe(text);
  });

  it("rejects short text", () => {
    expect(() => validateText("too short")).toThrow("at least 100 characters");
  });

  it("defaults providerPreference to all", () => {
    const payload = parseAnalyzeRequest({ text: "A".repeat(120) });
    expect(payload.providerPreference).toBe("all");
  });
});
