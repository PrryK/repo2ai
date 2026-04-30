import fs from "node:fs/promises";
import { getFilePriority } from "./priority.js";
import { redactSensitiveValues } from "./redact.js";
import { estimateTokens } from "./tokens.js";
import { languageForPath } from "./languages.js";
import type { PreparedFile, ScannedFile } from "./types.js";

export async function prepareFiles(files: ScannedFile[]): Promise<PreparedFile[]> {
  const prepared: PreparedFile[] = [];

  for (const file of files) {
    const rawContent = await fs.readFile(file.absolutePath, "utf8");
    const redaction = redactSensitiveValues(rawContent);
    prepared.push({
      ...file,
      content: redaction.content,
      language: languageForPath(file.path),
      priority: getFilePriority(file.path, file.sizeBytes),
      approxTokens: estimateTokens(redaction.content),
      redacted: redaction.redacted
    });
  }

  return prepared;
}
