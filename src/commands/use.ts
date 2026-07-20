import { detectAllApps } from "../detectors/index.js";
import {
  loadSettings,
  saveSettings,
  getProviderMemory,
  setProviderMemory,
  loadTemplates,
  getTemplate,
} from "../config/index.js";
import type { Template } from "../types/provider.js";

import { fetchProviderInfo } from "../providers/api.js";
import { selectApp, configureApp, getAppfit } from "../appfits/index.js";
import type { UseParams, ProviderDetail, RoleModels } from "../types/provider.js";
import type { AppConfig } from "../detectors/types.js";

async function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    const wasRaw = stdin.isRaw;
    if (!wasRaw) stdin.setRawMode(true);
    stdout.write(prompt);

    let answer = "";
    const cleanup = () => {
      stdin.removeListener("data", onData);
      if (!wasRaw) stdin.setRawMode(false);
      stdin.pause();
    };
    const onData = (chunk: Buffer) => {
      const str = chunk.toString("utf-8");
      for (const char of str) {
        if (char === "\r" || char === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(answer.trim());
          return;
        }
        if (char === "\x7f" || char === "\b") {
          // backspace
          if (answer.length > 0) {
            answer = answer.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        if (char >= " ") {
          answer += char;
          stdout.write("*");
        }
      }
    };

    stdin.resume();
    stdin.on("data", onData);
  });
}

function resolveModel(
  cliModel: string | undefined,
  memoryModel: string | undefined,
  defaultModel: string,
): string | undefined {
  if (cliModel) return cliModel;
  if (memoryModel) return memoryModel;
  if (defaultModel) return defaultModel;
  return undefined;
}

/**
 * Apply a saved template to target app(s).
 * CLI options override template values (--app, --key, --model, etc.).
 */
async function applyTemplate(
  templateName: string,
  template: Template,
  options: { key?: string; model?: string; models?: string[]; roleModels?: RoleModels; env?: Record<string, string>; effortLevel?: string; app?: string },
): Promise<void> {
  // Merge: CLI options override template values
  const apiKey = options.key ?? template.apiKey;
  const model = options.model ?? template.model;
  const models = options.models ?? template.models;
  const roleModels = options.roleModels ?? template.roleModels;
  const env = options.env ?? template.env;
  const effortLevel = options.effortLevel ?? template.effortLevel;

  const params: UseParams = {
    provider: templateName,
    baseUrl: template.baseUrl,
    apiKey,
    model,
    models,
    roleModels,
    env,
    effortLevel,
  };

  if (options.app ?? template.app) {
    // Single target app
    const targetAppName = options.app ?? template.app!;
    await configureApp(
      targetAppName,
      params,
      `Template "${templateName}" applied to ${targetAppName}`,
    );
    return;
  }

  // Apply to all detected apps
  const allApps = detectAllApps();
  if (allApps.length === 0) {
    throw new Error("No installed applications detected. Please install an AI application first.");
  }

  for (const app of allApps) {
    try {
      await configureApp(
        app.name,
        params,
        `Template "${templateName}" applied to ${app.name}`,
      );
    } catch (error) {
      console.warn(`⚠ Skipped ${app.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export async function useCommand(
  provider: string,
  options: { key?: string; model?: string; models?: string[]; roleModels?: RoleModels; env?: Record<string, string>; effortLevel?: string; app?: string },
  apiUrl: string,
  clientId?: string,
): Promise<void> {
  // 0. Check templates first
  const templateStore = await loadTemplates();
  const template = getTemplate(templateStore, provider);
  if (template) {
    await applyTemplate(provider, template, options);
    return;
  }

  // 1. Load settings and provider memory
  const settings = await loadSettings();
  let memory = getProviderMemory(settings, provider);

  // 2. Resolve apiKey: CLI > memory > interactive (TTY only)
  let apiKey = options.key ?? memory?.apiKey;
  if (!apiKey) {
    if (!process.stdin.isTTY) {
      throw new Error(
        `Provider "${provider}" not found and no API key available.\n` +
          `Use --key to provide an API key, or check available templates with "tmf save".`,
      );
    }
    const currentHint = memory?.apiKey
      ? ` [current: ${"*".repeat(8)}]`
      : "";
    const prompt =
      `Enter API Key for ${provider}${currentHint} (input hidden): `;
    apiKey = await promptHidden(prompt);
    if (!apiKey && memory?.apiKey) {
      apiKey = memory.apiKey;
    }
  }

  if (!apiKey) {
    throw new Error("No API Key provided, operation cancelled.");
  }

  // 3. Resolve providerInfo
  let providerInfo: ProviderDetail | undefined;
  if (memory?.urls) {
    providerInfo = {
      name: provider,
      urls: memory.urls,
      defaultModel: memory.model ?? "",
      models: [],
      intro: "",
      website: "",
      updated_at: "",
    };
  } else {
    const cid = clientId ?? "unknown";
    const result = await fetchProviderInfo(apiUrl, cid, provider);
    if ("code" in result) {
      throw new Error(`Cannot get info for Provider "${provider}". ${result.message}`);
    }
    providerInfo = result;
  }

  // 4. Resolve model: --models[0] > --model > memory > provider default
  const effectiveModel = options.models?.[0] ?? options.model;
  const model = resolveModel(effectiveModel, memory?.model, providerInfo.defaultModel);

  // 5. Apply to target app(s)
  if (options.app) {
    // Single target: resolve protocol URL
    const allApps = detectAllApps();
    const target = selectApp(options.app, allApps);
    const appfit = getAppfit(target.name);
    if (!appfit) {
      throw new Error(`Unsupported application: ${target.name}`);
    }

    const protocol = appfit.requiredProtocol() ?? "default";
    const resolvedUrl = providerInfo.urls[protocol] ?? providerInfo.urls["default"];
    if (!resolvedUrl) {
      throw new Error(`Provider "${provider}" missing URL for "${protocol}" protocol.`);
    }

    await configureApp(
      target.name,
      {
        provider,
        baseUrl: resolvedUrl,
        apiKey,
        model,
        models: options.models,
        roleModels: options.roleModels,
        env: options.env,
        effortLevel: options.effortLevel,
      },
      `Switched ${target.name} to ${provider}`,
    );
  } else {
    // All detected apps: resolve protocol per app
    const allApps = detectAllApps();
    if (allApps.length === 0) {
      throw new Error("No installed applications detected. Please install an AI application first.");
    }

    for (const app of allApps) {
      const appfit = getAppfit(app.name);
      if (!appfit) {
        console.warn(`⚠ Unsupported application: ${app.name}, skipped.`);
        continue;
      }

      const protocol = appfit.requiredProtocol() ?? "default";
      const resolvedUrl = providerInfo.urls[protocol] ?? providerInfo.urls["default"];
      if (!resolvedUrl) {
        console.warn(`⚠ Provider "${provider}" missing URL for "${protocol}" protocol, skipped ${app.name}.`);
        continue;
      }

      await configureApp(
        app.name,
        {
          provider,
          baseUrl: resolvedUrl,
          apiKey,
          model,
          models: options.models,
          roleModels: options.roleModels,
          env: options.env,
          effortLevel: options.effortLevel,
        },
        `Switched ${app.name} to ${provider}`,
      );
    }
  }

  // 6. Update memory (shared across all apps)
  const updatedMemory = {
    apiKey,
    model: model ?? undefined,
    urls: providerInfo.urls,
  };
  setProviderMemory(settings, provider, updatedMemory);
  await saveSettings(settings);
}
