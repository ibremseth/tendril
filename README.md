# Tendril

![Tendril](./tendril_logo.svg)

Cross-chain contract management from a single root address. Deploy and control contracts on any EVM chain that eventually settles to Ethereum (L2, L3, L4+) through tendrils that are guaranteed to be at the same address.

## How it works

A tendril contract is deployed to the same deterministic address on every chain via the Arachnid CREATE2 deployer. On the root chain, the admin is your wallet address. On L2(+) chains, the admin is the address-aliased version of the tendril contract itself, allowing cross-chain calls to flow through native bridges.

The contract can:

- **Plant** new tendrils either directly to the target chain, or through the root contract via cross-chain messages
- **Execute** arbitrary calls on any chain through cross-chain message wrapping
- **Deploy** upgradeable proxy contracts (ERC1967 + UUPS) at deterministic addresses

## Setup

```sh
# Install dependencies
bun i && forge install

# Copy and fill in env
cp .env.example .env

# Plant your first tendril!
bun tendril plant sepolia
```

### Environment variables

| Variable       | Description                                          |
| -------------- | ---------------------------------------------------- |
| `ROOT`         | Your root admin address                              |
| `ROOT_CHAIN`   | `sepolia` or `mainnet`                               |
| `PRIVATE_KEY`  | Private key for signing (optional if using keystore) |
| `ETH_KEYSTORE` | Keystore path                                        |

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

**`plant <chain>`** - Plant a tendril to a new chain

```sh
# Plant from root (default — sends cross-chain message)
bun tendril plant base-sepolia

# Plant directly to the target chain
bun tendril plant --direct base-sepolia

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

# Send ETH with the call
bun tendril execute base-sepolia 0xContractAddr "deposit()" --value 0.1ether

# Simulate first
bun tendril --sim execute base-sepolia 0xContractAddr "pause()"
```

**`deploy <chain> <impl>`** - Deploy an upgradeable proxy through a tendril

```sh
# Deploy with no initializer
bun tendril deploy base-sepolia 0xImplAddress

# Deploy with a custom salt
bun tendril deploy base-sepolia 0xImplAddress --salt 0x0000...0001

# Deploy with an initializer
bun tendril deploy base-sepolia 0xImplAddress --init "initialize(address)" --init-args 0xOwner
```

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
