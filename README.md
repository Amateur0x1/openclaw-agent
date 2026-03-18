# openclaw-agent

OpenClaw Agent Git 管理工具 — 将 agent 纳入 Git 版本控制，支持多端同步。

## 安装

```bash
cd ~/self/openclaw-agent
npm install -g
```

## 命令

| 命令 | 说明 |
|------|------|
| `track <name>` | 将 OpenClaw 现有 agent 纳入 Git 版本控制 |
| `clone <repo>` | 从 GitHub 克隆 agent 仓库并准备管理 |
| `import <name>` | 将已 track 的 agent 导入到 OpenClaw（注册配置） |
| `commit <name> <message>` | 提交 agent 改动到本地 Git 仓库 |
| `push <name>` | 推送 agent 到远程 |
| `pull <name>` | 从远程拉取 agent 改动 |
| `sync <name>` | 同步 agent：从远程拉取改动并导入到 OpenClaw |
| `publish <name>` | 发布 agent 到 GitHub（创建新仓库） |
| `list` | 列出所有管理的 agents |
| `untrack <name>` | 取消 agent 的 Git 版本控制 |

## Git 仓库结构

```
.
├── config.json              # agent 配置（仅含 id/name/skills/identity/subagents/tools）
└── workspace-<agentId>/    # workspace 文件
    ├── AGENTS.md
    ├── SOUL.md
    ├── USER.md
    ├── memory/
    └── ...
```

**注意**：不包含 `~/.openclaw/agents/<agentId>/` 下的任何内容（auth-profiles.json、sessions 等敏感文件不同步）

## 使用流程

```bash
# 1. 把本地 agent 纳入 Git 管理
openclaw-agent track test-agent

# 2. 提交改动
openclaw-agent commit test-agent "feat: update SOUL.md"

# 3. 发布到 GitHub
openclaw-agent publish test-agent

# 4. 推送到远程
openclaw-agent push test-agent

# 5. 远程有改动，同步到本地 + 导入 OpenClaw
openclaw-agent sync test-agent

# 或者分开执行
openclaw-agent pull test-agent     # 只拉取
openclaw-agent import test-agent   # 只导入

# 6. 取消管理
openclaw-agent untrack test-agent
```

从 GitHub 克隆新 agent：
```bash
openclaw-agent clone owner/repo     # 克隆并 track
openclaw-agent import test-agent    # 导入到 OpenClaw
```

## 概念说明

- **track**：将 OpenClaw 现有 agent 纳入 Git 管理
- **clone**：从 GitHub 克隆一个已存在的 agent 仓库
- **import**：将 Git 仓库中的配置注册到 OpenClaw（调用 `openclaw agents add`）
- **commit**：本地提交改动（不推送）
- **push**：本地提交 + 推送到远程
- **pull**：从远程拉取 + 同步到 OpenClaw
- **sync**：pull + import 一步完成
- **publish**：在 GitHub 创建新仓库并推送

## config.json 只同步的字段

- `id`
- `name`
- `skills`
- `identity`
- `subagents`
- `tools`

其他字段（如 workspace、model、sandbox 等）由 OpenClaw 原生命令管理，不通过 Git 同步。
