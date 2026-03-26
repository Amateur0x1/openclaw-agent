# openclaw-agent

> OpenClaw Agent Git Management Tool — version-control your agents with Git, sync across devices, and share with the community.

## The Problem

When using OpenClaw agents across **multiple devices** or in a **team environment**:

1. **Config drift** — workspace changes have to be manually copied
2. **No version control for skills** — no history, no collaboration
3. **No easy sharing** — sharing an agent means sharing a whole folder structure

`openclaw-agent` puts your agent's **identity config + skills** under Git management, with GitHub as the sync/sharing backend.

## Installation

```bash
npm install -g @amateur0x1/openclaw-agent

# Or build from source
git clone https://github.com/Amateur0x1/openclaw-agent.git
cd openclaw-agent
npm install
npm run build
npm install -g
```

## Commands

| Command            | Description                                                                | Who      |
| ------------------ | -------------------------------------------------------------------------- | -------- |
| `publish <name>`   | Auto-initializes if not managed, creates GitHub remote + pushes            | Creator  |
| `track <name>`     | Local commit snapshot of current workspace (no push)                       | Creator  |
| `pull <name/repo>` | Pulls from remote; auto-clones if not managed; syncs to OpenClaw workspace | Everyone |
| `list`             | List all managed agents                                                    | Everyone |
| `untrack <name>`   | Remove git management (OpenClaw workspace untouched)                       | Everyone |

## Git Repo Structure

```
~/.openclaw-agents/repos/<agent>/
├── config.json              # agent config (only key fields synced)
└── workspace-<agent>/
    ├── IDENTITY.md
    ├── SOUL.md
    ├── README.md           # English readme
    ├── README_zh.md        # Chinese readme
    └── skills/
```

**Excluded from sync**: `AGENTS.md`, `TOOLS.md`, `memory/`, `auth-profiles.json`, `sessions/`, `~/.openclaw/agents/<id>/`

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

## Usage Flow

### Creator: Publish a new agent

```bash
# One command: initializes + creates remote + pushes
openclaw-agent publish my-agent

# Subsequent development: local snapshot only
openclaw-agent track my-agent
```

### Collaborator: Use a shared agent

```bash
# Auto-clones and syncs to OpenClaw workspace
openclaw-agent pull owner/repo
```

### Day-to-day updates

```bash
# Creator pushes updates
openclaw-agent track my-agent   # commit current workspace
openclaw-agent publish my-agent # publish to GitHub

# Collaborator pulls updates
openclaw-agent pull owner/repo
```

## Concepts

| Concept     | Meaning                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| **publish** | Auto-initializes if not managed, creates GitHub remote, first push         |
| **track**   | Syncs OpenClaw workspace to local git repo and commits (no push)           |
| **pull**    | Pulls from remote; auto-clones if not managed; syncs to OpenClaw workspace |
| **untrack** | Removes git management, OpenClaw workspace stays intact                    |

## FAQ

**Q: Will `pull` overwrite my local changes?**
> `pull` syncs remote content into `.openclaw/workspace-<name>/`. If you have uncommitted local changes, run `track` first to snapshot them.

**Q: What files are NOT synced?**
> `memory/`, `auth-profiles.json`, `sessions/`, and everything under `~/.openclaw/agents/<id>/`.

**Q: What's the difference between creator and collaborator?**
> Creators own the GitHub remote and can `publish`. Collaborators can only `pull` updates.

## License

MIT
