import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function createTempRepo(files: Record<string, string | Buffer>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "repo2ai-"));

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content);
  }

  return root;
}

export function tempCwdFor(root: string): string {
  return root;
}
