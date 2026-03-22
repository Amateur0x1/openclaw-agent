# openclaw-agent

> OpenClaw Agent Git Management Tool — version-control your agents with Git, sync across devices, and share with the community.

## The Problem

When using OpenClaw agents across **multiple devices** or in a **team environment**, you run into:

1. **Config drift** — AGENTS.md, SOUL.md changes have to be manually copied
2. **No version control for skills** — no history, no collaboration
3. **No easy sharing** — sharing an agent means sharing a whole folder structure

`openclaw-agent` solves this by putting your agent's **identity config + skills** under Git management, with GitHub as the sync/sharing backend.

## Features

| Feature | Description |
|---------|-------------|
| **Git versioning** | Full history for agent config and skills, with commit/push/pull |
| **Cross-device sync** | Push on one machine, sync on another |
| **Community sharing** | Publish to GitHub, others clone and import in one command |
| **Sensitive data isolation** | auth-profiles.json, sessions, memory are NOT synced |

## Installation

```bash
cd ~/self/openclaw-agent
npm install -g

# Or build from source
npm install
npm run build
```

## Commands

| Command | Description |
|---------|-------------|
| `track <name>` | Put an existing OpenClaw agent under Git version control |
| `clone <repo>` | Clone an agent repo from GitHub and start managing it |
| `import <name>` | Import a tracked agent into OpenClaw (registers the config) |
| `commit <name> <message>` | Commit agent changes to the local Git repo |
| `push <name>` | Push agent to remote (auto-commits first if there are changes) |
| `pull <name>` | Pull agent changes from remote (Git repo only, no import) |
| `sync <name>` | Pull from remote and import into OpenClaw in one step |
| `publish <name>` | Publish agent to GitHub (creates a new repo and pushes initial version) |
| `list` | List all agents managed by openclaw-agent |
| `untrack <name>` | Remove agent from Git version control (OpenClaw config untouched) |

## Git Repo Structure

A cloned or published agent repo looks like this:

```
.
├── config.json              # agent config (id/name/skills/identity/subagents/tools only)
└── workspace-<agentId>/    # workspace files
    ├── AGENTS.md           # agent instructions and behavior
    ├── SOUL.md             # persona and role definition
    ├── IDENTITY.md         # identity metadata
    ├── TOOLS.md            # tool notes (optional)
    ├── USER.md             # user info (optional)
    ├── skills/             # skills directory
    │   ├── skill-1/
    │   └── skill-2/
    └── memory/             # memory directory (optional, not tracked by default)
        └── YYYY-MM-DD.md
```

**Excluded from sync** (sensitive / personal data):
- Everything under `~/.openclaw/agents/<agentId>/`
- `auth-profiles.json`
- `sessions/` directory
- `memory/` (unless manually added to Git)

## Fields Synced in config.json

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

Other fields (workspace path, model, sandbox settings, etc.) are managed by OpenClaw's native commands and are NOT synced via Git.

## Usage Flow

### Create and publish a new agent

```bash
# 1. Create the agent (via OpenClaw native command)
openclaw agents add my-agent --workspace my-workspace

# 2. Put it under Git management
openclaw-agent track my-agent

# 3. Commit changes
openclaw-agent commit my-agent "feat: initial agent setup"

# 4. Publish to GitHub (creates a new repo and pushes)
openclaw-agent publish my-agent

# 5. Push to remote
openclaw-agent push my-agent
```

### Sync an agent on another device

```bash
# Recommended: sync in one command
openclaw-agent sync my-agent

# Or step by step
openclaw-agent pull my-agent      # pull to Git repo only
openclaw-agent import my-agent    # then import to OpenClaw
```

### Clone an agent from GitHub

```bash
# 1. Clone and track
openclaw-agent clone owner/repo

# 2. Import into OpenClaw
openclaw-agent import the-agent-name
```

### Day-to-day changes

```bash
# After editing SOUL.md or skills
openclaw-agent commit my-agent "feat: update agent persona"
openclaw-agent push my-agent
```

### Stop managing an agent

```bash
openclaw-agent untrack my-agent
```

## Concepts

| Concept | Meaning |
|---------|---------|
| **track** | Start managing an existing OpenClaw agent with Git (creates `config.json` and `workspace-<id>/` in a local Git repo) |
| **clone** | Clone an agent repo from GitHub (automatically tracks it) |
| **import** | Register the agent config from the Git repo into OpenClaw (calls `openclaw agents add`), does NOT restart OpenClaw |
| **commit** | Local Git commit (you write the message) |
| **push** | Local commit + push to remote (auto-commits if working dir has changes) |
| **pull** | Pull from remote to local Git repo (does NOT auto-import into OpenClaw) |
| **sync** | pull + import in one step (remote changes take effect immediately) |
| **publish** | Create a new GitHub repo and push the initial version |
| **untrack** | Remove Git management (leaves OpenClaw config untouched, Git repo stays on disk) |

## FAQ

**Q: Will `import` overwrite an existing agent in OpenClaw?**
> No. `import` registers the config from the Git repo into OpenClaw. If the agent already exists, it will skip or update only the relevant fields.

**Q: What files are NOT synced?**
> `memory/`, `auth-profiles.json`, `sessions/`, and everything under `~/.openclaw/agents/<id>/` are excluded.

**Q: Can I use a Git platform other than GitHub?**
> Currently only GitHub is supported. Other platforms may be added in future releases.

## License

MIT
