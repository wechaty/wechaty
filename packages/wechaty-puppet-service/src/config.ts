/// <reference path="./typings.d.ts" />

import { log }  from 'wechaty-puppet'

import { VERSION } from './version'

import * as rootEnvVars from './env-vars'
import * as authEnvVars from './auth/env-vars'

const envVars = {
  ...rootEnvVars,
  ...authEnvVars,
}

/**
 * gRPC default options
 */
const GRPC_OPTIONS = {
  // https://github.com/wechaty/wechaty-puppet-service/issues/86
  // 'grpc.max_receive_message_length': 1024 * 1024 * 150,
  // 'grpc.max_send_message_length': 1024 * 1024 * 150,
}

export {
  envVars,
  log,
  GRPC_OPTIONS,
  VERSION,
}
