import path from "node:path";

export function normalizeAbsolutePath(targetPath: string) {
  return path.resolve(targetPath);
}

export function ensureWithinDirectory(baseDir: string, targetPath: string) {
  const normalizedBase = normalizeAbsolutePath(baseDir);
  const normalizedTarget = normalizeAbsolutePath(targetPath);
  const relative = path.relative(normalizedBase, normalizedTarget);

  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return normalizedTarget;
  }

  throw new Error(`Path escapes workspace: ${targetPath}`);
}

export function isLikelyGitHubUrl(value: string) {
  return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/i.test(value.trim());
}

