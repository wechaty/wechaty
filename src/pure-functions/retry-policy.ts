import {
  ExponentialBackoff,
  handleAll,
  retry,
  RetryPolicy,
}                 from 'cockatiel'
import {
  log,
}                 from 'wechaty-puppet'

/**
 * Create a retry policy that'll try whatever function we execute 3
 *  times with a randomized exponential backoff.
 *
 * https://github.com/connor4312/cockatiel#policyretry
 */
const retryPolicy = getRetryPolicy()

function getRetryPolicy (): RetryPolicy {
  const policy = retry(handleAll, {
    /**
     * ExponentialBackoff
     *  https://github.com/connor4312/cockatiel#exponentialbackoff
     */
    backoff: new ExponentialBackoff({
      initialDelay : 1000,
      // maxAttempts  : 5,
      maxDelay     : 10 * 1000,
    }),
    maxAttempts: 3,
  })

  policy.onRetry(reason => log.silly('wechaty',
    'retry-policy getRetryPolicy policy.onRetry() reason: "%s"',
    JSON.stringify(reason),
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
