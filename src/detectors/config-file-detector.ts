import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { Detector, AppConfig } from "./types.js";
import { getVersion } from "../utils/version.js";
import { whichSync } from "../utils/which.js";

export interface DetectorConfig {
  name: string;
  configDirName: string;
  configFileName: string;
  configFormat: AppConfig["configFormat"];
  executableNames?: string[];
}

export class ConfigFileDetector implements Detector {
  name: string;
  #config: DetectorConfig;

  constructor(config: DetectorConfig) {
    this.name = config.name;
    this.#config = config;
  }

  detect(): AppConfig | null {
    const configDir = join(homedir(), this.#config.configDirName);
    const configPath = join(configDir, this.#config.configFileName);
    const hasConfig = existsSync(configPath);

    // Check if executable is in PATH (only when executableNames is specified)
    let execFound = false;
    if (this.#config.executableNames?.length) {
      execFound = this.#config.executableNames.some(
        (name) => whichSync(name) !== null,
      );
    }

    // Not installed at all (executable check SKIPPED when executableNames not configured)
    if (!hasConfig && !execFound) return null;

    // Installed but config file missing: auto-create only if executable was verified
    if (!hasConfig && execFound) {
      mkdirSync(dirname(configPath), { recursive: true });
      writeFileSync(configPath, this.#emptyConfig());
    }
    const version = getVersion(configDir);

    return {
      name: this.#config.name,
      version,
      path: configDir,
      configPath,
      configFormat: this.#config.configFormat,
    };
  }

  #emptyConfig(): string {
    switch (this.#config.configFormat) {
      case "json": return "{}\n";
      case "yaml": return "{}\n";
      case "toml": return "";
      default: return "{}\n";
    }
  }
}
