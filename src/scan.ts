import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import fg from "fast-glob";
import type { Ignore } from "ignore";
import { DEFAULT_IGNORE_PATTERNS } from "./constants.js";
import { isBinaryFile } from "./binary.js";
import { isSensitiveEnvFile } from "./env.js";
import { isLockFile } from "./lock-files.js";
import { normalizeRelativePath, relativePathIfInside } from "./path-utils.js";
import type { OmittedFile, ScanOptions, ScanResult } from "./types.js";

const require = createRequire(import.meta.url);
const createIgnore = require("ignore") as (options?: { ignorecase?: boolean; ignoreCase?: boolean; allowRelativePaths?: boolean }) => Ignore;

function expandPattern(pattern: string): string[] {
  const normalized = normalizeRelativePath(pattern).replace(/\/$/, "");
  if (!normalized) {
    return [];
  }
  return [normalized, `${normalized}/**`];
}

async function readIgnoreFile(root: string, name: string): Promise<string[]> {
  try {
    const content = await fs.readFile(path.join(root, name), "utf8");
    return content.split(/\r?\n/);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function scanRepository(options: ScanOptions): Promise<ScanResult> {
  const root = path.resolve(options.root);
  const outputPath = path.resolve(options.cwd, options.out);
  const outputRelativePath = relativePathIfInside(root, outputPath);
  const gitignore = await readIgnoreFile(root, ".gitignore");
  const repo2aiIgnore = await readIgnoreFile(root, ".repo2aiignore");

  const ignoreMatcher = createIgnore().add([
    ...DEFAULT_IGNORE_PATTERNS,
    ...gitignore,
    ...repo2aiIgnore,
    ...options.exclude.flatMap(expandPattern)
  ]);
  const includeMatcher = options.include.length > 0 ? createIgnore().add(options.include.flatMap(expandPattern)) : undefined;

  const rawEntries = await fg(["**/*"], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    unique: true,
    suppressErrors: true
  });

  const entries = rawEntries.map(normalizeRelativePath).sort((a, b) => a.localeCompare(b));
  const files = [];
  const omitted: OmittedFile[] = [];
  const treePaths: string[] = [];

  for (const relativePath of entries) {
    if (outputRelativePath && relativePath === outputRelativePath) {
      omitted.push({ path: relativePath, reason: "output file excluded" });
      continue;
    }

    const absolutePath = path.join(root, relativePath);
    const stats = await fs.stat(absolutePath);

    if (isSensitiveEnvFile(relativePath)) {
      omitted.push({ path: relativePath, reason: "sensitive env file skipped", sizeBytes: stats.size });
      continue;
    }

    if (ignoreMatcher.ignores(relativePath)) {
      continue;
    }

    if (includeMatcher && !includeMatcher.ignores(relativePath)) {
      continue;
    }

    treePaths.push(relativePath);

    if (isLockFile(relativePath)) {
      omitted.push({ path: relativePath, reason: "lock file omitted by default", sizeBytes: stats.size });
      continue;
    }

    if (stats.size > options.maxFileSize) {
      omitted.push({ path: relativePath, reason: "file exceeds max file size", sizeBytes: stats.size });
      continue;
    }

    if (await isBinaryFile(absolutePath)) {
      omitted.push({ path: relativePath, reason: "binary file skipped", sizeBytes: stats.size });
      continue;
    }

    files.push({
      path: relativePath,
      absolutePath,
      sizeBytes: stats.size
    });
  }

  return {
    root,
    outputPath,
    files,
    omitted,
    treePaths
  };
}
