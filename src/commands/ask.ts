import type { ConfigProvider } from "../config.js";
import { fetchProviderInfo } from "../providers/api.js";

export interface AskOptions {
  debug: boolean;
}

export async function askAction(
  provider: string,
  configProvider: ConfigProvider,
  options: AskOptions,
): Promise<void> {
  const config = await configProvider.getConfig();
  const apiUrl = configProvider.getApiUrl(config);
  const fingerprint = config?.fingerprint ?? "unknown";

  const result = await fetchProviderInfo(apiUrl, fingerprint, provider);

  if ("code" in result) {
    if (options.debug) {
      console.error(`[Debug] 请求 URL: ${apiUrl}/api/v1/providers/${provider}`);
      console.error(`[Debug] 错误码: ${result.code}`);
      if (result.statusCode != null) {
        console.error(`[Debug] 状态码: ${String(result.statusCode)}`);
      }
    }
    console.error(result.message);
    return;
  }

  const d = result;
  const intro = d.intro ? `  简介：${d.intro}` : "";
  const website = d.website ? `  网址：${d.website}` : "";
  const defaultModel = d.defaultModel ? `  默认模型：${d.defaultModel}` : "";
  const urlLines = d.urls && Object.keys(d.urls).length > 0
    ? Object.entries(d.urls).map(([proto, url]) => `  API 地址 (${proto})：${url}`)
    : ["  API 地址：未配置"];
  const models = d.models.length > 0 ? `  可用模型：${d.models.join(", ")}` : "";
  const updated = d.updated_at ? `  数据更新：${d.updated_at}` : "";

  const lines = [
    `🔍 ${d.name}`,
    "",
    intro,
    website,
    defaultModel,
    ...urlLines,
    models,
    updated,
  ].filter((l) => l !== "");

  console.log(lines.join("\n"));
}
