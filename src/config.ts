/**
 *   Wechaty - https://github.com/chatie/wechaty
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

import fs    from 'fs'
import os    from 'os'
import path  from 'path'

import qrImage   from 'qr-image'
import Raven     from 'raven'
import readPkgUp from 'read-pkg-up'

import { log }    from 'brolog'
import {
  FileBox,
}                 from 'file-box'

import {
  PuppetModuleName,
}                 from './puppet-config'

// https://github.com/Microsoft/TypeScript/issues/14151#issuecomment-280812617
// if (!Symbol.asyncIterator) {
//   (Symbol as any).asyncIterator = Symbol.for('Symbol.asyncIterator')
// }

const pkg = readPkgUp.sync({ cwd: __dirname }).pkg
export const VERSION = pkg.version

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
      git_commit: '',
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
}

export interface DefaultSetting {
  DEFAULT_HEAD     : number,
  DEFAULT_PORT     : number,
  // DEFAULT_PUPPET   : PuppetName,
  DEFAULT_APIHOST  : string,
  // DEFAULT_PROFILE  : string,
  DEFAULT_TOKEN    : string,
  DEFAULT_PROTOCOL : string,
}

/* tslint:disable:variable-name */
/* tslint:disable:no-var-requires */
const DEFAULT_SETTING = pkg.wechaty as DefaultSetting

export class Config {
  public default = DEFAULT_SETTING

  public apihost = process.env.WECHATY_APIHOST    || DEFAULT_SETTING.DEFAULT_APIHOST
  public head    = ('WECHATY_HEAD' in process.env) ? (!!process.env.WECHATY_HEAD) : (!!(DEFAULT_SETTING.DEFAULT_HEAD))

  public systemPuppetName (): PuppetModuleName {
    return (
      process.env.WECHATY_PUPPET || 'default'
    ).toLowerCase() as PuppetModuleName
  }

  // DEPRECATED: Use WECHATY_NAME instead
  public profile = process.env.WECHATY_PROFILE

  public name    = process.env.WECHATY_NAME || process.env.WECHATY_PROFILE  // replace WECHATY_PROFILE

  public token   = process.env.WECHATY_TOKEN      // DO NOT set DEFAULT, because sometimes user do not want to connect to io cloud service
  public debug   = !!(process.env.WECHATY_DEBUG)

  public httpPort = process.env.PORT || process.env.WECHATY_PORT || DEFAULT_SETTING.DEFAULT_PORT
  public docker = !!(process.env.WECHATY_DOCKER)

  // private _puppetInstance: Puppet | null = null

  constructor () {
    log.verbose('Config', 'constructor()')
    this.validApiHost(this.apihost)

    if (this.profile) {
      log.warn('Config', 'constructor() WECHATY_PROFILE is DEPRECATED, use WECHATY_NAME instead.')
    }
  }

  /**
   * 5. live setting
   */
  // public puppetInstance(): Puppet
  // public puppetInstance(empty: null): void
  // public puppetInstance(instance: Puppet): void

  // public puppetInstance(instance?: Puppet | null): Puppet | void {

  //   if (typeof instance === 'undefined') {
  //     if (!this._puppetInstance) {
  //       throw new Error('no puppet instance')
  //     }
  //     return this._puppetInstance

  //   } else if (instance === null) {
  //     log.verbose('Config', 'puppetInstance(null)')
  //     this._puppetInstance = null
  //     return
  //   }

  //   log.verbose('Config', 'puppetInstance(%s)', instance.constructor.name)
  //   this._puppetInstance = instance
  //   return

  // }

  public gitRevision (): string | null {
    const dotGitPath  = path.join(__dirname, '..', '.git') // only for ts-node, not for dist
    // const gitLogArgs  = ['log', '--oneline', '-1']
    // TODO: use git rev-parse HEAD ?
    const gitArgs  = ['rev-parse', 'HEAD']

    try {
      // Make sure this is a Wechaty repository
      fs.statSync(dotGitPath).isDirectory()

      const ss = require('child_process')
                  .spawnSync('git', gitArgs, { cwd:  __dirname })

      if (ss.status !== 0) {
        throw new Error(ss.error)
      }

      const revision = ss.stdout
                        .toString()
                        .trim()
                        .slice(0, 7)
      return revision

    } catch (e) { /* fall safe */
      /**
       *  1. .git not exist
       *  2. git log fail
       */
      log.silly('Wechaty', 'version() form development environment is not availble: %s', e.message)
      return null
    }
  }

  public validApiHost (apihost: string): boolean {
    if (/^[a-zA-Z0-9\.\-\_]+:?[0-9]*$/.test(apihost)) {
      return true
    }
    throw new Error('validApiHost() fail for ' + apihost)
  }
}

export const CHATIE_OFFICIAL_ACCOUNT_ID = 'gh_051c89260e5d'

export function qrCodeForChatie (): FileBox {
  const CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5'
  const name                           = 'qrcode-for-chatie.png'
  const type                           = 'png'

  const qrStream = qrImage.image(CHATIE_OFFICIAL_ACCOUNT_QRCODE, { type })
  return FileBox.fromStream(qrStream, name)
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
}

export const config = new Config()
