import fs from "node:fs/promises";
import path from "node:path";
import { BINARY_EXTENSIONS } from "./constants.js";

export async function isBinaryFile(filePath: string): Promise<boolean> {
  if (BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
    return true;
  }

  const handle = await fs.open(filePath, "r");
  try {
    const sample = Buffer.alloc(8000);
    const { bytesRead } = await handle.read(sample, 0, sample.length, 0);
    if (bytesRead === 0) {
      return false;
    }

    let suspicious = 0;
    for (let index = 0; index < bytesRead; index += 1) {
      const byte = sample[index];
      if (byte === 0) {
        return true;
      }
      const isAllowedControl = byte === 7 || byte === 8 || byte === 9 || byte === 10 || byte === 12 || byte === 13 || byte === 27;
      if (byte < 32 && !isAllowedControl) {
        suspicious += 1;
      }
    }

    return suspicious / bytesRead > 0.3;
  } finally {
    await handle.close();
  }
}
