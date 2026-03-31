import { z } from "zod";
import { DEFAULT_EXPLORATION_LAMBDA } from "./selection.js";

export const providerSchema = z.enum(["codex", "claude", "gemini"]);
export type ProviderName = z.infer<typeof providerSchema>;
export const parentSelectionModeSchema = z.enum(["auto", "fixed"]);
export type ParentSelectionMode = z.infer<typeof parentSelectionModeSchema>;

export const configSchema = z.object({
  repoPath: z.string().min(1),
  provider: providerSchema,
  providerCommandTemplate: z.string().min(1),
  callsign: z.string().regex(/^[a-z0-9]{1,10}$/),
  explorationLambda: z.number().nonnegative().finite().default(DEFAULT_EXPLORATION_LAMBDA),
  parentSelectionMode: parentSelectionModeSchema.default("auto"),
  fixedParentRef: z.string().trim().min(1).optional(),
  autoPr: z.boolean(),
  dangerousPublicFeedback: z.boolean(),
  websiteBaseUrl: z.string().url(),
  publicWebsiteBaseUrl: z.string().url(),
  validationCommands: z.array(z.string()).default([]),
  githubRepo: z.string().optional()
});
export type RepoConfig = z.infer<typeof configSchema>;

export const iterationRecordSchema = z.object({
  startedAt: z.string(),
  completedAt: z.string().optional(),
  parentBranch: z.string(),
  parentCommitSha: z.string(),
  childBranch: z.string(),
  worktreePath: z.string(),
  status: z.enum(["running", "success", "failed"]),
  provider: providerSchema,
  failureMessage: z.string().optional()
});
export type IterationRecord = z.infer<typeof iterationRecordSchema>;

export const stateSchema = z.object({
  iterations: z.array(iterationRecordSchema).default([]),
  lastParentBranch: z.string().optional(),
  lastParentCommitSha: z.string().optional(),
  lastChildBranch: z.string().optional(),
  status: z.enum(["idle", "running", "paused", "failed"]).default("idle"),
  worktreePath: z.string().optional()
});
export type RepoState = z.infer<typeof stateSchema>;

export type VersionSummary = {
  commitSha: string;
  shortSha?: string;
  branchName?: string | null;
  primaryBranch?: string | null;
  branchLabels?: string[];
  currentElo?: number;
  matches?: number;
};

export type CommitContext = {
  version: {
    commitSha: string;
    shortSha?: string;
    branchName?: string | null;
    primaryBranch?: string | null;
    currentElo?: number;
    matches?: number;
  };
  summary?: Record<string, unknown>;
  feedbackEntries?: unknown[];
  errorSummary?: unknown[];
  recentComparisons?: unknown[];
  contextMarkdown?: string;
};

export type SelectedParent = {
  branchName: string;
  commitSha: string;
  baseBranchName?: string;
};

export type BranchRefInfo = {
  name: string;
  headCommitSha: string;
  parentCommitSha: string | null;
};

export type ProviderRunInput = {
  prompt: string;
  cwd: string;
  worktreePath: string;
  commandTemplate: string;
};

export type ProviderRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};
