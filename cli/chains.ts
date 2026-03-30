import type { Address } from "viem";
import { error } from "./logger";

export type TendrilChain = {
  name: string;
  rpc: string;
  id: number;
  parent: string;
  type: ChainType;
  bridge: Address;
};

export enum ChainType {
  ROOT,
  OP,
  ARB,
  ARB_ERC20,
}

export const CHAINS: Record<string, TendrilChain> = {
  mainnet: {
    name: "ethereum mainnet",
    rpc: "https://ethereum-rpc.publicnode.com",
    id: 1,
    parent: "",
    type: ChainType.ROOT,
    bridge: "0x0000000000000000000000000000000000000000",
  },
  base: {
    name: "base",
    rpc: "https://base-rpc.publicnode.com",
    id: 8453,
    parent: "mainnet",
    type: ChainType.OP,
    bridge: "0x49048044D57e1C92A77f79988d21Fa8fAF74E97e", // Base OptimismPortal on mainnet
  },
  "base-sepolia": {
    name: "base sepolia",
    rpc: "https://sepolia.base.org",
    id: 84532,
    parent: "sepolia",
    type: ChainType.OP,
    bridge: "0x49f53e41452C74589E85cA1677426Ba426459e85", // Base Sepolia OptimismPortal on sepolia
  },
  arbitrum: {
    name: "arbitrum",
    rpc: "https://arbitrum-one-rpc.publicnode.com",
    id: 42161,
    parent: "mainnet",
    type: ChainType.ARB,
    bridge: "0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f", // Arbitrum Delayed Inbox on mainnet
  },
  "arb-sepolia": {
    name: "arbitrum sepolia",
    rpc: "https://arbitrum-sepolia-rpc.publicnode.com",
    id: 421614,
    parent: "sepolia",
    type: ChainType.ARB,
    bridge: "0xaAe29B0366299461418F5324a79Afc425BE5ae21", // Arbitrum Sepolia Delayed Inbox on sepolia
  },
  optimism: {
    name: "optimism",
    rpc: "https://optimism-rpc.publicnode.com",
    id: 10,
    parent: "mainnet",
    type: ChainType.OP,
    bridge: "0xbEb5Fc579115071764c7423A4f12eDde41f106Ed", // OP Mainnet OptimismPortal on mainnet
  },
  "op-sepolia": {
    name: "optimism sepolia",
    rpc: "https://optimism-sepolia-rpc.publicnode.com",
    id: 11155420,
    parent: "sepolia",
    type: ChainType.OP,
    bridge: "0x16Fc5058F25648194471939df75CF27A2fdC48BC", // OP Sepolia OptimismPortal on sepolia
  },
  sepolia: {
    name: "sepolia",
    rpc: "https://ethereum-sepolia-rpc.publicnode.com",
    id: 11155111,
    parent: "",
    type: ChainType.ROOT,
    bridge: "0x0000000000000000000000000000000000000000",
  },
};

export function parseChain(name: string): TendrilChain {
  const chain = CHAINS[name];
  if (!chain) {
    error(
      `Unknown chain: ${name}\nAvailable: ${Object.keys(CHAINS).join(", ")}`,
    );
    process.exit(1);
  }
  return chain;
}

export function getRootChainId(chain: TendrilChain): bigint {
  let c = chain;
  while (c.type !== ChainType.ROOT) {
    c = parseChain(c.parent);
  }
  return BigInt(c.id);
}
