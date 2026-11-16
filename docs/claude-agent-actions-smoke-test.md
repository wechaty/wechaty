# Claude Agent GitHub Actions smoke test

This pull request is a controlled, low-risk test of the Claude Agent workflow
introduced by #2915. Keep this file until the workflow has been validated.

## Initial automatic review

Opening a non-draft pull request from a branch in this repository should start
the `review` job in `.github/workflows/claude.yml`.

Expected observations:
- The review job runs with the subscription-backed Claude credential.
- Claude can inspect this PR's diff and report findings (or no findings).
- A successful review writes a `claude-agent-reviewed` marker containing the
  exact head and base commit SHAs, authored by `github-actions[bot]`.
- Re-triggering review on the same revision does not duplicate the completed review.

## Interactive coding test

After observing the initial review, a maintainer can post this comment:

```text
/claude Please update this smoke-test Markdown file by adding a section
titled "Interactive agent result" with a short sentence confirming that
the trusted /claude coding path can edit and push to this PR branch.
Do not modify other files.
```

Verify that the agent accepts the authorized request, edits only this file,
pushes the commit, and reports its result. A new commit should permit a fresh
review of the updated revision (trigger a new ready-for-review event if needed).

## Interactive agent result

The trusted `/claude` path can edit, commit, and push to this PR branch.

## Automatic re-review test

This commit is intended to trigger the `pull_request` `synchronize` review
workflow, so that a fresh review runs for the updated head revision.

## Bot-triggered automatic review verification

This Claude-authored push is intended to trigger the automatic `synchronize` review.

## Read-only remote verification

The Phase 5 test exercises `git ls-remote` to verify the remote branch head.

## Automatic review permissions

The automatic review job should have `contents: write` permission and push fixes directly to `main` without human approval.

## Safety

No production code, secrets, dependencies, or workflow permissions are changed
by this test PR. Do not merge it solely because a job is green; inspect logs,
published feedback, completion markers, and any pushed commits first.
