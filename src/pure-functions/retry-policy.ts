import {
  ExponentialBackoff,
  handleAll,
  retry,
  type RetryPolicy,
}                 from 'cockatiel'
import {
  log,
}                 from 'wechaty-puppet'

/**
 * Cockatiel 2.0.2 behavior, preserved with 4.0.0: no retries after success,
 * up to four calls (three retries), and jittered exponential delays capped at
 * ten seconds.
 *
 * https://github.com/connor4312/cockatiel#retry
 */
const retryPolicy = getRetryPolicy()

function getRetryPolicy (): RetryPolicy {
  const policy = retry(handleAll, {
    maxAttempts: 3,
    backoff: new ExponentialBackoff({
      initialDelay: 1000,
      maxDelay: 10 * 1000,
    }),
  })

  policy.onRetry(reason => log.silly('wechaty',
    'retry-policy getRetryPolicy policy.onRetry() reason: "%s"',
    JSON.stringify({ ...reason, attempt: undefined }),
  ))
  policy.onSuccess(({ duration }) => log.silly('wechaty',
    'retry-policy getRetryPolicy policy.onSuccess(): retry call ran in %s ms',
    duration,
  ))
  return policy
}

export {
  retryPolicy,
}
