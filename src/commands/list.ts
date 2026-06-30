import type { ConfigProvider } from "../config/index.js";
import { fetchProviderList } from "../providers/api.js";
import type { ProviderListItem } from "../types/provider.js";

export interface ListOptions {
  all: boolean;
  debug: boolean;
}

const DEFAULT_LIMIT = 20;

function truncateDesc(desc: string, maxLen: number): string {
  const chars = Array.from(desc);
  if (chars.length <= maxLen) return desc;
  return chars.slice(0, maxLen).join("") + "...";
}

function formatModels(models: string[], modelCount: number): string {
  const MAX_MODEL_LEN = 10;
  const trunc = (m: string) => m.length > MAX_MODEL_LEN ? m.slice(0, MAX_MODEL_LEN) + "…" : m;
  const shown = models.slice(0, 2).map(trunc);
  let result = shown.join(", ");
  if (modelCount > 2) {
    result += ` (+${String(modelCount)})`;
  }
  return result;
}

const COLS = { name: 10, models: 32, desc: 32, tags: 24 } as const;

function pad(text: string, width: number): string {
  const chars = Array.from(text);
  if (chars.length > width) return chars.slice(0, width - 1).join("") + "…";
  return text.padEnd(width);
}

function formatTable(items: ProviderListItem[], total: number, all: boolean): string {
  const rows = all ? items : items.slice(0, DEFAULT_LIMIT);

  const header =
    pad("Name", COLS.name) + " " +
    pad("Models", COLS.models) + " " +
    pad("Description", COLS.desc) + " " +
    pad("Tags", COLS.tags);

  const lines = [header];

  for (const p of rows) {
    lines.push(
      pad(p.name, COLS.name) + " " +
      pad(formatModels(p.models, p.modelCount), COLS.models) + " " +
      pad(truncateDesc(p.description, COLS.desc), COLS.desc) + " " +
      pad(p.tags.join(", "), COLS.tags),
    );
  }

  let output = lines.join("\n");

  if (!all && total > DEFAULT_LIMIT) {
    output += `\n---\n${String(total)} provider(s) total. Use --all to show all`;
  } else {
    output += `\n---\n${String(total)} provider(s) total`;
  }

  return output;
}

export async function listAction(
  configProvider: ConfigProvider,
  options: ListOptions,
): Promise<void> {
  const config = await configProvider.getConfig();
  const apiUrl = configProvider.getApiUrl(config);
  const fingerprint = config?.fingerprint ?? "unknown";
  const startedAt = Date.now();

  const result = await fetchProviderList(apiUrl, fingerprint);

  if ("code" in result) {
    if (options.debug) {
      console.error(`[Debug] Request URL: ${apiUrl}/api/v1/providers`);
      console.error(`[Debug] Error code: ${result.code}`);
      if (result.statusCode != null) {
        console.error(`[Debug] Status code: ${String(result.statusCode)}`);
      }
    }
    console.error(result.message);
    return;
  }

  const elapsed = Date.now() - startedAt;

  if (options.debug) {
    console.error(`[Debug] Request URL: ${apiUrl}/api/v1/providers`);
    console.error(`[Debug] Elapsed: ${String(elapsed)}ms`);
    console.error(`[Debug] Provider count: ${String(result.total)}`);
  }

  const output = formatTable(result.providers, result.total, options.all);
  console.log(output);
}
