#!/usr/bin/env node

import { Command } from "commander";
import process from "node:process";
import { runCommand } from "./commands/run.js";
import { renderBanner, renderDangerNotice } from "./ui/banner.js";
import { error } from "./ui/logger.js";
import { confirmDangerousExecution } from "./ui/prompts.js";

const program = new Command();

program
  .name("autogamestudio")
  .description("CLI for running recursive game-improvement agents against AutoGameStudio-compatible repos.")
  .option("--repo <pathOrUrl>", "game repository path or GitHub URL")
  .option("--provider <provider>", "provider preset to use")
  .option("--callsign <callsign>", "operator callsign")
  .option("--auto-pr", "enable auto-PR")
  .option("--dangerous-public-feedback", "allow fallback to public site feedback")
  .option("--website-base-url <url>", "website base URL for context and rescan requests")
  .option("--once", "run exactly one iteration")
  .action(async (options) => {
    console.log(renderBanner());
    console.log(renderDangerNotice());
    const confirmed = await confirmDangerousExecution();
    if (!confirmed) {
      process.exit(0);
    }
    await runCommand(options);
  });

program.parseAsync(process.argv).catch((caughtError) => {
  const message = caughtError instanceof Error ? caughtError.message : "Unexpected CLI error.";
  error(message);
  process.exit(1);
});
