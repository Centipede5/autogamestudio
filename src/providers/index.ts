import type { ProviderName } from "../types.js";
import { ClaudeProvider } from "./claude.js";
import { CodexProvider } from "./codex.js";
import { GeminiProvider } from "./gemini.js";

export function getProviderAdapter(provider: ProviderName) {
  switch (provider) {
    case "codex":
      return new CodexProvider();
    case "claude":
      return new ClaudeProvider();
    case "gemini":
      return new GeminiProvider();
  }
}

