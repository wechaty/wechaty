/**
 * Process-wide settings: the `config` singleton reads the environment
 * (`WECHATY_APIHOST`, `WECHATY_TOKEN`, `WECHATY_NAME`, `WECHATY_DEBUG`,
 * `WECHATY_DOCKER`, `PORT`, and `WECHATY_PUPPET` through
 * `systemPuppetName()`), next to the package version, the Chatie QR code and
 * the mention separator constants. `systemPuppetName()` has no fallback:
 * Wechaty 2.0 has no default puppet.
 */
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
/// <reference path="./io-peer/json-rpc-peer.d.ts" />

import {
  log,
}                   from 'wechaty-puppet'
import { FileBox } from 'file-box'
import type {
  FileBoxInterface,
}                   from 'file-box'
import type { OfficialPuppetNpmName } from './puppet-config.ts'
import {
  packageJson,
  GIT_COMMIT_HASH,
}                       from './package-json.ts'

type PackageJsonWechaty = {
  version?: string
  wechaty: {
    DEFAULT_PORT: number
    DEFAULT_PROTOCOL: string
    DEFAULT_APIHOST: string
  }
}

const VERSION = packageJson.version || '0.0.0'

const getEnv = (): Record<string, string | undefined> =>
  ((globalThis as any).process?.env ?? {})

const proc = (globalThis as any).process

/**
 * to handle unhandled exceptions
 */
if (proc?.on && (log.level() === 'verbose' || log.level() === 'silly')) {
  log.info('Config', 'registering process.on("unhandledRejection") for development/debug')

  /**
   * Refer to https://nodejs.org/api/process.html#process_event_unhandledrejection
   * the reason is in type: Error | any
   */
  proc.on('unhandledRejection', (reason: Error | any, promise: any) => {
    log.error('Config', '###########################')
    log.error('Config', 'Wechaty unhandledRejection: %s %s', reason.stack || reason, promise)
    log.error('Config', '###########################')
    promise.catch((err: any) => {
      log.error('Config', 'process.on(unhandledRejection) promise.catch(%s)', err.message)
      console.error('Config', err) // I don't know if log.error has similar full trace print support like console.error
    })
  })

  proc.on('uncaughtException', function (error: any) {
    const origin = arguments[1] // to compatible with node 12 or below version typings

    log.error('Config', '###########################')
    log.error('Config', 'Wechaty uncaughtException: %s %s', error.stack, origin)
    log.error('Config', '###########################')
  })
}

export interface DefaultSetting {
  DEFAULT_PORT     : number,
  DEFAULT_APIHOST  : string,
  DEFAULT_PROTOCOL : string,
}

const DEFAULT_SETTING = packageJson['wechaty'] as DefaultSetting

export class Config {

  default = DEFAULT_SETTING

  apihost = getEnv()['WECHATY_APIHOST'] || DEFAULT_SETTING['DEFAULT_APIHOST']

  serviceIp = getEnv()['WECHATY_PUPPET_SERVICE_IP'] || ''

  /**
   * The puppet named by `WECHATY_PUPPET`, lowercased, read at call time.
   * `undefined` when it is unset: Wechaty 2.0 has no default puppet.
   */
  systemPuppetName (): undefined | OfficialPuppetNpmName {
    return getEnv()['WECHATY_PUPPET']?.toLowerCase() as undefined | OfficialPuppetNpmName
  }

  name = getEnv()['WECHATY_NAME']

  // DO NOT set DEFAULT, because sometimes user do not want to connect to io cloud service
  token   = getEnv()['WECHATY_TOKEN']

  debug   = !!(getEnv()['WECHATY_DEBUG'])

  httpPort = getEnv()['PORT']
    || getEnv()['WECHATY_PORT']
    || DEFAULT_SETTING['DEFAULT_PORT']

  docker = !!(getEnv()['WECHATY_DOCKER'])

  constructor () {
    log.verbose('Config', 'constructor()')
    this.validApiHost(this.apihost)
  }

  validApiHost (apihost: string): boolean {
    if (/^[a-zA-Z0-9.\-_]+:?[0-9]*$/.test(apihost)) {
      return true
    }
    throw new Error('validApiHost() fail for ' + apihost)
  }

}

export const CHATIE_OFFICIAL_ACCOUNT_ID = 'gh_051c89260e5d'

export function qrCodeForChatie (): FileBoxInterface {
  const CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5'
  return FileBox.fromQRCode(CHATIE_OFFICIAL_ACCOUNT_QRCODE)
}

// http://jkorpela.fi/chars/spaces.html
// String.fromCharCode(8197)
export const FOUR_PER_EM_SPACE = String.fromCharCode(0x2005)
// mobile: \u2005, PC、mac: \u0020
export const AT_SEPARATOR_REGEX = /[\u2005\u0020]/

export function qrcodeValueToImageUrl (qrcodeValue: string): string {
  return [
    'https://wechaty.js.org/qrcode/',
    encodeURIComponent(qrcodeValue),
  ].join('')
}

export function isProduction (): boolean {
  const env = getEnv()
  return env['NODE_ENV'] === 'production'
      || env['NODE_ENV'] === 'prod'
}

const config = new Config()

export type {
  PackageJsonWechaty,
}
export {
  log,
  config,
  GIT_COMMIT_HASH,
  VERSION,
}
