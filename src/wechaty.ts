/**
 *
 *  Wechaty - https://github.com/chatie/wechaty
 *  2016-2017 Huan LI <zixia@zixia.net>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  Wechaty: Wechat for ChatBots.
 *
 *  Wechaty is a Bot Framework for Wechat **Personal** Account
 *  which can help you create a bot in 6 lines of javascript
 *  by easy to use API, with cross-platform support for
 *  Linux/Mac/Windows.
 *
 *  @ignore
 */

import { EventEmitter } from 'events'

import { StateSwitch }  from 'state-switch'

import {
  config,
  HeadName,
  PuppetName,
  Raven,
  Sayable,
  log,
}                         from './config'

import { Contact }        from './contact'
import { FriendRequest }  from './friend-request'
import {
  Message,
  MediaMessage,
}                         from './message'
import { Puppet }         from './puppet'
import { PuppetWeb }      from './puppet-web/'
import { Room }           from './room'
import { UtilLib }        from './util-lib'

export interface PuppetSetting {
  head?:    HeadName,
  puppet?:  PuppetName,
  profile?: string,
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

/**
 * Main bot class.
 *
 * [The World's Shortest ChatBot Code: 6 lines of JavaScript]{@link #wechatyinstance}
 *
 * [Wechaty Starter Project]{@link https://github.com/lijiarui/wechaty-getting-started}
 * @example
 * import { Wechaty } from 'wechaty'
 *
 */
export class Wechaty extends EventEmitter implements Sayable {
  /**
   * singleton _instance
   * @private
   */
  private static _instance: Wechaty

  /**
   * the puppet
   * @private
   */
  public puppet: Puppet | null

  /**
   * the state
   * @private
   */
  private state = new StateSwitch<'standby', 'ready'>('Wechaty', 'standby', log)

  /**
   * the uuid
   * @private
   */
  public uuid:        string

  /**
   * get the singleton instance of Wechaty
   *
   * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
   * const { Wechaty } = require('wechaty')
   *
   * Wechaty.instance() // Singleton
   * .on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
   * .on('login',       user => console.log(`User ${user} logined`))
   * .on('message',  message => console.log(`Message: ${message}`))
   * .init()
   */
  public static instance(setting?: PuppetSetting) {
    if (setting && this._instance) {
      throw new Error('there has already a instance. no params will be allowed any more')
    }
    if (!this._instance) {
      this._instance = new Wechaty(setting)
    }
    return this._instance
  }

  /**
   * @private
   */
  private constructor(private setting: PuppetSetting = {}) {
    super()
    log.verbose('Wechaty', 'contructor()')

    setting.head    = setting.head    || config.head
    setting.puppet  = setting.puppet  || config.puppet
    setting.profile = setting.profile || config.profile

    // setting.port    = setting.port    || Config.port

    if (setting.profile) {
      setting.profile  = /\.wechaty\.json$/i.test(setting.profile)
                        ? setting.profile
                        : setting.profile + '.wechaty.json'
    }

    this.uuid = UtilLib.guid()
  }

  /**
   * @private
   */
  public toString() { return 'Class Wechaty(' + this.setting.puppet + ')'}

  /**
   * Return version of Wechaty
   *
   * @param {boolean} [forceNpm=false]  - if set to true, will only return the version in package.json.
   *                                      otherwise will return git commit hash if .git exists.
   * @returns {string}                  - the version number
   * @example
   * console.log(Wechaty.instance().version())       // return '#git[af39df]'
   * console.log(Wechaty.instance().version(true))   // return '0.7.9'
   */
  public static version(forceNpm = false): string {
    if (!forceNpm) {
      const revision = config.gitVersion()
      if (revision) {
        return `#git[${revision}]`
      }
    }
    return config.npmVersion()
  }

  /**
   * @private
   */
  public version(forceNpm?) {
    return Wechaty.version(forceNpm)
  }

  /**
   * @private
   */
  public user(): Contact {
    log.warn('Wechaty', 'user() DEPRECATED. use self() instead.')

    if (!this.puppet || !this.puppet.user) {
      throw new Error('no user')
    }
    return this.puppet.user
  }

  /**
   * @private
   */
  public async reset(reason?: string): Promise<void> {
    log.verbose('Wechaty', 'reset() because %s', reason)
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.reset(reason)
    return
  }

  /**
   * Initialize the bot, return Promise.
   *
   * @returns {Promise<void>}
   * @example
   * await bot.init()
   * // do other stuff with bot here
   */
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

    this.state.target('ready')
    this.state.current('ready', false)

    try {
      await this.initPuppet()
    } catch (e) {
      log.error('Wechaty', 'init() exception: %s', e && e.message)
      Raven.captureException(e)
      throw e
    }

    this.state.current('ready')
    return
  }

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

  /**
   * @desc       Wechaty Class Event Type
   * @typedef    WechatyEventName
   * @property   {string}  error      - When the bot get error, there will be a Wechaty error event fired.
   * @property   {string}  login      - After the bot login full successful, the event login will be emitted, with a Contact of current logined user.
   * @property   {string}  logout     - Logout will be emitted when bot detected log out, with a Contact of the current login user.
   * @property   {string}  scan       - A scan event will be emitted when the bot needs to show you a QR Code for scanning.
   * @property   {string}  heartbeat  - Get bot's heartbeat.
   * @property   {string}  friend     - When someone sends you a friend request, there will be a Wechaty friend event fired.
   * @property   {string}  message    - Emit when there's a new message.
   * @property   {string}  room-join  - Emit when anyone join any room.
   * @property   {string}  room-topic - Get topic event, emitted when someone change room topic.
   * @property   {string}  room-leave - Emit when anyone leave the room.<br>
   *                                    If someone leaves the room by themselves, wechat will not notice other people in the room, so the bot will never get the "leave" event.
   */

  /**
   * @desc       Wechaty Class Event Function
   * @typedef    WechatyEventFunction
   * @property   {Function} error           -(this: Wechaty, error: Error) => void callback function
   * @property   {Function} login           -(this: Wechaty, user: Contact)=> void
   * @property   {Function} logout          -(this: Wechaty, user: Contact) => void
   * @property   {Function} scan            -(this: Wechaty, url: string, code: number) => void <br>
   * <ol>
   * <li>URL: {String} the QR code image URL</li>
   * <li>code: {Number} the scan status code. some known status of the code list here is:</li>
   * </ol>
   * <ul>
   * <li>0 initial_</li>
   * <li>200 login confirmed</li>
   * <li>201 scaned, wait for confirm</li>
   * <li>408 waits for scan</li>
   * </ul>
   * @property   {Function} heartbeat       -(this: Wechaty, data: any) => void
   * @property   {Function} friend          -(this: Wechaty, friend: Contact, request?: FriendRequest) => void
   * @property   {Function} message         -(this: Wechaty, message: Message) => void
   * @property   {Function} room-join       -(this: Wechaty, room: Room, inviteeList: Contact[],  inviter: Contact) => void
   * @property   {Function} room-topic      -(this: Wechaty, room: Room, topic: string, oldTopic: string, changer: Contact) => void
   * @property   {Function} room-leave      -(this: Wechaty, room: Room, leaverList: Contact[]) => void
   */

  /**
   * @listens Wechaty
   * @param   {WechatyEventName}      event      - Emit WechatyEvent
   * @param   {WechatyEventFunction}  listener   - Depends on the WechatyEvent
   * @return  {Wechaty}                          - this for chain
   *
   * More Example Gist: [Example/Friend-Bot]{@link https://github.com/wechaty/wechaty/blob/master/example/friend-bot.ts}
   *
   * @example <caption>Event:scan </caption>
   * wechaty.on('scan', (url: string, code: number) => {
   *   console.log(`[${code}] Scan ${url} to login.` )
   * })
   *
   * @example <caption>Event:login </caption>
   * bot.on('login', (user: Contact) => {
   *   console.log(`user ${user} login`)
   * })
   *
   * @example <caption>Event:logout </caption>
   * bot.on('logout', (user: Contact) => {
   *   console.log(`user ${user} logout`)
   * })
   *
   * @example <caption>Event:message </caption>
   * wechaty.on('message', (message: Message) => {
   *   console.log(`message ${message} received`)
   * })
   *
   * @example <caption>Event:friend </caption>
   * bot.on('friend', (contact: Contact, request: FriendRequest) => {
   *   if(request){ // 1. request to be friend from new contact
   *     let result = await request.accept()
   *       if(result){
   *         console.log(`Request from ${contact.name()} is accept succesfully!`)
   *       } else{
   *         console.log(`Request from ${contact.name()} failed to accept!`)
   *       }
   * 	  } else { // 2. confirm friend ship
   *       console.log(`new friendship confirmed with ${contact.name()}`)
   *    }
   *  })
   *
   * @example <caption>Event:room-join </caption>
   * bot.on('room-join', (room: Room, inviteeList: Contact[], inviter: Contact) => {
   *   const nameList = inviteeList.map(c => c.name()).join(',')
   *   console.log(`Room ${room.topic()} got new member ${nameList}, invited by ${inviter}`)
   * })
   *
   * @example <caption>Event:room-leave </caption>
   * bot.on('room-leave', (room: Room, leaverList: Contact[]) => {
   *   const nameList = leaverList.map(c => c.name()).join(',')
   *   console.log(`Room ${room.topic()} lost member ${nameList}`)
   * })
   *
   * @example <caption>Event:room-topic </caption>
   * bot.on('room-topic', (room: Room, topic: string, oldTopic: string, changer: Contact) => {
   *   console.log(`Room ${room.topic()} topic changed from ${oldTopic} to ${topic} by ${changer.name()}`)
   * })
   */
  public on(event: WechatyEventName, listener: (...args: any[]) => any): this {
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

  /**
   * @private
   */
  public async initPuppet(): Promise<Puppet> {
    let puppet: Puppet

    if (!this.setting.head) {
      throw new Error('no head')
    }

    switch (this.setting.puppet) {
      case 'web':
        puppet = new PuppetWeb({
          head:     this.setting.head,
          profile:  this.setting.profile,
        })
        break

      default:
        throw new Error('Puppet unsupport(yet?): ' + this.setting.puppet)
    }

    const eventList: WechatyEventName[] = [
      'error',
      'friend',
      'heartbeat',
      'login',
      'logout',
      'message',
      'room-join',
      'room-leave',
      'room-topic',
      'scan',
    ]

    eventList.map(e => {
      // https://strongloop.com/strongblog/an-introduction-to-javascript-es6-arrow-functions/
      // We’ve lost () around the argument list when there’s just one argument (rest arguments are an exception, eg (...args) => ...)
      puppet.on(e, (...args: any[]) => {
        // this.emit(e, data)
        this.emit.apply(this, [e, ...args])
      })
    })

    // set puppet before init, because we need this.puppet if we quit() before init() finish
    this.puppet = <Puppet>puppet // force to use base class Puppet interface for better encapsolation

    // set puppet instance to Wechaty Static variable, for using by Contact/Room/Message/FriendRequest etc.
    config.puppetInstance(puppet)

    await puppet.init()
    return puppet
  }

  /**
   * Quit the bot
   *
   * @returns {Promise<void>}
   * @example
   * await bot.quit()
   */
  public async quit(): Promise<void> {
    log.verbose('Wechaty', 'quit()')

    if (this.state.current() !== 'ready' || this.state.inprocess()) {
      const err = new Error('quit() must run on a inited instance.')
      log.error('Wechaty', err.message)
      throw err
    }
    this.state.target('standby')
    this.state.current('standby', false)

    if (!this.puppet) {
      log.warn('Wechaty', 'quit() without this.puppet')
      return
    }

    const puppetBeforeDie = this.puppet
    this.puppet     = null
    config.puppetInstance(null)

    await puppetBeforeDie.quit()
                        .catch(e => {
                          log.error('Wechaty', 'quit() exception: %s', e.message)
                          Raven.captureException(e)
                          throw e
                        })
    this.state.current('standby')
    return
  }

  /**
   * Logout the bot
   *
   * @returns {Promise<void>}
   * @example
   * await bot.logout()
   */
  public async logout(): Promise<void>  {
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.logout()
                    .catch(e => {
                      log.error('Wechaty', 'logout() exception: %s', e.message)
                      Raven.captureException(e)
                      throw e
                    })
    return
  }

  /**
   * Get current user
   *
   * @returns {Contact}
   * @example
   * const contact = bot.self()
   * console.log(`Bot is ${contact.name()}`)
   */
  public self(): Contact {
    if (!this.puppet) {
      throw new Error('Wechaty.self() no puppet')
    }
    return this.puppet.self()
  }

  /**
   * @private
   */
  public async send(message: Message | MediaMessage): Promise<boolean> {
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    return await this.puppet.send(message)
                            .catch(e => {
                              log.error('Wechaty', 'send() exception: %s', e.message)
                              Raven.captureException(e)
                              throw e
                            })
  }

  /**
   * Send message to filehelper
   *
   * @param {string} content
   * @returns {Promise<boolean>}
   */
  public async say(content: string): Promise<boolean> {
    log.verbose('Wechaty', 'say(%s)', content)

    if (!this.puppet) {
      throw new Error('no puppet')
    }
    return await this.puppet.say(content)
  }

  /**
   * @private
   */
  public static async sleep(millisecond: number): Promise<void> {
    await new Promise(resolve => {
      setTimeout(resolve, millisecond)
    })
  }

  /**
   * @private
   */
  public ding() {
    if (!this.puppet) {
      return Promise.reject(new Error('wechaty cant ding coz no puppet'))
    }

    return this.puppet.ding() // should return 'dong'
                      .catch(e => {
                        log.error('Wechaty', 'ding() exception: %s', e.message)
                        Raven.captureException(e)
                        throw e
                      })
  }
}

export default Wechaty
