# Token魔方 CLI (`tmf`)

Spin up any LLM provider in one CLI command.

## 安装

推荐全局安装：

```bash
npm install -g @tokenmofang/cli
```

安装后即可使用 `tmf` 命令：

```bash
tmf --help
```

### 文件 IO 权限说明

`tmf` 需要以下文件系统访问权限：

- **读取** `~/.codex/`、`~/.claude/`、`~/.openclaw/` 等 AI 应用配置目录，用于自动检测已安装应用
- **写入** `~/.tokenmofang/` 目录，用于保存检测报告和运行时配置
- **读写** 目标应用的配置文件（`use` / `rollback` 命令时会创建 `.bak` 备份）

请以普通用户身份运行，避免 `sudo` 导致配置文件权限问题。

## 使用

```bash
# 查看帮助
tmf --help

# 浏览可用厂商
tmf list

# 查看全部厂商
tmf list --all

# 切换厂商
tmf use openai -k sk-xxx -m gpt-4o

# 回滚配置
tmf rollback

# 测试厂商延迟
tmf test openai

# 查询厂商详情
tmf ask openai
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TMF_API_URL` | API 服务地址 | `https://api.tokenmofang.com` |

## 开发

```bash
git clone https://github.com/lvshiwei66/tokenmofang
cd tokenmofang/code/cli
npm install
npm run build
node dist/index.js --help
```
