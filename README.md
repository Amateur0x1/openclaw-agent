# openclaw-agent

> OpenClaw Agent Git 管理工具 — 将 agent 纳入 Git 版本控制，支持多端同步与社区分享。

## 解决的问题

当你在**多设备**或**多人协作**场景下使用 OpenClaw agent 时，会遇到这些问题：

1. **配置无法同步** — workspace 里的 AGENTS.md、SOUL.md 等文件改了要手动复制
2. **skills 无法版本化管理** — 无法回溯改动、多人无法协作
3. **无法方便地分享 agent** — 分享要给对方一整套文件夹和配置

`openclaw-agent` 就是来解决这些问题的。它把 agent 的**人设配置 + skills** 纳入 Git 管理，通过 GitHub 实现同步和分发。

## 核心特性

| 特性 | 说明 |
|------|------|
| **Git 版本控制** | agent 配置和 skills 完整版本化，支持 commit、push、pull |
| **多端同步** | 一端 push，另一端 sync 即可拉取最新配置 |
| **社区分享** | push 到 GitHub 后，其他人可以 clone 并导入 |
| **敏感文件隔离** | 不同步 auth-profiles.json、sessions 等个人化数据 |

## 安装

```bash
cd ~/self/openclaw-agent
npm install -g

# 或者从源码编译
npm install
npm run build
```

## 命令

| 命令 | 说明 |
|------|------|
| `track <name>` | 将 OpenClaw 现有 agent 纳入 Git 版本控制 |
| `clone <repo>` | 从 GitHub 克隆 agent 仓库并准备管理 |
| `import <name>` | 将已 track 的 agent 导入到 OpenClaw（注册配置） |
| `commit <name> <message>` | 提交 agent 改动到本地 Git 仓库 |
| `push <name>` | 推送 agent 到远程（自动 commit） |
| `pull <name>` | 从远程拉取 agent 改动（仅拉取，不导入） |
| `sync <name>` | 同步 agent：从远程拉取改动并导入到 OpenClaw |
| `publish <name>` | 发布 agent 到 GitHub（创建新仓库并推送初始版本） |
| `list` | 列出所有由 openclaw-agent 管理的 agents |
| `untrack <name>` | 取消 agent 的 Git 版本控制（不影响 OpenClaw 原配置） |

## Git 仓库结构

克隆或 publish 后的 agent 仓库结构如下：

```
.
├── config.json              # agent 配置
└── workspace-<agentId>/    # workspace 文件
    ├── AGENTS.md           # agent 指令与行为定义
    ├── SOUL.md             # agent 人设与角色
    ├── IDENTITY.md         # agent 身份标识
    ├── TOOLS.md            # 工具说明（可选）
    ├── USER.md             # 用户信息（可选）
    ├── skills/             # 技能目录
    │   ├── skill-1/
    │   └── skill-2/
    └── memory/             # 记忆目录（可选，不会被 track）
        └── YYYY-MM-DD.md
```

**不包含以下文件**（敏感/个人化数据，不同步）：
- `~/.openclaw/agents/<agentId>/` 下的所有内容
- `auth-profiles.json`
- `sessions/` 目录
- `memory/` 目录（除非手动添加）

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

其他字段（如 workspace 路径、model、sandbox 等）由 OpenClaw 原生命令管理，不通过 Git 同步。

## 使用流程

### 从零创建一个新 agent 并发布

```bash
# 1. 创建 agent（通过 OpenClaw 原生命令）
openclaw agents add my-agent --workspace my-workspace

# 2. 把 agent 纳入 Git 管理
openclaw-agent track my-agent

# 3. 提交改动
openclaw-agent commit my-agent "feat: initial agent setup"

# 4. 发布到 GitHub（创建新仓库并推送）
openclaw-agent publish my-agent

# 5. 推送到远程
openclaw-agent push my-agent
```

### 在另一台设备上同步 agent

```bash
# 方式一：直接 sync（推荐）
openclaw-agent sync my-agent

# 方式二：分步执行
openclaw-agent pull my-agent      # 只拉取到 Git 仓库
openclaw-agent import my-agent    # 导入到 OpenClaw
```

### 从 GitHub 克隆一个 agent

```bash
# 1. 克隆并 track
openclaw-agent clone owner/repo

# 2. 导入到 OpenClaw
openclaw-agent import the-agent-name
```

### 日常改动提交

```bash
# 编辑了 SOUL.md 或 skills 之后
openclaw-agent commit my-agent "feat: update agent persona"
openclaw-agent push my-agent
```

### 取消管理

```bash
openclaw-agent untrack my-agent
```

## 概念说明

| 概念 | 含义 |
|------|------|
| **track** | 将 OpenClaw 现有 agent 的配置文件纳入 Git 管理（在仓库中创建 `config.json` 和 `workspace-<id>/`） |
| **clone** | 从 GitHub 克隆一个已存在的 agent 仓库（自动 track） |
| **import** | 将 Git 仓库中的配置注册到 OpenClaw（调用 `openclaw agents add`），**不**触发 OpenClaw 重启 |
| **commit** | 本地 Git 提交（需要手动写 message） |
| **push** | 本地 commit + 推送到远程（如果工作区有改动会先自动 commit） |
| **pull** | 从远程拉取到本地 Git 仓库（**不**自动导入到 OpenClaw） |
| **sync** | pull + import 一步完成（远程改动直接生效） |
| **publish** | 在 GitHub 创建新仓库并将初始版本推送上去 |
| **untrack** | 移除 Git 管理（不影响 OpenClaw 原有配置，Git 仓库保留在原目录） |

## 常见问题

**Q: `import` 会覆盖 OpenClaw 里已有的 agent 配置吗？**
> 不会。`import` 是将 Git 仓库中的配置注册到 OpenClaw，如果 agent 已存在会跳过或更新对应字段。

**Q: 哪些文件不会被同步？**
> `memory/`、`auth-profiles.json`、`sessions/` 以及 `~/.openclaw/agents/<id>/` 下的所有内容都不会被同步。

**Q: 可以同步到除 GitHub 以外的其他 Git 平台吗？**
> 目前版本仅支持 GitHub，未来版本可能扩展。

## License

MIT
