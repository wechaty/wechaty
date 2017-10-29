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

import * as readPkgUp from 'read-pkg-up'
import * as Raven     from 'raven'
import Brolog         from 'brolog'

import Puppet from './puppet'

const pkg = readPkgUp.sync({ cwd: __dirname }).pkg
export const VERSION = pkg.version

/**
 * Raven.io
 */
Raven.disableConsoleAlerts()

Raven
.config(
  process.env.NODE_ENV === 'production'
    && 'https://f6770399ee65459a82af82650231b22c:d8d11b283deb441e807079b8bb2c45cd@sentry.io/179672',
  {
    release: VERSION,
    tags: {
      git_commit: '',
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

export const log = new Brolog()
const logLevel = process.env['WECHATY_LOG'] || 'info'
if (logLevel) {
  log.level(logLevel.toLowerCase() as any)
  log.silly('Brolog', 'WECHATY_LOG set level to %s', logLevel)
}

/**
 * to handle unhandled exceptions
 */
if (/verbose|silly/i.test(log.level())) {
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

export type PuppetName = 'web'
                        | 'android'
                        | 'ios'

export interface DefaultSetting {
  DEFAULT_HEAD     : number,
  DEFAULT_PORT     : number,
  DEFAULT_PUPPET   : PuppetName,
  DEFAULT_APIHOST  : string,
  DEFAULT_PROFILE  : string,
  DEFAULT_TOKEN    : string,
  DEFAULT_PROTOCOL : string,
}

/* tslint:disable:variable-name */
/* tslint:disable:no-var-requires */
export const DEFAULT_SETTING = pkg.wechaty as DefaultSetting

export class Config {
  public default = DEFAULT_SETTING

  public apihost = process.env['WECHATY_APIHOST']    || DEFAULT_SETTING.DEFAULT_APIHOST
  public head    = ('WECHATY_HEAD' in process.env) ? (!!process.env['WECHATY_HEAD']) : (!!(DEFAULT_SETTING.DEFAULT_HEAD))
  public puppet  = (process.env['WECHATY_PUPPET']    || DEFAULT_SETTING.DEFAULT_PUPPET) as PuppetName

  public profile = process.env['WECHATY_PROFILE']    || null    // DO NOT set DEFAULT_PROFILE, because sometimes user do not want to save session
  public token   = process.env['WECHATY_TOKEN']      || null    // DO NOT set DEFAULT, because sometimes user do not want to connect to io cloud service
  public debug   = !!(process.env['WECHATY_DEBUG'])

  public httpPort = process.env['PORT'] || process.env['WECHATY_PORT'] || DEFAULT_SETTING.DEFAULT_PORT
  public docker = !!(process.env['WECHATY_DOCKER'])

  private _puppetInstance: Puppet | null = null

  constructor() {
    log.verbose('Config', 'constructor()')
    this.validApiHost(this.apihost)
  }

  /**
   * 5. live setting
   */
  public puppetInstance(): Puppet
  public puppetInstance(empty: null): void
  public puppetInstance(instance: Puppet): void

  public puppetInstance(instance?: Puppet | null): Puppet | void {

    if (typeof instance === 'undefined') {
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

  public gitRevision(): string | null {
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

  public validApiHost(apihost: string): boolean {
    if (/^[a-zA-Z0-9\.\-\_]+:?[0-9]*$/.test(apihost)) {
      return true
    }
    throw new Error('validApiHost() fail for ' + apihost)
  }
}

export interface Sayable {
  say(content: string, replyTo?: any|any[]): Promise<boolean>
}

export interface Sleepable {
  sleep(millisecond: number): Promise<void>
}

export {
  Raven,
}

export const config = new Config()
export default config
