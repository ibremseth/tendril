import { program } from "../cli";

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

export function printContext() {
  const opts = program.opts();
  const root = opts.root || yellow("(not set)");
  const network = opts.mainnet ? bold(green("mainnet (1)")) : cyan("sepolia (11155111)");
  console.log(dim("───────────────────────────────────────"));
  console.log(`  ${dim("Root:")}    ${root}`);
  console.log(`  ${dim("Network:")} ${network}`);
  console.log(dim("───────────────────────────────────────"));
  console.log();
}

export function verbose(...args: unknown[]) {
  if (program.opts().verbose) {
    console.log(dim("[verbose]"), ...args);
  }
}

export function info(...args: unknown[]) {
  console.log(...args);
}

export function success(...args: unknown[]) {
  console.log(bold(green("+")), ...args);
}

export function error(...args: unknown[]) {
  console.error(bold(red("Error:")), ...args);
}
