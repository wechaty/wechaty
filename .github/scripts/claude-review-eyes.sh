#!/usr/bin/env bash
# Trusted PR-base helper. Requires GH_TOKEN and id-token: write.
set -euo pipefail
set +x

mode="${1:?usage: claude-review-eyes.sh start|finish}"
repo="$GITHUB_REPOSITORY"
pr="${PR_NUMBER:?}"
reactions="https://api.github.com/repos/$repo/issues/$pr/reactions"

if [[ "$mode" == start ]]; then
  # A review queued behind another agent must not acknowledge a stale revision.
  target="$(gh api "repos/$repo/pulls/$pr")"
  if [[ "$(jq -r .head.sha <<<"$target")" != "$EXPECTED_SHA" ||
        "$(jq -r .base.sha <<<"$target")" != "$EXPECTED_BASE_SHA" ]]; then
    echo "current=false" >> "$GITHUB_OUTPUT"
    echo "review_needed=false" >> "$GITHUB_OUTPUT"
    echo "::warning::PR changed while queued; skipping stale Claude review."
    exit 0
  fi
  echo "current=true" >> "$GITHUB_OUTPUT"

  statuses="$(gh api "repos/$repo/commits/$EXPECTED_SHA/statuses?per_page=100")"
  if jq -e --arg ctx "claude-agent/review/$EXPECTED_BASE_SHA" \
    'any(.[]; .context == $ctx and .state == "success" and .creator.login == "github-actions[bot]")' \
    <<<"$statuses" >/dev/null; then
    echo "review_needed=false" >> "$GITHUB_OUTPUT"
    echo "Already reviewed this exact HEAD/BASE revision." >> "$GITHUB_STEP_SUMMARY"
    exit 0
  fi
  echo "review_needed=true" >> "$GITHUB_OUTPUT"
elif [[ "$mode" == finish ]]; then
  [[ -n "${REACTION_ID:-}" ]] || exit 0
else
  echo "::error::Expected start or finish" >&2
  exit 2
fi

# Authenticate like Anthropic's default action: OIDC audience, POST without a body.
TOKEN=''
revoke() {
  if [[ -n "$TOKEN" ]]; then
    curl -fsS -X DELETE -H "Authorization: Bearer $TOKEN" \
      https://api.github.com/installation/token >/dev/null ||
      echo "::warning::Failed to revoke Claude App token."
  fi
}
trap revoke EXIT

app_api() {
  curl -fsS -H "Authorization: Bearer $TOKEN" \
    -H 'Accept: application/vnd.github+json' "$@"
}

react() {
  local oidc response existing reaction id code
  oidc="$(curl -fsSG -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
    --data-urlencode 'audience=claude-code-github-action' \
    "$ACTIONS_ID_TOKEN_REQUEST_URL" | jq -er '.value')" || return 1
  response="$(curl -fsS -X POST -H "Authorization: Bearer $oidc" \
    https://api.anthropic.com/api/github/github-app-token-exchange)" || return 1
  unset oidc
  TOKEN="$(jq -er '.token // .app_token' <<<"$response")" || return 1
  unset response
  echo "::add-mask::$TOKEN"

  if [[ "$mode" == start ]]; then
    existing="$(app_api "$reactions?per_page=100")" || return 1
    if jq -e 'any(.[]; .content == "eyes" and .user.login == "claude[bot]")' \
      <<<"$existing" >/dev/null; then
      echo "Existing claude[bot] reaction retained."
      return 0
    fi
    reaction="$(app_api -X POST -H 'Content-Type: application/json' \
      -d '{"content":"eyes"}' "$reactions")" || return 1
    id="$(jq -er 'select(.user.login == "claude[bot]") | .id' \
      <<<"$reaction")" || return 1
    echo "reaction_id=$id" >>"$GITHUB_OUTPUT"
    echo "claude[bot] eyes reaction added."
  else
    code="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE \
      -H "Authorization: Bearer $TOKEN" "$reactions/$REACTION_ID")" || return 1
    [[ "$code" == 204 || "$code" == 404 ]] || return 1
    echo "claude[bot] eyes reaction cleared."
  fi
}

# The emoji is best-effort. Never fail a valid code review because of it.
react || echo "::warning::Claude eyes operation failed; review continues."
