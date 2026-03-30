import { encodeAbiParameters, concat } from "viem";
import { program } from "../cli";
import {
  getClient,
  getWalletClient,
  getTendrilAddress,
  ARACHNID,
  ARACHNID_CODE,
  BYTECODE,
  getPlantSeed,
  getRoot,
} from "./utils";
import {
  CHAINS,
  ChainType,
  parseChain,
  getRootChainId,
  type TendrilChain,
} from "./chains";
import { printContext, verbose, success, error, info, c } from "./logger";
import { executeRaw } from "./execute";

export async function plant(
  chainName: string | undefined,
  opts: { direct?: boolean; all?: boolean; testnet?: boolean },
) {
  if (!chainName && !opts.all) {
    error("Provide a <chain> argument or use --all");
    process.exit(1);
  }
  let chain = parseChain(
    chainName ? chainName : opts.testnet ? "sepolia" : "mainnet",
  );
  printContext(chain);

  if (opts.all) {
    await plantAll(chain, opts);
  } else {
    await plantOne(chain, opts);
  }
}

async function plantAll(
  rootChain: TendrilChain,
  opts: { direct?: boolean; testnet?: boolean },
) {
  const rootId = BigInt(rootChain.id);

  // Plant root first if needed
  const rootAddress = getTendrilAddress(rootChain);
  const rootClient = getClient(rootChain.rpc);
  const rootCode = await rootClient.getCode({ address: rootAddress });

  if (!rootCode || rootCode === "0x") {
    info(`Planting root tendril on ${rootChain.name} first...`);
    await plantOne(rootChain, { direct: true });

    if (!opts.direct) {
      await confirmDeployment(rootChain);
    }
  } else {
    console.log(
      `  ${rootChain.name.padEnd(16)} ${c.dimText("already planted")}`,
    );
  }

  // Plant L2s
  const l2Chains = Object.entries(CHAINS).filter(([_, chain]) => {
    if (chain.type === ChainType.ROOT) return false;
    return getRootChainId(chain) === rootId;
  });

  for (const [name, chain] of l2Chains) {
    const tendrilAddress = getTendrilAddress(chain);
    const client = getClient(chain.rpc);
    const existingCode = await client.getCode({ address: tendrilAddress });

    if (existingCode && existingCode !== "0x") {
      console.log(`  ${name.padEnd(16)} ${c.dimText("already planted")}`);
      continue;
    }

    try {
      await plantOne(chain, opts);
      console.log(`  ${name.padEnd(16)} ${c.accent("planted")}`);
    } catch (e) {
      console.log(`  ${name.padEnd(16)} ${c.dimText("failed")}`);
      verbose("Error:", e);
    }
  }
  console.log();
}

async function confirmDeployment(chain: TendrilChain) {
  // Wait for root to be on-chain
  info("Waiting for tendril to be deployed...");
  const client = getClient(chain.rpc);
  let deployed = false;
  for (let i = 0; i < 60; i++) {
    const code = await client.getCode({ address: getTendrilAddress(chain) });
    if (code && code !== "0x") {
      deployed = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!deployed) {
    error("Tendril not detected after 5 minutes. Aborting.");
    process.exit(1);
  }
  success(`Tendril deployed on ${chain.name}`);
}

async function plantOne(chain: TendrilChain, opts: { direct?: boolean }) {
  const client = getClient(chain.rpc);

  const tendrilAddress = getTendrilAddress(chain);
  const existingCode = await client.getCode({ address: tendrilAddress });
  if (existingCode && existingCode !== "0x") {
    error(`Tendril already deployed at ${tendrilAddress} on ${chain.name}`);
    process.exit(1);
  }
  verbose("No existing deployment at", tendrilAddress);

  const arachnidCode = await client.getCode({ address: ARACHNID });
  if (!arachnidCode || arachnidCode !== ARACHNID_CODE) {
    error("Arachnid deployer not deployed on this chain");
    process.exit(1);
  }
  verbose("Arachnid deployer verified");

  const constructorArgs = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [getRoot(), getRootChainId(chain)],
  );
  const deployData = concat([getPlantSeed(), BYTECODE, constructorArgs]);

  if (opts.direct || chain.type === ChainType.ROOT) {
    info("Planting new tendril directly");
    if (program.opts().sim) {
      const result = await client.call({
        to: ARACHNID,
        data: deployData,
      });
      success("Simulation passed");
      verbose("Result:", result);
    } else {
      const wallet = await getWalletClient(chain.rpc);
      verbose("Deployer:", wallet.account!.address);
      const result = await wallet.sendTransaction({
        chain: { id: chain.id } as any,
        to: ARACHNID,
        data: deployData,
      });
      success("Transaction sent:", result);
    }
  } else {
    info("Planting new tendril from root");
    await executeRaw({
      chain,
      toAddress: ARACHNID,
      rawData: deployData,
      gasLimit: BigInt(2_000_000),
    });
  }
}
