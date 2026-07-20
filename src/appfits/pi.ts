import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Appfit } from "./types.js";
import type { UseParams } from "../types/provider.js";

interface PiModelsJson {
  providers?: Record<string, PiProviderConfig>;
}

interface PiProviderConfig {
  baseUrl: string;
  api: string;
  apiKey: string;
  models: PiModelConfig[];
}

interface PiModelConfig {
  id: string;
  name?: string;
  reasoning?: boolean;
  input?: string[];
  contextWindow?: number;
  maxTokens?: number;
  cost?: { input: number; output: number; cacheRead: number; cacheWrite: number };
}

const PROVIDER_NAME = "tmf";

function inferApi(baseUrl: string): string {
  if (baseUrl.includes("/anthropic")) return "anthropic-messages";
  return "openai-completions";
}

export const piAppfit: Appfit = {
  name: "pi",

  resolveConfigPaths(appPath: string): string[] {
    return [join(appPath, "agent", "models.json")];
  },

  requiredProtocol(): "openai" | "anthropic" | undefined {
    return undefined; // Pi supports both, determined at apply time
  },

  async apply(appPath: string, params: UseParams): Promise<void> {
    const configPath = join(appPath, "agent", "models.json");

    // Read existing or start fresh
    let config: PiModelsJson;
    try {
      const raw = await readFile(configPath, "utf-8");
      config = JSON.parse(raw) as PiModelsJson;
    } catch {
      config = {};
    }

    const api = inferApi(params.baseUrl);
    const primaryModel = params.models?.[0] ?? params.model;

    const models: PiModelConfig[] = [];
    if (primaryModel) {
      models.push({
        id: primaryModel,
        reasoning: false,
        input: ["text"],
        contextWindow: 128000,
        maxTokens: 16384,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      });
    }

    config.providers ??= {};
    config.providers[PROVIDER_NAME] = {
      baseUrl: params.baseUrl,
      api,
      apiKey: params.apiKey,
      models,
    };

    await mkdir(join(appPath, "agent"), { recursive: true });
    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
  },
};
