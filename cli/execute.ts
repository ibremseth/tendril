import { encodeFunctionData, parseAbiItem, isAddress } from "viem";
import type { Hex, Address } from "viem";

import { program } from "../cli";
import { getClient, getWalletClient, getTendrilAddress } from "./utils";
import { parseChain, getRpcUrl, ChainType } from "./chains";
import type { TendrilChain } from "./chains";

const ARB_INBOX_ABI = [
  {
    name: "unsafeCreateRetryableTicket",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "l2CallValue", type: "uint256" },
      { name: "maxSubmissionCost", type: "uint256" },
      { name: "excessFeeRefundAddress", type: "address" },
      { name: "callValueRefundAddress", type: "address" },
      { name: "gasLimit", type: "uint256" },
      { name: "maxFeePerGas", type: "uint256" },
      { name: "tokenTotalFeeAmount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

const OPTIMISM_PORTAL_ABI = [
  {
    name: "depositTransaction",
    type: "function",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
      { name: "_gasLimit", type: "uint64" },
      { name: "_isCreation", type: "bool" },
      { name: "_data", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

const TENDRIL_EXECUTE_ABI = [
  {
    name: "execute",
    type: "function",
    inputs: [
      { name: "dest", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

export async function execute(
  chainName: string,
  rawToAddress: string,
  sig: string,
  args: string[],
) {
  if (!isAddress(rawToAddress)) {
    console.error(`Error: Invalid address: ${rawToAddress}`);
    process.exit(1);
  }
  const toAddress: Address = rawToAddress;
  const chain = parseChain(chainName);

  // Parse the function signature into an ABI item
  const abiItem = parseAbiItem(`function ${sig}`);

  // Encode the inner call (toAddress + sig + args)
  const innerCalldata = encodeFunctionData({
    abi: [abiItem],
    args: args.length > 0 ? args : undefined,
  });

  const tendrilAddress = getTendrilAddress();
  console.log("Tendril:", tendrilAddress);
  console.log("Target:", toAddress);
  console.log("Call:", sig, args.join(" "));

  // Encode the outer call to Tendril.execute(dest, data)
  const executeCalldata = encodeFunctionData({
    abi: TENDRIL_EXECUTE_ABI,
    functionName: "execute",
    args: [toAddress, innerCalldata],
  });

  let calldata = executeCalldata;
  let currentChain = chain;
  while (currentChain.parent != "") {
    const wrappedCall = wrap(currentChain, {
      toAddress: chain.bridge,
      value: BigInt(0),
      gasLimit: BigInt(0),
      data: calldata,
      refundAddress: tendrilAddress,
    });
    calldata = encodeFunctionData({
      abi: TENDRIL_EXECUTE_ABI,
      functionName: "execute",
      args: [toAddress, wrappedCall],
    });

    currentChain = parseChain(currentChain.parent);
  }

  console.log("Final calldata:", calldata);

  if (process.env["PRIVATE_KEY"]) {
    const wallet = getWalletClient(getRpcUrl(chain));
    console.log("Sender:", wallet.account!.address);
    const result = await wallet.sendTransaction({
      chain: { id: chain.id } as any,
      to: tendrilAddress,
      data: calldata,
    });
    console.log("Transaction:", result);
  } else {
    const client = getClient(getRpcUrl(chain));
    const result = await client.call({
      to: tendrilAddress,
      data: calldata,
    });
    console.log("Simulation success:", result);
  }
}

type WrapInput = {
  toAddress: Address;
  value: bigint;
  gasLimit: bigint;
  data: Hex;

  // Need for Arb
  refundAddress: Address;
};

function wrap(chain: TendrilChain, input: WrapInput) {
  switch (chain.type) {
    case ChainType.OP:
      return wrapOp(input);
    case ChainType.ARB:
      return wrapArb(input);
    default:
      throw Error(`Unwrappable chain: ${chain.type}`);
  }
}

function wrapOp({ toAddress, value, gasLimit, data }: WrapInput) {
  return encodeFunctionData({
    abi: OPTIMISM_PORTAL_ABI,
    functionName: "depositTransaction",
    args: [toAddress, value, gasLimit, false, data],
  });
}

function wrapArb({
  toAddress,
  value,
  gasLimit,
  data,
  refundAddress,
}: WrapInput) {
  // TODO: Calculate these well
  const maxFeePerGas = BigInt(0); // << Need to get from chain? Or hardcode high value
  const tokenTotalFeeAmount = BigInt(0); // << maxSubmissionCost + l2CallValue + gasLimit * maxFeePerGas

  return encodeFunctionData({
    abi: ARB_INBOX_ABI,
    functionName: "unsafeCreateRetryableTicket",
    args: [
      toAddress,
      value,
      BigInt(0), // 0 for ERC20 chains
      refundAddress,
      refundAddress,
      gasLimit,
      maxFeePerGas,
      tokenTotalFeeAmount,
      data,
    ],
  });
}
