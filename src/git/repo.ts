import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { ensureWithinDirectory, isLikelyGitHubUrl } from "../guardrails/paths.js";
import type { BranchRefInfo, SelectedParent } from "../types.js";

export async function cloneRepoIfNeeded(repoInput: string, cloneBaseDir: string) {
  if (!isLikelyGitHubUrl(repoInput)) {
    return path.resolve(repoInput);
  }

  const slug = repoInput
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\/+$/, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\//g, "__");
  const targetPath = path.join(cloneBaseDir, slug);

  await fs.mkdir(cloneBaseDir, { recursive: true });
  try {
    await fs.access(path.join(targetPath, ".git"));
    await execa("git", ["-C", targetPath, "fetch", "--all", "--prune"], { stdio: "pipe" });
  } catch {
    await execa("git", ["clone", repoInput, targetPath], { stdio: "pipe" });
  }

  return targetPath;
}

export async function assertGitRepo(repoPath: string) {
  const result = await execa("git", ["-C", repoPath, "rev-parse", "--is-inside-work-tree"], {
    reject: false
  });
  if (result.exitCode !== 0 || result.stdout.trim() !== "true") {
    throw new Error(`Not a git repository: ${repoPath}`);
  }
}

export async function assertProviderCommandAvailable(commandTemplate: string) {
  const executable = commandTemplate.trim().split(/\s+/)[0];
  const probe = process.platform === "win32" ? ["where", executable] : ["which", executable];
  const result = await execa(probe[0], probe.slice(1), { reject: false });
  if (result.exitCode !== 0) {
    throw new Error(getProviderInstallMessage(executable));
  }
}

function getProviderInstallMessage(executable: string) {
  const sharedFooter = [
    `After installing, open a new terminal and verify with:`,
    `  ${executable} --version`
  ].join("\n");

  switch (executable.toLowerCase()) {
    case "codex":
      return [
        `Provider binary not found: codex`,
        ``,
        `Install OpenAI Codex CLI and make sure it is on your PATH:`,
        `  npm install -g @openai/codex`,
        ``,
        `Docs: https://help.openai.com/en/articles/11096431-openai-codex-ci-getting-started`,
        sharedFooter
      ].join("\n");
    case "claude":
      return [
        `Provider binary not found: claude`,
        ``,
        `Install Claude Code and make sure it is on your PATH:`,
        `  npm install -g @anthropic-ai/claude-code`,
        ``,
        `Docs: https://docs.anthropic.com/en/docs/claude-code/getting-started`,
        sharedFooter
      ].join("\n");
    case "gemini":
      return [
        `Provider binary not found: gemini`,
        ``,
        `Install Gemini CLI and make sure it is on your PATH:`,
        `  npm install -g @google/gemini-cli`,
        ``,
        `Docs: https://github.com/google-gemini/gemini-cli`,
        sharedFooter
      ].join("\n");
    default:
      return [
        `Provider binary not found: ${executable}`,
        ``,
        `Install that CLI and make sure it is available on your PATH.`,
        sharedFooter
      ].join("\n");
  }
}

export async function getBranchHeadSha(repoPath: string, branchName: string) {
  const resolvedRef = await resolveParentStartPoint(repoPath, branchName);
  const result = await execa("git", ["-C", repoPath, "rev-parse", resolvedRef ?? branchName], { reject: false });
  if (result.exitCode !== 0) {
    throw new Error(`Unable to resolve branch head for ${branchName}`);
  }
  return result.stdout.trim();
}

export async function getBranchRefs(repoPath: string): Promise<BranchRefInfo[]> {
  const result = await execa(
    "git",
    ["-C", repoPath, "for-each-ref", "--format=%(refname:short)|%(objectname)", "refs/heads", "refs/remotes/origin"],
    { reject: false }
  );
  if (result.exitCode !== 0) {
    throw new Error("Unable to list branches.");
  }

  const refs = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("origin/HEAD"))
    .map((line) => {
      const [name, headCommitSha] = line.split("|");
      return { name, headCommitSha };
    });

  const withParents = await Promise.all(
    refs.map(async (ref) => {
      const parent = await execa("git", ["-C", repoPath, "rev-parse", `${ref.headCommitSha}^`], {
        reject: false
      });
      return {
        ...ref,
        parentCommitSha: parent.exitCode === 0 ? parent.stdout.trim() : null
      };
    })
  );

  const deduped = new Map<string, BranchRefInfo>();
  for (const ref of withParents) {
    deduped.set(ref.name, ref);
  }
  return Array.from(deduped.values());
}

export async function getLocalBranchNames(repoPath: string) {
  const result = await execa("git", ["-C", repoPath, "for-each-ref", "--format=%(refname:short)", "refs/heads"], {
    reject: false
  });
  if (result.exitCode !== 0) {
    throw new Error("Unable to list local branches.");
  }
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export async function getSelectableBranchNames(repoPath: string) {
  const refs = await getBranchRefs(repoPath);
  const deduped = new Set<string>();
  for (const ref of refs) {
    const normalized = normalizeBranchName(ref.name);
    if (normalized) {
      deduped.add(normalized);
    }
  }
  return Array.from(deduped.values());
}

export async function createIsolatedWorktree(params: {
  repoPath: string;
  worktreePath: string;
  newBranchName: string;
  parentBranchName: string;
  parentCommitSha?: string;
}) {
  ensureWithinDirectory(path.join(params.repoPath, ".autogamestudio", "worktrees"), params.worktreePath);
  await fs.mkdir(path.dirname(params.worktreePath), { recursive: true });
  const startPoint = await resolveParentStartPoint(params.repoPath, params.parentBranchName, params.parentCommitSha);
  if (!startPoint) {
    throw new Error(
      `Unable to resolve parent branch ${params.parentBranchName}. Try fetching the repo or choose a local branch.`
    );
  }
  const result = await execa(
    "git",
    ["-C", params.repoPath, "worktree", "add", "-b", params.newBranchName, params.worktreePath, startPoint],
    { reject: false }
  );
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || `Unable to create worktree for ${params.newBranchName}`);
  }
}

export async function getChangedFiles(repoPath: string, baseCommitSha: string) {
  const result = await execa("git", ["-C", repoPath, "status", "--porcelain=v1", "--untracked-files=all"], {
    reject: false
  });
  if (result.exitCode !== 0) {
    throw new Error("Unable to list changed files.");
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .flatMap((line) => {
      if (line.startsWith("?? ")) {
        return [line.slice(3)];
      }

      const status = line.slice(0, 2);
      if (status.includes("D")) {
        return [];
      }

      const rawPath = line.slice(3);
      if (rawPath.includes(" -> ")) {
        const [, nextPath] = rawPath.split(" -> ");
        return nextPath ? [nextPath] : [];
      }

      return rawPath ? [rawPath] : [];
    });
}

export async function commitAllChanges(repoPath: string, message: string) {
  await execa("git", ["-C", repoPath, "add", "-A"], { reject: false });
  const diff = await execa("git", ["-C", repoPath, "status", "--short"], { reject: false });
  if (!diff.stdout.trim()) {
    throw new Error("No changes were produced by the coding agent.");
  }
  const commit = await execa("git", ["-C", repoPath, "commit", "-m", message], { reject: false });
  if (commit.exitCode !== 0) {
    throw new Error(commit.stderr || "Unable to commit changes.");
  }
}

export async function pushBranch(repoPath: string, branchName: string) {
  const result = await execa("git", ["-C", repoPath, "push", "-u", "origin", branchName], { reject: false });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || `Unable to push branch ${branchName}`);
  }
}

export async function getOriginUrl(repoPath: string) {
  const result = await execa("git", ["-C", repoPath, "remote", "get-url", "origin"], { reject: false });
  if (result.exitCode !== 0) {
    return null;
  }
  return result.stdout.trim();
}

export function parseGitHubRepoFromRemote(remoteUrl: string | null) {
  if (!remoteUrl) {
    return null;
  }

  const cleaned = remoteUrl.replace(/\.git$/i, "");
  const match = cleaned.match(/github\.com[/:]([^/]+)\/(.+)$/i);
  if (!match) {
    return null;
  }
  return `${match[1]}/${match[2]}`;
}

export async function buildSelectedParent(repoPath: string, branchName: string): Promise<SelectedParent> {
  return {
    branchName,
    commitSha: await getBranchHeadSha(repoPath, branchName),
    baseBranchName: branchName
  };
}

export async function resolveParentStartPoint(repoPath: string, branchName: string, commitSha?: string) {
  return resolveExistingRef(repoPath, [branchName, `origin/${branchName}`, commitSha]);
}

export async function resolveSelectedParentRef(repoPath: string, requestedRef: string): Promise<SelectedParent> {
  const branchRefs = await getBranchRefs(repoPath);
  const exactBranchRef = branchRefs.find((ref) => ref.name === requestedRef);
  if (exactBranchRef) {
    const normalizedName = normalizeBranchName(exactBranchRef.name);
    return {
      branchName: normalizedName,
      commitSha: exactBranchRef.headCommitSha,
      baseBranchName: normalizedName
    };
  }

  const normalizedMatch = branchRefs.find((ref) => normalizeBranchName(ref.name) === requestedRef);
  if (normalizedMatch) {
    const normalizedName = normalizeBranchName(normalizedMatch.name);
    return {
      branchName: normalizedName,
      commitSha: normalizedMatch.headCommitSha,
      baseBranchName: normalizedName
    };
  }

  const commitResult = await execa("git", ["-C", repoPath, "rev-parse", "--verify", `${requestedRef}^{commit}`], {
    reject: false
  });
  if (commitResult.exitCode !== 0) {
    throw new Error(`Unable to resolve fixed parent ref: ${requestedRef}`);
  }

  const commitSha = commitResult.stdout.trim();
  const matchingHead = branchRefs.find((ref) => ref.headCommitSha === commitSha);
  if (matchingHead) {
    const normalizedName = normalizeBranchName(matchingHead.name);
    return {
      branchName: normalizedName,
      commitSha,
      baseBranchName: normalizedName
    };
  }

  return {
    branchName: commitSha.slice(0, 7),
    commitSha
  };
}

function normalizeBranchName(refName: string) {
  return refName.startsWith("origin/") ? refName.slice("origin/".length) : refName;
}

async function resolveExistingRef(repoPath: string, candidates: Array<string | undefined | null>) {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const result = await execa("git", ["-C", repoPath, "rev-parse", "--verify", `${candidate}^{commit}`], {
      reject: false
    });
    if (result.exitCode === 0) {
      return candidate;
    }
  }
  return null;
}
