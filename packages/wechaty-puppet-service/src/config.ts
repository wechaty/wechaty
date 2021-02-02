/// <reference path="./typings.d.ts" />

import { log } from 'wechaty-puppet'

export { VERSION } from './version'

export const GRPC_LIMITATION = {
  // https://github.com/wechaty/wechaty-puppet-service/issues/86
  // 'grpc.max_receive_message_length': 1024 * 1024 * 150,
  // 'grpc.max_send_message_length': 1024 * 1024 * 150,
}

// Huan(202011): use a function to return the value in time.
export const WECHATY_PUPPET_SERVICE_TOKEN    = () => {
  if (process.env.WECHATY_PUPPET_SERVICE_TOKEN) {
    return process.env.WECHATY_PUPPET_SERVICE_TOKEN
  }
  /**
   * Huan(202102): remove this deprecated warning after Dec 31, 2021
   */
  if (process.env.WECHATY_PUPPET_HOSTIE_TOKEN) {
    log.warn('wechaty-puppet-service', [
      '',
      'WECHATY_PUPPET_HOSTIE_TOKEN has been deprecated,',
      'please use WECHATY_PUPPET_SERVICE_TOKEN instead.',
      'See: https://github.com/wechaty/wechaty-puppet-service/issues/118',
      '',
    ].join(' '))
    return process.env.WECHATY_PUPPET_HOSTIE_TOKEN
  }
  return undefined
}

export const WECHATY_PUPPET_SERVICE_ENDPOINT = () => {
  if (process.env.WECHATY_PUPPET_SERVICE_ENDPOINT) {
    return process.env.WECHATY_PUPPET_SERVICE_ENDPOINT
  }
  /**
   * Huan(202102): remove this deprecated warning after Dec 31, 2021
   */
  if (process.env.WECHATY_PUPPET_HOSTIE_ENDPOINT) {
    log.warn('wechaty-puppet-service', [
      '',
      'WECHATY_PUPPET_HOSTIE_ENDPOINT has been deprecated,',
      'please use WECHATY_PUPPET_SERVICE_ENDPOINT instead.',
      'See: https://github.com/wechaty/wechaty-puppet-service/issues/118',
      '',
    ].join(' '))
    return process.env.WECHATY_PUPPET_HOSTIE_ENDPOINT
  }
  return undefined
}

export {
  log,
}
