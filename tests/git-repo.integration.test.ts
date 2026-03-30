import path from "node:path";
import { describe, expect, it } from "vitest";
import { execa } from "execa";
import {
  assertGitRepo,
  buildSelectedParent,
  commitAllChanges,
  createIsolatedWorktree,
  getBranchRefs,
  getChangedFiles,
  parseGitHubRepoFromRemote,
  pushBranch
} from "../src/git/repo.js";
import { commitAll, createBareRemote, initGitRepo, makeTempDir, writeRepoFile } from "./helpers.js";

describe("git integration", () => {
  it("detects untracked files in changed-file discovery", async () => {
    const repoPath = await makeTempDir("ags-git-untracked-");
    await initGitRepo(repoPath);
    await writeRepoFile(repoPath, "index.html", "<html></html>");
    await commitAll(repoPath, "init");

    await writeRepoFile(repoPath, "new-file.js", "console.log('new');");

    const changedFiles = await getChangedFiles(repoPath, "HEAD");
    expect(changedFiles).toContain("new-file.js");
  });

  it("creates a worktree branch, commits, and pushes to origin", async () => {
    const remotePath = await createBareRemote();
    const repoPath = await makeTempDir("ags-git-repo-");

    await execa("git", ["clone", remotePath, repoPath]);
    await execa("git", ["-C", repoPath, "config", "user.email", "test@example.com"]);
    await execa("git", ["-C", repoPath, "config", "user.name", "Test User"]);
    await writeRepoFile(repoPath, "index.html", "<html><script src=\"main.js\"></script></html>");
    await writeRepoFile(repoPath, "main.js", "console.log('base');");
    await commitAll(repoPath, "init");
    const currentBranch = (await execa("git", ["-C", repoPath, "branch", "--show-current"])).stdout.trim();
    await execa("git", ["-C", repoPath, "push", "-u", "origin", currentBranch]);
    await execa("git", ["-C", repoPath, "checkout", "-b", "fighting"]);
    await execa("git", ["-C", repoPath, "push", "-u", "origin", "fighting"]);

    await assertGitRepo(repoPath);
    const selectedParent = await buildSelectedParent(repoPath, "fighting");
    const worktreePath = path.join(repoPath, ".autogamestudio", "worktrees", "fighting-v2.1-test");

    await createIsolatedWorktree({
      repoPath,
      worktreePath,
      newBranchName: "fighting-v2.1-test",
      parentBranchName: "fighting"
    });

    await writeRepoFile(worktreePath, "main.js", "console.log('child');");
    await commitAllChanges(worktreePath, "child commit");
    await pushBranch(worktreePath, "fighting-v2.1-test");

    const refs = await getBranchRefs(repoPath);
    expect(refs.some((ref) => ref.name === "fighting-v2.1-test")).toBe(true);

    const remoteRefs = await execa("git", ["-C", remotePath, "for-each-ref", "--format=%(refname:short)", "refs/heads"]);
    expect(remoteRefs.stdout.split(/\r?\n/)).toContain("fighting-v2.1-test");
  });

  it("parses github remotes", () => {
    expect(parseGitHubRepoFromRemote("git@github.com:Centipede5/autogamestudio.git")).toBe("Centipede5/autogamestudio");
    expect(parseGitHubRepoFromRemote("https://github.com/Centipede5/autogamestudio.git")).toBe("Centipede5/autogamestudio");
    expect(parseGitHubRepoFromRemote("file:///tmp/repo")).toBeNull();
  });
});
