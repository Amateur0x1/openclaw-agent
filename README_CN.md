# openclaw-agent

> OpenClaw Agent Git 管理工具 — 将 agent 纳入 Git 版本控制，支持多端同步与社区分享。

## 解决的问题

当你在**多设备**或**多人协作**场景下使用 OpenClaw agent 时：

1. **配置无法同步** — workspace 里的 AGENTS.md、SOUL.md 等改了要手动复制
2. **skills 无法版本化管理** — 无法回溯改动、多人无法协作
3. **无法方便地分享 agent** — 分享要给对方一整套文件夹和配置

`openclaw-agent` 把 agent 的**人设配置 + skills** 纳入 Git 管理，通过 GitHub 实现同步和分发。

## 安装

```bash
npm install -g @amateur0x1/openclaw-agent

# 或从源码编译
git clone https://github.com/Amateur0x1/openclaw-agent.git
cd openclaw-agent
npm install
npm run build
npm install -g
```

## 命令

| 命令               | 说明                                                | 适用   |
| ------------------ | --------------------------------------------------- | ------ |
| `publish <name>`   | 初始化（如需要）+ 建 GitHub remote + push（创作者） | 创作者 |
| `track <name>`     | 本地 commit 快照，不 push                           | 创作者 |
| `pull <name/repo>` | 从 remote 拉取 + 同步到 OpenClaw workspace          | 所有人 |
| `list`             | 列出已管理的 agents                                 | 所有人 |
| `untrack <name>`   | 取消 git 管理（不动 OpenClaw workspace）            | 所有人 |

## Git 仓库结构

```
~/.openclaw-agents/repos/<agent>/
├── config.json              # agent 配置（只同步关键字段）
└── workspace-<agent>/
    ├── AGENTS.md
    ├── IDENTITY.md
    ├── SOUL.md
    ├── TOOLS.md
    ├── README.md           # 英文说明
    ├── README_zh.md       # 中文说明
    └── skills/
```

**不同步的文件**：`memory/`、`auth-profiles.json`、`sessions/`、`~/.openclaw/agents/<id>/`

## config.json 只同步的字段

```json
{
  "id": "my-agent",
  "name": "My Agent",
  "skills": ["skill-1", "skill-2"],
  "identity": { ... },
  "subagents": [ ... ],
  "tools": [ ... ]
}
```

## 使用流程

### 创作者：发布新 agent

```bash
# 一句话搞定：初始化 + 建 remote + push
openclaw-agent publish my-agent

# 后续开发：本地的改动快照
openclaw-agent track my-agent
```

### 协作者：使用他人分享的 agent

```bash
# 自动 clone 并同步到 OpenClaw workspace
openclaw-agent pull owner/repo
```

### 日常更新

```bash
# 创作者推送更新
openclaw-agent track my-agent   # 提交当前 workspace
openclaw-agent publish my-agent # 发布到 GitHub

# 协作者拉取更新
openclaw-agent pull owner/repo
```

## 概念说明

| 概念        | 含义                                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| **publish** | 自动初始化（如未管理）+ 创建 GitHub remote + 首次 push                        |
| **track**   | 将 OpenClaw workspace 同步到本地 git repo 并 commit（不 push）                |
| **pull**    | 从 remote 拉取，未管理则自动 clone；已管理则 pull + 同步到 OpenClaw workspace |
| **untrack** | 移除 git 管理，OpenClaw workspace 保持不变                                    |

## 常见问题

**Q: `pull` 会覆盖我本地的改动吗？**
> `pull` 会把 remote 的内容同步进 `.openclaw/workspace-<name>/`。如果本地有未提交的改动，建议先 `track` 提交快照。

**Q: 哪些文件不会被同步？**
> `memory/`、`auth-profiles.json`、`sessions/` 以及 `~/.openclaw/agents/<id>/` 下的内容不会同步。

**Q: 创作者和协作者的区别是什么？**
> 创作者拥有 GitHub remote，可以 `publish` 和 `push`。协作者只有 `pull` 权限拉取更新。

## License

MIT