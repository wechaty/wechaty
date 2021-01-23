/// <reference path="./typings.d.ts" />

export { log } from 'wechaty-puppet'

export { VERSION } from './version'

export const GRPC_LIMITATION = {
  // https://github.com/wechaty/wechaty-puppet-service/issues/86
  // 'grpc.max_receive_message_length': 1024 * 1024 * 150,
  // 'grpc.max_send_message_length': 1024 * 1024 * 150,
}

// Huan(202011): use a function to return the value in time.
export const WECHATY_PUPPET_HOSTIE_TOKEN    = () => process.env.WECHATY_PUPPET_HOSTIE_TOKEN
export const WECHATY_PUPPET_HOSTIE_ENDPOINT = () => process.env.WECHATY_PUPPET_HOSTIE_ENDPOINT
