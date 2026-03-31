import os from "node:os";
import { cancel, confirm, group, isCancel, select, text } from "@clack/prompts";
import { type ParentSelectionMode, type ProviderName } from "../types.js";
import { isLikelyGitHubUrl } from "../guardrails/paths.js";
import { sanitizeCallsign } from "../guardrails/sanitize.js";
import { DEFAULT_EXPLORATION_LAMBDA, EXPLORATION_PRESETS } from "../selection.js";

function assertPromptResult<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Cancelled.");
    process.exit(1);
  }
  return value;
}

export async function confirmDangerousExecution() {
  const result = await confirm({
    message: "Do you want to continue?"
  });
  return assertPromptResult(result);
}

export async function promptForSetup(defaultRepo: string, defaults?: Partial<{
  provider: ProviderName;
  callsign: string;
  explorationLambda: number;
  parentSelectionMode: ParentSelectionMode;
  fixedParentRef: string;
  autoPr: boolean;
  dangerousPublicFeedback: boolean;
  runMode: "once" | "continuous";
}>) {
  const answers = await group(
    {
      repoInput: () =>
        text({
          message: "Choose starting repository",
          initialValue: defaultRepo,
          validate(value) {
            const trimmed = value.trim();
            if (!trimmed) {
              return "Repository path or URL is required.";
            }
            if (trimmed.includes("://") && !isLikelyGitHubUrl(trimmed)) {
              return "Only GitHub repository URLs are supported.";
            }
            return;
          }
        }),
      provider: () =>
        select({
          message: "Choose provider",
          initialValue: defaults?.provider ?? "codex",
          options: [
            { label: "Codex", value: "codex" },
            { label: "Claude Code", value: "claude" },
            { label: "Gemini CLI", value: "gemini" }
          ]
        }),
      callsign: () =>
        text({
          message: "Choose a callsign (max 10 chars)",
          initialValue: defaults?.callsign ?? os.userInfo().username.slice(0, 10),
          validate(value) {
            try {
              sanitizeCallsign(value);
              return;
            } catch (error) {
              return error instanceof Error ? error.message : "Invalid callsign.";
            }
          }
        }),
      explorationLambda: () =>
        select({
          message: "Choose exploration level for parent selection",
          initialValue: defaults?.explorationLambda ?? DEFAULT_EXPLORATION_LAMBDA,
          options: EXPLORATION_PRESETS.map((preset) => ({
            label: `${preset.label} (lambda ${preset.value})`,
            value: preset.value,
            hint: preset.description
          }))
        }),
      parentSelectionMode: () =>
        select({
          message: "Choose parent selection mode",
          initialValue: defaults?.parentSelectionMode ?? "auto",
          options: [
            {
              label: "Auto-select parent",
              value: "auto",
              hint: "Sample from eligible evaluated branches using the exploration lambda."
            },
            {
              label: "Use one fixed parent",
              value: "fixed",
              hint: "Always branch from one branch or commit hash, such as 40201b3."
            }
          ]
        }),
      autoPr: () =>
        confirm({
          message: "Enable auto-PR?",
          initialValue: defaults?.autoPr ?? false
        }),
      dangerousPublicFeedback: () =>
        confirm({
          message: "[DANGEROUS] Use the secondary public feedback source if the primary website context is unavailable?",
          initialValue: defaults?.dangerousPublicFeedback ?? false
        }),
      runMode: () =>
        select({
          message: "Choose run mode",
          initialValue: defaults?.runMode ?? "continuous",
          options: [
            { label: "Run once", value: "once" },
            { label: "Run continuously", value: "continuous" }
          ]
        })
    },
    {
      onCancel() {
        cancel("Cancelled.");
        process.exit(1);
      }
    }
  );

  let fixedParentRef: string | undefined;
  if ((answers.parentSelectionMode as ParentSelectionMode) === "fixed") {
    fixedParentRef = assertPromptResult(
      await text({
        message: "Enter the fixed parent branch or commit hash",
        initialValue: defaults?.fixedParentRef ?? "",
        placeholder: "e.g. rhythm or 40201b3",
        validate(value) {
          if (!value.trim()) {
            return "A branch name or commit hash is required for fixed-parent mode.";
          }
          return;
        }
      })
    ).trim();
  }

  return {
    repoInput: answers.repoInput.trim(),
    provider: answers.provider as ProviderName,
    callsign: sanitizeCallsign(answers.callsign),
    explorationLambda: Number(answers.explorationLambda),
    parentSelectionMode: answers.parentSelectionMode as ParentSelectionMode,
    fixedParentRef,
    autoPr: Boolean(answers.autoPr),
    dangerousPublicFeedback: Boolean(answers.dangerousPublicFeedback),
    runMode: answers.runMode as "once" | "continuous",
    suggestedClonePath: `${os.homedir()}\\.autogamestudio\\repos`
  };
}

export async function promptForManualBranch(branches: string[]) {
  const choice = await select({
    message: "Local website context is unavailable. Choose a parent branch.",
    options: branches.map((branch) => ({ label: branch, value: branch }))
  });
  return assertPromptResult(choice);
}

export async function promptForFailureAction() {
  const choice = await select({
    message: "Iteration failed. Choose how to proceed.",
    options: [
      { label: "Continue", value: "continue" },
      { label: "Retry", value: "retry" },
      { label: "Exit", value: "exit" }
    ]
  });
  return assertPromptResult(choice) as "continue" | "retry" | "exit";
}
