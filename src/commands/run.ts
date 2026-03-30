import fs from "node:fs/promises";
import path from "node:path";
import { intro, outro } from "@clack/prompts";
import {
  DEFAULT_LOCAL_REPO,
  DEFAULT_PUBLIC_WEBSITE_URL,
  DEFAULT_WEBSITE_URL,
  ensureRepoRuntimeFiles,
  getProviderCommandTemplate,
  loadRepoConfig,
  saveRepoConfig
} from "../config.js";
import { createPullRequest } from "../github.js";
import {
  assertGitRepo,
  assertProviderCommandAvailable,
  buildSelectedParent,
  cloneRepoIfNeeded,
  commitAllChanges,
  createIsolatedWorktree,
  getBranchRefs,
  getLocalBranchNames,
  getOriginUrl,
  parseGitHubRepoFromRemote,
  pushBranch
} from "../git/repo.js";
import { createChildBranchName, isAutoSelectableBranch } from "../guardrails/branching.js";
import { renderTemplate, sanitizePromptValue } from "../guardrails/sanitize.js";
import { buildCommitMessage, buildPrBody, buildPrTitle } from "../metadata.js";
import { syncPlanFileToRepoRuntime } from "../plan-file.js";
import { getProviderAdapter } from "../providers/index.js";
import { loadRepoState, saveRepoState } from "../state.js";
import type { IterationRecord, RepoConfig } from "../types.js";
import { createSpinner, info, success, warn } from "../ui/logger.js";
import { promptForFailureAction, promptForManualBranch, promptForSetup } from "../ui/prompts.js";
import { validateRepoOutput } from "../validation/repo.js";
import { WebsiteClient } from "../website/client.js";

type RunOptions = {
  repo?: string;
  provider?: "codex" | "claude" | "gemini";
  callsign?: string;
  autoPr?: boolean;
  dangerousPublicFeedback?: boolean;
  websiteBaseUrl?: string;
  once?: boolean;
};

export async function runCommand(options: RunOptions) {
  intro("autogamestudio");

  const initialRepoInput = options.repo ?? DEFAULT_LOCAL_REPO;
  const existingConfig = await loadRepoConfig(initialRepoInput).catch(() => null);
  const setup = await promptForSetup(initialRepoInput, {
    provider: options.provider ?? existingConfig?.provider,
    callsign: options.callsign ?? existingConfig?.callsign,
    autoPr: options.autoPr ?? existingConfig?.autoPr,
    dangerousPublicFeedback: options.dangerousPublicFeedback ?? existingConfig?.dangerousPublicFeedback,
    runMode: options.once ? "once" : "continuous"
  });

  info("configuring autogamestudio....");
  const spinner = createSpinner("Preparing repository and runtime config");

  const repoPath = await cloneRepoIfNeeded(setup.repoInput, setup.suggestedClonePath);
  await assertGitRepo(repoPath);
  await ensureRepoRuntimeFiles(repoPath);

  const runtimeConfig: RepoConfig = {
    repoPath,
    provider: setup.provider,
    providerCommandTemplate: getProviderCommandTemplate(setup.provider),
    callsign: setup.callsign,
    autoPr: setup.autoPr,
    dangerousPublicFeedback: setup.dangerousPublicFeedback,
    websiteBaseUrl: options.websiteBaseUrl ?? existingConfig?.websiteBaseUrl ?? DEFAULT_WEBSITE_URL,
    publicWebsiteBaseUrl: existingConfig?.publicWebsiteBaseUrl ?? DEFAULT_PUBLIC_WEBSITE_URL,
    validationCommands: existingConfig?.validationCommands ?? [],
    githubRepo: existingConfig?.githubRepo
  };

  await assertProviderCommandAvailable(runtimeConfig.providerCommandTemplate);
  if (runtimeConfig.autoPr && !process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is required when auto-PR is enabled.");
  }

  if (!runtimeConfig.githubRepo) {
    const remoteUrl = await getOriginUrl(repoPath);
    runtimeConfig.githubRepo = parseGitHubRepoFromRemote(remoteUrl) ?? undefined;
  }

  await saveRepoConfig(runtimeConfig);
  spinner.succeed("Configuration saved.");

  info("running agent studio...");
  const websiteClient = new WebsiteClient({
    websiteBaseUrl: runtimeConfig.websiteBaseUrl,
    publicWebsiteBaseUrl: runtimeConfig.publicWebsiteBaseUrl,
    dangerousPublicFeedback: runtimeConfig.dangerousPublicFeedback
  });
  const runOnce = options.once || setup.runMode === "once";

  let keepRunning = true;
  while (keepRunning) {
    let retryCurrent = false;
    do {
      retryCurrent = false;
      try {
        await runSingleIteration(runtimeConfig, websiteClient);
        if (runOnce) {
          keepRunning = false;
        }
      } catch (error) {
        warn(error instanceof Error ? error.message : "Iteration failed.");
        const nextAction = await promptForFailureAction();
        if (nextAction === "retry") {
          retryCurrent = true;
        } else if (nextAction === "exit") {
          keepRunning = false;
        }
      }
    } while (retryCurrent && keepRunning);
  }

  outro("AutoGameStudio stopped.");
}

async function runSingleIteration(config: RepoConfig, websiteClient: WebsiteClient) {
  const state = await loadRepoState(config.repoPath);
  const selectedParent = await selectParent(config.repoPath, websiteClient);
  const branchRefs = await getBranchRefs(config.repoPath);
  const childBranchName = createChildBranchName({
    parentBranchName: selectedParent.branchName,
    parentCommitSha: selectedParent.commitSha,
    callsign: config.callsign,
    branchRefs
  });
  const worktreePath = path.join(config.repoPath, ".autogamestudio", "worktrees", childBranchName);

  const iteration: IterationRecord = {
    startedAt: new Date().toISOString(),
    parentBranch: selectedParent.branchName,
    parentCommitSha: selectedParent.commitSha,
    childBranch: childBranchName,
    worktreePath,
    status: "running",
    provider: config.provider
  };
  state.iterations.push(iteration);
  state.lastParentBranch = selectedParent.branchName;
  state.lastParentCommitSha = selectedParent.commitSha;
  state.lastChildBranch = childBranchName;
  state.status = "running";
  state.worktreePath = worktreePath;
  await saveRepoState(config.repoPath, state);

  try {
    const setupSpinner = createSpinner(`Creating worktree ${childBranchName}`);
    await createIsolatedWorktree({
      repoPath: config.repoPath,
      worktreePath,
      newBranchName: childBranchName,
      parentBranchName: selectedParent.branchName
    });
    setupSpinner.succeed(`Worktree created at ${worktreePath}`);

    const contextSpinner = createSpinner(`Loading context for ${selectedParent.branchName}`);
    const commitContext = await websiteClient.getCommitContext(selectedParent.commitSha);
    contextSpinner.succeed(`Loaded commit context for ${selectedParent.commitSha.slice(0, 7)}`);

    const guardrails = await loadGuardrailContext(config.repoPath);
    const agentPrompt = await buildAgentPrompt({
      repoPath: config.repoPath,
      parentBranch: selectedParent.branchName,
      parentCommitSha: selectedParent.commitSha,
      branchName: childBranchName,
      guardrails,
      contextJson: JSON.stringify(commitContext, null, 2)
    });

    const provider = getProviderAdapter(config.provider);
    const agentSpinner = createSpinner(`Running agent with ${config.provider}`);
    const agentResult = await provider.run({
      cwd: worktreePath,
      worktreePath,
      prompt: agentPrompt,
      commandTemplate: config.providerCommandTemplate
    });
    if (agentResult.exitCode !== 0) {
      throw new Error(agentResult.stderr || "Agent provider run failed.");
    }
    agentSpinner.succeed("Agent completed.");

    await syncPlanFileToRepoRuntime(config.repoPath, worktreePath);

    const validationSpinner = createSpinner("Validating repo output");
    const changedFiles = await validateRepoOutput({
      repoPath: worktreePath,
      baseCommitSha: selectedParent.commitSha,
      config
    });
    validationSpinner.succeed(`Validated ${changedFiles.length} changed file(s).`);

    const publishSpinner = createSpinner(`Committing and pushing ${childBranchName}`);
    await commitAllChanges(worktreePath, buildCommitMessage(selectedParent.branchName, childBranchName));
    await pushBranch(worktreePath, childBranchName);
    publishSpinner.succeed(`Pushed ${childBranchName}`);

    const rescanned = await websiteClient.triggerRescan();
    if (rescanned) {
      success("Triggered local website rescan.");
    } else {
      warn("Local website rescan was skipped or failed.");
    }

    if (config.autoPr) {
      if (!config.githubRepo) {
        throw new Error("Auto-PR is enabled, but GitHub repo could not be determined.");
      }
      const prSpinner = createSpinner("Creating pull request");
      const pullRequest = await createPullRequest({
        repo: config.githubRepo,
        title: buildPrTitle(selectedParent.branchName, childBranchName),
        body: buildPrBody({
          parentBranch: selectedParent.branchName,
          childBranch: childBranchName,
          parentCommitSha: selectedParent.commitSha,
          startedAt: iteration.startedAt
        }),
        head: childBranchName,
        base: selectedParent.branchName
      });
      prSpinner.succeed(`Pull request created${pullRequest.html_url ? `: ${pullRequest.html_url}` : ""}`);
    }

    iteration.status = "success";
    iteration.completedAt = new Date().toISOString();
    state.status = "idle";
    await saveRepoState(config.repoPath, state);
  } catch (error) {
    iteration.status = "failed";
    iteration.completedAt = new Date().toISOString();
    iteration.failureMessage = error instanceof Error ? error.message : "Unknown failure";
    state.status = "failed";
    await saveRepoState(config.repoPath, state);
    throw error;
  }
}

async function selectParent(repoPath: string, websiteClient: WebsiteClient) {
  try {
    return await websiteClient.getTopParentCandidate();
  } catch {
    const branches = (await getLocalBranchNames(repoPath)).filter(isAutoSelectableBranch);
    if (branches.length === 0) {
      throw new Error("No selectable local branches are available.");
    }
    const branchName = await promptForManualBranch(branches);
    return buildSelectedParent(repoPath, branchName);
  }
}

async function loadGuardrailContext(repoPath: string) {
  const runtimeDir = path.join(repoPath, ".autogamestudio", "guardrails");
  const filenames = ["forbidden-paths.json", "sanitization-rules.json", "branching-rules.json", "schemas.json"];
  const entries = await Promise.all(
    filenames.map(async (filename) => {
      const content = await fs.readFile(path.join(runtimeDir, filename), "utf8");
      return `# ${filename}\n${content}`;
    })
  );
  return entries.join("\n\n");
}

async function buildAgentPrompt(params: {
  repoPath: string;
  parentBranch: string;
  parentCommitSha: string;
  branchName: string;
  guardrails: string;
  contextJson: string;
}) {
  const template = await fs.readFile(path.join(params.repoPath, ".autogamestudio", "prompts", "agent.md"), "utf8");
  return renderTemplate(template, {
    parentBranch: sanitizePromptValue(params.parentBranch),
    parentCommitSha: sanitizePromptValue(params.parentCommitSha),
    branchName: sanitizePromptValue(params.branchName),
    guardrails: sanitizePromptValue(params.guardrails),
    contextJson: sanitizePromptValue(params.contextJson)
  });
}
