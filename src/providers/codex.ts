import { getProviderCommandTemplate } from "../config.js";
import type { ProviderRunInput } from "../types.js";
import { runCommandTemplate, type ProviderAdapter } from "./base.js";

export function extractFinalCodexMessage(stdout: string) {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let lastMessage = "";
  for (const line of lines) {
    try {
      const payload = JSON.parse(line) as {
        type?: string;
        item?: {
          type?: string;
          text?: string;
        };
      };
      if (payload.type === "item.completed" && payload.item?.type === "agent_message" && payload.item.text) {
        lastMessage = payload.item.text;
      }
    } catch {
      return stdout;
    }
  }

  return lastMessage || stdout;
}

export class CodexProvider implements ProviderAdapter {
  readonly name = "codex";

  async run(input: ProviderRunInput) {
    const result = await runCommandTemplate({
      ...input,
      commandTemplate: input.commandTemplate || getProviderCommandTemplate("codex")
    });
    return {
      ...result,
      stdout: extractFinalCodexMessage(result.stdout)
    };
  }
}
