#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import {
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_OUTPUT,
  DEFAULT_TREE_DEPTH
} from "./constants.js";
import { runRepo2Ai } from "./run.js";
import { splitCommaList } from "./path-utils.js";

const program = new Command();

program
  .name("repo2ai")
  .description("Pack a local repository into a clean, token-aware Markdown context file for AI coding agents.")
  .argument("[root]", "repository root", ".")
  .option("--out <file>", "output Markdown file", DEFAULT_OUTPUT)
  .option("--force", "overwrite an existing output file", false)
  .option("--max-tokens <number>", "approximate token budget", parsePositiveInteger, DEFAULT_MAX_TOKENS)
  .option("--include <patterns>", "comma-separated include patterns")
  .option("--exclude <patterns>", "comma-separated exclude patterns")
  .option("--tree-depth <number>", "maximum directory tree depth", parseNonNegativeInteger, DEFAULT_TREE_DEPTH)
  .option("--max-file-size <bytes>", "maximum file size to include", parsePositiveInteger, DEFAULT_MAX_FILE_SIZE)
  .action(async (root: string, options) => {
    try {
      const result = await runRepo2Ai({
        root,
        out: options.out,
        force: options.force,
        maxTokens: options.maxTokens,
        include: splitCommaList(options.include),
        exclude: splitCommaList(options.exclude),
        treeDepth: options.treeDepth,
        maxFileSize: options.maxFileSize
      });

      if (result.budgetWarning) {
        console.warn(`Warning: ${result.budgetWarning}`);
      }

      console.log(`Wrote ${result.outputPath}`);
      console.log(`Files included: ${result.includedFiles.length}`);
      console.log(`Approx tokens: ${result.approxTokens}`);
      if (result.omittedFiles.length > 0) {
        console.log(`Omitted files: ${result.omittedFiles.length}`);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });

program.parseAsync();

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError("Expected a positive integer.");
  }
  return parsed;
}

function parseNonNegativeInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new InvalidArgumentError("Expected a non-negative integer.");
  }
  return parsed;
}
