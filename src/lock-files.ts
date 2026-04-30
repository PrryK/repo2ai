import path from "node:path";
import { LOCK_FILE_NAMES } from "./constants.js";

export function isLockFile(filePath: string): boolean {
  return LOCK_FILE_NAMES.has(path.posix.basename(filePath));
}
