import { describe, expect, it } from "vitest";
import { ensureWithinDirectory } from "../src/guardrails/paths.js";
import { sanitizeCallsign } from "../src/guardrails/sanitize.js";

describe("guardrails", () => {
  it("sanitizes callsigns", () => {
    expect(sanitizeCallsign("Calvi-123")).toBe("calvi123");
  });

  it("rejects escaping paths", () => {
    expect(() => ensureWithinDirectory("C:\\repo", "C:\\elsewhere")).toThrow();
  });
});
