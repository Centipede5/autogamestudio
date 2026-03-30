import { getProviderCommandTemplate } from "../config.js";
import type { ProviderRunInput } from "../types.js";
import { runCommandTemplate, type ProviderAdapter } from "./base.js";

export class GeminiProvider implements ProviderAdapter {
  readonly name = "gemini";

  async run(input: ProviderRunInput) {
    return runCommandTemplate({
      ...input,
      commandTemplate: input.commandTemplate || getProviderCommandTemplate("gemini")
    });
  }
}

