import { encodeAbiParameters, concat } from "viem";
import { program } from "../cli";
import {
  getClient,
  getWalletClient,
  ARACHNID,
  ARACHNID_CODE,
  BYTECODE,
  SALT,
} from "./utils";
import { parseChain, getRpcUrl, getRootChainId } from "./chains";

export async function plant(chainName: string) {
  const opts = program.opts();
  const root = opts.root as string;
  const rootChainId = getRootChainId(opts.mainnet);
  const chain = parseChain(chainName);
  const rpcUrl = getRpcUrl(chain);

  const client = getClient(rpcUrl);
  const arachnidCode = await client.getCode({ address: ARACHNID });
  if (!arachnidCode || arachnidCode !== ARACHNID_CODE) {
    console.error("Error: Arachnid deployer not deployed on this chain");
    process.exit(1);
  }

  const constructorArgs = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [root as `0x${string}`, rootChainId],
  );
  const deployData = concat([SALT, BYTECODE, constructorArgs]);

  if (process.env["PRIVATE_KEY"]) {
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
}
