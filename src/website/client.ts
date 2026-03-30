import type { CommitContext, SelectedParent, VersionSummary } from "../types.js";
import { isAutoSelectableBranch } from "../guardrails/branching.js";

type WebsiteClientOptions = {
  websiteBaseUrl: string;
  publicWebsiteBaseUrl: string;
  dangerousPublicFeedback: boolean;
};

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function normalizeVersions(payload: unknown): VersionSummary[] {
  if (Array.isArray(payload)) {
    return payload as VersionSummary[];
  }
  if (payload && typeof payload === "object") {
    for (const key of ["versions", "items", "data"]) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value as VersionSummary[];
      }
    }
  }
  throw new Error("Website returned an unexpected versions payload.");
}

export class WebsiteClient {
  constructor(private readonly options: WebsiteClientOptions) {}

  async getTopParentCandidate(): Promise<SelectedParent> {
    const payload = await fetchJson(`${this.options.websiteBaseUrl}/api/versions`);
    const versions = normalizeVersions(payload)
      .filter((version) => {
        const branchName = version.branchName || version.primaryBranch || "";
        const labels = version.branchLabels || [];
        return branchName && isAutoSelectableBranch(branchName) && !labels.some((label) => label.toLowerCase() === "main");
      })
      .sort((left, right) => {
        const rightElo = right.currentElo ?? 0;
        const leftElo = left.currentElo ?? 0;
        const matchDelta = (left.matches ?? 0) - (right.matches ?? 0);
        return rightElo - leftElo || matchDelta;
      });

    const best = versions[0];
    if (!best?.commitSha) {
      throw new Error("No eligible parent branch found from website context.");
    }

    return {
      branchName: best.branchName || best.primaryBranch || best.shortSha || best.commitSha,
      commitSha: best.commitSha
    };
  }

  async getCommitContext(commitSha: string): Promise<CommitContext> {
    try {
      return (await fetchJson(`${this.options.websiteBaseUrl}/api/context/${commitSha}?format=json`)) as CommitContext;
    } catch (error) {
      if (!this.options.dangerousPublicFeedback) {
        throw error;
      }
      return (await fetchJson(`${this.options.publicWebsiteBaseUrl}/api/context/${commitSha}?format=json`)) as CommitContext;
    }
  }

  async triggerRescan() {
    try {
      const response = await fetch(`${this.options.websiteBaseUrl}/api/admin/rescan`, {
        method: "POST"
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
