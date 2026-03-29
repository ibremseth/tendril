import { encodeAbiParameters, concat } from "viem";
import { program } from "../cli";
import {
  getClient,
  getWalletClient,
  getTendrilAddress,
  ARACHNID,
  ARACHNID_CODE,
  BYTECODE,
  SALT,
  getRoot,
} from "./utils";
import { parseChain, getRootChainId, ChainType } from "./chains";
import { printContext, verbose, success, error, info } from "./logger";
import { executeRaw } from "./execute";

export async function plant(chainName: string, opts: { direct?: boolean }) {
  const chain = parseChain(chainName);
  printContext(chain);
  const client = getClient(chain.rpc);

  const tendrilAddress = getTendrilAddress(chain);
  const existingCode = await client.getCode({ address: tendrilAddress });
  if (existingCode && existingCode !== "0x") {
    error(`Tendril already deployed at ${tendrilAddress} on ${chainName}`);
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
  const deployData = concat([SALT, BYTECODE, constructorArgs]);

  if (opts.direct || chain.type === ChainType.ROOT) {
    info("Planting new tendril directly");
    if (program.opts().sim) {
      const client = getClient(chain.rpc);
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
