import { getClient, getTendrilAddress } from "./utils";
import { CHAINS, ChainType, getRootChainId, parseChain } from "./chains";
import { printContext, info, highlight, c } from "./logger";

export async function inspect(opts: { testnet?: boolean }) {
  const rootName = opts.testnet ? "sepolia" : "mainnet";
  const rootChain = parseChain(rootName);
  printContext(rootChain);

  const tendrilAddress = getTendrilAddress(rootChain);
  info(`Tendril: ${highlight(tendrilAddress)}\n`);

  const chains = Object.entries(CHAINS).filter(([_, chain]) => {
    if (chain.type === ChainType.ROOT) {
      return chain.id === rootChain.id;
    }
    return getRootChainId(chain) === BigInt(rootChain.id);
  });

  const results = await Promise.all(
    chains.map(async ([name, chain]) => {
      const client = getClient(chain.rpc);
      const code = await client.getCode({ address: tendrilAddress });
      const deployed = !!code && code !== "0x";
      return { name, deployed };
    }),
  );

  const root = results.find(({ name }) => name === rootName);
  const children = results.filter(({ name }) => name !== rootName);

  if (root) {
    const status = root.deployed
      ? c.accent("deployed")
      : c.dimText("not deployed");
    console.log(`  ${root.name.padEnd(16)} ${status}`);
  }
  for (const { name, deployed } of children) {
    const status = deployed ? c.accent("deployed") : c.dimText("not deployed");
    console.log(`    ${c.muted("└")} ${name.padEnd(14)} ${status}`);
  }
  console.log();
}
