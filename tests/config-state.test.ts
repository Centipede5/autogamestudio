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
      explorationLambda: 1.25,
      parentSelectionMode: "auto",
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
    const gitignore = await fs.readFile(path.join(repoPath, ".gitignore"), "utf8");
    expect(gitignore).toContain(".autogamestudio/");
  });

  it("does not duplicate the runtime ignore entry", async () => {
    const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), "ags-config-ignore-"));
    await fs.writeFile(path.join(repoPath, ".gitignore"), ".autogamestudio/\nnode_modules/\n", "utf8");

    await ensureRepoRuntimeFiles(repoPath);

    const gitignore = await fs.readFile(path.join(repoPath, ".gitignore"), "utf8");
    expect(gitignore.match(/^\.autogamestudio\/$/gm)).toHaveLength(1);
  });
});
