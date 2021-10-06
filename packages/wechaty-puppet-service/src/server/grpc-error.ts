import { grpc } from 'wechaty-grpc'
import {
  log,
}         from 'wechaty-puppet'

export function grpcError (
  method   : string,
  err      : Error,
  callback : Function,
): void {
  log.error('PuppetServiceImpl', `grpcError() ${method}() rejection: %s`, err && err.message)

  const error: grpc.ServiceError = {
    ...err,
    code: grpc.status.INTERNAL,
    details: err.message,
    metadata: new grpc.Metadata(),
  }
  return callback(error, null)
}
