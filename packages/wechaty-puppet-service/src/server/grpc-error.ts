import { grpc } from 'wechaty-grpc'

import {
  log,
}         from '../config'

export function grpcError (
  method   : string,
  e        : Error,
  callback : Function,
): void {
  log.error('PuppetServiceImpl', `grpcError() ${method}() rejection: %s`, e && e.message)

  const error: grpc.ServiceError = {
    ...e,
    code: grpc.status.INTERNAL,
    details: e.message,
    metadata: new grpc.Metadata(),
  }
  return callback(error, null)
}
