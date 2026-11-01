# Everything Claude Code — reliability fork

This fork improves hook execution and explicit project checkpoints. It derives from
[WorldFlowAI/everything-claude-code](https://github.com/WorldFlowAI/everything-claude-code)
at `432485ba6b92c14fb357276a98957f348bcff9ee`. Original toolkit and prompts are credited to
[Affaan Mustafa](https://github.com/affaan-m/everything-claude-code).

## Review version

The implementation is on `improve/reliable-hooks-checkpoints`, not `main` until reviewed.
Clone this fork and select that branch:

```sh
git clone --branch improve/reliable-hooks-checkpoints https://github.com/adamdiaz313-collab/everything-claude-code.git
cd everything-claude-code
node tests/run-all.js
claude plugin validate .
```

Requirements: Node.js 22 or later, Git, and a separately installed/authenticated Claude Code.
No npm dependencies are needed for the toolkit tests. See [validation](docs/VALIDATION.md)
for what was actually tested and remaining host checks.

## Try in one session

From your project directory, load the checkout with its absolute path:

```sh
claude --plugin-dir /absolute/path/to/everything-claude-code
```

On Windows, quote the Windows path, for example:

```powershell
claude --plugin-dir "C:\Users\acool\Documents\everything-claude-code"
```

Use the four default commands:
- `/ecc-reliable:plan`: plan a change.
- `/ecc-reliable:verify`: run the project's checks.
- `/ecc-reliable:code-review`: review the changes.
- `/ecc-reliable:checkpoint save` or `show`: save or inspect project notes.

The existing skills and agents remain available as inherited reference components, not newly
validated features. Global rules and MCP servers are not installed by this setup. Do not copy
the whole `rules/` or `mcp-configs/` directory into global configuration. Optional legacy
commands remain in `commands/` but only the four above are exposed by the manifest.

## What hooks do

- `SessionStart`: load the most recent valid explicit checkpoint for the checkout and branch.
- `PreCompact` and `SessionEnd`: record current Git metadata; do not generate a task summary.
- `PreToolUse` on `Write`: optional document-name restriction, disabled by default.
- `PostToolUse` on `Edit|Write`: optional local Prettier formatting, disabled by default.

No tmux requirement, automatic package downloads, full-project typecheck after every edit,
or automatic pattern extraction. Only `scripts/hooks/runtime.js` is registered. Old scripts
under `hooks/memory-persistence`, `hooks/strategic-compact` and `scripts/hooks/` are retained
for provenance and are not part of the supported runtime. Remove old copied hook entries
before loading this plugin to avoid running both versions.

## Options

Set these in the environment before starting Claude Code:

| Variable | Default | Effect |
| --- | --- | --- |
| `ECC_FORMAT_ON_EDIT` | `0` | `1` runs the project's installed Prettier using argument arrays, with a 15-second timeout |
| `ECC_RESTRICT_DOCS` | `0` | `1` blocks Write of .md/.txt except README.md, CLAUDE.md, AGENTS.md and CONTRIBUTING.md |
| `ECC_STATE_DIR` | `~/.claude/ecc-state` | Local checkpoint storage outside the source repository |

The document restriction is a convenience policy, not a security boundary: other tools can
write files. A matched restriction exits 2. Unexpected errors exit 1 and are non-blocking.
Opt-in formatting executes your project's Prettier and configuration; use trusted projects.
No API keys or paid services are required by the hooks. Normal Claude usage limits still apply.

## Checkpoint storage and limits

`checkpoint save` reads a JSON summary on stdin and captures branch, commit and tracked-file
status. The six summary fields are `task`, `decisions`, `completed`, `unfinished`, `tests`,
and `nextSteps` (all strings, at most 12 KB total). Failed and unrun tests should be recorded.
SessionStart returns these notes as reference context, with the current commit for comparison.

Storage is partitioned by canonical checkout path and branch (detached HEAD uses the commit).
Subdirectories share their Git root. Non-Git folders are partitioned by their exact path.
Each save is an atomic, immutable file; concurrent sessions on the same branch share history
and the newest valid file is restored. Lifecycle metadata is stored separately per session.
No transcript is copied or analyzed. Notes are plaintext, so omit secrets and sensitive content.
On POSIX, new directories/files request 0700/0600; Windows permissions depend on your profile ACLs.
History is retained until you remove the relevant directory. Moving a checkout or renaming a
branch changes its storage key. No automatic migration from legacy global session files occurs.

## Rollback

For `--plugin-dir`, end the session and start Claude without that option. Your existing Claude
settings were not overwritten. Keep checkpoint files if you want to resume later. To remove
notes, identify the relevant project directory under `ECC_STATE_DIR` before deleting it.

Do not run the old global reset commands; they can delete unrelated agents, commands and rules.

## Attribution

The original README declares MIT and the inherited manifests label MIT. This snapshot has no
standalone LICENSE file; this fork preserves that declaration and attribution without inventing
copyright ownership. Original README remains available in Git history at the baseline commit.
