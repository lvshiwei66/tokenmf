import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import type { Appfit } from "./types.js";
import type { UseParams } from "../types/provider.js";

function inferProvider(baseUrl: string): string {
  if (baseUrl.includes("/anthropic")) return "anthropic";
  return "openai";
}

export const hermesAppfit: Appfit = {
  name: "hermes",

  resolveConfigPaths(appPath: string): string[] {
    return [join(appPath, "config.yaml")];
  },

  requiredProtocol(): "openai" | "anthropic" | undefined {
    return undefined; // supports both, determined at apply time
  },

  async apply(appPath: string, params: UseParams): Promise<void> {
    const configPath = join(appPath, "config.yaml");

    // Read existing config
    let doc: YAML.Document;
    try {
      const raw = await readFile(configPath, "utf-8");
      doc = YAML.parseDocument(raw);
    } catch {
      doc = new YAML.Document();
    }

    const provider = inferProvider(params.baseUrl);
    const primaryModel = params.models?.[0] ?? params.model;

    // Set model section
    const modelNode = doc.get("model", true) as YAML.YAMLMap | null;
    if (!modelNode || !YAML.isMap(modelNode)) {
      doc.set("model", doc.createNode({}));
    }

    const modelMap = doc.get("model", true) as YAML.YAMLMap;
    if (primaryModel) {
      modelMap.set("default", `${provider}/${primaryModel}`);
    }
    modelMap.set("provider", "custom");
    modelMap.set("api_key", params.apiKey);
    modelMap.set("base_url", params.baseUrl);

    // Preserve comments and formatting
    await writeFile(configPath, doc.toString());
  },
};
