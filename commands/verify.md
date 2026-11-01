---
description: Run project-specific validation and report evidence and untested areas.
---
# Verify

Read this project's CLAUDE.md, contribution instructions, package scripts and CI configuration.
Choose the existing build, lint, type and test commands appropriate to the changed behavior.
For Python use the project's selected environment; do not install or upgrade dependencies to
make a check pass without identifying the need. For a web app include relevant browser tests.

Run the selected checks and report each exact command, exit status, pass/fail/skip counts
where available, and any blockers. Separate checks not run from successful checks.
Do not claim a secret scan or coverage result unless actually measured. An AI review is not
an automated security scanner. Inspect the diff and Git status for unintended changes.

`quick`: focused checks for the change. `full` or `pre-pr`: the project's required full checks.
Project policy decides coverage thresholds; there is no universal 80% requirement.
Do not commit, push, merge, or deploy as part of verification.

Arguments: $ARGUMENTS
