# Validation record

## Baseline

Source: WorldFlowAI/everything-claude-code, commit
`432485ba6b92c14fb357276a98957f348bcff9ee`.
Original runner: 61 passed, 1 failed (session file existence assertion). The old tests exercised
the user's home configuration and mixed UTC/local date naming. Lifecycle tests have been
replaced with isolated project fixtures that exercise the new supported runtime.

## Local results

On Linux, Node 24.22.1, `node tests/run-all.js` exited 0:
- 22 shared utility tests.
- 23 package-manager tests.
- 20 hook/checkpoint integration tests (no skips).
- 3 test-runner regressions, including deliberate crash and missing-file fixtures.

The runner fixtures intentionally print failures from child processes; the assertions verify
that those failures propagate. The parent runner exits 0 only if all suites pass.
Tests cover save/restore, project and branch isolation, nested Git directories, lifecycle metadata
preserving notes, invalid and oversized input, corrupted checkpoints, hostile session IDs,
optional document blocking, formatter opt-in, missing/failed formatter, and literal filenames.
The formatter fixture tests argument handling; it does not certify every Prettier version.

`git diff --check` passed. GitHub Actions runs Linux, Windows and macOS on Node 22/24.
All six jobs passed on commit `0c8055b`; subsequent commits must pass the same matrix.

## Native validator: offline success

Claude Code 2.1.316 validated both the marketplace directory and the explicit plugin manifest
with exit 0. Frontmatter and marketplace metadata warnings were fixed. One nonfunctional
catalog warning remains: no marketplace listing icon. The validator also advises adding a
marketplace installation line; this review branch deliberately documents direct loading until
it is merged. Neither message changes the successful validation verdict.

The first network-enabled attempt was stopped by automatic approval review after an attempted
connection to api.anthropic.com. That observation alone does not establish what payload was
intended. Claude's general startup can perform network operations independently of local
manifest checks. Disabling optional traffic is not proof of offline operation.

For the successful rerun, a fresh config directory, an allowlisted environment without API
credentials, and Linux seccomp rules denied network socket creation and connection in the
validator and its descendants. A socket probe confirmed the kernel restriction before launch.
The check passed without API access, so API approval is unnecessary for this validation.
Reproduce on Linux with libseccomp installed and an already-installed official Claude binary:

```sh
python scripts/validate-offline.py /absolute/path/to/claude .
python scripts/validate-offline.py /absolute/path/to/claude .claude-plugin/plugin.json
```

This command does not install Claude or authenticate. It fails if the restriction cannot be
applied and propagates the validator's exit code. The native validator checks metadata and
structure; it does not certify prompt behavior, run a model conversation, or perform the
catalog's separate safety and policy reviews.

## Remaining live-host checks

An authenticated model session and the FinePrint pilot have not been run. The standalone
tests exercise hook inputs and outputs, not live model decisions or host dispatch.

Before installing broadly, run on a machine with Claude Code:

1. `claude plugin validate .` against this branch checkout.
2. Launch a disposable project with `claude --plugin-dir <absolute checkout path>`.
3. Confirm all four `ecc-reliable` commands appear and hooks are registered once.
4. Save an explicit checkpoint, end the session, restart, and confirm the correct notes return.
5. Switch branches and projects; verify notes do not cross those boundaries.
6. Enable the optional document policy and verify Write denial; disable it and verify normal writing.
7. With a trusted local Prettier installation, enable formatting and test a path containing spaces.
8. Run a small FinePrint task using the project's existing checks, then evaluate whether the
   added workflow reduces missed checks and repeated context. This pilot has not been run.

Inherited skills, legacy scripts and agents have not received a full audit in this change.
The new manifest registers four commands and only the new runtime hook file. MCP example
packages remain historical examples; none are automatically installed or enabled.
