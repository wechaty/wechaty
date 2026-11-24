/**
 * Package-wide settings: the version embedded from `package.json`, the
 * shared logger, the merged environment variable readers (`envVars`) and the
 * default gRPC channel options.
 */
/// <reference path="./typings.d.ts" />

import { log } from 'wechaty-puppet'

import { packageJson } from './package-json.ts'

import * as rootEnvVars from './env-vars.ts'
import * as authEnvVars from './auth/env-vars.ts'

const VERSION = packageJson.version || '0.0.0'

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
