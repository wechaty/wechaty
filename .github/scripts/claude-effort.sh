#!/usr/bin/env bash
# Selects reasoning effort for the interactive and automatic review jobs in
# claude.yml. RFC #3001 defines issue difficulty and PR risk as independent
# measures. This resolver turns those labels into Claude effort and review titles.
# https://github.com/wechaty/wechaty/issues/3001
#
# The workflow defaults to medium. Only active labels most recently applied by
# huan can raise effort. Missing or unverifiable label evidence keeps the default.
set -euo pipefail

level=medium

# Read the event target, current labels, and label history from GitHub.
# Update level to the highest verified effort. Unavailable metadata leaves
# level at medium and allows the workflow to continue.
resolve_effort() {
  local target kind number endpoint labels events selected

  if ! target="$(jq -er '
    if .pull_request then ["pr", .pull_request.number]
    elif .issue.pull_request then ["pr", .issue.number]
    elif .issue then ["issue", .issue.number]
    else empty
    end | @tsv
  ' "$GITHUB_EVENT_PATH")"; then
    echo 'Claude effort: could not identify the issue or pull request.'
    return
  fi
  IFS=$'\t' read -r kind number <<< "$target"
  endpoint="repos/$GITHUB_REPOSITORY/issues/$number"

  if ! labels="$(gh api "$endpoint" | jq -ce '[.labels[].name]')"; then
    echo 'Claude effort: could not read current labels.'
    return
  fi

  local high_label deep_label
  if [[ "$kind" == pr ]]; then
    high_label=risk/medium
    deep_label=risk/high
  else
    high_label=difficulty/medium
    deep_label=difficulty/hard
  fi

  if ! jq -e --arg high "$high_label" --arg deep "$deep_label" \
    'index($high) != null or index($deep) != null' <<< "$labels" > /dev/null; then
    return
  fi

  if ! events="$(gh api --paginate --slurp "$endpoint/events?per_page=100")"; then
    echo 'Claude effort: could not read label history.'
    return
  fi

  if ! selected="$(jq -r --argjson labels "$labels" \
    --arg high "$high_label" --arg deep "$deep_label" '
      def applied_by_huan($name):
        ($labels | index($name)) != null and
        ([.[][] | select(
          (.event == "labeled" or .event == "unlabeled") and .label.name == $name
        )] | max_by([.created_at, .id])
            | .event == "labeled" and ((.actor.login // "") | ascii_downcase) == "huan");
      if applied_by_huan($deep) then "xhigh"
      elif applied_by_huan($high) then "high"
      else "medium"
      end
    ' <<< "$events")"; then
    echo 'Claude effort: could not verify who applied the labels.'
    return
  fi

  level="$selected"
}

resolve_effort

case "$level" in
  medium) title='Claude review' ;;
  high) title='Claude review · 🦾 High' ;;
  xhigh) title='Claude review · 🦾🦾 XHigh' ;;
  max) title='Claude review · 🦾🦾🦾 Max' ;;
  ultracode) title='Claude review · 🦾🦾🦾🦾 Ultracode' ;;
esac

printf 'level=%s\nreview_title=%s\n' "$level" "$title" >> "$GITHUB_OUTPUT"
printf 'Claude effort: %s\n' "$level"
