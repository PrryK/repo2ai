import { describe, expect, it } from "vitest";
import { estimateTokens, redactSensitiveValues } from "../src/index.js";

describe("token estimation", () => {
  it("estimates tokens using four characters per token", () => {
    expect(estimateTokens("12345678")).toBe(2);
    expect(estimateTokens("12345")).toBe(2);
  });
});

describe("redaction", () => {
  it("does not redact token-budget code identifiers", () => {
    const input = [
      "const maxTokens = 30000",
      "approxTokens: number",
      "tokenBudget: number",
      "estimateTokens(text)",
      "options.maxTokens"
    ].join("\n");

    expect(redactSensitiveValues(input)).toEqual({ content: input, redacted: false });
  });

  it("redacts env-style secrets", () => {
    const result = redactSensitiveValues("API_KEY=sk-abcdefghijklmnopqrstuvwxyz\nPUBLIC_URL=http://localhost\n");
    expect(result.redacted).toBe(true);
    expect(result.content).toContain("API_KEY=[REDACTED]");
    expect(result.content).toContain("PUBLIC_URL=http://localhost");
  });

  it("redacts requested provider and authorization secrets", () => {
    const input = [
      "OPENAI_API_KEY=sk-abc1234567890000",
      "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz",
      "Authorization: Bearer abcdef123456",
      'const header = "Authorization: Bearer quoted123456";'
    ].join("\n");

    const result = redactSensitiveValues(input);
    expect(result.content).toContain("OPENAI_API_KEY=[REDACTED]");
    expect(result.content).toContain("GITHUB_TOKEN=[REDACTED]");
    expect(result.content).toContain("Authorization: Bearer [REDACTED]");
    expect(result.content).toContain('const header = "Authorization: Bearer [REDACTED]";');
  });

  it("redacts json and yaml secrets", () => {
    const result = redactSensitiveValues('{"token":"ghp_abcdefghijklmnopqrstuvwxyz123456"}\npassword: "hunter2"\nsecret: "hidden"');
    expect(result.content).toContain('"token":"[REDACTED]"');
    expect(result.content).toContain("password: [REDACTED]");
    expect(result.content).toContain("secret: [REDACTED]");
  });

  it("redacts private key blocks", () => {
    const result = redactSensitiveValues("-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----");
    expect(result.content).toContain("[REDACTED]");
    expect(result.content).not.toContain("\nabc\n");
  });

  it("leaves non-secret text intact", () => {
    const input = "const greeting = 'hello';";
    expect(redactSensitiveValues(input)).toEqual({ content: input, redacted: false });
  });
});
