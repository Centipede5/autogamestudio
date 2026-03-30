import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ensureRepoRuntimeFiles, getRuntimeDir, saveRepoConfig } from "../src/config.js";
import { loadRepoState, saveRepoState } from "../src/state.js";

describe("config and state", () => {
  it("writes runtime files and roundtrips state", async () => {
    const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), "ags-config-"));
    await ensureRepoRuntimeFiles(repoPath);
    await saveRepoConfig({
      repoPath,
      provider: "codex",
      providerCommandTemplate: "codex exec --json -",
      callsign: "calvi",
      autoPr: false,
      dangerousPublicFeedback: false,
      websiteBaseUrl: "http://localhost:3000",
      publicWebsiteBaseUrl: "https://autogamestudio.ai",
      validationCommands: []
    });
    await saveRepoState(repoPath, {
      iterations: [],
      status: "idle"
    });
    const state = await loadRepoState(repoPath);
    expect(state.status).toBe("idle");
    await expect(fs.access(path.join(getRuntimeDir(repoPath), "prompts", "agent.md"))).resolves.toBeUndefined();
  });
});
