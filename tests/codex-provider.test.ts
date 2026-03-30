import { describe, expect, it } from "vitest";
import { extractFinalCodexMessage } from "../src/providers/codex.js";

describe("codex adapter event handling", () => {
  it("extracts the final agent message from codex jsonl output", () => {
    const sample = [
      JSON.stringify({ type: "thread.started", thread_id: "123" }),
      JSON.stringify({
        type: "item.completed",
        item: {
          type: "agent_message",
          text: "intermediate"
        }
      }),
      JSON.stringify({
        type: "item.completed",
        item: {
          type: "agent_message",
          text: "Created .autogamestudio/plan.md and implemented the combat readability pass."
        }
      })
    ].join("\n");

    expect(extractFinalCodexMessage(sample)).toBe(
      "Created .autogamestudio/plan.md and implemented the combat readability pass."
    );
  });

  it("falls back to raw stdout when the stream is not jsonl", () => {
    expect(extractFinalCodexMessage("plain output")).toBe("plain output");
  });
});
