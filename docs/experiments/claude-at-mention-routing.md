# Claude @mention routing experiment

This file is a disposable fixture for validating the interactive Claude GitHub Action after switching its trigger from `/claude` to `@claude` in PR #2925.

## Observation checklist

- Whether `@claude` starts the `Claude Agent` GitHub Actions interactive job
- Whether `claude[bot]` reacts and posts a reply
- Whether GitHub-native Claude creates a separate coding-agent session
- Whether the same comment causes duplicate execution
- Whether the reply identifies the GitHub Actions execution environment

No production code changes are required. Do not merge this fixture PR into `main`.
