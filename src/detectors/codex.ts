import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Detector, AppConfig } from "./types.js";
import { getVersion } from "../utils/version.js";

export class CodexDetector implements Detector {
  name = "codex";

  detect(): AppConfig | null {
    const configDir = join(homedir(), ".codex");
    const configPath = join(configDir, "config.toml");

    if (!existsSync(configPath)) {
      return null;
    }

    const version = getVersion(configDir);

    return {
      name: "codex",
      version,
      path: configDir,
      configPath,
      configFormat: "toml",
    };
  }
}
