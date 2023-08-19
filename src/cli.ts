#!/usr/bin/env node
import { program } from "commander";

import countTopLevelFunctionsWithTSDoc from "./index";

program
  .version("0.0.0")
  .description("A tool for checking documentation coverage");

program
  .command("check")
  .description("check documentation coverage")
  .action(() => {
    countTopLevelFunctionsWithTSDoc();
  });

program.parse(process.argv);

// Handle case where no command is passed
if (!program.args.length) {
  program.help();
}
