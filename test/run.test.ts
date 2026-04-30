import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runRepo2Ai } from "../src/index.js";
import { createTempRepo } from "./helpers.js";

describe("runRepo2Ai", () => {
  it("writes repo-context.md by default", async () => {
    const root = await createTempRepo({
      "README.md": "hello"
    });

    const result = await runRepo2Ai({ root, cwd: root });
    expect(path.basename(result.outputPath)).toBe("repo-context.md");
    await expect(fs.readFile(result.outputPath, "utf8")).resolves.toContain("# Repository Context");
  });

  it("writes a custom output path", async () => {
    const root = await createTempRepo({
      "README.md": "hello"
    });

    const result = await runRepo2Ai({ root, cwd: root, out: "context.md" });
    expect(path.basename(result.outputPath)).toBe("context.md");
    await expect(fs.readFile(result.outputPath, "utf8")).resolves.toContain("README.md");
  });

  it("refuses to overwrite without force", async () => {
    const root = await createTempRepo({
      "README.md": "hello",
      "repo-context.md": "old"
    });

    await expect(runRepo2Ai({ root, cwd: root })).rejects.toThrow("already exists");
    await expect(fs.readFile(path.join(root, "repo-context.md"), "utf8")).resolves.toBe("old");
  });

  it("overwrites with force", async () => {
    const root = await createTempRepo({
      "README.md": "hello",
      "repo-context.md": "old"
    });

    await runRepo2Ai({ root, cwd: root, force: true });
    await expect(fs.readFile(path.join(root, "repo-context.md"), "utf8")).resolves.toContain("# Repository Context");
  });
});
