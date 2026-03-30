import { describe, expect, it } from "vitest";
import { buildCommitMessage, buildPrBody, buildPrTitle } from "../src/metadata.js";

describe("deterministic metadata", () => {
  it("builds commit messages", () => {
    expect(buildCommitMessage("fighting-v2", "fighting-v2-v2.1-calvi")).toBe(
      "Iterate fighting-v2 -> fighting-v2-v2.1-calvi"
    );
  });

  it("builds pull request title and body", () => {
    expect(buildPrTitle("fighting-v2", "fighting-v2-v2.1-calvi")).toBe(
      "Iterate fighting-v2 into fighting-v2-v2.1-calvi"
    );
    expect(
      buildPrBody({
        parentBranch: "fighting-v2",
        childBranch: "fighting-v2-v2.1-calvi",
        parentCommitSha: "abc123",
        startedAt: "2026-03-29T00:00:00.000Z"
      })
    ).toContain(".autogamestudio/plan.md");
  });
});
