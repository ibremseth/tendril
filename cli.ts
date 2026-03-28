import { Command } from "commander";
import { CHAINS } from "./cli/chains";
import { printContext, c } from "./cli/logger";
import { plant } from "./cli/plant";
import { address } from "./cli/address";
import { execute } from "./cli/execute";
import { deploy } from "./cli/deploy";

export const program = new Command();

program
  .name("tendril")
  .description("CLI for managing tendrils cross-chain deployments")
  .configureHelp({
    styleTitle: (str) => c.bold(c.foreground(str)),
    styleUsage: (str) => c.accent(str),
    styleCommandText: (str) => c.accent(str),
    styleCommandDescription: (str) => c.muted(str),
    styleOptionText: (str) => c.deepGreen(str),
    styleOptionDescription: (str) => c.muted(str),
    styleSubcommandText: (str) => c.accent(str),
    styleSubcommandDescription: (str) => c.muted(str),
    styleArgumentText: (str) => c.blue(str),
    styleArgumentDescription: (str) => c.muted(str),
  })
  .configureOutput({
    outputError: (str, write) => write(c.bold(c.foreground(str))),
  })
  .option(
    "--mainnet",
    "Use mainnet (default: sepolia)",
    process.env["ROOT_CHAIN"] === "mainnet",
  )
  .option(
    "--root <address>",
    "Root admin address for the tendrils",
    process.env["ROOT"],
  )
  .option("--sim", "Simulate transactions without sending")
  .option("-v, --verbose", "Show detailed output")
  .hook("preAction", () => printContext());

program
  .command("plant")
  .description(
    "Plant a tendril to a new chain via the root (using the Arachnid CREATE2 deployer)",
  )
  .argument("<chain>", `Target chain (${Object.keys(CHAINS).join(", ")})`)
  .option("-d, --direct", "Plant the new tendril directly to the chain")
  .action(plant);

program
  .command("addr")
  .description("Get the tendril address of the current root")
  .action(address);

program
  .command("execute")
  .description("Execute a call through a tendril contract")
  .argument("<chain>", `Target chain (${Object.keys(CHAINS).join(", ")})`)
  .argument("<toAddress>", "Destination address")
  .argument("<sig>", 'Function signature (e.g. "transfer(address,uint256)")')
  .argument("[args...]", "Function arguments")
  .option(
    "--value <amount>",
    'ETH value to send (e.g. "0.1ether", "100gwei", "1000000wei")',
    "0",
  )
  .action(execute);

program
  .command("deploy")
  .description("Deploy a contract through a tendril's proxy deployer")
  .argument("<chain>", `Target chain (${Object.keys(CHAINS).join(", ")})`)
  .argument("<impl>", "Implementation contract address")
  .option("--salt <bytes32>", "CREATE2 salt", "0x" + "00".repeat(32))
  .option("--init <sig>", 'Initializer signature (e.g. "initialize(address)")')
  .option("--init-args <args...>", "Initializer arguments (comma-separated)")
  .action(deploy);

program.parse();
