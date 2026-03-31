import { describe, expect, it } from "vitest";
import { calculateNextWidth, createChildBranchName, parseVersionedBranchName } from "../src/guardrails/branching.js";

describe("branch naming", () => {
  it("parses versioned branch names", () => {
    expect(parseVersionedBranchName("fighting-v3.2-calvi")).toEqual({
      root: "fighting",
      depth: 3,
      width: 2,
      callsign: "calvi"
    });
  });

  it("supports legacy parents", () => {
    const next = createChildBranchName({
      parentBranchName: "fighting-v2",
      parentCommitSha: "abc",
      callsign: "calvi",
      branchRefs: []
    });
    expect(next).toBe("fighting-v2-v2.1-calvi");
  });

  it("calculates next sibling width from matching parent commit", () => {
    expect(
      calculateNextWidth("abc", [
        { name: "a", headCommitSha: "1", parentCommitSha: "abc" },
        { name: "b", headCommitSha: "2", parentCommitSha: "abc" },
        { name: "c", headCommitSha: "3", parentCommitSha: "zzz" }
      ])
    ).toBe(3);
  });

  it("skips an already-existing child branch name even if the branch has no child commit yet", () => {
    const next = createChildBranchName({
      parentBranchName: "fighting",
      parentCommitSha: "parent-sha",
      callsign: "c5",
      branchRefs: [
        { name: "fighting-v2.1-c5", headCommitSha: "parent-sha", parentCommitSha: "older-sha" }
      ]
    });
    expect(next).toBe("fighting-v2.2-c5");
  });
});
