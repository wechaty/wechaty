/**
 *   Wechaty - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
// tslint:disable-next-line:no-reference
/// <reference path="./typings.d.ts" />

import os    from 'os'

import Raven      from 'raven'
import readPkgUp  from 'read-pkg-up'

import { log }      from 'brolog'
import { FileBox }  from 'file-box'

import {
  PuppetModuleName,
  PUPPET_NAME_DEFAULT,
}                      from './puppet-config'
import {
  VERSION,
  GIT_COMMIT_HASH,
}                       from './version'

const pkg = readPkgUp.sync({ cwd: __dirname })!.packageJson

/**
 * Raven.io
 */
Raven.disableConsoleAlerts()

Raven
  .config(
    isProduction()
      && 'https://f6770399ee65459a82af82650231b22c:d8d11b283deb441e807079b8bb2c45cd@sentry.io/179672',
    {
      release: VERSION,
      tags: {
        git_commit: GIT_COMMIT_HASH,
        platform: process.env.WECHATY_DOCKER
          ? 'docker'
          : os.platform(),
      },
    },
  )
  .install()

/*
try {
    doSomething(a[0])
} catch (e) {
    Raven.captureException(e)
}

Raven.context(function () {
  doSomething(a[0])
})
 */

const logLevel = process.env.WECHATY_LOG
if (logLevel) {
  log.level(logLevel.toLowerCase() as any)
  log.silly('Config', 'WECHATY_LOG set level to %s', logLevel)
}

/**
 * to handle unhandled exceptions
 */
if (log.level() === 'verbose' || log.level() === 'silly') {
  log.info('Config', 'registering process.on("unhandledRejection") for development/debug')

  process.on('unhandledRejection', (reason, promise) => {
    log.error('Config', '###########################')
    log.error('Config', 'unhandledRejection: %s %s', reason, promise)
    log.error('Config', '###########################')
    promise.catch(err => {
      log.error('Config', 'process.on(unhandledRejection) promise.catch(%s)', err.message)
      console.error('Config', err) // I don't know if log.error has similar full trace print support like console.error
    })
  })

  process.on('uncaughtException', function (error) {
    const origin = arguments[1] // to compatible with node 12 or below version typings

    log.error('Config', '###########################')
    log.error('Config', 'uncaughtException: %s %s', error, origin)
    log.error('Config', '###########################')
  })
}

export interface DefaultSetting {
  DEFAULT_PORT     : number,
  DEFAULT_APIHOST  : string,
  DEFAULT_PROTOCOL : string,
}

const DEFAULT_SETTING = pkg.wechaty as DefaultSetting

export class Config {

  public default = DEFAULT_SETTING

  public apihost = process.env.WECHATY_APIHOST || DEFAULT_SETTING.DEFAULT_APIHOST

  public systemPuppetName (): PuppetModuleName {
    return (
      process.env.WECHATY_PUPPET || PUPPET_NAME_DEFAULT
    ).toLowerCase() as PuppetModuleName
  }

  public name    = process.env.WECHATY_NAME

  // DO NOT set DEFAULT, because sometimes user do not want to connect to io cloud service
  public token   = process.env.WECHATY_TOKEN

  public debug   = !!(process.env.WECHATY_DEBUG)

  public httpPort = process.env.PORT || process.env.WECHATY_PORT || DEFAULT_SETTING.DEFAULT_PORT
  public docker = !!(process.env.WECHATY_DOCKER)

  constructor () {
    log.verbose('Config', 'constructor()')
    this.validApiHost(this.apihost)
  }

  public validApiHost (apihost: string): boolean {
    if (/^[a-zA-Z0-9.\-_]+:?[0-9]*$/.test(apihost)) {
      return true
    }
    throw new Error('validApiHost() fail for ' + apihost)
  }

}

export const CHATIE_OFFICIAL_ACCOUNT_ID = 'gh_051c89260e5d'

export function qrCodeForChatie (): FileBox {
  const CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5'
  return FileBox.fromQRCode(CHATIE_OFFICIAL_ACCOUNT_QRCODE)
}

// http://jkorpela.fi/chars/spaces.html
// String.fromCharCode(8197)
export const FOUR_PER_EM_SPACE = String.fromCharCode(0x2005)
// mobile: \u2005, PC、mac: \u0020
export const AT_SEPRATOR_REGEX = /[\u2005\u0020]/

export function qrcodeValueToImageUrl (qrcodeValue: string): string {
  return [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcodeValue),
    '&size=220x220&margin=20',
  ].join('')
}

export function isProduction (): boolean {
  return process.env.NODE_ENV === 'production'
      || process.env.NODE_ENV === 'prod'
}

export {
  log,
  Raven,
  VERSION,
}

export const config = new Config()
