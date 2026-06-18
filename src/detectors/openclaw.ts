import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Detector, AppConfig } from "./types.js";
import { getVersion } from "../utils/version.js";

export class OpenClawDetector implements Detector {
  name = "openclaw";

  detect(): AppConfig | null {
    const configDir = join(homedir(), ".openclaw");
    const configPath = join(configDir, "config.yaml");

    if (!existsSync(configPath)) {
      return null;
    }

    const version = getVersion(configDir);

    return {
      name: "openclaw",
      version,
      path: configDir,
      configPath,
      configFormat: "yaml",
    };
  }
}
