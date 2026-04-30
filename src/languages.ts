import path from "node:path";

const LANGUAGE_BY_EXTENSION = new Map<string, string>([
  [".ts", "ts"],
  [".tsx", "tsx"],
  [".js", "js"],
  [".jsx", "jsx"],
  [".json", "json"],
  [".md", "md"],
  [".css", "css"],
  [".scss", "scss"],
  [".html", "html"],
  [".py", "py"],
  [".rs", "rust"],
  [".go", "go"],
  [".java", "java"],
  [".c", "c"],
  [".h", "c"],
  [".cpp", "cpp"],
  [".hpp", "cpp"],
  [".toml", "toml"],
  [".yaml", "yaml"],
  [".yml", "yaml"],
  [".xml", "xml"],
  [".sh", "sh"],
  [".ps1", "powershell"],
  [".env", "dotenv"]
]);

export function languageForPath(filePath: string): string {
  const base = path.posix.basename(filePath);
  if (base.startsWith(".env")) {
    return "dotenv";
  }
  return LANGUAGE_BY_EXTENSION.get(path.posix.extname(filePath).toLowerCase()) ?? "";
}
