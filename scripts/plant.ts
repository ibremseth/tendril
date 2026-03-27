import { encodeAbiParameters, concat } from "viem";
import type { Hex } from "viem";
import {
  CHAINS,
  parseChain,
  getRpcUrl,
  getClient,
  getWalletClient,
  ARACHNID,
  ARACHNID_CODE,
  BYTECODE,
  SALT,
} from "./utils";

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    `Usage: bun plant <chain> <root_address> <root_chain_id>\nChains: ${Object.keys(CHAINS).join(", ")}`,
  );
  process.exit(1);
}

const chain = parseChain(args[0] ?? "");
const rpcUrl = getRpcUrl(chain);
const ROOT = args[1] as `0x${string}`;
const ROOT_CHAIN_ID = BigInt(args[2] ?? "0");

const client = getClient(rpcUrl);
const arachnidCode = await client.getCode({ address: ARACHNID });
if (!arachnidCode || arachnidCode !== ARACHNID_CODE) {
  console.error("Error: Arachnid deployer not deployed on this chain");
  process.exit(1);
}

const constructorArgs = encodeAbiParameters(
  [{ type: "address" }, { type: "uint256" }],
  [ROOT, ROOT_CHAIN_ID],
);
const deployData = concat([SALT, BYTECODE, constructorArgs]);

const priv_key = process.env["PRIVATE_KEY"];
if (priv_key) {
  const wallet = getWalletClient(rpcUrl);
  console.log("Deployer:", wallet.account!.address);
  const result = await wallet.sendTransaction({
    chain: { id: chain.id } as any,
    to: ARACHNID,
    data: deployData,
  });
  console.log("Transaction result:", result);
} else {
  const result = await client.call({
    to: ARACHNID,
    data: deployData,
  });
  console.log("Simulation success:", result);
}
