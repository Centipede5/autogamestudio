import { afterEach, describe, expect, it, vi } from "vitest";
import { MIN_PARENT_MATCHES, WebsiteClient } from "../src/website/client.js";

describe("website client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("selects the highest-elo non-main branch with enough matches", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        versions: [
          { branchName: "main", branchLabels: ["main"], commitSha: "111", currentElo: 9999, matches: 1 },
          { branchName: "fighting", branchLabels: ["fighting"], commitSha: "222", currentElo: 1800, matches: MIN_PARENT_MATCHES - 1 },
          { branchName: "flappy", branchLabels: ["flappy"], commitSha: "333", currentElo: 1700, matches: MIN_PARENT_MATCHES + 2 },
          { branchName: "rpg", branchLabels: ["rpg"], commitSha: "444", currentElo: 1650, matches: MIN_PARENT_MATCHES + 6 }
        ]
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new WebsiteClient({
      websiteBaseUrl: "http://localhost:3000",
      publicWebsiteBaseUrl: "https://autogamestudio.ai",
      dangerousPublicFeedback: false
    });

    await expect(client.getTopParentCandidate()).resolves.toEqual({
      branchName: "flappy",
      commitSha: "333"
    });
  });

  it("rejects website candidates when no branch meets the minimum match threshold", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        versions: [
          { branchName: "fighting", branchLabels: ["fighting"], commitSha: "222", currentElo: 1800, matches: 1 },
          { branchName: "flappy", branchLabels: ["flappy"], commitSha: "333", currentElo: 1700, matches: 2 }
        ]
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new WebsiteClient({
      websiteBaseUrl: "http://localhost:3000",
      publicWebsiteBaseUrl: "https://autogamestudio.ai",
      dangerousPublicFeedback: false
    });

    await expect(client.getParentCandidates()).rejects.toThrow(`at least ${MIN_PARENT_MATCHES} matches`);
  });

  it("falls back to the public site for commit context when enabled", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("local down"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: {
            commitSha: "abc"
          }
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = new WebsiteClient({
      websiteBaseUrl: "http://localhost:3000",
      publicWebsiteBaseUrl: "https://autogamestudio.ai",
      dangerousPublicFeedback: true
    });

    const context = await client.getCommitContext("abc");
    expect(context.version.commitSha).toBe("abc");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://autogamestudio.ai/api/context/abc?format=json",
      expect.any(Object)
    );
  });

  it("does not fall back to the public site when disabled", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("local down"));
    vi.stubGlobal("fetch", fetchMock);

    const client = new WebsiteClient({
      websiteBaseUrl: "http://localhost:3000",
      publicWebsiteBaseUrl: "https://autogamestudio.ai",
      dangerousPublicFeedback: false
    });

    await expect(client.getCommitContext("abc")).rejects.toThrow("local down");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns false when rescan fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const client = new WebsiteClient({
      websiteBaseUrl: "http://localhost:3000",
      publicWebsiteBaseUrl: "https://autogamestudio.ai",
      dangerousPublicFeedback: false
    });

    await expect(client.triggerRescan()).resolves.toBe(false);
  });
});
