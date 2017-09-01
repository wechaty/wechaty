/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
import * as fs    from 'fs'
import * as os    from 'os'
import * as path  from 'path'

/**
 * Raven.io
 */
import * as Raven from 'raven'
Raven.disableConsoleAlerts()

Raven
.config(
  process.env.NODE_ENV === 'production'
    && 'https://f6770399ee65459a82af82650231b22c:d8d11b283deb441e807079b8bb2c45cd@sentry.io/179672',
  {
    release: require('../package.json').version,
    tags: {
      git_commit: 'c0deb10c4',
      platform:   !!process.env['WECHATY_DOCKER']
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

import {
  log,
  Loggable,
}                 from 'brolog'

import { Puppet } from './puppet'

const logLevel = process.env['WECHATY_LOG'] || 'info'
if (logLevel) {
  log.level(logLevel.toLowerCase() as any)
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

export type PuppetName = 'web'
                        | 'android'
                        | 'ios'

export type HeadName = 'chrome'
                      | 'chrome-headless'
                      | 'phantomjs'
                      | 'firefox'

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
  puppetInstance(instance?: Puppet | null): Puppet | void,

  gitVersion(): string | null,
  npmVersion(): string,

  dockerMode: boolean,
}
/* tslint:disable:variable-name */
/* tslint:disable:no-var-requires */
export const config: ConfigSetting = require('../package.json').wechaty

/**
 * 1. ENVIRONMENT VARIABLES + PACKAGES.JSON (default)
 */
Object.assign(config, {
  apihost:    process.env['WECHATY_APIHOST']   || config.DEFAULT_APIHOST,
  head:       process.env['WECHATY_HEAD']      || config.DEFAULT_HEAD,
  puppet:     process.env['WECHATY_PUPPET']    || config.DEFAULT_PUPPET,
  validApiHost,
})

function validApiHost(apihost: string): boolean {
  if (/^[a-zA-Z0-9\.\-\_]+:?[0-9]*$/.test(apihost)) {
    return true
  }
  throw new Error('validApiHost() fail for ' + apihost)
}
validApiHost(config.apihost)

/**
 * 2. ENVIRONMENT VARIABLES (only)
 */
Object.assign(config, {
  port:       process.env['WECHATY_PORT']     || null, // 0 for disable port
  profile:  process.env['WECHATY_PROFILE']    || null, // DO NOT set DEFAULT_PROFILE, because sometimes user do not want to save session
  token:    process.env['WECHATY_TOKEN']      || null, // DO NOT set DEFAULT, because sometimes user do not want to connect to io cloud service
  debug:    !!(process.env['WECHATY_DEBUG'])  || false,
})

/**
 * 3. Service Settings
 */
Object.assign(config, {
  // get PORT form cloud service env, ie: heroku
  httpPort: process.env['PORT'] || process.env['WECHATY_PORT'] || config.DEFAULT_PORT,
})

/**
 * 4. Envioronment Identify
 */
Object.assign(config, {
  dockerMode: !!process.env['WECHATY_DOCKER'],
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

function gitVersion(): string | null {
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

function npmVersion(): string {
  try {
    return require('../package.json').version
  } catch (e) {
    log.error('Wechaty', 'npmVersion() exception %s', e.message)
    Raven.captureException(e)
    return '0.0.0'
  }
}

Object.assign(config, {
  gitVersion,
  npmVersion,
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

export {
  log,
  Loggable,
  Raven,
}

export default config
