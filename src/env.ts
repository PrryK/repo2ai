import path from "node:path";

const SAFE_ENV_SUFFIXES = [".example", ".template", ".sample"];

export function isSafeEnvTemplate(filePath: string): boolean {
  const base = path.posix.basename(filePath).toLowerCase();
  return base.startsWith(".env") && SAFE_ENV_SUFFIXES.some((suffix) => base.endsWith(suffix));
}

export function isSensitiveEnvFile(filePath: string): boolean {
  const base = path.posix.basename(filePath).toLowerCase();
  if (!base.startsWith(".env")) {
    return false;
  }

  if (isSafeEnvTemplate(filePath)) {
    return false;
  }

  return base === ".env" || base.startsWith(".env.");
}
