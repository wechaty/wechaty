import type { grpc }  from 'wechaty-grpc'
import { log }        from 'wechaty-puppet'
import { GError }     from 'gerror'

type GErrorCallback = (
  gerror: Partial<grpc.StatusObject>,
  value: null,
) => void

export function grpcError (
  method   : string,
  error    : any,
  callback : GErrorCallback,
): void {
  const gerr = GError.from(error)

  log.error('PuppetServiceImpl', `grpcError() ${method}() rejection: %s\n%s`,
    gerr.message,
    gerr.stack,
  )

  return callback(gerr, null)
}
