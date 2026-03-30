import { describe, expect, it } from "vitest";
import { execa } from "execa";
import { validateRepoOutput } from "../src/validation/repo.js";
import { commitAll, initGitRepo, makeTempDir, writeRepoFile } from "./helpers.js";

const baseConfig = {
  repoPath: "",
  provider: "codex" as const,
  providerCommandTemplate: "codex exec --json -",
  callsign: "tester",
  autoPr: false,
  dangerousPublicFeedback: false,
  websiteBaseUrl: "http://localhost:3000",
  publicWebsiteBaseUrl: "https://autogamestudio.ai",
  validationCommands: []
};

describe("repo validation", () => {
  it("passes for a normal playable repo edit", async () => {
    const repoPath = await makeTempDir("ags-validate-pass-");
    await initGitRepo(repoPath);
    await writeRepoFile(repoPath, "index.html", "<html><script src=\"scripts/main.js\"></script></html>");
    await writeRepoFile(repoPath, ".autogamestudio/plan.md", "# Plan\n");
    await writeRepoFile(repoPath, "scripts/main.js", "console.log('v1');");
    await commitAll(repoPath, "init");
    const baseCommit = (await execa("git", ["-C", repoPath, "rev-parse", "HEAD"])).stdout.trim();

    await writeRepoFile(repoPath, ".autogamestudio/plan.md", "# Plan\n\n- update combat");
    await writeRepoFile(repoPath, "scripts/main.js", "console.log('v2');");
    const changedFiles = await validateRepoOutput({
      repoPath,
      baseCommitSha: baseCommit,
      config: {
        ...baseConfig,
        repoPath
      }
    });

    expect(changedFiles).toContain("scripts/main.js");
  });

  it("fails when index references a missing asset", async () => {
    const repoPath = await makeTempDir("ags-validate-missing-");
    await initGitRepo(repoPath);
    await writeRepoFile(repoPath, "index.html", "<html><script src=\"scripts/main.js\"></script></html>");
    await writeRepoFile(repoPath, ".autogamestudio/plan.md", "# Plan\n");
    await writeRepoFile(repoPath, "scripts/main.js", "console.log('v1');");
    await commitAll(repoPath, "init");
    const baseCommit = (await execa("git", ["-C", repoPath, "rev-parse", "HEAD"])).stdout.trim();

    await writeRepoFile(repoPath, ".autogamestudio/plan.md", "# Plan\n\n- break assets");
    await writeRepoFile(repoPath, "index.html", "<html><script src=\"scripts/missing.js\"></script></html>");

    await expect(
      validateRepoOutput({
        repoPath,
        baseCommitSha: baseCommit,
        config: {
          ...baseConfig,
          repoPath
        }
      })
    ).rejects.toThrow();
  });

  it("fails when forbidden state file is modified", async () => {
    const repoPath = await makeTempDir("ags-validate-forbidden-");
    await initGitRepo(repoPath);
    await writeRepoFile(repoPath, "index.html", "<html></html>");
    await writeRepoFile(repoPath, ".autogamestudio/plan.md", "# Plan\n");
    await writeRepoFile(repoPath, ".autogamestudio/state.json", "{\"status\":\"idle\"}");
    await commitAll(repoPath, "init");
    const baseCommit = (await execa("git", ["-C", repoPath, "rev-parse", "HEAD"])).stdout.trim();

    await writeRepoFile(repoPath, ".autogamestudio/plan.md", "# Plan\n\n- invalid");
    await writeRepoFile(repoPath, ".autogamestudio/state.json", "{\"status\":\"running\"}");

    await expect(
      validateRepoOutput({
        repoPath,
        baseCommitSha: baseCommit,
        config: {
          ...baseConfig,
          repoPath
        }
      })
    ).rejects.toThrow(/Forbidden path/);
  });

  it("fails when a validation command fails", async () => {
    const repoPath = await makeTempDir("ags-validate-command-");
    await initGitRepo(repoPath);
    await writeRepoFile(repoPath, "index.html", "<html></html>");
    await writeRepoFile(repoPath, ".autogamestudio/plan.md", "# Plan\n");
    await commitAll(repoPath, "init");
    const baseCommit = (await execa("git", ["-C", repoPath, "rev-parse", "HEAD"])).stdout.trim();

    await writeRepoFile(repoPath, ".autogamestudio/plan.md", "# Plan\n\n- run validation");
    await writeRepoFile(repoPath, "game.js", "console.log('x');");

    await expect(
      validateRepoOutput({
        repoPath,
        baseCommitSha: baseCommit,
        config: {
          ...baseConfig,
          repoPath,
          validationCommands: ["node -e \"process.exit(1)\""]
        }
      })
    ).rejects.toThrow(/Validation command failed/);
  });

  it("fails when the plan file is missing", async () => {
    const repoPath = await makeTempDir("ags-validate-no-plan-");
    await initGitRepo(repoPath);
    await writeRepoFile(repoPath, "index.html", "<html></html>");
    await commitAll(repoPath, "init");
    const baseCommit = (await execa("git", ["-C", repoPath, "rev-parse", "HEAD"])).stdout.trim();

    await writeRepoFile(repoPath, "game.js", "console.log('x');");

    await expect(
      validateRepoOutput({
        repoPath,
        baseCommitSha: baseCommit,
        config: {
          ...baseConfig,
          repoPath
        }
      })
    ).rejects.toThrow();
  });
});
