import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function getVersion(dir: string): string | undefined {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return undefined;

  try {
    const content = readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as Record<string, unknown>;
    return typeof pkg.version === "string" ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}
