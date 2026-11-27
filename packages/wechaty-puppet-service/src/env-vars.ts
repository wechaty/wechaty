/**
 * Readers for the connection environment variables: token, endpoint and
 * discovery authority. Each prefers the explicit option, then the
 * environment. They read the environment when called, so tests and late
 * configuration take effect. A missing token throws.
 */

// Huan(202011): use a function to return the value in time.
const WECHATY_PUPPET_SERVICE_TOKEN: (token?: string) => string = token => {
  if (token) {
    return token
  }

  if (process.env['WECHATY_PUPPET_SERVICE_TOKEN']) {
    return process.env['WECHATY_PUPPET_SERVICE_TOKEN']
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
