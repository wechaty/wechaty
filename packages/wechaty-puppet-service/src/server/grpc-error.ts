/**
 * `toConnectError()` / `grpcError()`: logs a handler failure and returns a ConnectError
 * with Code.Internal and the original error details.
 */
import type { Interceptor } from '@connectrpc/connect'
import { ConnectError, Code } from '@connectrpc/connect'
import { log } from 'wechaty-puppet'
import { GError } from 'gerror'

export function toConnectError (
  method : string,
  error  : unknown,
): ConnectError {
  const gerr = GError.from(error)

  log.error('PuppetServiceImpl', `toConnectError() ${method}() rejection: %s\n%s`,
    gerr.message,
    gerr.stack,
  )

  return new ConnectError(gerr.message, Code.Internal)
}

export const grpcError = toConnectError

export function serverErrorInterceptor (): Interceptor {
  return (next) => async (req) => {
    try {
      const res = await next(req)
      if (res.stream) {
        const stream = res.message as AsyncIterable<any>
        async function* wrapMessage () {
          try {
            for await (const chunk of stream) {
              yield chunk
            }
          } catch (err) {
            if (err instanceof ConnectError) {
              throw err
            }
            throw toConnectError(req.method.name, err)
          }
        }
        return {
          ...res,
          message: wrapMessage(),
        }
      }
      return res
    } catch (e) {
      if (e instanceof ConnectError) {
        throw e
      }
      throw toConnectError(req.method.name, e)
    }
  }
}
