export type FilePriority = "high" | "medium" | "low";

export interface Repo2AiOptions {
  root: string;
  cwd?: string;
  out?: string;
  force?: boolean;
  maxTokens?: number;
  include?: string[];
  exclude?: string[];
  treeDepth?: number;
  maxFileSize?: number;
}

export interface ScanOptions {
  root: string;
  cwd: string;
  out: string;
  include: string[];
  exclude: string[];
  maxFileSize: number;
}

export interface ScannedFile {
  path: string;
  absolutePath: string;
  sizeBytes: number;
}

export interface PreparedFile extends ScannedFile {
  content: string;
  language: string;
  priority: FilePriority;
  approxTokens: number;
  redacted: boolean;
}

export interface OmittedFile {
  path: string;
  reason: string;
  sizeBytes?: number;
  approxTokens?: number;
  priority?: FilePriority;
}

export interface ScanResult {
  root: string;
  outputPath: string;
  files: ScannedFile[];
  omitted: OmittedFile[];
  treePaths: string[];
}

export interface Repo2AiResult {
  root: string;
  outputPath: string;
  markdown: string;
  includedFiles: PreparedFile[];
  omittedFiles: OmittedFile[];
  approxTokens: number;
  tokenBudget: number;
  budgetWarning?: string;
}
