import promiseRetry         from 'promise-retry'
import { OperationOptions } from 'retry'

export async function tryWait<T> (
  retryableFn: (
    retry   : (error: Error) => never,
    attempt : number,
  ) => Promise<T>,
): Promise<T> {
  /**
   * 60 seconds: (to be confirmed)
   *  factor: 3
   *  minTimeout: 10
   *  maxTimeout: 20 * 1000
   *  retries: 9
   */
  const factor     = 3
  const minTimeout = 10
  const maxTimeout = 20 * 1000
  const retries    = 9
  // const unref      = true

  const retryOptions: OperationOptions = {
    factor,
    maxTimeout,
    minTimeout,
    retries,
    // unref,
  }
  return promiseRetry(retryOptions, retryableFn)
}
