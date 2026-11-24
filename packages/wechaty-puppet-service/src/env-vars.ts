import { log } from 'wechaty-puppet'

// Huan(202011): use a function to return the value in time.
const WECHATY_PUPPET_SERVICE_TOKEN: (token?: string) => string = token => {
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

  const tokenNotFoundError = 'wechaty-puppet-service: WECHATY_PUPPET_SERVICE_TOKEN not found'

  console.error([
    '',
    tokenNotFoundError,
    '(save token to WECHATY_PUPPET_SERVICE_TOKEN env var or pass it to puppet options is required.).',
    '',
    'To learn how to get Wechaty Puppet Service Token,',
    'please visit <https://wechaty.js.org/docs/puppet-services/>',
    'to see our Wechaty Puppet Service Providers.',
    '',
  ].join('\n'))

  throw new Error(tokenNotFoundError)
}

const WECHATY_PUPPET_SERVICE_ENDPOINT = (endpoint?: string) => {
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

const WECHATY_PUPPET_SERVICE_AUTHORITY = (authority?: string) => {
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

  /**
   * Huan(202108): Wechaty community default authority
   */
  return 'api.chatie.io'
}

export {
  WECHATY_PUPPET_SERVICE_ENDPOINT,
  WECHATY_PUPPET_SERVICE_TOKEN,
  WECHATY_PUPPET_SERVICE_AUTHORITY,
}
