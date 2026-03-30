export function buildCommitMessage(parentBranch: string, childBranch: string) {
  return `Iterate ${parentBranch} -> ${childBranch}`;
}

export function buildPrTitle(parentBranch: string, childBranch: string) {
  return `Iterate ${parentBranch} into ${childBranch}`;
}

export function buildPrBody(params: {
  parentBranch: string;
  childBranch: string;
  parentCommitSha: string;
  startedAt: string;
}) {
  return [
    `Parent branch: ${params.parentBranch}`,
    `Child branch: ${params.childBranch}`,
    `Parent commit: ${params.parentCommitSha}`,
    `Run started: ${params.startedAt}`,
    `Execution plan: .autogamestudio/plan.md`
  ].join("\n");
}
