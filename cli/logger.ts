import { program } from "../cli";
import { getRootChainId, type TendrilChain } from "./chains";
import { getPlantSeed, ZERO_SEED } from "./utils";

// Tendril palette — RGB escape sequences
const rgb = (r: number, g: number, b: number) => (s: string) =>
  `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`;

export const c = {
  accent: rgb(93, 202, 165), // #5DCAA5 — primary teal-green
  deepGreen: rgb(29, 158, 117), // #1D9E75 — secondary accent
  darkGreen: rgb(15, 110, 86), // #0F6E56 — muted elements
  foreground: rgb(232, 230, 222), // #e8e6de — primary text
  muted: rgb(136, 135, 128), // #888780 — secondary text
  dimText: rgb(95, 94, 90), // #5f5e5a — tertiary text
  blue: rgb(59, 139, 212), // #3B8BD4 — info/network
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

export function printContext(chain: TendrilChain) {
  const opts = program.opts();
  const root = opts.root || c.accent("(not set)");
  const network =
    getRootChainId(chain) === BigInt(1)
      ? c.bold(c.foreground("mainnet (1)"))
      : c.blue("sepolia (11155111)");
  console.log(c.darkGreen("───────────────────────────────────────"));
  console.log(`  ${c.muted("Root:")}  ${root}`);
  if (getPlantSeed() !== ZERO_SEED) {
    const seed = getPlantSeed();
    console.log(
      `   ${c.muted("└")} ${c.muted("Seed:")} ${seed.slice(0, 6)}...${seed.slice(-4)}`,
    );
  }
  console.log(`  ${c.muted("Network:")} ${network}`);
  console.log(c.darkGreen("───────────────────────────────────────"));
  console.log();
}

export function verbose(...args: unknown[]) {
  if (program.opts().verbose) {
    console.log(c.dimText("[verbose]"), ...args);
  }
}

export function info(...args: unknown[]) {
  console.log(c.foreground(args.map(String).join(" ")));
}

export function success(...args: unknown[]) {
  console.log(c.bold(c.accent("+")), ...args);
}

export function error(...args: unknown[]) {
  console.error(c.bold(c.foreground("Error:")), ...args);
}

export function highlight(s: string) {
  return c.accent(s);
}
