/**
 * The retry policy for token discovery requests: up to three retries with a
 * randomized exponential backoff, for any error. Retries and successes are
 * logged at the `silly` level.
 */
import {
  ExponentialBackoff,
  handleAll,
  retry,
  type RetryPolicy,
}                       from 'cockatiel'

import {
  log,
}           from './config.ts'

/**
 * Creates the policy. See https://github.com/connor4312/cockatiel#retry
 */
function getRetryPolicy (): RetryPolicy {
  const policy = retry(handleAll, {
    maxAttempts : 3,
    backoff     : new ExponentialBackoff(),
  })

  policy.onRetry(reason => log.silly('wechaty-token',
    'retry-policy getRetryPolicy policy.onRetry() reason: "%s"',
    JSON.stringify(reason),
  ))
  policy.onSuccess(({ duration }) => log.silly('wechaty-token',
    'retry-policy getRetryPolicy policy.onSuccess(): retry call ran in %s ms',
    duration,
  ))
  return policy
}

const retryPolicy = getRetryPolicy()

export {
  retryPolicy,
}
