import path from "node:path";
import { MANIFEST_FILE_NAMES } from "./constants.js";
import type { FilePriority } from "./types.js";

export function getFilePriority(filePath: string, sizeBytes = 0): FilePriority {
  const base = path.posix.basename(filePath);
  const lower = filePath.toLowerCase();

  if (
    MANIFEST_FILE_NAMES.has(base) ||
    /^readme(\.[a-z0-9]+)?$/i.test(base) ||
    lower === "license" ||
    lower.startsWith("src/") ||
    lower.startsWith("lib/") ||
    lower.startsWith("app/")
  ) {
    return "high";
  }

  if (
    lower.startsWith("docs/") ||
    lower.startsWith("examples/") ||
    lower.startsWith("test/") ||
    lower.startsWith("tests/") ||
    lower.includes(".test.") ||
    lower.includes(".spec.")
  ) {
    return "medium";
  }

  if (sizeBytes > 100000 || lower.includes("generated") || lower.includes("snapshot")) {
    return "low";
  }

  return "medium";
}

export function priorityRank(priority: FilePriority): number {
  if (priority === "high") {
    return 0;
  }
  if (priority === "medium") {
    return 1;
  }
  return 2;
}
