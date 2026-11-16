# Claude Agent Permission Policy v2 — autonomy-first

## Intent

Favor productive autonomous development over command-by-command approval. Claude Code tool approval, Bash sandboxing, GitHub token permissions, and branch rules are distinct controls. Broad tool access is not the same as broad GitHub authorization.

## Trusted interactive agent

- Only the existing trusted-human trigger and the action's write-access verification may initiate work.
- Use Claude Code's `--dangerously-skip-permissions` in the trusted interactive job so Bash, Node.js, Python, Git, npm, Deno, edits, tests and debugging do not require per-tool approval. This is intentionally more permissive than an allowlist.
- Disable the Claude Bash sandbox for interactive work on disposable GitHub-hosted runners. Retain subprocess environment scrubbing, `restrict_untrusted_prs: true`, action-level collaborator checks, guarded tag-mode branch behavior, and checkout with `persist-credentials: false`. These protections do not make arbitrary code safe.
- Remove `id-token: write` from both jobs; routine agent work does not need an OIDC publishing identity. The interactive job retains contents/PR/issues write access for authorized branch work. Protected-branch rules, required checks and human merge decisions remain in force.
- Do not grant repository administration, secrets management, ruleset modification or an intentional direct-to-main merge workflow.

## Automatic PR reviewer

- Same-repository non-draft PRs only; retain bot exclusions, Claude-authored synchronize exception, revision-specific status and deduplication.
- Allow broad Bash inspection (git, gh and other diagnostic commands), Read, Glob and Grep; do not explicitly allow Edit/Write.
- Keep `contents: read`, `pull-requests: write` for feedback, and the dedicated inline-comment tool. No authorized source push or merge.
- Do not interpret a green job as proof that comments were published. A review with no findings can legitimately publish no comments.

## Security tradeoffs and limitations

- **Important:** unrestricted Bash can write workspace files, run arbitrary scripts, read available environment variables, and potentially communicate with external systems subject to sandbox/network policy. A tool allowlist is not a credential boundary.
- `persist-credentials: false` prevents checkout from persisting its token in Git configuration; it does **not** guarantee that OAuth tokens or action-provided credentials are inaccessible to a compromised Claude subprocess.
- This PR does not implement a separately brokered GitHub credential or prove strong secret isolation. Achieving that requires an architecture where untrusted execution has no credential access and privileged GitHub operations happen through a separate validated broker/job.
- Interactive work intentionally disables Claude permission prompts and Bash sandbox restrictions. It can run untrusted code and may expose action-injected credentials; treat this as a high-risk experiment. Automatic review retains its distinct tool permissions and read-only contents token.
- Broad Bash in automatic review may execute repository-supplied code if Claude chooses to; the review prompt prohibits following PR instructions, but prompt text alone is not an isolation mechanism.

## Verification before merge

1. Verify that the installed Claude Code Action accepts `--dangerously-skip-permissions` in trusted tag mode and that it does not silently override the action's PR trust checks. If it rejects the flag, do not bypass upstream safety checks without reviewing the failure.
2. On PR #2917, run Bash, Node.js, Python, remote verification, and a branch-only edit/push; verify no unexpected files changed.
3. Re-trigger automatic review on the seeded permission-policy issue. Inspect the job logs for denied operations and verify a concrete inline comment by `claude[bot]` (not Codex).
4. Report permission denials separately from review success; investigate whether the denied operation was essential. Do not infer review quality from exit status.
5. Check fork/bot exclusions, HEAD/BASE deduplication, protected-branch enforcement, and credential redaction in logs.

This v2 policy supersedes v1 after merge. PR #2917 remains an unmerged test fixture until its deliberate incorrect statement is removed.
