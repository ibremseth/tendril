# Tendril

Cross-chain contract management from a single root address. Deploy and control contracts on any EVM chain through L1-to-L2 bridge messaging.

## How it works

Tendril is deployed to the same deterministic address on every chain via the Arachnid CREATE2 deployer. On the root chain, the admin is your wallet address. On L2 chains, the admin is the address-aliased version of the Tendril contract itself, allowing cross-chain calls to flow through native bridges (Optimism Portal, Arbitrum Inbox).

The contract can:

- **Execute** arbitrary calls on any chain through cross-chain message wrapping
- **Deploy** upgradeable proxy contracts (ERC1967 + UUPS) at deterministic addresses
- **Predict** deployment addresses before deploying

## Setup

```sh
# Install dependencies
bun install
forge install

# Copy and fill in env
cp .env.example .env
```

### Environment variables

| Variable       | Description                                          |
| -------------- | ---------------------------------------------------- |
| `ROOT`         | Your root admin address                              |
| `ROOT_CHAIN`   | `sepolia` or `mainnet`                               |
| `PRIVATE_KEY`  | Private key for signing (optional if using keystore) |
| `ETH_KEYSTORE` | Foundry keystore name (default: `default`)           |

## CLI

```sh
bun tendril <command> [options]
```

### Global options

| Flag               | Description                               |
| ------------------ | ----------------------------------------- |
| `--root <address>` | Root admin address (overrides `ROOT` env) |
| `--mainnet`        | Use mainnet (default: sepolia)            |
| `--sim`            | Simulate transactions without sending     |
| `-v, --verbose`    | Show detailed output                      |

### Commands

**`plant <chain>`** - Deploy Tendril to a chain

```sh
bun tendril plant base-sepolia
bun tendril --mainnet plant base
```

**`addr`** - Get the Tendril deployment address for the current root

```sh
bun tendril addr
```

**`execute <chain> <toAddress> <sig> [args...]`** - Execute a call through Tendril

```sh
# Call a function on base-sepolia
bun tendril execute base-sepolia 0xContractAddr "transfer(address,uint256)" 0xRecipient 1000

# Simulate first
bun tendril --sim execute base-sepolia 0xContractAddr "pause()"
```

**`deploy`** - Deploy a contract through Tendril's proxy deployer (WIP)

### Supported chains

| Chain            | Type |
| ---------------- | ---- |
| mainnet          | Root |
| sepolia          | Root |
| base             | OP   |
| base-sepolia     | OP   |
| optimism         | OP   |
| optimism-sepolia | OP   |
| arbitrum         | Arb  |
| arbitrum-sepolia | Arb  |

## Contract

```sh
# Build
forge build

# Test
forge test
```
