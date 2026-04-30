import { renderMarkdown } from "./markdown.js";
import { priorityRank } from "./priority.js";
import { estimateTokens } from "./tokens.js";
import type { OmittedFile, PreparedFile } from "./types.js";

export interface BudgetInput {
  root: string;
  tokenBudget: number;
  tree: string;
  files: PreparedFile[];
  omitted: OmittedFile[];
  maxFileSize: number;
}

export interface BudgetResult {
  markdown: string;
  includedFiles: PreparedFile[];
  omittedFiles: OmittedFile[];
  approxTokens: number;
  budgetWarning?: string;
}

export async function buildBudgetedMarkdown(input: BudgetInput): Promise<BudgetResult> {
  const sortedFiles = [...input.files].sort((a, b) => {
    return priorityRank(a.priority) - priorityRank(b.priority) || a.sizeBytes - b.sizeBytes || a.path.localeCompare(b.path);
  });
  const allBudgetOmitted = sortedFiles.map(toBudgetOmittedFile);
  const requiredMarkdown = await renderMarkdown({
    root: input.root,
    tokenBudget: input.tokenBudget,
    tree: input.tree,
    includedFiles: [],
    omittedFiles: [...input.omitted, ...allBudgetOmitted],
    maxFileSize: input.maxFileSize,
    budgetWarning: undefined
  });
  const requiredTokens = estimateTokens(requiredMarkdown);

  if (requiredTokens > input.tokenBudget) {
    const budgetWarning = `Token budget ${input.tokenBudget} is too small for the required metadata, tree, and tables. File contents were omitted, but this Markdown file is still valid.`;
    const markdown = await renderMarkdown({
      root: input.root,
      tokenBudget: input.tokenBudget,
      tree: input.tree,
      includedFiles: [],
      omittedFiles: [...input.omitted, ...allBudgetOmitted],
      maxFileSize: input.maxFileSize,
      budgetWarning
    });
    return {
      markdown,
      includedFiles: [],
      omittedFiles: [...input.omitted, ...allBudgetOmitted],
      approxTokens: estimateTokens(markdown),
      budgetWarning
    };
  }

  const includedFiles: PreparedFile[] = [];
  const budgetOmitted: OmittedFile[] = [];

  for (let index = 0; index < sortedFiles.length; index += 1) {
    const file = sortedFiles[index];
    const remaining = sortedFiles.slice(index + 1).map(toBudgetOmittedFile);
    const trialIncluded = [...includedFiles, file];
    const trialOmitted = [...input.omitted, ...budgetOmitted, ...remaining];
    const trialMarkdown = await renderMarkdown({
      root: input.root,
      tokenBudget: input.tokenBudget,
      tree: input.tree,
      includedFiles: trialIncluded,
      omittedFiles: trialOmitted,
      maxFileSize: input.maxFileSize
    });

    if (estimateTokens(trialMarkdown) <= input.tokenBudget) {
      includedFiles.push(file);
    } else {
      budgetOmitted.push(toBudgetOmittedFile(file));
    }
  }

  const omittedFiles = [...input.omitted, ...budgetOmitted];
  const markdown = await renderMarkdown({
    root: input.root,
    tokenBudget: input.tokenBudget,
    tree: input.tree,
    includedFiles,
    omittedFiles,
    maxFileSize: input.maxFileSize
  });

  return {
    markdown,
    includedFiles,
    omittedFiles,
    approxTokens: estimateTokens(markdown)
  };
}

function toBudgetOmittedFile(file: PreparedFile): OmittedFile {
  return {
    path: file.path,
    reason: "omitted to fit token budget",
    sizeBytes: file.sizeBytes,
    approxTokens: file.approxTokens,
    priority: file.priority
  };
}
