import chalk from "chalk";
import ora from "ora";

export function createSpinner(text: string) {
  return ora({
    text,
    color: "cyan"
  }).start();
}

export function info(message: string) {
  console.log(chalk.cyan(message));
}

export function warn(message: string) {
  console.log(chalk.yellow(message));
}

export function success(message: string) {
  console.log(chalk.green(message));
}

export function error(message: string) {
  console.error(chalk.red(message));
}

