import { getTendrilAddress } from "./utils";
import { parseChain } from "./chains";
import { printContext, highlight } from "./logger";

export function address(opts: { testnet?: boolean }) {
  const chainName = opts.testnet ? "sepolia" : "mainnet";
  const chain = parseChain(chainName);
  printContext(chain);
  console.log(highlight(getTendrilAddress(chain)));
}
