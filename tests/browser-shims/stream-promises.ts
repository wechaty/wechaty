/**
 * Browser shim for `node:stream/promises`.
 *
 * Provides browser-safe stream pipeline implementations for libraries like
 * `file-box` when executed in browser environments where Node standard
 * `stream/promises` built-in module is unavailable.
 */

/**
 * Pipes a sequence of streams together, resolving when all streams have
 * completed or rejecting if an error occurs.
 *
 * @param streams - Stream instances to pipe together in sequence.
 * @returns A promise that resolves when the pipeline completes.
 */
export async function pipeline (...streams: any[]): Promise<void> {
  if (streams.length < 2) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    let current = streams[0]
    for (let i = 1; i < streams.length; i++) {
      const next = streams[i]
      if (typeof current?.pipe === 'function') {
        current = current.pipe(next)
      } else {
        return reject(new Error('pipeline() requires pipeable streams'))
      }
    }

    let settled = false
    const onFinish = () => {
      if (!settled) {
        settled = true
        resolve()
      }
    }
    const onError = (err: unknown) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    }

    current.on?.('finish', onFinish)
    current.on?.('end', onFinish)
    current.on?.('close', onFinish)
    current.on?.('error', onError)
  })
}

export default {
  pipeline,
}
