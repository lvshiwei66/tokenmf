import Table from "cli-table3";
import { fetchProviderList } from "../providers/api.js";
import type { ProviderListItem } from "../types/provider.js";

export interface ListOptions {
  all: boolean;
  debug: boolean;
}

const DEFAULT_LIMIT = 20;

/** Column widths (terminal display columns — CJK chars count as 2) */
const COLS = { name: 20, models: 32, desc: 32, tags: 24 } as const;

/**
 * Format models cell content.
 * Shows up to 2 model names; appends (+N) for remaining.
 * Truncates model names (not count) when the cell would overflow.
 */
function formatModels(models: string[]): string {
  if (!models || models.length === 0) return "-";
  const maxVisible = 2;
  const shown = models.slice(0, maxVisible);
  let result = shown.join(", ");
  if (models.length > maxVisible) {
    result += ` (+${String(models.length - maxVisible)})`;
  }
  if (result.length > COLS.models) {
    result = result.slice(0, COLS.models - 3) + "...";
  }
  return result;
}

function formatTable(items: ProviderListItem[], total: number, all: boolean): string {
  const table = new Table({
    head: ["Name", "Models", "Description", "Tags"],
    colWidths: [COLS.name, COLS.models, COLS.desc, COLS.tags],
    wordWrap: false,
    style: { head: [], border: [] },
  });

  for (const item of items) {
    table.push([
      item.name,
      formatModels(item.models),
      item.description ?? "",
      item.tags?.join(", ") ?? "",
    ]);
  }

  let output = table.toString();

  if (!all && total > DEFAULT_LIMIT) {
    output += `\n---\n${String(total)} provider(s) total. Use --all to show all`;
  } else {
    output += `\n---\n${String(total)} provider(s) total`;
  }

  return output;
}

export async function listAction(
  apiUrl: string,
  clientId: string,
  options: ListOptions,
): Promise<void> {
  const startedAt = Date.now();

  const result = await fetchProviderList(apiUrl, clientId);

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
