# Claude Agent GitHub Actions smoke test

This pull request is a controlled, low-risk test of the Claude Agent workflow
introduced by #2915 and upgraded by #2922. This is a disposable test fixture; do not merge it.

## Initial automatic review

Opening a non-draft pull request from a branch in this repository should start
the `review` job in `.github/workflows/claude.yml`.

Expected observations:
- The review job runs with the subscription-backed Claude credential.
- Claude can inspect this PR's diff and report findings (or no findings).
- Claude posts an inline finding and a PR conversation comment containing
  `<!-- claude-review-complete:HEAD:BASE -->`, authored by `claude[bot]`.
- Only after verifying that comment does the workflow record a successful
  `claude-agent/review/BASE` commit status authored by `github-actions[bot]`.
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

The workflow subscribes to `pull_request.synchronize` as well as opened,
ready-for-review and reopened. After a new commit, confirm the current HEAD/BASE
is reviewed, not an earlier revision. Claude-authored synchronize events are
specifically permitted by the workflow; other bot events remain excluded.

## Bot-triggered automatic review verification

A Claude-authored push is intended to trigger the automatic `synchronize` review.
Verify this from the Actions run rather than assuming a push always starts a job.

## Read-only remote verification

The Phase 5 test exercises `git ls-remote` to verify the remote branch head.

## Post-merge v2 review verification

This revision exercises the merged autonomy-first Claude workflow from PR #2922.
The deliberately incorrect statement below is retained as an inline-review
**detection fixture**, not a recommendation. Do not merge this smoke-test PR.

Observed on HEAD `54098b43`: Claude posted an inline finding and the exact
HEAD/BASE completion marker. GitHub recorded successful commit status
`claude-agent/review/515c13f09ee8ecf2221a4b46a196881ec36e43c2`.
The reviewer has `contents: write` at both job and GitHub App token levels,
but is instructed to review without editing. A successful review does not
prove the reviewer can actually push. Test reviewer write authority only on
a disposable branch with an explicitly authorized, controlled workflow;
never test a direct push to protected `main`.

## Automatic review permissions — deliberately false detection fixture

The following statement is intentionally incorrect and must be flagged by
reviewers; it is not the expected policy:

The automatic review job should have `contents: write` permission and push fixes directly to `main` without human approval.

## Safety

No production code, secrets, dependencies, or workflow permissions are changed
by this test PR. Do not merge it solely because a job is green; inspect logs,
published feedback, completion markers, and any pushed commits first.
