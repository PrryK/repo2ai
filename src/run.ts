import fs from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_OUTPUT,
  DEFAULT_TREE_DEPTH
} from "./constants.js";
import { buildBudgetedMarkdown } from "./budget.js";
import { prepareFiles } from "./prepare.js";
import { scanRepository } from "./scan.js";
import { renderDirectoryTree } from "./tree.js";
import type { Repo2AiOptions, Repo2AiResult } from "./types.js";

export async function generateRepositoryContext(options: Repo2AiOptions): Promise<Repo2AiResult> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const root = path.resolve(cwd, options.root);
  const out = options.out ?? DEFAULT_OUTPUT;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

  const scanResult = await scanRepository({
    root,
    cwd,
    out,
    include: options.include ?? [],
    exclude: options.exclude ?? [],
    maxFileSize
  });
  const preparedFiles = await prepareFiles(scanResult.files);
  const tree = renderDirectoryTree(scanResult.treePaths, options.treeDepth ?? DEFAULT_TREE_DEPTH);
  const budget = await buildBudgetedMarkdown({
    root: scanResult.root,
    tokenBudget: maxTokens,
    tree,
    files: preparedFiles,
    omitted: scanResult.omitted,
    maxFileSize
  });

  return {
    root: scanResult.root,
    outputPath: scanResult.outputPath,
    markdown: budget.markdown,
    includedFiles: budget.includedFiles,
    omittedFiles: budget.omittedFiles,
    approxTokens: budget.approxTokens,
    tokenBudget: maxTokens,
    budgetWarning: budget.budgetWarning
  };
}

export async function writeRepositoryContext(result: Repo2AiResult, force = false): Promise<void> {
  await fs.mkdir(path.dirname(result.outputPath), { recursive: true });

  if (!force && (await pathExists(result.outputPath))) {
    throw new Error(`Output file already exists: ${result.outputPath}. Use --force to overwrite or choose a different --out path.`);
  }

  await fs.writeFile(result.outputPath, result.markdown, "utf8");
}

export async function runRepo2Ai(options: Repo2AiOptions): Promise<Repo2AiResult> {
  const result = await generateRepositoryContext(options);
  await writeRepositoryContext(result, options.force ?? false);
  return result;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
