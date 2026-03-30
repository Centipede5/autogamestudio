import fs from "node:fs/promises";
import path from "node:path";
import { getRuntimeDir } from "./config.js";

export function getWorktreePlanPath(worktreePath: string) {
  return path.join(worktreePath, ".autogamestudio", "plan.md");
}

export function getRepoPlanPath(repoPath: string) {
  return path.join(getRuntimeDir(repoPath), "plan.md");
}

export async function syncPlanFileToRepoRuntime(repoPath: string, worktreePath: string) {
  const sourcePath = getWorktreePlanPath(worktreePath);
  const destinationPath = getRepoPlanPath(repoPath);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
  return destinationPath;
}
