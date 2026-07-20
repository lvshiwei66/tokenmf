import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Appfit } from "./types.js";
import type { UseParams } from "../types/provider.js";
import type { AppConfig } from "../detectors/types.js";
import { detectAllApps } from "../detectors/index.js";
import { applyWithBackup } from "../commands/apply-backup.js";
import { codexAppfit } from "./codex.js";
import { claudeCodeAppfit } from "./claude-code.js";
import { openclawAppfit } from "./openclaw.js";
import { piAppfit } from "./pi.js";
import { opencodeAppfit } from "./opencode.js";
import { hermesAppfit } from "./hermes.js";

const registry: Record<string, Appfit> = {
  codex: codexAppfit,
  "claude-code": claudeCodeAppfit,
  openclaw: openclawAppfit,
  opencode: opencodeAppfit,
  hermes: hermesAppfit,
  pi: piAppfit,
};

/** Aliases that map to the canonical app name. */
const ALIASES: Record<string, string> = {
  codex: "codex",
  claude: "claude-code",
  cc: "claude-code",
  "claude-code": "claude-code",
  openclaw: "openclaw",
  opencode: "opencode",
  hermes: "hermes",
  pi: "pi",
};

/** Resolve an alias or canonical name to the canonical app name. */
export function resolveAppName(raw: string): string | undefined {
  return ALIASES[raw.toLowerCase()];
}

export function getAppfit(name: string): Appfit | undefined {
  const canonical = resolveAppName(name);
  return canonical ? registry[canonical] : undefined;
}

/** List all supported app names with aliases for display. */
export function getSupportedAppNames(): string {
  const names = Object.keys(ALIASES)
    .filter((k) => k === ALIASES[k]) // canonical names only
    .map((k) => {
      const aliases = Object.entries(ALIASES)
        .filter(([a, c]) => c === k && a !== k)
        .map(([a]) => a);
      return aliases.length > 0 ? `${k} (${aliases.join(", ")})` : k;
    });
  return names.join(", ");
}

/**
 * Create a standard JSON-config Appfit for OpenAI-compatible apps.
 * The config file is `{appPath}/config.json` with these keys:
 * provider, api_key, base_url, model, models[], model_reasoning_effort.
 */
function createJsonAppfit(name: string): Appfit {
  return {
    name,

    resolveConfigPaths(appPath: string): string[] {
      return [join(appPath, "config.json")];
    },

    requiredProtocol(): "openai" | "anthropic" | undefined {
      return "openai";
    },

    async apply(appPath: string, params: UseParams): Promise<void> {
      const configPath = join(appPath, "config.json");
      const raw = await readFile(configPath, "utf-8");
      const config = JSON.parse(raw) as Record<string, unknown>;

      config.provider = params.provider;
      config.api_key = params.apiKey;
      config.base_url = params.baseUrl;

      const primaryModel = params.models?.[0] ?? params.model;
      if (primaryModel) {
        config.model = primaryModel;
      }

      if (params.models && params.models.length > 0) {
        config.models = params.models;
      }

      if (params.effortLevel) {
        config.model_reasoning_effort = params.effortLevel;
      }

      await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    },
  };
}

// ── App selection ────────────────────────────────────────────

/**
 * Select a single app from the detection results.
 * Used by set, use, and rollback commands.
 */
export function selectApp(
  providedApp: string | undefined,
  apps: AppConfig[],
): AppConfig {
  if (providedApp) {
    const canonicalName = resolveAppName(providedApp);
    if (!canonicalName) {
      throw new Error(
        `Unknown application "${providedApp}". Available: ${getSupportedAppNames()}.`,
      );
    }
    const app = apps.find((a) => a.name === canonicalName);
    if (!app) {
      throw new Error(
        `${canonicalName} installation not detected, skipping.`,
      );
    }
    return app;
  }

  if (apps.length === 0) {
    throw new Error(
      `No installed AI applications detected. Supported apps: ${getSupportedAppNames()}.`,
    );
  }

  if (apps.length === 1) {
    return apps[0];
  }

  const names = apps.map((a) => a.name).join("、");
  throw new Error(
    `Multiple applications detected (${names}). Use --app to specify the target application.`,
  );
}

// ── Shared config mutation ───────────────────────────────────

/**
 * Detect, select, and apply configuration to a single app.
 * This is the shared core used by both `set` and `use` commands.
 */
export async function configureApp(
  appName: string,
  params: UseParams,
  label: string,
): Promise<void> {
  const apps = detectAllApps();
  const target = selectApp(appName, apps);
  const appfit = getAppfit(target.name);
  if (!appfit) {
    throw new Error(`No appfit found for "${target.name}".`);
  }
  await applyWithBackup(target, appfit, params, label);
}
