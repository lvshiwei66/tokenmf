import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { detectAllApps } from "../detectors/index.js";
import { getFingerprint, CONFIG_DIR, CONFIG_PATH, saveConfig } from "../config/index.js";
import type { DetectionReport } from "../detectors/types.js";

export async function setup(): Promise<void> {
  console.log("Scanning for installed AI agents...\n");

  const apps = detectAllApps();
  const fingerprint = getFingerprint();

  if (apps.length === 0) {
    console.log("ℹ️ No installed AI applications detected.");
  } else {
    console.log(`Detected ${String(apps.length)} application(s):\n`);
    for (const app of apps) {
      console.log(`  ${app.name}`);
      if (app.version) console.log(`    Version: ${app.version}`);
      console.log(`    Path: ${app.path}`);
      console.log(`    Config: ${app.configPath}`);
      console.log(`    Format: ${app.configFormat.toUpperCase()}`);
      console.log();
    }
  }

  const report: DetectionReport = {
    timestamp: new Date().toISOString(),
    apps,
    fingerprint,
  };

  await mkdir(CONFIG_DIR, { recursive: true });

  const reportPath = join(CONFIG_DIR, "detection-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  await saveConfig(CONFIG_PATH, { fingerprint });

  console.log(`Detection report saved to: ${reportPath}`);
}
