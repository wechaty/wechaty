# Claude Agent Permission Policy v1

## Goal

Maximize useful autonomous engineering work while keeping credentials, protected branches, and repository administration outside the agent's routine authority. Tool permissions, GitHub token scopes, and branch protection are independent controls; none replaces the others.

## Interactive agent (trusted maintainer command)

- Only trusted human collaborators can initiate `/claude`; the action independently checks write access.
- Allow repository inspection, narrow read-only Git commands, Node/npm/Deno development tools, and the action's guarded editing, commit, and PR-branch push flow.
- Do not grant unrestricted Bash, unrestricted Git push, shell-based secret access, or arbitrary repository administration.
- Work on task/PR branches; merging to `main`, changing rulesets, managing secrets, or changing organization settings remains a human action.
- Preserve sandboxing and `restrict_untrusted_prs`; do not treat a trusted command as making PR content trustworthy.

## Automatic PR reviewer

- Only same-repository, non-draft PRs; bot-triggered synchronize events are limited to `claude[bot]`.
- Read-only repository and PR inspection; allow narrowly scoped Git/gh inspection and the inline-review-comment tool.
- No source edits, commits, pushes, merges, or administrative operations.
- Use Claude's GitHub App identity for published feedback; record completion against exact HEAD/BASE revisions.
- A successful action run does not by itself prove review quality or that comments were published.

## Permission design

Prefer exact command patterns to broad `Bash(git:*)` or `Bash(gh:*)`. Explicitly permitted Git commands are inspection-only. Note that Git configuration, aliases, hooks, external diff drivers, and command arguments can change risk; command allowlists are defense in depth, not a sandbox replacement. Review changes to allowlists like security-sensitive code.

## Acceptance tests (PR #2917)

1. Interactive Claude runs `git ls-remote` on the repository and independently confirms the remote PR branch HEAD, without a tool approval denial.
2. Automatic reviewer inspects a deliberately harmless, seeded issue and publishes an actionable inline comment under `claude[bot]`.
3. Confirm the exact HEAD/BASE completion status, no `github-actions[bot]` bookkeeping comment, and no unauthorized file changes.
4. Verify a repeated review event for an already completed revision is deduplicated.
5. Confirm unrelated bots and fork PRs do not get subscription-backed review access.

Do not merge the smoke-test fixture until these tests pass. Never introduce real secrets or intentionally exploitable code for testing.
