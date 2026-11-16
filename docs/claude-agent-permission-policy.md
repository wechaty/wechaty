# Claude Agent Permission Policy v2 — autonomy-first

## Intent

Favor productive autonomous development over command-by-command approval. Claude Code tool approval, Bash sandboxing, GitHub token permissions, and branch rules are distinct controls. Broad tool access is not the same as broad GitHub authorization.

## Trusted interactive agent

- Only the existing trusted-human trigger and the action's write-access verification may initiate work.
- Use Claude Code's `--dangerously-skip-permissions` in the trusted interactive job so Bash, Node.js, Python, Git, npm, Deno, edits, tests and debugging do not require per-tool approval. This is intentionally more permissive than an allowlist.
- Disable the Claude Bash sandbox for interactive work on disposable GitHub-hosted runners. Retain subprocess environment scrubbing, `restrict_untrusted_prs: true`, action-level collaborator checks, guarded tag-mode branch behavior, and checkout with `persist-credentials: false`. These protections do not make arbitrary code safe.
- Retain `id-token: write` for both jobs because Claude Code Action exchanges the Actions OIDC identity for its GitHub App token. Explicitly grant `contents: write`, `pull-requests: write`, and `issues: write` through the action's `additional_permissions`, rather than relying on implicit App-token defaults. Protected-branch rules, required checks and human merge decisions remain in force.
- Do not grant repository administration, secrets management, ruleset modification or an intentional direct-to-main merge workflow.

## Automatic PR reviewer

- Same-repository non-draft PRs only; retain bot exclusions, Claude-authored synchronize exception, revision-specific status and deduplication.
- Grant broad Bash, Read, Glob, Grep, Edit and Write tools. The reviewer has explicit repository source-write capability, even though automatic review events should normally report findings without silently modifying the revision under review.
- Grant `contents: write`, `pull-requests: write`, and `issues: write` at both job and Claude App token levels. Keep the dedicated inline-comment tool. Normal automatic reviews should report findings; separate human-directed tasks can request code changes.
- Do not interpret a green job as proof that comments were published. A review with no findings can legitimately publish no comments.

## Security tradeoffs and limitations

- **Important:** unrestricted Bash can write workspace files, run arbitrary scripts, read available environment variables, and potentially communicate with external systems subject to sandbox/network policy. A tool allowlist is not a credential boundary.
- `persist-credentials: false` prevents checkout from persisting its token in Git configuration; it does **not** guarantee that OAuth tokens or action-provided credentials are inaccessible to a compromised Claude subprocess.
- This PR does not implement a separately brokered GitHub credential or prove strong secret isolation. Achieving that requires an architecture where untrusted execution has no credential access and privileged GitHub operations happen through a separate validated broker/job.
- Interactive work intentionally disables Claude permission prompts and Bash sandbox restrictions. It can run untrusted code and may expose action-injected credentials; treat this as a high-risk experiment. Automatic review retains its distinct tool permissions and read-only contents token.
- Broad Bash in automatic review can execute repository-supplied code and, with explicit write credentials, alter the repository. This is a deliberate autonomy-first tradeoff. Prompt text does not prevent misuse or accidental writes.

## Verification before merge

1. Verify that the installed Claude Code Action accepts `--dangerously-skip-permissions` in trusted tag mode and that it does not silently override the action's PR trust checks. If it rejects the flag, do not bypass upstream safety checks without reviewing the failure.
2. On PR #2917, run Bash, Node.js, Python, remote verification, and a branch-only edit/push; verify no unexpected files changed.
3. Re-trigger automatic review on the seeded permission-policy issue. Inspect the job logs for denied operations and verify a concrete inline comment by `claude[bot]` (not Codex).
4. Report permission denials separately from review success; investigate whether the denied operation was essential. Verify both GitHub App token and Actions job permissions permit intended writes. Do not infer review quality from exit status.
5. Check fork/bot exclusions, HEAD/BASE deduplication, protected-branch enforcement, and credential redaction in logs.

This v2 policy supersedes v1 after merge. PR #2917 remains an unmerged test fixture until its deliberate incorrect statement is removed.
