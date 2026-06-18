#!/usr/bin/env node
import { Command } from "commander";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setup } from "./commands/setup.js";

export function createProgram() {
  const program = new Command();

  program
    .name("tmf")
    .description("Token魔方 — 管理和切换本地 AI 应用的第三方 LLM 提供商")
    .version("0.1.0");

  program
    .command("setup")
    .description("扫描已安装的 AI 应用并生成检测报告")
    .action(async () => {
      try {
        await setup();
      } catch (error) {
        console.error("❌ Setup 失败:", error);
        process.exit(1);
      }
    });

  return program;
}

const scriptPath = process.argv[1];
const modulePath = fileURLToPath(import.meta.url);

if (scriptPath && realpathSync(scriptPath) === realpathSync(modulePath)) {
  const program = createProgram();
  program.parse();
}
