import boxen from "boxen";
import chalk from "chalk";
import figlet from "figlet";

export function renderBanner() {
  return chalk.cyan(figlet.textSync("AutoGameStudio", { horizontalLayout: "fitted" }));
}

export function renderDangerNotice() {
  return boxen(
    [
      "This is inherently dangerous.",
      "AutoGameStudio involves agents modifying and running arbitrary code on your system.",
      "We have tried to limit obvious vulnerabilities, but we cannot guarantee safety."
    ].join("\n"),
    {
      borderColor: "red",
      padding: 1
    }
  );
}
