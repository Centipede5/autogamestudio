import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRepoPlanPath, getWorktreePlanPath, syncPlanFileToRepoRuntime } from "../src/plan-file.js";

describe("plan file syncing", () => {
  it("copies the latest worktree plan into the repo-level .autogamestudio directory", async () => {
    const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), "ags-plan-repo-"));
    const worktreePath = await fs.mkdtemp(path.join(os.tmpdir(), "ags-plan-worktree-"));
    const worktreePlanPath = getWorktreePlanPath(worktreePath);

    await fs.mkdir(path.dirname(worktreePlanPath), { recursive: true });
    await fs.writeFile(worktreePlanPath, "# Plan\n\n- Improve controls\n", "utf8");

    const destinationPath = await syncPlanFileToRepoRuntime(repoPath, worktreePath);

    expect(destinationPath).toBe(getRepoPlanPath(repoPath));
    await expect(fs.readFile(destinationPath, "utf8")).resolves.toContain("Improve controls");
  });
});
