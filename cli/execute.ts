import { encodeFunctionData, parseAbiItem, isAddress } from "viem";
import type { Hex, Address } from "viem";

import { program } from "../cli";
import {
  getClient,
  getWalletClient,
  getTendrilAddress,
  getRoot,
  parseValue,
} from "./utils";
import { parseChain, ChainType } from "./chains";
import { printContext, verbose, success, error } from "./logger";
import type { TendrilChain } from "./chains";

// const ARB_ERC20_INBOX_ABI = [
//   {
//     name: "unsafeCreateRetryableTicket",
//     type: "function",
//     inputs: [
//       { name: "to", type: "address" },
//       { name: "l2CallValue", type: "uint256" },
//       { name: "maxSubmissionCost", type: "uint256" },
//       { name: "excessFeeRefundAddress", type: "address" },
//       { name: "callValueRefundAddress", type: "address" },
//       { name: "gasLimit", type: "uint256" },
//       { name: "maxFeePerGas", type: "uint256" },
//       { name: "tokenTotalFeeAmount", type: "uint256" },
//       { name: "data", type: "bytes" },
//     ],
//     outputs: [{ name: "", type: "uint256" }],
//     stateMutability: "nonpayable",
//   },
// ] as const;

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
  opts: { value?: string },
) {
  const chain = parseChain(chainName);
  printContext(chain);
  const value = parseValue(opts.value || "0");
  if (!isAddress(rawToAddress)) {
    error(`Invalid address: ${rawToAddress}`);
    process.exit(1);
  }
  const toAddress: Address = rawToAddress;

  // Parse the function signature into an ABI item
  const abiItem = parseAbiItem(`function ${sig}`);

  // Encode the inner call (toAddress + sig + args)
  const innerCalldata = encodeFunctionData({
    abi: [abiItem],
    args: args.length > 0 ? args : undefined,
  });

  // Encode the outer call to Tendril.execute(dest, data)
  const executeCalldata = encodeFunctionData({
    abi: TENDRIL_EXECUTE_ABI,
    functionName: "execute",
    args: [toAddress, innerCalldata],
  });

  await executeRaw({
    chain,
    toAddress: getTendrilAddress(chain),
    rawData: executeCalldata,
    rawValue: value,
  });
}

export async function executeRaw({
  chain,
  toAddress,
  rawData,
  rawValue,
  gasLimit,
}: {
  chain: TendrilChain;
  toAddress: Address;
  rawData: Hex;
  rawValue?: bigint;
  gasLimit?: bigint;
}) {
  const tendrilAddress = getTendrilAddress(chain);
  verbose("Tendril:", tendrilAddress);
  verbose("Target:", toAddress);
  verbose("Data:", rawData);

  let calldata = rawData;
  let currentChain = chain;
  let finalValue = BigInt(0);

  while (currentChain.parent != "") {
    const { data, value } = wrap(currentChain, {
      toAddress,
      value: rawValue ?? BigInt(0),
      gasLimit: gasLimit ?? BigInt(500_000), // TODO: Use a real estimate
      data: calldata,
      refundAddress: tendrilAddress,
    });
    finalValue += value;
    calldata = encodeFunctionData({
      abi: TENDRIL_EXECUTE_ABI,
      functionName: "execute",
      args: [chain.bridge, data],
    });

    currentChain = parseChain(currentChain.parent);
  }

  verbose("Final calldata:", calldata);

  if (program.opts().sim) {
    const client = getClient(currentChain.rpc);
    const result = await client.call({
      account: getRoot(),
      to: tendrilAddress,
      data: calldata,
      value: finalValue,
    });
    success("Simulation passed");
    verbose("Result:", result);
  } else {
    const wallet = await getWalletClient(currentChain.rpc);
    verbose("Sender:", wallet.account!.address);
    const result = await wallet.sendTransaction({
      chain: { id: currentChain.id } as any,
      to: tendrilAddress,
      data: calldata,
      value: finalValue,
    });
    success("Transaction sent:", result);
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

function wrap(
  chain: TendrilChain,
  input: WrapInput,
): { data: Hex; value: bigint } {
  switch (chain.type) {
    case ChainType.OP:
      return wrapOp(input);
    case ChainType.ARB:
      return wrapArb(input);
    case ChainType.ARB_ERC20:
      // TODO: Suport ERC20 Arb chains
      throw Error(`ERC20 chain not supported yet`);
    // return wrapArbERC20(input);
    default:
      throw Error(`Unwrappable chain: ${chain.type}`);
  }
}

function wrapOp({ toAddress, value, gasLimit, data }: WrapInput): {
  data: Hex;
  value: bigint;
} {
  return {
    data: encodeFunctionData({
      abi: OPTIMISM_PORTAL_ABI,
      functionName: "depositTransaction",
      args: [toAddress, value, gasLimit, false, data],
    }),
    value,
  };
}

function wrapArb({
  toAddress,
  value,
  gasLimit,
  data,
  refundAddress,
}: WrapInput) {
  // Estimate submission cost: (1400 + 6 * dataBytes) * baseFee
  const dataBytes = BigInt(data.length / 2 - 1); // hex string to byte count
  // TODO: Use a real estimate
  const baseFee = 30n * BigInt(1e9); // 30 gwei — conservative L1 estimate
  const maxSubmissionCost = (1400n + 6n * dataBytes) * baseFee;
  // TODO: Use a real estimate
  const maxFeePerGas = BigInt(1e9); // 1 gwei

  return {
    data: encodeFunctionData({
      abi: ARB_INBOX_ABI,
      functionName: "unsafeCreateRetryableTicket",
      args: [
        toAddress,
        value,
        maxSubmissionCost,
        refundAddress,
        refundAddress,
        gasLimit,
        maxFeePerGas,
        data,
      ],
    }),
    value: maxSubmissionCost + value + gasLimit * maxFeePerGas,
  };
}

// function wrapArbERC20({
//   toAddress,
//   value,
//   gasLimit,
//   data,
//   refundAddress,
// }: WrapInput) {
//   // Hardcoded high — excess refunds to the Tendril contract
//   const maxFeePerGas = BigInt(1e9); // 1 gwei
//   const tokenTotalFeeAmount = value + gasLimit * maxFeePerGas;

//   return {
//     data: encodeFunctionData({
//       abi: ARB_ERC20_INBOX_ABI,
//       functionName: "unsafeCreateRetryableTicket",
//       args: [
//         toAddress,
//         value,
//         BigInt(0), // This is hardcoded to 0 for ERC20 chains
//         refundAddress,
//         refundAddress,
//         gasLimit,
//         maxFeePerGas,
//         tokenTotalFeeAmount,
//         data,
//       ],
//     }),
//     value: BigInt(0),
//   };
// }
