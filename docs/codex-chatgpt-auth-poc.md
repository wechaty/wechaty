# Codex CLI ChatGPT subscription authentication — experimental PoC

Related: #2923. This is an **authentication-only**, manual proof of concept.
It does not install an autonomous Codex GitHub reviewer or allow repository writes.

## Hypothesis

Codex CLI may be able to run `codex exec` headlessly on a fresh GitHub-hosted
runner using ChatGPT account-backed credentials rather than `OPENAI_API_KEY`.
This is **not** the documented authentication path for the official
`openai/codex-action`, and is not guaranteed to be supported or durable.

## Safety and prerequisites

- The workflow is **manual only** (`workflow_dispatch`) and checks out no
  repository or PR code. It has only `contents: read` GitHub permission.
- It is disabled unless the repository variable `CODEX_AUTH_POC_ENABLED` is
  explicitly set to `true`.
- The optional repository secret `CODEX_AUTH_JSON_B64` must contain a base64
  encoding of a Codex CLI `auth.json` obtained through an authorized ChatGPT
  login. **Do not paste the credential in an issue, PR, comment, or chat.**
- This auth file is a sensitive, reusable credential. It may permit use of the
  linked ChatGPT account. GitHub Actions secrets do not eliminate the risks of
  workflow modifications, third-party dependencies, and compromised runners.
  Use an isolated account and a tightly controlled repository/environment
  rather than personal account credentials in a public project.
- The job creates a temporary `CODEX_HOME`, never prints credentials, and
  removes the file when the step exits. It does not upload artifacts.
- Confirm with OpenAI's current documentation and applicable terms before
  relying on credential export or unattended refresh. An initial success
  does **not** establish that refresh works or that this is a supported CI
  integration.

## Procedure

1. Review this draft PR and the workflow before merging anything.
2. Prefer reproducing the experiment in a separate private test repository
   with protected secrets and a restricted set of workflow editors.
3. Set `CODEX_AUTH_POC_ENABLED=true` only after the credential handling and
   runner trust boundary have been approved.
4. Configure `CODEX_AUTH_JSON_B64` in GitHub Actions secrets through GitHub
   settings, **never** in a public discussion.
5. Manually run `Codex ChatGPT Auth PoC (manual only)`.
6. Inspect whether the run prints `WECHATY_CODEX_AUTH_POC_OK`, and check
   authentication failures, refresh behavior, account quota, and any billing
   separately. Do not publish sensitive logs.

## Acceptance criteria

- Fresh ephemeral runner; no `OPENAI_API_KEY` supplied.
- Codex CLI runs a trivial prompt non-interactively.
- No credential disclosure or repository write.
- Confirm subscription usage and whether auth refresh survives a fresh runner.
- Record limitations; do not interpret one successful run as production-ready.

If the account-backed path is unsupported, use OpenAI API credentials or the
managed Codex GitHub integration as the documented alternatives.
