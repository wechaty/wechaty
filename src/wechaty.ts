/**
 *
 * wechaty: Wechat for ChatBots.
 *
 * Class Wechaty
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
import { EventEmitter }  from 'events'
import * as path         from 'path'
// const co            = require('co')
import * as fs          from'fs'

import Config, {
    HeadType
  , PuppetType
} from './config'

import Contact      from './contact'
import Message      from './message'
import Puppet       from './puppet'
import PuppetWeb    from './puppet-web/index'
import UtilLib      from './util-lib'
import WechatyEvent from './wechaty-event'

import log          from './brolog-env'

type WechatySetting = {
  profile?:    string
  head?:       HeadType
  type?:       PuppetType
  // port?:       number
}

class Wechaty extends EventEmitter {
  private static _instance: Wechaty

  public puppet: Puppet

  private inited:     boolean = false
  private npmVersion: string

  public uuid:        string

  public static instance(setting?: WechatySetting) {
    if (setting && this._instance) {
      throw new Error('there has already a instance. no params allowed any more')
    }
    if (!this._instance) {
      this._instance = new Wechaty(setting)
    }
    return this._instance
  }

  private constructor(private setting: WechatySetting) {
    super()
    log.verbose('Wechaty', 'contructor()')

    // if (Wechaty._instance instanceof Wechaty) {
    //   throw new Error('Wechaty must be singleton')
    // }

    setting.type    = setting.type    || Config.puppet
    setting.head    = setting.head    || Config.head
    // setting.port    = setting.port    || Config.port
    setting.profile = setting.profile || Config.profile  // no profile, no session save/restore

    if (setting.profile) {
      setting.profile  = /\.wechaty\.json$/i.test(setting.profile)
                        ? setting.profile
                        : setting.profile + '.wechaty.json'
    }

    this.npmVersion = require('../package.json').version

    this.uuid = UtilLib.guid()

    this.inited = false

    // Wechaty._instance = this
  }

  public toString() { return 'Class Wechaty(' + this.setting.type + ')'}

  public version(forceNpm = false) {
    const dotGitPath  = path.join(__dirname, '..', '.git')
    const gitLogCmd   = 'git'
    const gitLogArgs  = ['log', '--oneline', '-1']

    if (!forceNpm) {
      try {
        /**
         * Synchronous version of fs.access().
         * This throws if any accessibility checks fail, and does nothing otherwise.
         */
        fs.accessSync(dotGitPath, fs['F_OK'])

        const ss = require('child_process')
                    .spawnSync(gitLogCmd, gitLogArgs, { cwd:  __dirname })
        if (ss.status !== 0) {
          throw new Error(ss.error)
        }

        const revision = ss.stdout
                          .toString()
                          .trim()
        return `#git[${revision}]`
      } catch (e) { /* fall safe */
        /**
         *  1. .git not exist
         *  2. git log fail
         */
        log.silly('Wechaty', 'version() test %s', e.message)
      }
    }

    return this.npmVersion
  }

  public user(): Contact { return this.puppet && this.puppet.user }

  public reset(reason?: string) {
    log.verbose('Wechaty', 'reset() because %s', reason)
    return this.puppet.reset(reason)
  }

  public async init(): Promise<Wechaty> {
    log.info('Wechaty', 'v%s initializing...' , this.version())
    log.verbose('Wechaty', 'puppet: %s'       , this.setting.type)
    log.verbose('Wechaty', 'head: %s'         , this.setting.head)
    log.verbose('Wechaty', 'profile: %s'      , this.setting.profile)
    log.verbose('Wechaty', 'uuid: %s'         , this.uuid)

    if (this.inited) {
      log.error('Wechaty', 'init() already inited. return and do nothing.')
      return Promise.resolve(this)
    }

    // return co.call(this, function* () {
    try {
      await this.initPuppet()

      this.inited = true
      // return this // for chaining
    // }).catch(e => {
    } catch (e) {
      log.error('Wechaty', 'init() exception: %s', e.message)
      throw e
    }
    return this
  }

  public on(event: string, listener: Function) {
    log.verbose('Wechaty', 'on(%s, %s)', event, typeof listener)

    const wrapListener = WechatyEvent.wrap.call(this, event, listener)
    super.on(event, wrapListener)

    return this
  }

  public initPuppet() {
    let puppet
    switch (this.setting.type) {
      case 'web':
        puppet = new PuppetWeb(
            this.setting.head
          , this.setting.profile
        )
        break
      default:
        throw new Error('Puppet unsupport(yet): ' + this.setting.type)
    }

    WechatyEvent.list().map(e => {
      // https://strongloop.com/strongblog/an-introduction-to-javascript-es6-arrow-functions/
      // We’ve lost () around the argument list when there’s just one argument (rest arguments are an exception, eg (...args) => ...)
      puppet.on(e, (...args) => {
        // this.emit(e, data)
        this.emit.apply(this, [e, ...args])
      })
    })
    /**
     * TODO: support more events:
     * 2. send
     * 3. reply
     * 4. quit
     * 5. ...
     */

    // set puppet before init, because we need this.puppet if we quit() before init() finish
    this.puppet     = puppet

    // set puppet instance to Wechaty Static variable, for using by Contact/Room/Message/FriendRequest etc.
    Config.puppetInstance(puppet)

    return puppet.init()
  }

  public quit() {
    log.verbose('Wechaty', 'quit()')

    if (!this.puppet) {
      log.warn('Wechaty', 'quit() without this.puppet')
      return Promise.resolve()
    }

    const puppetBeforeDie = this.puppet
    this.puppet     = null
    Config.puppetInstance(null)
    this.inited = false

    return puppetBeforeDie.quit()
    .catch(e => {
      log.error('Wechaty', 'quit() exception: %s', e.message)
      throw e
    })
  }

  public logout()  {
    return this.puppet.logout()
                      .catch(e => {
                        log.error('Wechaty', 'logout() exception: %s', e.message)
                        throw e
                      })
  }

  public self(message?: Message): boolean | Contact {
    return this.puppet.self(message)
  }

  public send(message) {
    return this.puppet.send(message)
                      .catch(e => {
                        log.error('Wechaty', 'send() exception: %s', e.message)
                        throw e
                      })
  }

  public reply(message, reply) {
    return this.puppet.reply(message, reply)
    .catch(e => {
      log.error('Wechaty', 'reply() exception: %s', e.message)
      throw e
    })
  }

  public ding(data: string) {
    if (!this.puppet) {
      return Promise.reject(new Error('wechaty cant ding coz no puppet'))
    }

    return this.puppet.ding(data)
                      .catch(e => {
                        log.error('Wechaty', 'ding() exception: %s', e.message)
                        throw e
                      })
  }
}

/**
 * Expose `Wechaty`.
 */
// module.exports = Wechaty.default = Wechaty.Wechaty = Wechaty
export default Wechaty
