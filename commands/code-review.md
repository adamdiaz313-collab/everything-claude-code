---
description: Review the actual diff for correctness, security and missing validation.
---
# Code review

Read project instructions, Git status, staged and unstaged diffs, and relevant new untracked files.
For branch review, establish the intended base explicitly. Do not assume HEAD captures all changes.

Prioritize concrete bugs, regressions, unsafe input handling, credential exposure, authorization
errors and missing behavioral tests. Cite file locations, the trigger and the consequence.
Distinguish verified defects from hypotheses. Follow project conventions; line counts, logging,
mutation, emoji and missing JSDoc are not automatically high-severity bugs.
Report verification performed and important limits. If no defects are found, say so without
claiming the code is secure or fully tested. Do not merge, publish, or change files during review
unless the user requested fixes as well.

Arguments: $ARGUMENTS
