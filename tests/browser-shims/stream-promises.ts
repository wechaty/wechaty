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
 * Propagates errors from any stream in the sequence, rejects upon premature
 * closure before completion, and detaches all event listeners on settlement.
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

    const destination = streams[streams.length - 1]
    let settled = false

    const cleanups: (() => void)[] = []
    const cleanup = () => {
      for (const fn of cleanups) fn()
      cleanups.length = 0
    }

    const onFinish = () => {
      if (!settled) {
        settled = true
        cleanup()
        resolve()
      }
    }

    const onError = (err: unknown) => {
      if (!settled) {
        settled = true
        cleanup()
        for (const s of streams) {
          if (typeof s?.destroy === 'function' && !s.destroyed) {
            try {
              s.destroy(err)
            } catch {
              // Ignore secondary destroy failures
            }
          }
        }
        reject(err)
      }
    }

    const onClose = () => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error('Premature close'))
      }
    }

    for (const s of streams) {
      if (typeof s?.on === 'function') {
        s.on('error', onError)
        cleanups.push(() => {
          s.off?.('error', onError) ?? s.removeListener?.('error', onError)
        })
      }
    }

    if (typeof destination?.on === 'function') {
      destination.on('finish', onFinish)
      destination.on('end', onFinish)
      destination.on('close', onClose)
      cleanups.push(() => {
        destination.off?.('finish', onFinish) ?? destination.removeListener?.('finish', onFinish)
        destination.off?.('end', onFinish) ?? destination.removeListener?.('end', onFinish)
        destination.off?.('close', onClose) ?? destination.removeListener?.('close', onClose)
      })
    }
  })
}

export default {
  pipeline,
}
