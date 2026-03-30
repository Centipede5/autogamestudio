import fs from "node:fs/promises";
import path from "node:path";
import { getStatePath } from "./config.js";
import { type RepoState, stateSchema } from "./types.js";

export async function loadRepoState(repoPath: string): Promise<RepoState> {
  const statePath = getStatePath(repoPath);
  try {
    const raw = await fs.readFile(statePath, "utf8");
    return stateSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return stateSchema.parse({
        iterations: [],
        status: "idle"
      });
    }
    throw error;
  }
}

export async function saveRepoState(repoPath: string, state: RepoState) {
  const statePath = getStatePath(repoPath);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(stateSchema.parse(state), null, 2)}\n`, "utf8");
}
