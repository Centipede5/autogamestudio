import { execa } from "execa";
import type { ProviderRunInput, ProviderRunResult } from "../types.js";

export interface ProviderAdapter {
  readonly name: string;
  run(input: ProviderRunInput): Promise<ProviderRunResult>;
}

export async function runCommandTemplate(input: ProviderRunInput) {
  const command = input.commandTemplate
    .replaceAll("{worktree}", input.worktreePath)
    .replaceAll("{prompt}", input.prompt.replaceAll('"', '\\"'));

  const result = await execa(command, {
    cwd: input.cwd,
    shell: true,
    input: input.commandTemplate.includes("{prompt}") ? undefined : input.prompt,
    reject: false,
    env: {
      FORCE_COLOR: "0"
    }
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode ?? 0
  };
}
