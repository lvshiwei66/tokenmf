import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { listAction } from "../commands/list.js";
import type { ProviderListItem } from "../types/provider.js";

const sampleProviders: ProviderListItem[] = [
  {
    name: "packcode",
    latency: 200,
    price: "$0.04",
    tokensPerSecond: 17,
    description: "支持 GPT-5.5 和 Claude-4 🚀",
    tags: ["fast", "cheap"],
    models: ["m1", "m2", "m3", "m4"],
    modelCount: 4,
  },
  {
    name: "xcodcs",
    latency: 79,
    price: "¥1.50",
    tokensPerSecond: null,
    description: "",
    tags: [],
    models: ["x1"],
    modelCount: 1,
  },
];

let mockProviders = sampleProviders;
let mockError: { code: string; message: string; statusCode?: number } | null = null;

vi.mock("../providers/api.js", () => ({
  fetchProviderList: vi.fn(async () => {
    if (mockError) return mockError;
    return { providers: mockProviders, total: mockProviders.length };
  }),
}));

describe("listAction", () => {
  let stdout: string[] = [];
  let stderr: string[] = [];
  const origLog = console.log;
  const origErr = console.error;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    mockProviders = sampleProviders;
    mockError = null;
    console.log = (...args: unknown[]) => { stdout.push(args.map(String).join(" ")); };
    console.error = (...args: unknown[]) => { stderr.push(args.map(String).join(" ")); };
  });

  afterEach(() => {
    console.log = origLog;
    console.error = origErr;
    vi.clearAllMocks();
  });

  it("renders provider table with default 20 limit", async () => {
    await listAction(
      { getConfig: async () => null, getApiUrl: () => "https://test.api" },
      { all: false, debug: false },
    );

    const output = stdout.join("\n");
    expect(output).toContain("packcode");
    expect(output).toContain("200ms");
    expect(output).toContain("$0.04");
    expect(output).toContain("m1, m2, m3 (+1)");
    expect(output).toContain("共 2 家供应商");
  });

  it("renders all providers with --all", async () => {
    await listAction(
      { getConfig: async () => null, getApiUrl: () => "https://test.api" },
      { all: true, debug: false },
    );

    const output = stdout.join("\n");
    expect(output).toContain("packcode");
    expect(output).toContain("xcodcs");
  });

  it("shows model column correctly for small model lists", async () => {
    await listAction(
      { getConfig: async () => null, getApiUrl: () => "https://test.api" },
      { all: false, debug: false },
    );

    const output = stdout.join("\n");
    expect(output).toContain("x1");
  });

  it("truncates description in table", async () => {
    // Description > 32 chars → truncateDesc adds "..."
    // Column width 28 will also clamp, but let's verify the truncation happened
    const longDesc = "这是一个较长的描述文本用于测试截断功能效果验证";
    mockProviders = [{
      name: "test",
      latency: 100,
      price: "$0.01",
      tokensPerSecond: null,
      description: longDesc,
      tags: [],
      models: [],
      modelCount: 0,
    }];

    await listAction(
      { getConfig: async () => null, getApiUrl: () => "https://test.api" },
      { all: false, debug: false },
    );

    const output = stdout.join("\n");
    // The description should appear truncated in the output
    expect(output).toContain("test");
    // full description should NOT appear (it would take 40+ chars)
    expect(output).not.toContain("验证");
  });

  it("outputs debug info when --debug is set", async () => {
    await listAction(
      { getConfig: async () => null, getApiUrl: () => "https://test.api" },
      { all: false, debug: true },
    );

    const debugOutput = stderr.join("\n");
    expect(debugOutput).toContain("[Debug]");
    expect(debugOutput).toContain("返回供应商数: 2");
  });

  it("shows network error message on fetch failure", async () => {
    mockError = { code: "NETWORK", message: "❌ 请检查网络连接" };

    await listAction(
      { getConfig: async () => null, getApiUrl: () => "https://test.api" },
      { all: false, debug: false },
    );

    expect(stderr.join("\n")).toContain("请检查网络连接");
  });

  it("shows service error on non-200 response", async () => {
    mockError = { code: "SERVER_ERROR", message: "❌ 服务异常（状态码: 500），请稍后重试", statusCode: 500 };

    await listAction(
      { getConfig: async () => null, getApiUrl: () => "https://test.api" },
      { all: false, debug: false },
    );

    expect(stderr.join("\n")).toContain("服务异常");
  });

  it("shows data error on JSON parse failure", async () => {
    mockError = { code: "PARSE", message: "❌ 响应数据异常" };

    await listAction(
      { getConfig: async () => null, getApiUrl: () => "https://test.api" },
      { all: false, debug: false },
    );

    expect(stderr.join("\n")).toContain("响应数据异常");
  });
});
