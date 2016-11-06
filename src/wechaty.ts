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
  , HeadName
  , PuppetName
  , Sayable
  , log
}                     from './config'

import { Contact }        from './contact'
import { FriendRequest }  from './friend-request'
import { Message }        from './message'
import { Puppet }         from './puppet'
import { PuppetWeb }      from './puppet-web/'
import { Room }           from './room'
import { StateMonitor }   from './state-monitor'
import { UtilLib }        from './util-lib'

export type PuppetSetting = {
  head?:    HeadName
  puppet?:  PuppetName
  profile?: string
}

export type WechatyEventName = 'error'
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

  private state = new StateMonitor<'standby', 'ready'>('Wechaty', 'standby')
  private npmVersion: string

  public uuid:        string

  public static instance(setting?: PuppetSetting) {
    if (setting && this._instance) {
      throw new Error('there has already a instance. no params will be allowed any more')
    }
    if (!this._instance) {
      this._instance = new Wechaty(setting)
    }
    return this._instance
  }

  private constructor(private setting: PuppetSetting = {}) {
    super()
    log.verbose('Wechaty', 'contructor()')

    setting.head    = setting.head    || Config.head
    setting.puppet  = setting.puppet  || Config.puppet
    setting.profile = setting.profile || Config.profile

    // setting.port    = setting.port    || Config.port

    if (setting.profile) {
      setting.profile  = /\.wechaty\.json$/i.test(setting.profile)
                        ? setting.profile
                        : setting.profile + '.wechaty.json'
    }

    this.npmVersion = require('../package.json').version

    this.uuid = UtilLib.guid()
  }

  public toString() { return 'Class Wechaty(' + this.setting.puppet + ')'}

  public version(forceNpm = false) {
    // TODO: use  git rev-parse HEAD  ?
    const dotGitPath  = path.join(__dirname, '..', '.git') // only for ts-node, not for dist
    const gitLogCmd   = 'git'
    const gitLogArgs  = ['log', '--oneline', '-1']

    if (!forceNpm) {
      try {
        fs.statSync(dotGitPath).isDirectory()

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
    log.verbose('Wechaty', 'puppet: %s'       , this.setting.puppet)
    log.verbose('Wechaty', 'head: %s'         , this.setting.head)
    log.verbose('Wechaty', 'profile: %s'      , this.setting.profile)
    log.verbose('Wechaty', 'uuid: %s'         , this.uuid)

    if (this.state.current() === 'ready') {
      log.error('Wechaty', 'init() already inited. return and do nothing.')
      return
    }

    this.state.current('ready', false)

    try {
      await this.initPuppet()
    } catch (e) {
      log.error('Wechaty', 'init() exception: %s', e && e.message)
      throw e
    }

    this.state.current('ready')
    return
  }

  // public on(event: WechatyEventName, listener: Function): this
  public on(event: 'error'      , listener: (this: Wechaty, error: Error) => void): this
  public on(event: 'friend'     , listener: (this: Wechaty, friend: Contact, request?: FriendRequest) => void): this
  public on(event: 'heartbeat'  , listener: (this: Wechaty, data: any) => void): this
  public on(event: 'logout'     , listener: (this: Wechaty, user: Contact) => void): this
  public on(event: 'login'      , listener: (this: Wechaty, user: Contact) => void): this
  public on(event: 'message'    , listener: (this: Wechaty, message: Message) => void): this
  public on(event: 'room-join'  , listener: (this: Wechaty, room: Room, inviteeList: Contact[],  inviter: Contact) => void): this
  public on(event: 'room-leave' , listener: (this: Wechaty, room: Room, leaverList: Contact[]) => void): this
  public on(event: 'room-topic' , listener: (this: Wechaty, room: Room, topic: string, oldTopic: string, changer: Contact) => void): this
  public on(event: 'scan'       , listener: (this: Wechaty, url: string, code: number) => void): this
  public on(event: 'EVENT_PARAM_ERROR', listener: () => void): this

  public on(event: WechatyEventName, listener: Function): this {
    log.verbose('Wechaty', 'addListener(%s, %s)', event, typeof listener)

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

  public async initPuppet(): Promise<Puppet> {
    let puppet: Puppet

    if (!this.setting.head) {
      throw new Error('no head')
    }

    switch (this.setting.puppet) {
      case 'web':
        puppet = new PuppetWeb({
            head:     this.setting.head
          , profile:  this.setting.profile
        })
        break

      default:
        throw new Error('Puppet unsupport(yet?): ' + this.setting.puppet)
    }

    const eventList: WechatyEventName[] = [
        'error'
      , 'friend'
      , 'heartbeat'
      , 'login'
      , 'logout'
      , 'message'
      , 'room-join'
      , 'room-leave'
      , 'room-topic'
      , 'scan'
    ]

    eventList.map(e => {
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
    this.puppet = <Puppet>puppet // force to use base class Puppet interface for better encapsolation

    // set puppet instance to Wechaty Static variable, for using by Contact/Room/Message/FriendRequest etc.
    Config.puppetInstance(puppet)

    await puppet.init()
    return puppet
  }

  public async quit(): Promise<void> {
    log.verbose('Wechaty', 'quit()')
    this.state.current('standby', false)

    if (!this.puppet) {
      log.warn('Wechaty', 'quit() without this.puppet')
      return
    }

    const puppetBeforeDie = this.puppet
    this.puppet     = null
    Config.puppetInstance(null)

    await puppetBeforeDie.quit()
                        .catch(e => {
                          log.error('Wechaty', 'quit() exception: %s', e.message)
                          throw e
                        })
    this.state.current('standby')
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

  public sleep(millisecond: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, millisecond)
    })
  }

  /**
   * @deprecated
   */
  public reply(message: Message, reply: string) {
    log.warn('Wechaty', 'reply() @deprecated, please use Message.say() instead')

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
