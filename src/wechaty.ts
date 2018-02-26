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
 *  @ignore
 */
import { EventEmitter } from 'events'
import * as os          from 'os'

import StateSwitch      from 'state-switch'
import {
  callerResolve,
  hotImport,
}                       from 'hot-import'

import {
  config,
  PuppetName,
  Raven,
  Sayable,
  log,
  VERSION,
}                     from './config'

import Contact        from './contact'
import FriendRequest  from './friend-request'
import {
  Message,
  MediaMessage,
}                     from './message'
import Profile        from './profile'
import Puppet         from './puppet'
import PuppetWeb      from './puppet-web/'
import Room           from './room'
import Misc           from './misc'

export interface WechatyOptions {
  puppet?:  PuppetName,
  profile?: string,
}

export type WechatEvent = 'friend'
                        | 'login'
                        | 'logout'
                        | 'message'
                        | 'room-join'
                        | 'room-leave'
                        | 'room-topic'
                        | 'scan'

export type WechatyEvent = WechatEvent
                        | 'error'
                        | 'heartbeat'
                        | 'start'
                        | 'stop'

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

  private profile: Profile

  /**
   * the state
   * @private
   */
  private state = new StateSwitch('Wechaty', log)

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
  public static instance(
    options?: WechatyOptions,
  ) {
    if (options && this._instance) {
      throw new Error('there has already a instance. no params will be allowed any more')
    }
    if (!this._instance) {
      this._instance = new Wechaty(options)
    }
    return this._instance
  }

  /**
   * @private
   */
  private constructor(
    private options: WechatyOptions = {},
  ) {
    super()
    log.verbose('Wechaty', 'contructor()')

    options.puppet  = options.puppet || config.puppet

    this.profile = new Profile(options.profile)

    this.uuid = Misc.guid()
  }

  /**
   * @private
   */
  public toString() { return `Wechaty<${this.options.puppet}, ${this.profile.name}>`}

  /**
   * @private
   */
  public static version(forceNpm = false): string {
    if (!forceNpm) {
      const revision = config.gitRevision()
      if (revision) {
        return `#git[${revision}]`
      }
    }
    return VERSION
  }

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
  public version(forceNpm?) {
    return Wechaty.version(forceNpm)
  }

  /**
   * Initialize the bot, return Promise.
   *
   * @deprecated
   * @returns {Promise<void>}
   * @example
   * await bot.init()
   * // do other stuff with bot here
   */
  public async init(): Promise<void> {
    log.warn('Wechaty', 'init() DEPRECATED and will be removed after Jun 2018. Use start() instead.')
    await this.start()
  }

  /**
   * Start the bot, return Promise.
   *
   * @returns {Promise<void>}
   * @example
   * await bot.start()
   * // do other stuff with bot here
   */
  public async start(): Promise<void> {
    log.info('Wechaty', 'v%s starting...' , this.version())
    log.verbose('Wechaty', 'puppet: %s'       , this.options.puppet)
    log.verbose('Wechaty', 'profile: %s'      , this.options.profile)
    log.verbose('Wechaty', 'uuid: %s'         , this.uuid)

    if (this.state.on() === true) {
      log.error('Wechaty', 'start() already started. return and do nothing.')
      return
    } else if (this.state.on() === 'pending') {
      log.error('Wechaty', 'start() another task is starting. return and do nothing.')
      return
    }

    this.state.on('pending')

    try {
      this.profile.load()
      this.puppet = await this.initPuppet()

    } catch (e) {
      log.error('Wechaty', 'start() exception: %s', e && e.message)
      Raven.captureException(e)
      throw e
    }

    this.on('heartbeat', () => this.memoryCheck())

    this.state.on(true)
    this.emit('start')

    return
  }

  public on(event: 'error'      , listener: string | ((this: Wechaty, error: Error) => void))                                                  : this
  public on(event: 'friend'     , listener: string | ((this: Wechaty, friend: Contact, request?: FriendRequest) => void))                      : this
  public on(event: 'heartbeat'  , listener: string | ((this: Wechaty, data: any) => void))                                                     : this
  public on(event: 'logout'     , listener: string | ((this: Wechaty, user: Contact) => void))                                                 : this
  public on(event: 'login'      , listener: string | ((this: Wechaty, user: Contact) => void))                                                 : this
  public on(event: 'message'    , listener: string | ((this: Wechaty, message: Message) => void))                                              : this
  public on(event: 'room-join'  , listener: string | ((this: Wechaty, room: Room, inviteeList: Contact[],  inviter: Contact) => void))         : this
  public on(event: 'room-leave' , listener: string | ((this: Wechaty, room: Room, leaverList: Contact[]) => void))                             : this
  public on(event: 'room-topic' , listener: string | ((this: Wechaty, room: Room, topic: string, oldTopic: string, changer: Contact) => void)) : this
  public on(event: 'scan'       , listener: string | ((this: Wechaty, url: string, code: number) => void))                                     : this
  public on(event: 'start'      , listener: string | ((this: Wechaty) => void))                                                                : this
  public on(event: 'stop'       , listener: string | ((this: Wechaty) => void))                                                                : this
  // guard for the above event: make sure it includes all the possible values
  public on(event: never,         listener: any): this

  /**
   * @desc       Wechaty Class Event Type
   * @typedef    WechatyEventName
   * @property   {string}  error      - When the bot get error, there will be a Wechaty error event fired.
   * @property   {string}  login      - After the bot login full successful, the event login will be emitted, with a Contact of current logined user.
   * @property   {string}  logout     - Logout will be emitted when bot detected log out, with a Contact of the current login user.
   * @property   {string}  heartbeat  - Get bot's heartbeat.
   * @property   {string}  friend     - When someone sends you a friend request, there will be a Wechaty friend event fired.
   * @property   {string}  message    - Emit when there's a new message.
   * @property   {string}  room-join  - Emit when anyone join any room.
   * @property   {string}  room-topic - Get topic event, emitted when someone change room topic.
   * @property   {string}  room-leave - Emit when anyone leave the room.<br>
   *                                    If someone leaves the room by themselves, wechat will not notice other people in the room, so the bot will never get the "leave" event.
   * @property   {string}  scan       - A scan event will be emitted when the bot needs to show you a QR Code for scanning.
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
   * @param   {WechatyEvent}      event      - Emit WechatyEvent
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
  public on(event: WechatyEvent, listener: string | ((...args: any[]) => any)): this {
    log.verbose('Wechaty', 'on(%s, %s) registered',
                            event,
                            typeof listener === 'string'
                              ? listener
                              : typeof listener,
                )

    if (typeof listener === 'function') {
      this.onFunction(event, listener)
    } else {
      this.onModulePath(event, listener)
    }
    return this
  }

  private onModulePath(event: WechatyEvent, modulePath: string): void {
    const absoluteFilename = callerResolve(modulePath, __filename)
    log.verbose('Wechaty', 'onModulePath() hotImpor(%s)', absoluteFilename)
    hotImport(absoluteFilename)
      .then((func: Function) => super.on(event, (...args: any[]) => {
        try {
          func.apply(this, args)
        } catch (e) {
          log.error('Wechaty', 'onModulePath(%s, %s) listener exception: %s',
                                event, modulePath, e)
          this.emit('error', e)
        }
      }))
      .catch(e => {
        log.error('Wechaty', 'onModulePath(%s, %s) hotImport() exception: %s',
                              event, modulePath, e)
        this.emit('error', e)
      })
  }

  private onFunction(event: WechatyEvent, listener: Function): void {
    log.verbose('Wechaty', 'onFunction(%s)', event)

    super.on(event, (...args: any[]) => {
      try {
        listener.apply(this, args)
      } catch (e) {
        log.error('Wechaty', 'onFunction(%s) listener exception: %s', event, e)
        this.emit('error', e)
      }
    })
  }

  /**
   * @private
   */
  public async initPuppet(): Promise<Puppet> {
    log.verbose('Wechaty', 'initPuppet()')
    let puppet: Puppet

    switch (this.options.puppet) {
      case 'web':
        puppet = new PuppetWeb({
          profile:  this.profile,
        })
        break

      default:
        throw new Error('Puppet unsupport(yet?): ' + this.options.puppet)
    }

    const eventList: WechatyEvent[] = [
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

    for (const event of eventList) {
      log.verbose('Wechaty', 'initPuppet() puppet.on(%s) registered', event)
      /// e as any ??? Maybe this is a bug of TypeScript v2.5.3
      puppet.on(event as any, (...args: any[]) => {
        this.emit(event, ...args)
      })
    }

    // set puppet instance to Wechaty Static variable, for using by Contact/Room/Message/FriendRequest etc.
    config.puppetInstance(puppet)
    await puppet.init()

    return puppet
  }

  /**
   * Quit the bot
   *
   * @deprecated use stop() instead
   * @returns {Promise<void>}
   * @example
   * await bot.quit()
   */
  public async quit(): Promise<void> {
    log.warn('Wechaty', 'quit() DEPRECATED and will be removed after Jun 2018. Use stop() instead.')
    await this.stop()
  }

  /**
   * Stop the bot
   *
   * @returns {Promise<void>}
   * @example
   * await bot.stop()
   */
  public async stop(): Promise<void> {
    log.verbose('Wechaty', 'stop()')

    if (this.state.off()) {
      if (this.state.off() === 'pending') { // current() !== 'on' || !this.state.stable()) {
        const err = new Error(`stop() on a pending stop instance.`)
        log.error('Wechaty', err.message)
        this.emit('error', err)
      } else {
        log.warn('Wechaty', 'stop() on an already stopped instance.')
      }
      return
    }
    this.state.off('pending')

    if (!this.puppet) {
      log.warn('Wechaty', 'stop() without this.puppet')
      return
    }

    const puppet = this.puppet

    this.puppet = null
    config.puppetInstance(null)

    try {
      await puppet.quit()
    } catch (e) {
      log.error('Wechaty', 'stop() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    } finally {
      this.state.off(true)
      this.emit('stop')

      // MUST use setImmediate at here(the end of this function),
      // because we need to run the micro task registered by the `emit` method
      setImmediate(() => puppet.removeAllListeners())
    }
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
    log.verbose('Wechaty', 'logout()')

    if (!this.puppet) {
      throw new Error('no puppet')
    }

    try {
      await this.puppet.logout()
    } catch (e) {
      log.error('Wechaty', 'logout() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
    return
  }

  /**
   * Get the logon / logoff state
   *
   * @returns {boolean}
   * @example
   * if (bot.logonoff()) {
   *   console.log('Bot logined')
   * } else {
   *   console.log('Bot not logined')
   * }
   */
  public logonoff(): Boolean {
    if (!this.puppet) {
      return false
    }
    return this.puppet.logonoff()
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
    try {
      return await this.puppet.send(message)
    } catch (e) {
      log.error('Wechaty', 'send() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
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
  public async ding(): Promise<string> {
    if (!this.puppet) {
      return Promise.reject(new Error('wechaty cant ding coz no puppet'))
    }

    try {
      return await this.puppet.ding() // should return 'dong'
    } catch (e) {
      log.error('Wechaty', 'ding() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * @private
   */
  private memoryCheck(minMegabyte = 4): void {
    const freeMegabyte = Math.floor(os.freemem() / 1024 / 1024)
    log.silly('Wechaty', 'memoryCheck() free: %d MB, require: %d MB',
                          freeMegabyte, minMegabyte)

    if (freeMegabyte < minMegabyte) {
      const e = new Error(`memory not enough: free ${freeMegabyte} < require ${minMegabyte} MB`)
      log.warn('Wechaty', 'memoryCheck() %s', e.message)
      this.emit('error', e)
    }
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

}

export default Wechaty
