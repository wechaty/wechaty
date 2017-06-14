/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   Copyright 2016-2017 Huan LI <zixia@zixia.net>
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
const isCi      = require('is-ci')
const isDocker  = require('is-docker')

import { log }    from 'brolog'

import { Puppet } from './puppet'

const logLevel = process.env['WECHATY_LOG']
if (logLevel) {
  log.level(logLevel.toLowerCase())
  log.silly('Brolog', 'WECHATY_LOG set level to %s', logLevel)
}

/**
 * to handle unhandled exceptions
 */
if (/verbose|silly/i.test(logLevel)) {
  log.info('Config', 'registering process.on("unhandledRejection") for development/debug')
  process.on('unhandledRejection', (reason, promise) => {
    log.error('Config', '###########################')
    log.error('Config', 'unhandledRejection: %s %s', reason, promise)
    log.error('Config', '###########################')
    promise.catch(err => {
      log.error('Config', 'unhandledRejection::catch(%s)', err.message)
      console.error('Config', err) // I don't know if log.error has similar full trace print support like console.error
    })
  })
}

export type PuppetName = 'web' | 'android' | 'ios'
export type HeadName = 'chrome' | 'phantomjs' | 'firefox'

export interface ConfigSetting {

  DEFAULT_HEAD: HeadName
  DEFAULT_PUPPET: PuppetName
  DEFAULT_APIHOST: string
  DEFAULT_PROFILE: string
  DEFAULT_TOKEN:  string
  DEFAULT_PROTOCOL: string
  CMD_CHROMIUM: string
  DEFAULT_PORT: number

  port: number
  profile: string
  token: string
  debug: boolean

  puppet: PuppetName
  head: HeadName

  apihost: string
  validApiHost: (host: string) => boolean

  httpPort: number

  _puppetInstance: Puppet | null
  puppetInstance(): Puppet
  puppetInstance(empty: null): void
  puppetInstance(instance: Puppet): void
  puppetInstance(instance?: Puppet | null): Puppet | void

  isDocker: boolean

}
/* tslint:disable:variable-name */
/* tslint:disable:no-var-requires */
export const Config: ConfigSetting = require('../package.json').wechaty

/**
 * 1. ENVIRONMENT VARIABLES + PACKAGES.JSON (default)
 */
Object.assign(Config, {
  head:       process.env['WECHATY_HEAD']      || Config.DEFAULT_HEAD,
  puppet:   process.env['WECHATY_PUPPET']    || Config.DEFAULT_PUPPET,
  apihost:  process.env['WECHATY_APIHOST']   || Config.DEFAULT_APIHOST,
  validApiHost,
})

function validApiHost(apihost: string): boolean {
  if (/^[a-zA-Z0-9\.\-\_]+:?[0-9]*$/.test(apihost)) {
    return true
  }
  throw new Error('validApiHost() fail for ' + apihost)
}
validApiHost(Config.apihost)

/**
 * 2. ENVIRONMENT VARIABLES (only)
 */
Object.assign(Config, {
  port:       process.env['WECHATY_PORT']     || null, // 0 for disable port
  profile:  process.env['WECHATY_PROFILE']    || null, // DO NOT set DEFAULT_PROFILE, because sometimes user do not want to save session
  token:    process.env['WECHATY_TOKEN']      || null, // DO NOT set DEFAULT, because sometimes user do not want to connect to io cloud service
  debug:    !!(process.env['WECHATY_DEBUG'])  || false,
})

/**
 * 3. Service Settings
 */
Object.assign(Config, {
  // get PORT form cloud service env, ie: heroku
  httpPort: process.env['PORT'] || process.env['WECHATY_PORT'] || Config.DEFAULT_PORT,
})

/**
 * 4. Envioronment Identify
 */
Object.assign(Config, {
  isDocker:  isWechatyDocker(),
  isGlobal:  isWechatyInstalledGlobal(),
})

function isWechatyInstalledGlobal() {
  /**
   * TODO:
   * 1. check /node_modules/wechaty
   * 2. return true if exists
   * 3. otherwise return false
   */
   return false
}

function isWechatyDocker() {
  /**
   * false for Continuous Integration System
   */
  if (isCi) {
    return false
  }

  /**
   * false Cloud9 IDE
   */
  const c9 = Object.keys(process.env)
                  .filter(k => /^C9_/.test(k))
                  .length
  if (c9 > 7 && process.env['C9_PORT']) {
    return false
  }

  /**
   * return indentify result by NPM module `is-docker`
   */
  return isDocker()
}

/**
 * 5. live setting
 */
function puppetInstance(): Puppet
function puppetInstance(empty: null): void
function puppetInstance(instance: Puppet): void

function puppetInstance(instance?: Puppet | null): Puppet | void {

  if (instance === undefined) {
    if (!this._puppetInstance) {
      throw new Error('no puppet instance')
    }
    return this._puppetInstance

  } else if (instance === null) {
    log.verbose('Config', 'puppetInstance(null)')
    this._puppetInstance = null
    return
  }

  log.verbose('Config', 'puppetInstance(%s)', instance.constructor.name)
  this._puppetInstance = instance
  return

}

Object.assign(Config, {
  puppetInstance,
})

export type WatchdogFoodName = 'HEARTBEAT'
                              | 'POISON'
                              | 'SCAN'

export interface WatchdogFood {
  data: any,
  timeout?: number,  // millisecond
  type?: WatchdogFoodName,
}

export interface ScanInfo {
  url: string,
  code: number,
}

/**
 * from Message
 */
export interface RecommendInfo {
  UserName:   string,
  NickName:   string,  // display_name
  Content:    string,  // request message
  HeadImgUrl: string,  // message.RecommendInfo.HeadImgUrl

  Ticket:     string,  // a pass token
  VerifyFlag: number,

}

export interface Sayable {
  say(content: string, replyTo?: any|any[]): Promise<boolean>
}

export interface Sleepable {
  sleep(millisecond: number): Promise<void>
}

/**
 * ISSUE #72
 * Introduce the SELENIUM_PROMISE_MANAGER environment variable.
 * When set to 1, selenium-webdriver will use the existing ControlFlow scheduler.
 * When set to 0, the SimpleScheduler will be used.
 */
process.env['SELENIUM_PROMISE_MANAGER'] = 0

import * as Raven from 'raven'
Raven
.config('https://f6770399ee65459a82af82650231b22c:d8d11b283deb441e807079b8bb2c45cd@sentry.io/179672')
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

export {
  log,
  Raven,
}

export default Config
