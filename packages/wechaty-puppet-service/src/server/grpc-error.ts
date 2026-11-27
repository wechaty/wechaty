/**
 * `toConnectError()` / `grpcError()`: logs a handler failure and returns a ConnectError
 * preserving valid non-OK gRPC status codes (e.g. Code.DeadlineExceeded, Code.InvalidArgument),
 * falling back to Code.Internal.
 */
import type { Interceptor } from '@connectrpc/connect'
import { ConnectError, Code } from '@connectrpc/connect'
import { log } from 'wechaty-puppet'
import { Code as GErrorCode, GError } from 'gerror'
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

const CONNECT_TO_GERROR_CODE: Record<Code, GErrorCode> = {
  [Code.Canceled]: GErrorCode.Cancelled,
  [Code.Unknown]: GErrorCode.Unknown,
  [Code.InvalidArgument]: GErrorCode.InvalidArgument,
  [Code.DeadlineExceeded]: GErrorCode.DeadlineExceeded,
  [Code.NotFound]: GErrorCode.NotFound,
  [Code.AlreadyExists]: GErrorCode.AlreadyExists,
  [Code.PermissionDenied]: GErrorCode.PermissionDenied,
  [Code.ResourceExhausted]: GErrorCode.ResourceExhausted,
  [Code.FailedPrecondition]: GErrorCode.FailedPrecondition,
  [Code.Aborted]: GErrorCode.Aborted,
  [Code.OutOfRange]: GErrorCode.OutOfRange,
  [Code.Unimplemented]: GErrorCode.Unimplemented,
  [Code.Internal]: GErrorCode.Internal,
  [Code.Unavailable]: GErrorCode.Unavailable,
  [Code.DataLoss]: GErrorCode.DataLoss,
  [Code.Unauthenticated]: GErrorCode.Unauthenticated,
}

export function toConnectError (
  method : string,
  error  : unknown,
): ConnectError {
  const gerr = GError.from(error)

  log.error('PuppetServiceImpl', `toConnectError() ${method}() rejection: %s\n%s`,
    gerr.message,
    gerr.stack,
  )

  const rawCode = (error as any)?.code ?? gerr.code
  const connectCode = mapGrpcCode(rawCode)
  const normalized = new GError(gerr.message, {
    code: CONNECT_TO_GERROR_CODE[connectCode],
    details: gerr.details,
    ...('cause' in gerr ? { cause: gerr.cause } : {}),
  })
  return gerrorToConnectError(normalized)
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
