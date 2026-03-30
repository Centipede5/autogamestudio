import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";

export async function makeTempDir(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function initGitRepo(repoPath: string) {
  await execa("git", ["-C", repoPath, "init", "--initial-branch=main"], { reject: false });
  await execa("git", ["-C", repoPath, "config", "user.email", "test@example.com"]);
  await execa("git", ["-C", repoPath, "config", "user.name", "Test User"]);
}

export async function writeRepoFile(repoPath: string, relativePath: string, content: string) {
  const filePath = path.join(repoPath, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

export async function commitAll(repoPath: string, message: string) {
  await execa("git", ["-C", repoPath, "add", "-A"]);
  await execa("git", ["-C", repoPath, "commit", "-m", message]);
}

export async function createBareRemote() {
  const remotePath = await makeTempDir("ags-remote-");
  await execa("git", ["init", "--bare", remotePath]);
  return remotePath;
}

