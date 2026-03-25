---
name: openclaw-agent
description: "openclaw-agent — OpenClaw Agent Git 管理工具。将 agent 纳入 Git 版本控制，支持 push/pull/sync 多端同步、发布到 GitHub 社区分享。9个命令：track、clone、import、commit、push、pull、sync、publish、list。"
emoji: "🔧"
author: "Amateur0x1"
tags: [openclaw, agent, git, github, sync, version-control, cli]
---

# openclaw-agent Skill

将 OpenClaw agent 纳入 Git 版本控制的 CLI 工具，支持多端同步和 GitHub 社区分享。

## 安装

```bash
# 从 npm 安装
npm install -g @amateur0x1/openclaw-agent

# 或从源码编译
git clone https://github.com/Amateur0x1/openclaw-agent.git
cd openclaw-agent
npm install
npm run build
npm link
```

## 命令速查

| 命令 | 说明 |
|------|------|
| `openclaw-agent list` | 列出所有被管理的 agents |
| `openclaw-agent track <name>` | 将现有 agent 纳入 Git 管理 |
| `openclaw-agent clone <repo>` | 从 GitHub 克隆 agent 仓库并管理 |
| `openclaw-agent import <name>` | 将已跟踪的 agent 导入 OpenClaw |
| `openclaw-agent commit <name> [msg]` | 提交改动到本地 Git |
| `openclaw-agent push <name>` | 推送到远程（自动 commit）|
| `openclaw-agent pull <name>` | 从远程拉取（仅 Git）|
| `openclaw-agent sync <name>` | 完整同步：pull + import |
| `openclaw-agent publish <name>` | 发布到 GitHub（创建仓库并 push）|
| `openclaw-agent untrack <name>` | 从 Git 管理中移除 |

## 详细用法

### track
将 OpenClaw 中已存在的 agent 纳入 Git 版本控制。

```bash
openclaw-agent track my-mind
```

会从 `openclaw.json` 读取 agent 配置和 skills 列表，从各个 skill 目录（workspace skills、全局 skills、`extraDirs`）找到对应的 skill 文件，复制到 Git repo 中。

### publish
发布到 GitHub（创建仓库 + push）。

```bash
openclaw-agent publish my-mind --repo my-agent  # 指定仓库名
```

首次 publish 会：
1. 在 GitHub 创建同名仓库
2. 同步 workspace 到 repo
3. push 到 GitHub

### push
推送更新（自动先 commit）。

```bash
openclaw-agent push my-mind
```

### sync
完整同步：先 pull 远程改动，再 import 到 OpenClaw。

```bash
openclaw-agent sync my-mind
# 或跳过 import
openclaw-agent sync my-mind --no-import
```

### clone
从 GitHub 克隆并开始管理。

```bash
openclaw-agent clone Amateur0x1/my-mind --agent-name my-mind
```

## 工作原理

```
Git repo 结构：
{gitDir}/
├── config.json          # 只存 skill 名字列表（同步用）
└── workspace-{name}/
    ├── AGENTS.md        # 人设配置
    ├── IDENTITY.md
    ├── SOUL.md
    ├── TOOLS.md
    └── skills/
        ├── skill-a/
        └── skill-b/
```

**不同步**：auth-profiles.json、sessions/、memory/ 等个人化数据。

## Skill 自动发现

track 命令会自动发现并同步：
- `openclaw.json` 中显式列出的 skills
- workspace 中存在但未在 `openclaw.json` 声明的 skill（有 SKILL.md 的目录）

Skill 搜索路径：
1. `~/.openclaw/workspace-{name}/skills/`
2. `~/.openclaw/workspace/skills/` （全局 workspace）
3. `openclaw.json` 中 `skills.load.extraDirs` 配置的路径

## 触发场景

- "把 agent 配置同步到 GitHub"
- "多设备间同步 OpenClaw 配置"
- "分享 agent 配置给其他人"
- "团队协作管理 agent 配置"
- "把 GitHub 上的 agent 导入本地"

## 源码

https://github.com/Amateur0x1/openclaw-agent
