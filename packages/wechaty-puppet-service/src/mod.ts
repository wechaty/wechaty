/**
 * Package entry: `PuppetService` (the client puppet, also the default
 * export), `PuppetServer` (serves any puppet over gRPC), `VERSION` and `log`.
 */
import {
  log,
}                 from 'wechaty-puppet'
import {
  PuppetService,
  type PuppetServiceOptions,
}                 from './client/puppet-service.ts'
import type { GrpcReconnectOptions } from './client/grpc-manager.ts'
import {
  VERSION,
}                 from './config.ts'
import {
  PuppetServer,
  type PuppetServerOptions,
}                         from './server/puppet-server.ts'

export {
  log,
  PuppetServer,
  PuppetService,
  VERSION,
}
export type {
  GrpcReconnectOptions,
  PuppetServerOptions,
  PuppetServiceOptions,
}

export default PuppetService
