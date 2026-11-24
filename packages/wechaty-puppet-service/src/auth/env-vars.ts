/**
 * Environment variables containing newlines in Node?
 *  `replace(/\\n/g, '\n')`
 *    https://stackoverflow.com/a/36439803/1123955
 */
const WECHATY_PUPPET_SERVICE_TLS_CA_CERT = (v?: string) => v
 || process.env['WECHATY_PUPPET_SERVICE_TLS_CA_CERT']?.replace(/\\n/g, '\n')

const WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT = (v?: string) => v
 || process.env['WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT']?.replace(/\\n/g, '\n')

const WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY = (v?: string) => v
 || process.env['WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY']?.replace(/\\n/g, '\n')

const WECHATY_PUPPET_SERVICE_TLS_SERVER_NAME = (v?: string) => v
 || process.env['WECHATY_PUPPET_SERVICE_TLS_SERVER_NAME']?.replace(/\\n/g, '\n')

const WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_SERVER = (v?: boolean) => typeof v === 'undefined'
  ? process.env['WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_SERVER'] === 'true'
  : v
const WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT = (v?: boolean) => typeof v === 'undefined'
  ? process.env['WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT'] === 'true'
  : v

export {
  WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT,
  WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_SERVER,
  WECHATY_PUPPET_SERVICE_TLS_CA_CERT,
  WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT,
  WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY,
  WECHATY_PUPPET_SERVICE_TLS_SERVER_NAME,
}
