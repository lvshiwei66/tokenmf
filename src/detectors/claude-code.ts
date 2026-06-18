import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Detector, AppConfig } from "./types.js";
import { getVersion } from "../utils/version.js";

export class ClaudeCodeDetector implements Detector {
  name = "claude-code";

  detect(): AppConfig | null {
    const configDir = join(homedir(), ".claude");
    const configPath = join(configDir, "settings.json");

    if (!existsSync(configPath)) {
      return null;
    }

    const version = getVersion(configDir);

    return {
      name: "claude-code",
      version,
      path: configDir,
      configPath,
      configFormat: "json",
    };
  }
}
