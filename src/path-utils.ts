import path from "node:path";

export function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

export function normalizeRelativePath(value: string): string {
  return toPosixPath(value).replace(/^\.\//, "");
}

export function isInsideOrEqual(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function relativePathIfInside(parent: string, child: string): string | undefined {
  if (!isInsideOrEqual(parent, child)) {
    return undefined;
  }

  const relative = path.relative(parent, child);
  return normalizeRelativePath(relative || path.basename(child));
}

export function splitCommaList(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
