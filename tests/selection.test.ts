import { describe, expect, it } from "vitest";
import { DEFAULT_EXPLORATION_LAMBDA, EXPLORATION_PRESETS, selectRankedCandidate, selectUniformCandidate } from "../src/selection.js";

describe("selection helpers", () => {
  it("exposes a focused default exploration preset", () => {
    expect(DEFAULT_EXPLORATION_LAMBDA).toBe(EXPLORATION_PRESETS[0].value);
    expect(EXPLORATION_PRESETS[0].value).toBeGreaterThan(EXPLORATION_PRESETS[1].value);
  });

  it("biases ranked selection toward earlier candidates", () => {
    const items = ["top", "middle", "tail"];

    expect(selectRankedCandidate(items, 1.25, 0)).toBe("top");
    expect(selectRankedCandidate(items, 1.25, 0.99)).toBe("tail");
  });

  it("supports wider exploration when lambda is small", () => {
    const items = ["top", "middle", "tail"];

    expect(selectRankedCandidate(items, 0, 0.5)).toBe("middle");
    expect(selectUniformCandidate(items, 0.8)).toBe("tail");
  });
});
