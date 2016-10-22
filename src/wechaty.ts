/**
 *
 * Wechaty: Wechat for ChatBots.
 * Connect ChatBots
 *
 * Class Wechaty
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
import { EventEmitter } from 'events'
import * as fs          from 'fs'
import * as path        from 'path'

import {
    Config
  , HeadType
  , PuppetType
  , Sayable
}                     from './config'

import Contact        from './contact'
import FriendRequest  from './friend-request'
import Message        from './message'
import Puppet         from './puppet'
import PuppetWeb      from './puppet-web/'
import Room           from './room'
import UtilLib        from './util-lib'

import log            from './brolog-env'

export type WechatySetting = {
  profile?:    string
  head?:       HeadType
  type?:       PuppetType
}

type WechatyEventName = 'error'
                      | 'friend'
                      | 'heartbeat'
                      | 'login'
                      | 'logout'
                      | 'message'
                      | 'room-join'
                      | 'room-leave'
                      | 'room-topic'
                      | 'scan'
                      | 'EVENT_PARAM_ERROR'

export class Wechaty extends EventEmitter implements Sayable {
  private static _instance: Wechaty

  public puppet: Puppet | null

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

  private constructor(private setting: WechatySetting = {}) {
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
    const dotGitPath  = path.join(__dirname, '..', '.git') // `/src/../.git`
    const gitLogCmd   = 'git'
    const gitLogArgs  = ['log', '--oneline', '-1']

    if (!forceNpm) {
      try {
        /**
         * Synchronous version of fs.access().
         * This throws if any accessibility checks fail, and does nothing otherwise.
         */
        // fs.accessSync(dotGitPath, fs.F_OK)
        fs.statSync(dotGitPath) // .isDirectory()

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

  public user(): Contact {
    if (!this.puppet || !this.puppet.user) {
      throw new Error('no user')
    }
    return this.puppet.user
  }

  public async reset(reason?: string): Promise<void> {
    log.verbose('Wechaty', 'reset() because %s', reason)
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.reset(reason)
    return
  }

  public async init(): Promise<void> {
    log.info('Wechaty', 'v%s initializing...' , this.version())
    log.verbose('Wechaty', 'puppet: %s'       , this.setting.type)
    log.verbose('Wechaty', 'head: %s'         , this.setting.head)
    log.verbose('Wechaty', 'profile: %s'      , this.setting.profile)
    log.verbose('Wechaty', 'uuid: %s'         , this.uuid)

    if (this.inited) {
      log.error('Wechaty', 'init() already inited. return and do nothing.')
      return
    }

    try {
      await this.initPuppet()
      this.inited = true
    } catch (e) {
      log.error('Wechaty', 'init() exception: %s', e && e.message)
      throw e
    }
    return
  }

  public on(event: 'error'      , listener: (this: Sayable, error: Error) => void): this
  public on(event: 'friend'     , listener: (this: Sayable, friend: Contact, request?: FriendRequest) => void): this
  public on(event: 'heartbeat'  , listener: (this: Sayable, data: any) => void): this
  public on(event: 'logout'     , listener: (this: Sayable, user: Contact) => void): this
  public on(event: 'login'      , listener: (this: Sayable, user: Contact) => void): this
  public on(event: 'message'    , listener: (this: Sayable, message: Message) => void): this
  public on(event: 'room-join'  , listener: (this: Sayable, room: Room, invitee:      Contact,    inviter: Contact) => void): this
  public on(event: 'room-join'  , listener: (this: Sayable, room: Room, inviteeList:  Contact[],  inviter: Contact) => void): this
  public on(event: 'room-leave' , listener: (this: Sayable, room: Room, leaver: Contact) => void): this
  public on(event: 'room-topic' , listener: (this: Sayable, room: Room, topic: string, oldTopic: string, changer: Contact) => void): this
  public on(event: 'scan'       , listener: (this: Sayable, url: string, code: number) => void): this
  public on(event: 'EVENT_PARAM_ERROR', listener: () => void): this

  public on(event: WechatyEventName, listener: Function): this {
    log.verbose('Wechaty', 'on(%s, %s)', event, typeof listener)

    // const thisWithSay: Sayable = {
    //   say: (content: string) => {
    //     return Config.puppetInstance()
    //                   .say(content)
    //   }
    // }

    super.on(event, listener) // `this: Wechaty` is Sayable

    // (...args) => {
    //
    //   return listener.apply(this, args)
    // })

    return this
  }

  public async initPuppet(): Promise<void> {
    let puppet: Puppet
    switch (this.setting.type) {
      case 'web':
        puppet = new PuppetWeb({
            head:     this.setting.head
          , profile:  this.setting.profile
        })
        break

      default:
        throw new Error('Puppet unsupport(yet): ' + this.setting.type)
    }

  ; // must have a semicolon here to seperate the last line with `[]`
  [   'error'
    , 'friend'
    , 'heartbeat'
    , 'login'
    , 'logout'
    , 'message'
    , 'room-join'
    , 'room-leave'
    , 'room-topic'
    , 'scan'
  ].map(e => {
      // https://strongloop.com/strongblog/an-introduction-to-javascript-es6-arrow-functions/
      // We’ve lost () around the argument list when there’s just one argument (rest arguments are an exception, eg (...args) => ...)
      puppet.on(e, (...args: any[]) => {
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
    this.puppet = puppet

    // set puppet instance to Wechaty Static variable, for using by Contact/Room/Message/FriendRequest etc.
    Config.puppetInstance(puppet)

    await puppet.init()
    return
  }

  public async quit(): Promise<void> {
    log.verbose('Wechaty', 'quit()')

    if (!this.puppet) {
      log.warn('Wechaty', 'quit() without this.puppet')
      return
    }

    const puppetBeforeDie = this.puppet
    this.puppet     = null
    Config.puppetInstance(null)
    this.inited = false

    await puppetBeforeDie.quit()
                        .catch(e => {
                          log.error('Wechaty', 'quit() exception: %s', e.message)
                          throw e
                        })
    return
  }

  public async logout(): Promise<void>  {
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.logout()
                    .catch(e => {
                      log.error('Wechaty', 'logout() exception: %s', e.message)
                      throw e
                    })
    return
  }

  /**
   * @deprecated
   * use Message.self() instead
   */
  public self(message: Message): boolean {
    log.warn('Wechaty', 'self() method deprecated. use Message.self() instead')
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    return this.puppet.self(message)
  }

  public async send(message: Message): Promise<void> {
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.send(message)
                      .catch(e => {
                        log.error('Wechaty', 'send() exception: %s', e.message)
                        throw e
                      })
    return
  }

  public async say(content: string): Promise<void> {
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.say(content)
    return
  }

  /**
   * @deprecated
   */
  public reply(message: Message, reply: string) {
    log.warn('Wechaty', 'reply() @deprecated, please use Message.say()')

    if (!this.puppet) {
      throw new Error('no puppet')
    }

    return this.puppet.reply(message, reply)
    .catch(e => {
      log.error('Wechaty', 'reply() exception: %s', e.message)
      throw e
    })
  }

  public ding() {
    if (!this.puppet) {
      return Promise.reject(new Error('wechaty cant ding coz no puppet'))
    }

    return this.puppet.ding() // should return 'dong'
                      .catch(e => {
                        log.error('Wechaty', 'ding() exception: %s', e.message)
                        throw e
                      })
  }
}

export default Wechaty
