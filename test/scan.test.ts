import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_FILE_SIZE, DEFAULT_OUTPUT, scanRepository } from "../src/index.js";
import { createTempRepo } from "./helpers.js";

async function scan(root: string, overrides = {}) {
  return scanRepository({
    root,
    cwd: root,
    out: DEFAULT_OUTPUT,
    include: [],
    exclude: [],
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    ...overrides
  });
}

describe("scanRepository", () => {
  it("applies default ignores, gitignore, repo2aiignore, include, and exclude", async () => {
    const root = await createTempRepo({
      "src/index.ts": "export const ok = true;",
      "src/skip.ts": "skip",
      "README.md": "readme",
      "node_modules/pkg/index.js": "ignored",
      ".gitignore": "ignored-by-gitignore.txt\n",
      ".repo2aiignore": "ignored-by-repo2ai.txt\n",
      "ignored-by-gitignore.txt": "ignored",
      "ignored-by-repo2ai.txt": "ignored",
      "tests/example.test.ts": "ignored by exclude"
    });

    const result = await scan(root, {
      include: ["src", "README.md"],
      exclude: ["src/skip.ts"]
    });

    expect(result.files.map((file) => file.path)).toEqual(["README.md", "src/index.ts"]);
  });

  it("excludes the output file when it is inside the scanned root", async () => {
    const root = await createTempRepo({
      "repo-context.md": "old context",
      "src/index.ts": "source"
    });

    const result = await scan(root);
    expect(result.files.map((file) => file.path)).toEqual(["src/index.ts"]);
    expect(result.omitted).toContainEqual({ path: "repo-context.md", reason: "output file excluded" });
  });

  it("skips real env files but allows env templates", async () => {
    const root = await createTempRepo({
      ".env": "API_KEY=secret",
      ".env.local": "TOKEN=secret",
      ".env.example": "API_KEY=example",
      ".env.template": "TOKEN=template",
      ".env.sample": "PASSWORD=sample"
    });

    const result = await scan(root);
    expect(result.files.map((file) => file.path).sort()).toEqual([".env.example", ".env.sample", ".env.template"]);
    expect(result.omitted.map((file) => file.path).sort()).toEqual([".env", ".env.local"]);
  });

  it("reports sensitive env files even when gitignore would ignore them", async () => {
    const root = await createTempRepo({
      ".gitignore": ".env\n",
      ".env": "API_KEY=secret",
      "src/index.ts": "source"
    });

    const result = await scan(root);
    expect(result.files.map((file) => file.path)).toContain("src/index.ts");
    expect(result.omitted).toContainEqual(expect.objectContaining({ path: ".env", reason: "sensitive env file skipped" }));
  });

  it("omits lock files but keeps manifest files", async () => {
    const root = await createTempRepo({
      "package.json": "{}",
      "package-lock.json": "{}",
      "Cargo.toml": "[package]",
      "Cargo.lock": "[[package]]"
    });

    const result = await scan(root);
    expect(result.files.map((file) => file.path).sort()).toEqual(["Cargo.toml", "package.json"]);
    expect(result.omitted.map((file) => file.path).sort()).toEqual(["Cargo.lock", "package-lock.json"]);
  });

  it("skips binary and very large files", async () => {
    const root = await createTempRepo({
      "src/index.ts": "source",
      "image.png": Buffer.from([0, 1, 2, 3]),
      "large.txt": "a".repeat(20)
    });

    const result = await scan(root, { maxFileSize: 10 });
    expect(result.files.map((file) => file.path)).toEqual(["src/index.ts"]);
    expect(result.omitted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "image.png", reason: "binary file skipped" }),
        expect.objectContaining({ path: "large.txt", reason: "file exceeds max file size" })
      ])
    );
  });

  it("excludes a custom output path inside the root", async () => {
    const root = await createTempRepo({
      "context.md": "old",
      "src/index.ts": "source"
    });

    const result = await scan(root, {
      out: path.join(root, "context.md")
    });
    expect(result.files.map((file) => file.path)).toEqual(["src/index.ts"]);
  });
});
