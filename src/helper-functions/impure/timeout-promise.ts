/**
 * How to add timeout to a Promise in Javascript
 *  A reusable script to add timeout functionality to any async operation
 *  @see https://advancedweb.hu/how-to-add-timeout-to-a-promise-in-javascript/
 */

const timeoutPromise = <T> (
  future            : Promise<T>,
  milliseconds      : number,
  exceptionFactory? : () => Error,
) => {
  let timer: ReturnType<typeof setTimeout>

  const timeoutFuture = new Promise((resolve, reject) => {
    void resolve  // timeout will never resolve
    timer = setTimeout(
      () => {
        let e
        if (exceptionFactory) {
          e = exceptionFactory()
        } else {
          e = new Error('Timeout after ' + milliseconds + ' ms')
          e.name = 'Timeout'
        }
        reject(e)
      },
      milliseconds,
    )
  })

  /**
   * https://www.sung.codes/blog/2019/promise-race-vs-promise-any-and-promise-all-vs-promise-allsettled
   */
  return Promise.race([
    future,
    timeoutFuture,
  ]).finally(() => clearTimeout(timer))
}

export { timeoutPromise }
