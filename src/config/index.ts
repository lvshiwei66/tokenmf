import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Template } from "../types/provider.js";

export { getFingerprint, getClientId } from "../utils/fingerprint.js";

// ── Settings types ───────────────────────────────────────────

export interface ProviderMemory {
  apiKey: string;
  model?: string;
  urls: Record<string, string>;
}

export interface Settings {
  clientId?: string;
  providers: Record<string, ProviderMemory>;
}

// ── Paths ────────────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), ".tmf");
const SETTINGS_PATH = join(CONFIG_DIR, "store", "used.json");
const TEMPLATES_PATH = join(CONFIG_DIR, "templates.json");

export { CONFIG_DIR, TEMPLATES_PATH };

// ── API URL ──────────────────────────────────────────────────

const DEFAULT_API_URL = "https://tokenmf.com";

/**
 * Resolve the API base URL using priority:
 * 1. TMF_API_URL env var
 * 2. Default
 */
export function getApiUrl(): string {
  const envUrl = process.env["TMF_API_URL"];
  if (envUrl) return envUrl;
  return DEFAULT_API_URL;
}

// ── Settings I/O ─────────────────────────────────────────────

function createDefaultSettings(): Settings {
  return { providers: {} };
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      clientId: parsed.clientId,
      providers: parsed.providers ?? {},
    };
  } catch {
    return createDefaultSettings();
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await mkdir(join(CONFIG_DIR, "store"), { recursive: true });
  const tmpPath = SETTINGS_PATH + ".tmp";
  await writeFile(tmpPath, JSON.stringify(settings, null, 2));
  await rename(tmpPath, SETTINGS_PATH);
}

export function getProviderMemory(
  settings: Settings,
  providerName: string,
): ProviderMemory | undefined {
  return settings.providers[providerName];
}

export function setProviderMemory(
  settings: Settings,
  providerName: string,
  memory: ProviderMemory,
): void {
  settings.providers[providerName] = memory;
}

// ── Template I/O ──────────────────────────────────────────────

export interface TemplateStore {
  templates: Record<string, Template>;
}

export async function loadTemplates(): Promise<TemplateStore> {
  try {
    const raw = await readFile(TEMPLATES_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TemplateStore>;
    return { templates: parsed.templates ?? {} };
  } catch {
    return { templates: {} };
  }
}

export async function saveTemplates(store: TemplateStore): Promise<void> {
  await mkdir(join(CONFIG_DIR), { recursive: true });
  const tmpPath = TEMPLATES_PATH + ".tmp";
  await writeFile(tmpPath, JSON.stringify(store, null, 2));
  await rename(tmpPath, TEMPLATES_PATH);
}

export function getTemplate(
  store: TemplateStore,
  name: string,
): Template | undefined {
  return store.templates[name];
}

export function setTemplate(
  store: TemplateStore,
  template: Template,
): void {
  store.templates[template.name] = template;
}

export function deleteTemplate(store: TemplateStore, name: string): boolean {
  if (store.templates[name]) {
    delete store.templates[name];
    return true;
  }
  return false;
}
