import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { askAction } from "../commands/ask.js";
import type { ProviderDetail } from "../types/provider.js";

const mockDetail: ProviderDetail = {
  name: "packcode",
  intro: "深度求索 DeepSeek V4 旗舰模型。适合代码生成与推理任务。",
  website: "https://platform.deepseek.com",
  urls: { default: "https://api.deepseek.com/openai", openai: "https://api.deepseek.com/openai" },
  defaultModel: "deepseek-v4-pro",
  models: ["deepseek-v4-pro", "deepseek-v4-lite"],
  updated_at: "2026年6月19日 16:30",
};

let mockResult: ProviderDetail | { code: string; message: string; statusCode?: number } = mockDetail;

vi.mock("../providers/api.js", () => ({
  fetchProviderInfo: vi.fn(() => {
    return mockResult;
  }),
}));

describe("askAction", () => {
  let stdout: string[] = [];
  let stderr: string[] = [];
  const origLog = console.log;
  const origErr = console.error;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    console.log = (...args: unknown[]) => { stdout.push(args.map(String).join(" ")); };
    console.error = (...args: unknown[]) => { stderr.push(args.map(String).join(" ")); };
    mockResult = mockDetail;
  });

  afterEach(() => {
    console.log = origLog;
    console.error = origErr;
    vi.clearAllMocks();
  });

  it("renders provider detail", async () => {
    await askAction("packcode", {
      getConfig: () => Promise.resolve(null),
      getApiUrl: () => "https://test.api",
    }, { debug: false });

    const output = stdout.join("\n");
    expect(output).toContain("🔍 packcode");
    expect(output).toContain("简介：深度求索 DeepSeek V4 旗舰模型。适合代码生成与推理任务。");
    expect(output).toContain("网址：https://platform.deepseek.com");
    expect(output).toContain("默认模型：deepseek-v4-pro");
    expect(output).toContain("API 地址 (default)：https://api.deepseek.com/openai");
    expect(output).toContain("可用模型：deepseek-v4-pro, deepseek-v4-lite");
    expect(output).toContain("数据更新：2026年6月19日 16:30");
  });

  it("shows 404 error for unknown provider", async () => {
    mockResult = { code: "NOT_FOUND", message: "❌ 未找到供应商: unknown" };

    await askAction("unknown", {
      getConfig: () => Promise.resolve(null),
      getApiUrl: () => "https://test.api",
    }, { debug: false });

    expect(stderr.join("\n")).toContain("未找到供应商: unknown");
  });

  it("shows network error on fetch failure", async () => {
    mockResult = { code: "NETWORK", message: "❌ 请检查网络连接" };

    await askAction("packcode", {
      getConfig: () => Promise.resolve(null),
      getApiUrl: () => "https://test.api",
    }, { debug: false });

    expect(stderr.join("\n")).toContain("请检查网络连接");
  });

  it("shows 429 rate limit error", async () => {
    mockResult = { code: "RATE_LIMITED", message: "❌ 请求过于频繁，请稍后重试" };

    await askAction("packcode", {
      getConfig: () => Promise.resolve(null),
      getApiUrl: () => "https://test.api",
    }, { debug: false });

    expect(stderr.join("\n")).toContain("请求过于频繁");
  });

  it("outputs debug info when --debug is set", async () => {
    mockResult = { code: "SERVER_ERROR", message: "❌ 服务异常（状态码: 500），请稍后重试", statusCode: 500 };

    await askAction("packcode", {
      getConfig: () => Promise.resolve(null),
      getApiUrl: () => "https://test.api",
    }, { debug: true });

    const debugOutput = stderr.join("\n");
    expect(debugOutput).toContain("[Debug]");
    expect(debugOutput).toContain("500");
  });

  it("omits empty fields from output", async () => {
    mockResult = {
      name: "minimal",
      intro: "",
      website: "",
      urls: {},
      defaultModel: "",
      models: [],
      updated_at: "",
    };

    await askAction("minimal", {
      getConfig: () => Promise.resolve(null),
      getApiUrl: () => "https://test.api",
    }, { debug: false });

    const output = stdout.join("\n");
    expect(output).toContain("🔍 minimal");
    expect(output).not.toContain("简介：");
    expect(output).not.toContain("网址：");
    expect(output).not.toContain("默认模型：");
  });
});
