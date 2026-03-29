import { encodeFunctionData, parseAbiItem, isAddress } from "viem";
import type { Hex, Address } from "viem";

import { getTendrilAddress } from "./utils";
import { parseChain } from "./chains";
import { printContext, verbose, error } from "./logger";
import { executeRaw } from "./execute";

const TENDRIL_DEPLOY_ABI = [
  {
    name: "deploy",
    type: "function",
    inputs: [
      { name: "salt", type: "bytes32" },
      { name: "impl", type: "address" },
      { name: "init", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export async function deploy(
  chainName: string,
  rawImpl: string,
  opts: { salt?: string; init?: string; initArgs?: string },
) {
  const chain = parseChain(chainName);
  printContext(chain);
  if (!isAddress(rawImpl)) {
    error(`Invalid implementation address: ${rawImpl}`);
    process.exit(1);
  }
  const impl: Address = rawImpl;
  const salt = (opts.salt || "0x" + "00".repeat(32)) as Hex;

  // Encode initializer calldata if provided
  let initData: Hex = "0x";
  if (opts.init) {
    const abiItem = parseAbiItem(`function ${opts.init}`);
    const initArgs = opts.initArgs ? opts.initArgs.split(",") : [];
    initData = encodeFunctionData({
      abi: [abiItem],
      args: initArgs.length > 0 ? initArgs : undefined,
    });
  }

  verbose("Chain:", chainName);
  verbose("Implementation:", impl);
  verbose("Salt:", salt);
  verbose("Init data:", initData);

  const deployCalldata = encodeFunctionData({
    abi: TENDRIL_DEPLOY_ABI,
    functionName: "deploy",
    args: [salt, impl, initData],
  });

  await executeRaw({
    chain,
    toAddress: getTendrilAddress(chain),
    rawData: deployCalldata,
  });
}
