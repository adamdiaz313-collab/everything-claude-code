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
- 19 hook/checkpoint integration tests (no skips).
- 3 test-runner regressions, including deliberate crash and missing-file fixtures.

The runner fixtures intentionally print failures from child processes; the assertions verify
that those failures propagate. The parent runner exits 0 only if all suites pass.
Tests cover save/restore, project and branch isolation, nested Git directories, lifecycle metadata
preserving notes, invalid and oversized input, corrupted checkpoints, hostile session IDs,
optional document blocking, formatter opt-in, missing/failed formatter, and literal filenames.
The formatter fixture tests argument handling; it does not certify every Prettier version.

`git diff --check` passed. GitHub Actions defines Linux, Windows and macOS jobs for Node 22/24;
check actual workflow results before asserting those platforms passed.

## Native-host validation pending

Claude Code was not initially installed in this environment. An attempt to run the official
2.1.316 plugin validator was blocked by automatic approval review when it attempted to contact
api.anthropic.com. No successful native validator or authenticated model session is claimed.
The standalone tests validate script contracts, not the entire Claude Code host integration.

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
