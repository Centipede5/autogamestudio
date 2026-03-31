import fs from "node:fs/promises";
import path from "node:path";
import { configSchema, type ProviderName, type RepoConfig } from "./types.js";
import { getPackageRoot } from "./internal/package-root.js";

export const DEFAULT_LOCAL_REPO = "https://github.com/Centipede5/autogamestudio-games";
export const DEFAULT_REMOTE_REPO = "https://github.com/Centipede5/autogamestudio-games";
export const DEFAULT_WEBSITE_URL = "http://localhost:3000";
export const DEFAULT_PUBLIC_WEBSITE_URL = "https://autogamestudio.ai";

const PROVIDER_COMMAND_TEMPLATES: Record<ProviderName, string> = {
  codex: 'codex exec --json -C "{worktree}" -s workspace-write -',
  claude: 'claude -p --permission-mode dontAsk "{prompt}"',
  gemini: 'gemini -p "{prompt}"'
};

export function getProviderCommandTemplate(provider: ProviderName) {
  return PROVIDER_COMMAND_TEMPLATES[provider];
}

export function getRuntimeDir(repoPath: string) {
  return path.join(repoPath, ".autogamestudio");
}

export function getConfigPath(repoPath: string) {
  return path.join(getRuntimeDir(repoPath), "config.json");
}

export function getStatePath(repoPath: string) {
  return path.join(getRuntimeDir(repoPath), "state.json");
}

export async function loadRepoConfig(repoPath: string) {
  const configPath = getConfigPath(repoPath);
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return configSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveRepoConfig(config: RepoConfig) {
  const configPath = getConfigPath(config.repoPath);
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(configSchema.parse(config), null, 2)}\n`, "utf8");
}

export async function ensureRepoRuntimeFiles(repoPath: string) {
  const runtimeDir = getRuntimeDir(repoPath);
  const packageRoot = getPackageRoot();

  await ensureRuntimeDirIgnored(repoPath);
  await fs.mkdir(path.join(runtimeDir, "prompts"), { recursive: true });
  await fs.mkdir(path.join(runtimeDir, "guardrails"), { recursive: true });
  await fs.mkdir(path.join(runtimeDir, "worktrees"), { recursive: true });

  for (const filename of ["agent.md"]) {
    await copyIfMissing(path.join(packageRoot, "prompts", filename), path.join(runtimeDir, "prompts", filename));
  }

  for (const filename of ["forbidden-paths.json", "sanitization-rules.json", "branching-rules.json", "schemas.json"]) {
    await copyIfMissing(path.join(packageRoot, "guardrails", filename), path.join(runtimeDir, "guardrails", filename));
  }
}

async function ensureRuntimeDirIgnored(repoPath: string) {
  const gitignorePath = path.join(repoPath, ".gitignore");
  const desiredEntry = ".autogamestudio/";

  let existing = "";
  try {
    existing = await fs.readFile(gitignorePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const lines = existing
    .split(/\r?\n/)
    .map((line) => line.trim());
  const alreadyIgnored = lines.includes(desiredEntry) || lines.includes("/.autogamestudio/");
  if (alreadyIgnored) {
    return;
  }

  const nextContent = existing
    ? `${existing.replace(/\s*$/, "")}\n${desiredEntry}\n`
    : `${desiredEntry}\n`;
  await fs.writeFile(gitignorePath, nextContent, "utf8");
}

async function copyIfMissing(sourcePath: string, destinationPath: string) {
  try {
    await fs.access(destinationPath);
  } catch {
    await fs.copyFile(sourcePath, destinationPath);
  }
}
