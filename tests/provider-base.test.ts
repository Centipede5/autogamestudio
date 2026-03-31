import { describe, expect, it } from "vitest";
import { getProviderCommandTemplate } from "../src/config.js";
import { runCommandTemplate } from "../src/providers/base.js";

describe("provider command execution", () => {
  it("sends the full prompt over stdin when the template does not include a prompt placeholder", async () => {
    const result = await runCommandTemplate({
      cwd: process.cwd(),
      worktreePath: process.cwd(),
      prompt: "plan from stdin",
      commandTemplate:
        'node -e "process.stdin.resume();process.stdin.setEncoding(\'utf8\');let data=\'\';process.stdin.on(\'data\', chunk => data += chunk);process.stdin.on(\'end\', () => process.stdout.write(data));"'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("plan from stdin");
  });

  it("keeps claude and gemini prompts off the command line", () => {
    expect(getProviderCommandTemplate("claude")).not.toContain("{prompt}");
    expect(getProviderCommandTemplate("gemini")).not.toContain("{prompt}");
  });
});
