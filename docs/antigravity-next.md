# Antigravity Next experiment

Implements the approved experimental direction in RFC #3157; relates to M0 #3158 and M1 #3159 (neither is complete). Existing `antigravity.yml` remains unchanged.

## Approved decisions

Minimum prompt, maximum capability, maximum autonomy, maximum privilege **within the existing repository-scoped Huan installation**. Use the existing APP_CLIENT_ID_HUAN and APP_PRIVATE_KEY_HUAN bootstrap; inherit existing permissions for requested tasks and narrow them for automatic reviews, within this repository. Both gh and official Docker GitHub MCP receive the same installation token. Enable all local toolsets and Insiders. This does not imply remote-only tools or APIs unsupported by installation tokens will work.

Use unrestricted `agy --dangerously-skip-permissions`, default effort (no effort flag), optional existing ANTIGRAVITY_MODEL, a minimal senior engineer/principal architect three-pass objective, and native GitHub communication. No mandatory output schema, artifact publisher, or raw public session logs. The agent decides how to investigate and communicate. Process success is execution success only, not proof of review publication or code quality. No mandatory evaluation check or required merge gate is introduced.

Antigravity Next has two paths. Use `@huan review` on a same-repository PR, optionally followed by a review focus, to request a three-pass code review. It checks HEAD and BASE before preparing the agent. The prompt asks for a formal **Comment** review titled **Antigravity Next review** with actionable findings on the relevant diff lines, followed by a separate **Approve** or **Request changes** review decision. Use `@huan <task>` for interaction on an issue or PR. Both commands are case-insensitive and must begin the issue comment, inline review comment, or submitted review body. The mention and review keyword each require whitespace or end of text. Manual dispatch accepts a number and a mode. Interaction requires a task, and review accepts optional focus.

Each review run opens one editable PR progress comment. Updates report paths checked, evidence and remaining work. Requested reviews can report local tests, while automatic reviews report GitHub checks and leave PR code unexecuted. Reruns reuse the same comment. The workflow attempts a final status update on failure or cancellation. The reviewer adds new evidence to existing inline threads when possible and links back when it cannot reply.

The review prompt links to the PR and includes any requested focus. The interactive prompt points to the original comment or submitted review so the agent can read the request directly. Manual interaction includes the issue or PR link and the dispatch task. The launcher still uses the resolved commit for checkout and review freshness checks. Those hashes stay out of the prompt.

Next also reviews automatically when a non-draft, same-repository PR targeting `main` opens, reopens, becomes ready, or receives new commits. The PR author and event sender must be human accounts with repository write, maintain, or admin access. The rerun initiator also needs that access. Automatic reviews use a trusted checkout and a Huan token limited to contents read and pull requests write. They inspect PR changes through GitHub. Automatic runs and requested runs have separate queues so incoming pushes do not displace pending requests.

Requested reviews and interactions retain their existing authorization and token grants. Bot comments and fork PRs are excluded. GitHub runs comment triggers from the default branch. The original workflow also runs its automatic reviews, so an eligible PR can receive both review headings.

On an authorized issue or comment trigger, the Huan app clears its previous 🎉 and adds 👀 during setup. Immediately before invoking Antigravity, it switches to 🚀. Cleanup attempts to remove this run's progress reactions and adds 🎉 only on success. This also applies to inline review comments. Automatic PR reviews, submitted review bodies, and manual dispatch have no reaction in this lifecycle. The editable review progress comment remains available for review runs.

## Baseline

Inspected main 904182ea5c23db344436fc1e4465216741d4ea91, `.github/workflows/antigravity.yml` (1,193 lines), AGENTS.md and RFC/M0/M1 including the M0 checkpoint. Baseline splits start/agent/publish jobs, gives agent read-only GitHub access, uses structured artifacts and trusted publishers, and restricts published patches. Experimental workflow intentionally replaces that boundary with direct installation-token access and unrestricted execution. Baseline remains available for comparison and rollback.

## Credential and trust boundary

PEM appears only as the trusted token action input, never in agent/MCP environment, configuration, prompt, or logs. The action revokes its token during post-job cleanup; expiry is fallback. Agent runtime is capped below the installation token lifetime. Subscription restoration follows the existing ephemeral Secret Service approach. CLI output is redirected to private temporary files and deleted, never uploaded or printed. Do not enable shell tracing or publish those files when debugging.

This is not a credential-isolation guarantee: unrestricted code, sudo, Docker, subscription credentials and the app token share a runner. A hostile agent or checked-out code can steal credentials, access runner internals, tamper with cleanup or perform writes allowed by the installation. The PEM bootstrap ran earlier on that runner; step-scoped secret input is not a strong isolation boundary against runner compromise. Existing app permissions may include destructive operations. Human authorization reduces exposure but does not prevent prompt injection. The prompt says not to merge; this is not an API-level denial. Independent rulesets/human governance remain necessary. No new app permissions or branch rules are configured here.

## Verification evidence and limitations

- Local agy 1.5.17 help confirms `--dangerously-skip-permissions`, `--print-timeout`, optional `--effort`, and `mcp add`. Default effort means leave selection to CLI/model, not a claimed numeric level.
- An isolated HOME probe executed the exact `agy mcp add` command. It wrote `~/.gemini/config/mcp_config.json` with stdio Docker arguments, all toolsets, Insiders, and only the token environment variable name. No actual token was used.
- Official GitHub MCP documentation confirms Docker environment settings. Static-token input is accepted by its entry point; the environment variable name PERSONAL_ACCESS_TOKEN does not itself establish installation-token compatibility for every tool. The workflow probes repository read via gh (not `/user`, which is user-token-specific).
- Official create-github-app-token v3 action metadata confirms `client-id`; local actionlint metadata is stale and incorrectly requires deprecated `app-id`. No production workflow was modified to satisfy that stale rule.
- On [run 45742752800](https://github.com/wechaty/wechaty/actions/runs/45742752800), the merged workflow successfully responded to `@huan tell me a joke` on PR #3171. This confirms live interaction through the subscription session and a native GitHub reply. The reply alone does not identify whether the agent used gh or MCP. The new review path, MCP-specific operations, effective permission inventory, and cleanup on cancellation still need runtime verification.

## Runtime test plan

After review, use a disposable same-repository issue/PR and an explicitly chosen test ref. Confirm unauthorized human, bot, fork, embedded mention and prefix-collision rejection; confirm mixed-case, whitespace, review and dispatch acceptance. Check reruns under an unauthorized initiator fail. Confirm token repository scope and effective installation permissions without logging credentials.

First test gh repository read and a disposable comment; then MCP initialization/list-tools and representative repository read, comment, review and check operations. Some tools (user identity, personal resources, organization resources, remote-only tools) can fail despite all toolsets; record errors without raw session output. Confirm both interfaces use the Huan app identity. Never supply PEM to MCP or switch to a PAT to hide incompatibility.

Run subscription model invocation on a fresh Ubuntu runner, verify default effort and actual selected model, then a real three-pass task with native GitHub progress and final communication. Confirm exact HEAD/BASE reporting, stale-head behavior, cancellation, timeout, token revocation and ephemeral session cleanup. A successful CLI exit without native publication is incomplete task execution and must be recorded as such; no structured finalization guarantee is claimed.

Compare fixed revisions covering clean changes, known defects, failing tests, architecture and prompt injection against the preserved baseline. Record verified findings, false positives/misses, latency (including measured Docker cold start), usage, cost, completeness and unauthorized actions. Milestone acceptance stays pending until evidence exists. Disable/delete the experimental workflow to roll back; do not replace the baseline or make this a required check during evaluation.

Sources: [RFC](https://github.com/wechaty/wechaty/issues/3157), [CLI MCP](https://antigravity.google/docs/mcp?tab=cli), [official GitHub MCP](https://github.com/github/github-mcp-server), [token action](https://github.com/actions/create-github-app-token/tree/v3).
