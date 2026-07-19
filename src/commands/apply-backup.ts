import { copyFile } from "node:fs/promises";
import type { Appfit } from "../appfits/types.js";
import type { UseParams } from "../types/provider.js";
import type { AppConfig } from "../detectors/types.js";

export async function applyWithBackup(
  app: AppConfig,
  appfit: Appfit,
  params: UseParams,
  label: string,
): Promise<void> {
  // Backup
  const configPaths = appfit.resolveConfigPaths(app.path);
  for (const configPath of configPaths) {
    try {
      await copyFile(configPath, configPath + ".bak");
    } catch (e: unknown) {
      const code = (e as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") throw e;
    }
  }

  // Apply
  try {
    await appfit.apply(app.path, params);
  } catch (error) {
    throw new Error(
      `Failed to modify ${app.name} config: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Output
  const lines: string[] = [`✅ ${label}`];
  if (params.model) lines.push(`   model: ${params.model}`);
  if (params.models && params.models.length > 1)
    lines.push(`   fallback: [${params.models.slice(1).join(", ")}]`);
  if (params.effortLevel) lines.push(`   effort: ${params.effortLevel}`);
  const envCount = params.env ? Object.keys(params.env).length : 0;
  if (envCount > 0) lines.push(`   env: ${envCount} var(s)`);
  lines.push("Please restart the application.");
  console.log(lines.join("\n"));
}
