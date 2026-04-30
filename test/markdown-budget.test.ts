import { describe, expect, it } from "vitest";
import { generateRepositoryContext } from "../src/index.js";
import { createTempRepo } from "./helpers.js";

describe("markdown and token budgeting", () => {
  it("uses a 30000 token default budget", async () => {
    const root = await createTempRepo({
      "README.md": "hello"
    });

    const result = await generateRepositoryContext({ root, cwd: root });
    expect(result.tokenBudget).toBe(30000);
  });

  it("renders required markdown sections", async () => {
    const root = await createTempRepo({
      "package.json": '{"name":"demo"}',
      "src/index.ts": "export const value = 1;"
    });

    const result = await generateRepositoryContext({ root, cwd: root });
    expect(result.markdown).toContain("# Repository Context");
    expect(result.markdown).toContain("## Metadata");
    expect(result.markdown).toContain("## Suggested Prompt");
    expect(result.markdown).toContain("## Directory Tree");
    expect(result.markdown).toContain("## Included Files");
    expect(result.markdown).toContain("## Omitted Files");
    expect(result.markdown).toContain("## File Contents");
    expect(result.markdown).toContain("src/index.ts");
  });

  it("reports the full generated markdown token estimate in metadata", async () => {
    const root = await createTempRepo({
      "README.md": "hello"
    });

    const result = await generateRepositoryContext({ root, cwd: root });
    expect(result.markdown).toContain(`- Approx tokens: ${result.approxTokens}`);
  });

  it("omits files to fit the token budget", async () => {
    const root = await createTempRepo({
      "README.md": "a".repeat(1000),
      "src/index.ts": "b".repeat(1000),
      "docs/guide.md": "c".repeat(1000)
    });

    const result = await generateRepositoryContext({ root, cwd: root, maxTokens: 450 });
    expect(result.includedFiles.length).toBeLessThan(3);
    expect(result.omittedFiles.some((file) => file.reason === "omitted to fit token budget")).toBe(true);
  });

  it("writes a valid markdown warning when budget is too small for required sections", async () => {
    const root = await createTempRepo({
      "README.md": "hello"
    });

    const result = await generateRepositoryContext({ root, cwd: root, maxTokens: 1 });
    expect(result.budgetWarning).toContain("too small");
    expect(result.markdown).toContain("## Warning");
    expect(result.markdown).toContain("# Repository Context");
    expect(result.includedFiles).toEqual([]);
  });

  it("redacts env templates before writing markdown", async () => {
    const root = await createTempRepo({
      ".env.example": "API_KEY=sk-abcdefghijklmnopqrstuvwxyz\nPUBLIC_URL=http://localhost"
    });

    const result = await generateRepositoryContext({ root, cwd: root });
    expect(result.markdown).toContain("API_KEY=[REDACTED]");
    expect(result.markdown).toContain("PUBLIC_URL=http://localhost");
  });

  it("honors tree depth", async () => {
    const root = await createTempRepo({
      "src/deep/nested/index.ts": "source"
    });

    const result = await generateRepositoryContext({ root, cwd: root, treeDepth: 2 });
    const treeBlock = result.markdown.match(/## Directory Tree\n\n```text\n([\s\S]*?)\n```/)?.[1] ?? "";
    expect(treeBlock).toContain("`-- src\n    `-- deep");
    expect(treeBlock).not.toContain("nested");
  });
});
