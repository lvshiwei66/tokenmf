import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Appfit } from "./types.js";
import type { UseParams } from "../types/provider.js";

interface ClaudeCodeEnv {
  ANTHROPIC_AUTH_TOKEN?: string;
  ANTHROPIC_BASE_URL?: string;
  ANTHROPIC_MODEL?: string;
  [key: string]: unknown;
}

interface ClaudeCodeSettings {
  env?: ClaudeCodeEnv;
  [key: string]: unknown;
}

export const claudeCodeAppfit: Appfit = {
  name: "claude-code",

  resolveConfigPaths(appPath: string): string[] {
    return [join(appPath, "settings.json")];
  },

  requiredProtocol(): "openai" | "anthropic" | undefined {
    return "anthropic";
  },

  async apply(appPath: string, params: UseParams): Promise<void> {
    const configPath = join(appPath, "settings.json");
    const raw = await readFile(configPath, "utf-8");
    const settings = JSON.parse(raw) as ClaudeCodeSettings;

    // Claude Code reads provider config from the env block
    if (!settings.env) {
      settings.env = {};
    }

    settings.env.ANTHROPIC_AUTH_TOKEN = params.apiKey;
    settings.env.ANTHROPIC_BASE_URL = params.baseUrl;

    if (params.model) {
      settings.env.ANTHROPIC_MODEL = params.model;
    }

    // Clean up erroneously-written top-level keys from prior buggy Appfit runs
    delete settings.provider;
    delete settings.apiKey;
    delete settings.baseUrl;
    delete settings.model;

    await writeFile(configPath, JSON.stringify(settings, null, 2) + "\n");
  },
};
