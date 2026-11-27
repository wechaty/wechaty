/**
 * `toConnectError()` / `grpcError()`: logs a handler failure and returns a ConnectError
 * preserving valid non-OK gRPC status codes (e.g. Code.DeadlineExceeded, Code.InvalidArgument),
 * falling back to Code.Internal.
 */
import type { Interceptor } from '@connectrpc/connect'
import { ConnectError, Code } from '@connectrpc/connect'
import { log } from 'wechaty-puppet'
import { GError } from 'gerror'
import { toConnectError as gerrorToConnectError } from 'gerror-connect'

function mapGrpcCode (code: unknown): Code {
  if (typeof code === 'number' && code >= 1 && code <= 16 && code !== 2) {
    return code as Code
  }
  if (typeof code === 'string' && code in Code && typeof Code[code as keyof typeof Code] === 'number') {
    const val = Code[code as keyof typeof Code] as number
    if (val !== 2) {
      return val as Code
    }
  }
  return Code.Internal
}

export function toConnectError (
  method : string,
  error  : unknown,
): ConnectError {
  if (error instanceof ConnectError) {
    log.error('PuppetServiceImpl', `toConnectError() ${method}() rejection: %s\n%s`,
      error.rawMessage,
      error.stack,
    )
    return error
  }

  const gerr = GError.from(error)

  log.error('PuppetServiceImpl', `toConnectError() ${method}() rejection: %s\n%s`,
    gerr.message,
    gerr.stack,
  )

  const rawCode = (error as any)?.code ?? gerr.code
  const connectCode = mapGrpcCode(rawCode)

  try {
    const converted = gerrorToConnectError(gerr)
    if (converted.code === connectCode) {
      return converted
    }
    const outgoing = converted.details.filter(
      (d): d is Extract<typeof converted.details[number], { desc: unknown }> => 'desc' in d,
    )
    return new ConnectError(
      converted.rawMessage,
      connectCode,
      converted.metadata,
      outgoing,
      converted.cause,
    )
  } catch {
    return new ConnectError(gerr.message.slice(0, 4096), connectCode)
  }
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
