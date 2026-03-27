import { getTendrilAddress } from "./utils";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: bun predict <root_address> <root_chain_id>");
  process.exit(1);
}

const root = args[0] as `0x${string}`;
const rootChainId = BigInt(args[1]);

console.log(getTendrilAddress(root, rootChainId));
