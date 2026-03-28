import { Command } from "commander";
import { CHAINS } from "./cli/chains";
import { plant } from "./cli/plant";
import { address } from "./cli/address";
import { execute } from "./cli/execute";
import { deploy } from "./cli/deploy";

export const program = new Command();

program
  .name("tendril")
  .description("CLI for managing Tendril cross-chain deployments")
  .option(
    "--mainnet",
    "Use mainnet (default: sepolia)",
    process.env["ROOT_CHAIN"] === "mainnet",
  )
  .option(
    "--root <address>",
    "Root admin address for the Tendril",
    process.env["ROOT"],
  )
  .option("--sim", "Simulate transactions without sending");

program
  .command("plant")
  .description("Deploy a Tendril to a chain via the Arachnid CREATE2 deployer")
  .argument("<chain>", `Target chain (${Object.keys(CHAINS).join(", ")})`)
  .action(plant);

program
  .command("addr")
  .description("Get the Tendril deployment address of the current root")
  .action(address);

program
  .command("execute")
  .description("Execute a call through the Tendril contract")
  .argument("<chain>", `Target chain (${Object.keys(CHAINS).join(", ")})`)
  .argument("<toAddress>", "Destination address")
  .argument("<sig>", 'Function signature (e.g. "transfer(address,uint256)")')
  .argument("[args...]", "Function arguments")
  .action(execute);

program
  .command("deploy")
  .description("Deploy a contract through Tendril's proxy deployer")
  .action(deploy);

program.parse();
