/**
 * Wechaty - Wechaty for Bot, Connect ChatBots, Chat as a Service
 *
 * https://github.com/wechaty/wechaty/
 */
const isCi      = require('is-ci')
const isDocker  = require('is-docker')

import { Puppet } from './puppet'
import { log }    from './brolog-env'

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
  isDocker:   isWechatyDocker(),
})

function isWechatyDocker() {
  /**
   * Continuous Integration System
   */
  if (isCi) {
    return false
  }

  /**
   * Cloud9 IDE
   */
  const c9 = Object.keys(process.env)
                  .filter(k => /^C9_/.test(k))
                  .length
  if (c9 > 7 && process.env['C9_PORT']) {
    return false
  }

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

export type WatchdogFood = {
  data: any,
  timeout?: number,  // millisecond
  type?: WatchdogFoodName,
}

export type ScanInfo = {
  url: string,
  code: number,
}

/**
 * from Message
 */
export type RecommendInfo = {
  UserName:   string,
  NickName:   string,  // display_name
  Content:    string,  // request message
  HeadImgUrl: string,  // message.RecommendInfo.HeadImgUrl

  Ticket:     string,  // a pass token
  VerifyFlag: number,

}

export interface Sayable {
  say(content: string, replyTo?: any|any[]): Promise<void>
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

/**
 * to count how many times this piece of code is instanciaed
 */
if (!global['WECHATY_CONFIG_INSTANCE_COUNTER']) {
  global['WECHATY_CONFIG_INSTANCE_COUNTER'] = 0
}
global['WECHATY_CONFIG_INSTANCE_COUNTER']++

export {
  log
}

/**
 * to handle unhandled exceptions
 */
/*
process.on('unhandledRejection', (reason, promise) => {
  log.error('Config', '###########################')
  log.error('Config', 'unhandledRejection: %s %s', reason, promise)
  log.error('Config', '###########################')
  promise.catch(err => {
    log.error('Config', 'unhandledRejection::catch(%s)', err.message || err)
  })
})
*/
