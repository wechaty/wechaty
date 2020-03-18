import grpc             from 'grpc'

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
  }
  return callback(error, null)
}
