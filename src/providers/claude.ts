import { getProviderCommandTemplate } from "../config.js";
import type { ProviderRunInput } from "../types.js";
import { runCommandTemplate, type ProviderAdapter } from "./base.js";

export class ClaudeProvider implements ProviderAdapter {
  readonly name = "claude";

  async run(input: ProviderRunInput) {
    return runCommandTemplate({
      ...input,
      commandTemplate: input.commandTemplate || getProviderCommandTemplate("claude")
    });
  }
}

