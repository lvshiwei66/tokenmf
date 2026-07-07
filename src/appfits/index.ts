import type { Appfit } from "./types.js";
import { codexAppfit } from "./codex.js";
import { claudeCodeAppfit } from "./claude-code.js";
import { openclawAppfit } from "./openclaw.js";

const registry: Record<string, Appfit> = {
  codex: codexAppfit,
  "claude-code": claudeCodeAppfit,
  openclaw: openclawAppfit,
};

/** Aliases that map to the canonical app name. */
const ALIASES: Record<string, string> = {
  codex: "codex",
  claude: "claude-code",
  cc: "claude-code",
  "claude-code": "claude-code",
  openclaw: "openclaw",
};

/** Resolve an alias or canonical name to the canonical app name. */
export function resolveAppName(raw: string): string | undefined {
  return ALIASES[raw.toLowerCase()];
}

export function getAppfit(name: string): Appfit | undefined {
  const canonical = resolveAppName(name);
  return canonical ? registry[canonical] : undefined;
}
