/// <reference path="./typings.d.ts" />

import { log }  from 'wechaty-puppet'

import { VERSION } from './version'

const GRPC_OPTIONS = {
  // https://github.com/wechaty/wechaty-puppet-service/issues/86
  // 'grpc.max_receive_message_length': 1024 * 1024 * 150,
  // 'grpc.max_send_message_length': 1024 * 1024 * 150,
}

// Huan(202011): use a function to return the value in time.
const GET_WECHATY_PUPPET_SERVICE_TOKEN = (token?: string) => {
  if (token) {
    return token
  }

  if (process.env['WECHATY_PUPPET_SERVICE_TOKEN']) {
    return process.env['WECHATY_PUPPET_SERVICE_TOKEN']
  }
  /**
   * Huan(202102): remove this deprecated warning after Dec 31, 2021
   */
  if (process.env['WECHATY_PUPPET_HOSTIE_TOKEN']) {
    log.warn('wechaty-puppet-service', [
      '',
      'WECHATY_PUPPET_HOSTIE_TOKEN has been deprecated,',
      'please use WECHATY_PUPPET_SERVICE_TOKEN instead.',
      'See: https://github.com/wechaty/wechaty-puppet-service/issues/118',
      '',
    ].join(' '))
    return process.env['WECHATY_PUPPET_HOSTIE_TOKEN']
  }
  return undefined
}

const GET_WECHATY_PUPPET_SERVICE_ENDPOINT = (endpoint?: string) => {
  if (endpoint) {
    return endpoint
  }

  if (process.env['WECHATY_PUPPET_SERVICE_ENDPOINT']) {
    return process.env['WECHATY_PUPPET_SERVICE_ENDPOINT']
  }
  /**
   * Huan(202102): remove this deprecated warning after Dec 31, 2021
   */
  if (process.env['WECHATY_PUPPET_HOSTIE_ENDPOINT']) {
    log.warn('wechaty-puppet-service', [
      '',
      'WECHATY_PUPPET_HOSTIE_ENDPOINT has been deprecated,',
      'please use WECHATY_PUPPET_SERVICE_ENDPOINT instead.',
      'See: https://github.com/wechaty/wechaty-puppet-service/issues/118',
      '',
    ].join(' '))
    return process.env['WECHATY_PUPPET_HOSTIE_ENDPOINT']
  }
  return undefined
}

const GET_WECHATY_PUPPET_SERVICE_AUTHORITY = (authority?: string) => {
  if (authority) {
    return authority
  }

  authority = process.env['WECHATY_PUPPET_SERVICE_AUTHORITY']
  if (authority) {
    return authority
  }

  const deprecatedDiscoveryEndpoint = process.env['WECHATY_SERVICE_DISCOVERY_ENDPOINT']
  if (deprecatedDiscoveryEndpoint) {
    console.error([
      'Environment variable WECHATY_SERVICE_DISCOVERY_ENDPOINT is deprecated,',
      'Use WECHATY_PUPPET_SERVICE_AUTHORITY instead.',
      'See: https://github.com/wechaty/wechaty-puppet-service/issues/156',
    ].join('\n'))
    return deprecatedDiscoveryEndpoint
      .replace(/^https?:\/\//, '')
      .replace(/\/*$/, '')
  }

  return 'api.chatie.io'
}

/**
 * Huan(202108): remove the below comments after confirm the above GET_WECHATY_PUPPET_SERVICE_AUTHORITY works as expected.
 *  See: https://github.com/wechaty/wechaty-puppet-service/issues/156
 */
// const GET_WECHATY_SERVICE_DISCOVERY_ENDPOINT = (endpoint?: string) => {
//   if (endpoint) {
//     return endpoint
//   }

//   return process.env['WECHATY_SERVICE_DISCOVERY_ENDPOINT']
//     || 'https://api.chatie.io'
// }

export {
  log,
  GRPC_OPTIONS,
  VERSION,
  GET_WECHATY_PUPPET_SERVICE_ENDPOINT,
  GET_WECHATY_PUPPET_SERVICE_TOKEN,
  GET_WECHATY_PUPPET_SERVICE_AUTHORITY,
}
