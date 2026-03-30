import type { BranchRefInfo } from "../types.js";
import { sanitizeBranchRoot } from "./sanitize.js";

const VERSIONED_BRANCH_PATTERN = /^(?<root>[a-z0-9-]+)-v(?<depth>\d+)\.(?<width>\d+)-(?<callsign>[a-z0-9]{1,10})$/;

export function parseVersionedBranchName(branchName: string) {
  const match = VERSIONED_BRANCH_PATTERN.exec(branchName);
  if (!match?.groups) {
    return null;
  }

  return {
    root: match.groups.root,
    depth: Number(match.groups.depth),
    width: Number(match.groups.width),
    callsign: match.groups.callsign
  };
}

export function calculateNextWidth(parentCommitSha: string, branchRefs: BranchRefInfo[]) {
  const siblingCount = branchRefs.filter((branchRef) => branchRef.parentCommitSha === parentCommitSha).length;
  return siblingCount + 1;
}

export function createChildBranchName(params: {
  parentBranchName: string;
  parentCommitSha: string;
  callsign: string;
  branchRefs: BranchRefInfo[];
}) {
  const parsed = parseVersionedBranchName(params.parentBranchName);
  const root = parsed?.root ?? sanitizeBranchRoot(params.parentBranchName);
  const depth = parsed ? parsed.depth + 1 : 2;
  const width = calculateNextWidth(params.parentCommitSha, params.branchRefs);

  return `${root}-v${depth}.${width}-${params.callsign}`;
}

export function isAutoSelectableBranch(branchName: string) {
  return !branchName.toLowerCase().includes("main");
}

