import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Appfit } from "./types.js";
import type { UseParams } from "../types/provider.js";

interface OpencodeConfig {
  $schema?: string;
  model?: string;
  provider?: Record<string, OpencodeProviderConfig>;
}

interface OpencodeProviderConfig {
  models: Record<string, { name?: string }>;
  npm: string;
  options: {
    apiKey: string;
    baseURL: string;
    setCacheKey?: boolean;
  };
}

const PROVIDER_NAME = "tmf";

function inferNpmPackage(baseUrl: string): string {
  if (baseUrl.includes("/anthropic")) return "@ai-sdk/anthropic";
  return "@ai-sdk/openai-compatible";
}

export const opencodeAppfit: Appfit = {
  name: "opencode",

  resolveConfigPaths(appPath: string): string[] {
    // opencode uses XDG config: ~/.config/opencode/opencode.json
    const xdgConfigHome = process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config");
    return [join(xdgConfigHome, "opencode", "opencode.json")];
  },

  requiredProtocol(): "openai" | "anthropic" | undefined {
    return "openai";
  },

  async apply(appPath: string, params: UseParams): Promise<void> {
    const xdgConfigHome = process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config");
    const configPath = join(xdgConfigHome, "opencode", "opencode.json");

    // Read existing or start fresh
    let config: OpencodeConfig;
    try {
      const raw = await readFile(configPath, "utf-8");
      config = JSON.parse(raw) as OpencodeConfig;
    } catch {
      config = {};
    }

    const npm = inferNpmPackage(params.baseUrl);
    const primaryModel = params.models?.[0] ?? params.model;

    const models: Record<string, { name?: string }> = {};
    if (primaryModel) {
      models[primaryModel] = {};
    }

    config.provider ??= {};
    config.provider[PROVIDER_NAME] = {
      models,
      npm,
      options: {
        apiKey: params.apiKey,
        baseURL: params.baseUrl,
        setCacheKey: true,
      },
    };

    // Set default model to our provider
    if (primaryModel) {
      config.model = `${PROVIDER_NAME}/${primaryModel}`;
    }

    await mkdir(join(xdgConfigHome, "opencode"), { recursive: true });
    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
  },
};
