import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import forbiddenPaths from "../../guardrails/forbidden-paths.json" with { type: "json" };
import { ensureWithinDirectory } from "../guardrails/paths.js";
import type { RepoConfig } from "../types.js";
import { getChangedFiles } from "../git/repo.js";

const MAX_BINARY_BYTES = 5 * 1024 * 1024;

export async function validateRepoOutput(params: {
  repoPath: string;
  baseCommitSha: string;
  config: RepoConfig;
}) {
  const changedFiles = await getChangedFiles(params.repoPath, params.baseCommitSha);
  if (changedFiles.length === 0) {
    throw new Error("The coding agent did not modify any tracked files.");
  }

  await ensurePlanFileExists(params.repoPath);
  await ensurePlayableIndex(params.repoPath);
  await ensureChangedFilesAreAllowed(params.repoPath, changedFiles);
  await ensureAssetReferencesExist(params.repoPath);
  await ensureFileSizeLimits(params.repoPath, changedFiles);
  await runValidationCommands(params.repoPath, params.config.validationCommands);

  return changedFiles;
}

async function ensurePlanFileExists(repoPath: string) {
  await fs.access(path.join(repoPath, ".autogamestudio", "plan.md"));
}

async function ensurePlayableIndex(repoPath: string) {
  await fs.access(path.join(repoPath, "index.html"));
}

async function ensureChangedFilesAreAllowed(repoPath: string, changedFiles: string[]) {
  for (const relativePath of changedFiles) {
    const absolutePath = ensureWithinDirectory(repoPath, path.join(repoPath, relativePath));
    const normalizedRelative = path.relative(repoPath, absolutePath).replaceAll("\\", "/");
    for (const forbiddenPath of forbiddenPaths) {
      if (normalizedRelative === forbiddenPath || normalizedRelative.startsWith(`${forbiddenPath}/`)) {
        throw new Error(`Forbidden path was modified: ${normalizedRelative}`);
      }
    }
  }
}

async function ensureAssetReferencesExist(repoPath: string) {
  const html = await fs.readFile(path.join(repoPath, "index.html"), "utf8");
  const matches = html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi);

  for (const match of matches) {
    const assetPath = match[1];
    if (!assetPath || assetPath.startsWith("http://") || assetPath.startsWith("https://") || assetPath.startsWith("#")) {
      continue;
    }
    if (assetPath.startsWith("data:")) {
      continue;
    }
    const cleanedPath = assetPath.replace(/^\.\//, "").replace(/\?.*$/, "");
    if (!cleanedPath) {
      continue;
    }
    await fs.access(path.join(repoPath, cleanedPath));
  }
}

async function ensureFileSizeLimits(repoPath: string, changedFiles: string[]) {
  for (const relativePath of changedFiles) {
    const absolutePath = path.join(repoPath, relativePath);
    const stat = await fs.stat(absolutePath);
    if (stat.isFile() && stat.size > MAX_BINARY_BYTES) {
      throw new Error(`Changed file exceeds size limit: ${relativePath}`);
    }
  }
}

async function runValidationCommands(repoPath: string, commands: string[]) {
  for (const command of commands) {
    const result = await execa(command, {
      cwd: repoPath,
      shell: true,
      reject: false
    });
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Validation command failed: ${command}`);
    }
  }
}
