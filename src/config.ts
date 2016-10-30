/**
 * Wechaty - Wechaty for Bot, Connect ChatBots, Chat as a Service
 *
 * https://github.com/wechaty/wechaty/
 */
import { execSync } from 'child_process'
import * as fs from 'fs'

import Puppet from './puppet'

export type PuppetType = 'web' | 'android' | 'ios'
export type HeadName = 'chrome' | 'phantomjs' | 'firefox'

export interface ConfigSetting {

  DEFAULT_HEAD: HeadName
  DEFAULT_PUPPET: PuppetType
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

  puppet: PuppetType
  head: HeadName

  apihost: string
  validApiHost: (host: string) => boolean

  httpPort: number

  _puppetInstance: Puppet | null
  puppetInstance(): Puppet
  puppetInstance(empty: null): void
  puppetInstance(instance: Puppet): Puppet
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
  head:       process.env['WECHATY_HEAD']      || Config.DEFAULT_HEAD
  , puppet:   process.env['WECHATY_PUPPET']    || Config.DEFAULT_PUPPET
  , apihost:  process.env['WECHATY_APIHOST']   || Config.DEFAULT_APIHOST
  , validApiHost
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
  port:       process.env['WECHATY_PORT']       || null // 0 for disable port
  , profile:  process.env['WECHATY_PROFILE']    || null // DO NOT set DEFAULT_PROFILE, because sometimes user do not want to save session
  , token:    process.env['WECHATY_TOKEN']      || null // DO NOT set DEFAULT, because sometimes user do not want to connect to io cloud service
  , debug:    !!(process.env['WECHATY_DEBUG'])  || false
})

/**
 * 3. Service Settings
 */
Object.assign(Config, {
  // get PORT form cloud service env, ie: heroku
  httpPort: process.env['PORT'] || process.env['WECHATY_PORT'] || Config.DEFAULT_PORT
})

/**
 * 4. Envioronment Identify
 */
Object.assign(Config, {
  isDocker:   isWechatyDocker()
})

function isWechatyDocker() {
  /**
   * Continuous Integration System
   */
  const isCi = require('is-ci')
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

  const cgroup = '/proc/1/cgroup'
  try       { fs.statSync(cgroup).isFile() }
  catch (e) { return false }

  const line = execSync(`sort -n ${cgroup} | head -1`)
                .toString()
                .replace(/\n$/, '')

  // instead of `/`, docker will end with a container id
  if (/\/$/.test(line)) {
    return false
  }

  return true
}

/**
 * 5. live setting
 */
function puppetInstance(instance?: Puppet | null): Puppet | void {
  if (instance !== undefined) {
    if (instance) {
      Config._puppetInstance = instance
      return instance
    }
    Config._puppetInstance = null
    return
  }

  if (!Config._puppetInstance) {
    throw new Error('no puppet instance')
  }
  return Config._puppetInstance
}

Object.assign(Config, {
  puppetInstance
})

export type WatchdogFoodName = 'HEARTBEAT'
                              | 'POISON'
                              | 'SCAN'

export type WatchdogFood = {
    data: any
  , timeout?: number  // millisecond
  , type?: WatchdogFoodName
}

export type ScanInfo = {
  url: string
  code: number
}

export type RecommendInfo = {
  UserName:   string
  NickName:   string
  Content:    string // request message
  Ticket:     string // a pass token
  VerifyFlag: number
}

export interface Sayable {
  say(content: string, replyTo?: any|any[]): Promise<void>
}
export interface Sleepable {
  sleep(millisecond: number): Promise<void>
}

export * from './brolog-env'

export default Config
