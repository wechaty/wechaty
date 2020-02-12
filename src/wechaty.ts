/**
 *   Wechaty - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
import cuid    from 'cuid'
import os      from 'os'

import {
  // Constructor,
  cloneClass,
  // instanceToClass,
}                   from 'clone-class'
import {
  FileBox,
}                   from 'file-box'
import {
  callerResolve,
  hotImport,
}                   from 'hot-import'
import {
  MemoryCard,
}                   from 'memory-card'
import {
  StateSwitch,
}                   from 'state-switch'

import {
  CHAT_EVENT_DICT,
  Puppet,

  PUPPET_EVENT_DICT,
  PuppetEventName,
  PuppetOptions,
  ScanStatus,
}                       from 'wechaty-puppet'

import {
  Accessory,
}                       from './accessory'
import {
  config,
  isProduction,
  log,
  Raven,
}                       from './config'

import {
  VERSION,
  GIT_COMMIT_HASH,
}                       from './version'

import {
  AnyFunction,
  Sayable,
}                       from './types'

import {
  Io,
}                       from './io'
import {
  PuppetModuleName,
}                       from './puppet-config'
import {
  PuppetManager,
}                       from './puppet-manager'

import {
  Contact,
  Tag,
  ContactSelf,
  Friendship,
  Message,
  Room,
  RoomInvitation,
  UrlLink,
  MiniProgram,
}                       from './user/'

export const WECHATY_EVENT_DICT = {
  ...CHAT_EVENT_DICT,
  dong      : 'Should be emitted after we call `Wechaty.ding()`',
  error     : `Will be emit when there's an Error occurred.`,
  heartbeat : 'Will be emited periodly after the Wechaty started. If not, means that the Wechaty had died.',
  ready     : 'All underlined data source are ready for use.',
  start     : 'Will be emitted after the Wechaty had been started.',
  stop      : 'Will be emitted after the Wechaty had been stopped.',
}

export type WechatyEventName  = keyof typeof WECHATY_EVENT_DICT

export interface WechatyOptions {
  memory?        : MemoryCard,
  name?          : string,                    // Wechaty Name

  // @deprecated: use `name` instead of `profile`
  profile?       : null | string,             // DEPRECATED: use name instead

  puppet?        : PuppetModuleName | Puppet, // Puppet name or instance
  puppetOptions? : PuppetOptions,             // Puppet TOKEN
  ioToken?       : string,                    // Io TOKEN
}

const PUPPET_MEMORY_NAME = 'puppet'

/**
 * Main bot class.
 *
 * A `Bot` is a wechat client depends on which puppet you use.
 * It may equals
 * - web-wechat, when you use: [puppet-puppeteer](https://github.com/wechaty/wechaty-puppet-puppeteer)/[puppet-wechat4u](https://github.com/wechaty/wechaty-puppet-wechat4u)
 * - ipad-wechat, when you use: [puppet-padchat](https://github.com/wechaty/wechaty-puppet-padchat)
 * - ios-wechat, when you use: puppet-ioscat
 *
 * See more:
 * - [What is a Puppet in Wechaty](https://github.com/wechaty/wechaty-getting-started/wiki/FAQ-EN#31-what-is-a-puppet-in-wechaty)
 *
 * > If you want to know how to send message, see [Message](#Message) <br>
 * > If you want to know how to get contact, see [Contact](#Contact)
 *
 * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
 * const { Wechaty } = require('wechaty')
 * const bot = new Wechaty()
 * bot.on('scan',    (qrcode, status) => console.log(['https://api.qrserver.com/v1/create-qr-code/?data=',encodeURIComponent(qrcode),'&size=220x220&margin=20',].join('')))
 * bot.on('login',   user => console.log(`User ${user} logined`))
 * bot.on('message', message => console.log(`Message: ${message}`))
 * bot.start()
 */
export class Wechaty extends Accessory implements Sayable {

  public static readonly VERSION = VERSION

  public  readonly state      : StateSwitch
  private readonly readyState : StateSwitch

  /**
   * singleton globalInstance
   * @ignore
   */
  private static globalInstance: Wechaty

  private memory?: MemoryCard

  private lifeTimer? : NodeJS.Timer
  private io?        : Io

  /**
   * the cuid
   * @ignore
   */
  public readonly id : string

  public readonly Contact       : typeof Contact
  public readonly Tag           : typeof Tag
  public readonly ContactSelf   : typeof ContactSelf
  public readonly Friendship    : typeof Friendship
  public readonly Message       : typeof Message
  public readonly RoomInvitation: typeof RoomInvitation
  public readonly Room          : typeof Room
  public readonly UrlLink       : typeof UrlLink
  public readonly MiniProgram   : typeof MiniProgram

  /**
   * Get the global instance of Wechaty
   *
   * @param {WechatyOptions} [options={}]
   *
   * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
   * const { Wechaty } = require('wechaty')
   *
   * Wechaty.instance() // Global instance
   * .on('scan', (url, status) => console.log(`Scan QR Code to login: ${status}\n${url}`))
   * .on('login',       user => console.log(`User ${user} logined`))
   * .on('message',  message => console.log(`Message: ${message}`))
   * .start()
   */
  public static instance (
    options?: WechatyOptions,
  ) {
    if (options && this.globalInstance) {
      throw new Error('instance can be only inited once by options!')
    }
    if (!this.globalInstance) {
      this.globalInstance = new Wechaty(options)
    }
    return this.globalInstance
  }

  /**
   * The term [Puppet](https://github.com/wechaty/wechaty/wiki/Puppet) in Wechaty is an Abstract Class for implementing protocol plugins.
   * The plugins are the component that helps Wechaty to control the Wechat(that's the reason we call it puppet).
   * The plugins are named XXXPuppet, for example:
   * - [PuppetPuppeteer](https://github.com/wechaty/wechaty-puppet-puppeteer):
   * - [PuppetPadchat](https://github.com/wechaty/wechaty-puppet-padchat)
   *
   * @typedef    PuppetModuleName
   * @property   {string}  PUPPET_DEFAULT
   * The default puppet.
   * @property   {string}  wechaty-puppet-wechat4u
   * The default puppet, using the [wechat4u](https://github.com/nodeWechat/wechat4u) to control the [WeChat Web API](https://wx.qq.com/) via a chrome browser.
   * @property   {string}  wechaty-puppet-padchat
   * - Using the WebSocket protocol to connect with a Protocol Server for controlling the iPad Wechat program.
   * @property   {string}  wechaty-puppet-puppeteer
   * - Using the [google puppeteer](https://github.com/GoogleChrome/puppeteer) to control the [WeChat Web API](https://wx.qq.com/) via a chrome browser.
   * @property   {string}  wechaty-puppet-mock
   * - Using the mock data to mock wechat operation, just for test.
   */

  /**
   * The option parameter to create a wechaty instance
   *
   * @typedef    WechatyOptions
   * @property   {string}                 name            -Wechaty Name. </br>
   *          When you set this: </br>
   *          `new Wechaty({name: 'wechaty-name'}) ` </br>
   *          it will generate a file called `wechaty-name.memory-card.json`. </br>
   *          This file stores the bot's login information. </br>
   *          If the file is valid, the bot can auto login so you don't need to scan the qrcode to login again. </br>
   *          Also, you can set the environment variable for `WECHATY_NAME` to set this value when you start. </br>
   *          eg:  `WECHATY_NAME="your-cute-bot-name" node bot.js`
   * @property   {PuppetModuleName | Puppet}    puppet             -Puppet name or instance
   * @property   {Partial<PuppetOptions>} puppetOptions      -Puppet TOKEN
   * @property   {string}                 ioToken            -Io TOKEN
   */

  /**
   * Creates an instance of Wechaty.
   * @param {WechatyOptions} [options={}]
   *
   */
  constructor (
    private options: WechatyOptions = {},
  ) {
    super()
    log.verbose('Wechaty', 'contructor()')

    if (!options.name && options.profile) {
      log.verbose('Wechaty', 'constuctor() WechatyOptions.profile DEPRECATED. use WechatyOptions.name instead.')
      options.name = options.profile
    }
    this.memory = this.options.memory

    this.id = cuid()

    this.state      = new StateSwitch('Wechaty', log)
    this.readyState = new StateSwitch('WechatyReady', log)

    /**
      * @ignore
     * Clone Classes for this bot and attach the `puppet` to the Class
     *
     *   https://stackoverflow.com/questions/36886082/abstract-constructor-type-in-typescript
     *   https://github.com/Microsoft/TypeScript/issues/5843#issuecomment-290972055
     *   https://github.com/Microsoft/TypeScript/issues/19197
     */
    // TODO: make Message & Room constructor private???
    this.Contact        = cloneClass(Contact)
    this.ContactSelf    = cloneClass(ContactSelf)
    this.Friendship     = cloneClass(Friendship)
    this.Message        = cloneClass(Message)
    this.Room           = cloneClass(Room)
    this.RoomInvitation = cloneClass(RoomInvitation)
    this.Tag            = cloneClass(Tag)

    // No need to set puppet/wechaty, so do not clone
    this.UrlLink        = UrlLink
    this.MiniProgram    = MiniProgram
  }

  /**
   * @ignore
   */
  public toString () {
    if (!this.options) {
      return this.constructor.name
    }

    return [
      'Wechaty#',
      this.id,
      `<${(this.options && this.options.puppet) || ''}>`,
      `(${(this.memory && this.memory.name) || ''})`,
    ].join('')
  }

  public emit (event: 'dong',       data?: string)                                                      : boolean
  public emit (event: 'error',      error: Error)                                                       : boolean
  public emit (event: 'friendship', friendship: Friendship)                                             : boolean
  public emit (event: 'heartbeat',  data: any)                                                          : boolean
  public emit (event: 'login',      user: ContactSelf)                                                  : boolean
  public emit (event: 'logout',     user: ContactSelf, reason?: string)                                 : boolean
  public emit (event: 'message',    message: Message)                                                   : boolean
  public emit (event: 'ready')                                                                          : boolean
  public emit (event: 'room-invite',  roomInvitation: RoomInvitation)                                   : boolean
  public emit (event: 'room-join',    room: Room, inviteeList : Contact[], inviter : Contact, date: Date)           : boolean
  public emit (event: 'room-leave',   room: Room, leaverList  : Contact[], remover : Contact, date: Date)           : boolean
  public emit (event: 'room-topic',   room: Room, newTopic: string, oldTopic: string, changer: Contact, date: Date) : boolean
  public emit (event: 'scan',         qrcode: string, status: ScanStatus, data?: string)                : boolean
  public emit (event: 'start' | 'stop')                                                                 : boolean

  // guard for the above event: make sure it includes all the possible values
  public emit (event: never, listener: never): never

  public emit (
    event:   WechatyEventName,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }

  public on (event: 'dong',         listener: string | ((this: Wechaty, data?: string) => void))                                                    : this
  public on (event: 'error',        listener: string | ((this: Wechaty, error: Error) => void))                                                     : this
  public on (event: 'friendship',   listener: string | ((this: Wechaty, friendship: Friendship) => void))                                           : this
  public on (event: 'heartbeat',    listener: string | ((this: Wechaty, data: any) => void))                                                        : this
  public on (event: 'login',        listener: string | ((this: Wechaty, user: ContactSelf) => void))                                                : this
  public on (event: 'logout',       listener: string | ((this: Wechaty, user: ContactSelf, reason?: string) => void))                               : this
  public on (event: 'message',      listener: string | ((this: Wechaty, message: Message) => void))                                                 : this
  public on (event: 'ready',        listener: string | ((this: Wechaty) => void))                                                                   : this
  public on (event: 'room-invite',  listener: string | ((this: Wechaty, roomInvitation: RoomInvitation) => void))                                   : this
  public on (event: 'room-join',    listener: string | ((this: Wechaty, room: Room, inviteeList: Contact[], inviter: Contact,  date?: Date) => void))            : this
  public on (event: 'room-leave',   listener: string | ((this: Wechaty, room: Room, leaverList: Contact[],  remover?: Contact, date?: Date) => void))            : this
  public on (event: 'room-topic',   listener: string | ((this: Wechaty, room: Room, newTopic: string, oldTopic: string, changer: Contact, date?: Date) => void)) : this
  public on (event: 'scan',         listener: string | ((this: Wechaty, qrcode: string, status: ScanStatus, data?: string) => void))                : this
  public on (event: 'start' | 'stop', listener: string | ((this: Wechaty) => void))                                                                 : this

  // guard for the above event: make sure it includes all the possible values
  public on (event: never, listener: never): never

  /**
   * @desc       Wechaty Class Event Type
   * @typedef    WechatyEventName
   * @property   {string}  error       - When the bot get error, there will be a Wechaty error event fired.
   * @property   {string}  login       - After the bot login full successful, the event login will be emitted, with a Contact of current logined user.
   * @property   {string}  logout      - Logout will be emitted when bot detected log out, with a Contact of the current login user.
   * @property   {string}  heartbeat   - Get bot's heartbeat.
   * @property   {string}  friendship  - When someone sends you a friend request, there will be a Wechaty friendship event fired.
   * @property   {string}  message     - Emit when there's a new message.
   * @property   {string}  ready       - Emit when all data has load completed, in wechaty-puppet-padchat, it means it has sync Contact and Room completed
   * @property   {string}  room-join   - Emit when anyone join any room.
   * @property   {string}  room-topic  - Get topic event, emitted when someone change room topic.
   * @property   {string}  room-leave  - Emit when anyone leave the room.<br>
   *                                   - If someone leaves the room by themselves, wechat will not notice other people in the room, so the bot will never get the "leave" event.
   * @property   {string}  room-invite - Emit when there is a room invitation, see more in  {@link RoomInvitation}
   * @property   {string}  scan        - A scan event will be emitted when the bot needs to show you a QR Code for scanning. </br>
   *                                    It is recommend to install qrcode-terminal(run `npm install qrcode-terminal`) in order to show qrcode in the terminal.
   */

  /**
   * @desc       Wechaty Class Event Function
   * @typedef    WechatyEventFunction
   * @property   {Function} error           -(this: Wechaty, error: Error) => void callback function
   * @property   {Function} login           -(this: Wechaty, user: ContactSelf)=> void
   * @property   {Function} logout          -(this: Wechaty, user: ContactSelf) => void
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
   * @property   {Function} friendship      -(this: Wechaty, friendship: Friendship) => void
   * @property   {Function} message         -(this: Wechaty, message: Message) => void
   * @property   {Function} ready           -(this: Wechaty) => void
   * @property   {Function} room-join       -(this: Wechaty, room: Room, inviteeList: Contact[],  inviter: Contact) => void
   * @property   {Function} room-topic      -(this: Wechaty, room: Room, newTopic: string, oldTopic: string, changer: Contact) => void
   * @property   {Function} room-leave      -(this: Wechaty, room: Room, leaverList: Contact[]) => void
   * @property   {Function} room-invite     -(this: Wechaty, room: Room, roomInvitation: RoomInvitation) => void <br>
   *                                        see more in  {@link RoomInvitation}
   */

  /**
   * @listens Wechaty
   * @param   {WechatyEventName}      event      - Emit WechatyEvent
   * @param   {WechatyEventFunction}  listener   - Depends on the WechatyEvent
   *
   * @return  {Wechaty}                          - this for chaining,
   * see advanced {@link https://github.com/wechaty/wechaty-getting-started/wiki/FAQ-EN#36-why-wechatyonevent-listener-return-wechaty|chaining usage}
   *
   * @desc
   * When the bot get message, it will emit the following Event.
   *
   * You can do anything you want when in these events functions.
   * The main Event name as follows:
   * - **scan**: Emit when the bot needs to show you a QR Code for scanning. After scan the qrcode, you can login
   * - **login**: Emit when bot login full successful.
   * - **logout**: Emit when bot detected log out.
   * - **message**: Emit when there's a new message.
   *
   * see more in {@link WechatyEventName}
   *
   * @example <caption>Event:scan</caption>
   * // Scan Event will emit when the bot needs to show you a QR Code for scanning
   *
   * bot.on('scan', (url, status) => {
   *   console.log(`[${status}] Scan ${url} to login.` )
   * })
   *
   * @example <caption>Event:login </caption>
   * // Login Event will emit when bot login full successful.
   *
   * bot.on('login', (user) => {
   *   console.log(`user ${user} login`)
   * })
   *
   * @example <caption>Event:logout </caption>
   * // Logout Event will emit when bot detected log out.
   *
   * bot.on('logout', (user) => {
   *   console.log(`user ${user} logout`)
   * })
   *
   * @example <caption>Event:message </caption>
   * // Message Event will emit when there's a new message.
   *
   * wechaty.on('message', (message) => {
   *   console.log(`message ${message} received`)
   * })
   *
   * @example <caption>Event:friendship </caption>
   * // Friendship Event will emit when got a new friend request, or friendship is confirmed.
   *
   * bot.on('friendship', (friendship) => {
   *   if(friendship.type() === Friendship.Type.Receive){ // 1. receive new friendship request from new contact
   *     const contact = friendship.contact()
   *     let result = await friendship.accept()
   *       if(result){
   *         console.log(`Request from ${contact.name()} is accept succesfully!`)
   *       } else{
   *         console.log(`Request from ${contact.name()} failed to accept!`)
   *       }
   *  } else if (friendship.type() === Friendship.Type.Confirm) { // 2. confirm friendship
   *       console.log(`new friendship confirmed with ${contact.name()}`)
   *    }
   *  })
   *
   * @example <caption>Event:room-join </caption>
   * // room-join Event will emit when someone join the room.
   *
   * bot.on('room-join', (room, inviteeList, inviter) => {
   *   const nameList = inviteeList.map(c => c.name()).join(',')
   *   console.log(`Room ${room.topic()} got new member ${nameList}, invited by ${inviter}`)
   * })
   *
   * @example <caption>Event:room-leave </caption>
   * // room-leave Event will emit when someone leave the room.
   *
   * bot.on('room-leave', (room, leaverList) => {
   *   const nameList = leaverList.map(c => c.name()).join(',')
   *   console.log(`Room ${room.topic()} lost member ${nameList}`)
   * })
   *
   * @example <caption>Event:room-topic </caption>
   * // room-topic Event will emit when someone change the room's topic.
   *
   * bot.on('room-topic', (room, topic, oldTopic, changer) => {
   *   console.log(`Room ${room.topic()} topic changed from ${oldTopic} to ${topic} by ${changer.name()}`)
   * })
   *
   * @example <caption>Event:room-invite, RoomInvitation has been encapsulated as a RoomInvitation Class. </caption>
   * // room-invite Event will emit when there's an room invitation.
   *
   * bot.on('room-invite', async roomInvitation => {
   *   try {
   *     console.log(`received room-invite event.`)
   *     await roomInvitation.accept()
   *   } catch (e) {
   *     console.error(e)
   *   }
   * }
   *
   * @example <caption>Event:error </caption>
   * // error Event will emit when there's an error occurred.
   *
   * bot.on('error', (error) => {
   *   console.error(error)
   * })
   */
  public on (event: WechatyEventName, listener: string | ((...args: any[]) => any)): this {
    log.verbose('Wechaty', 'on(%s, %s) registered',
      event,
      typeof listener === 'string'
        ? listener
        : typeof listener,
    )

    // DEPRECATED for 'friend' event
    if (event as any === 'friend') {
      log.warn('Wechaty', `on('friend', contact, friendRequest) is DEPRECATED. use on('friendship', friendship) instead`)
      if (typeof listener === 'function') {
        const oldListener = listener
        listener = (...args: any[]) => {
          log.warn('Wechaty', `on('friend', contact, friendRequest) is DEPRECATED. use on('friendship', friendship) instead`)
          oldListener.apply(this, args)
        }
      }
    }

    if (typeof listener === 'function') {
      this.addListenerFunction(event, listener)
    } else {
      this.addListenerModuleFile(event, listener)
    }
    return this
  }

  private addListenerModuleFile (event: WechatyEventName, modulePath: string): void {
    const absoluteFilename = callerResolve(modulePath, __filename)
    log.verbose('Wechaty', 'addListenerModuleFile() hotImport(%s)', absoluteFilename)

    hotImport(absoluteFilename)
      .then((func: AnyFunction) => super.on(event, (...args: any[]) => {
        try {
          func.apply(this, args)
        } catch (e) {
          log.error('Wechaty', 'addListenerModuleFile(%s, %s) listener exception: %s',
            event, modulePath, e,
          )
          this.emit('error', e)
        }
      }))
      .catch(e => {
        log.error('Wechaty', 'addListenerModuleFile(%s, %s) hotImport() exception: %s',
          event, modulePath, e,
        )
        this.emit('error', e)
      })

    if (isProduction()) {
      log.verbose('Wechaty', 'addListenerModuleFile() disable watch for hotImport because NODE_ENV is production.')
      hotImport(absoluteFilename, false)
        .catch(e => log.error('Wechaty', 'addListenerModuleFile() hotImport() rejection: %s', e))
    }
  }

  private addListenerFunction (event: WechatyEventName, listener: AnyFunction): void {
    log.verbose('Wechaty', 'addListenerFunction(%s)', event)

    super.on(event, (...args: any[]) => {
      try {
        listener.apply(this, args)
      } catch (e) {
        log.error('Wechaty', 'addListenerFunction(%s) listener exception: %s', event, e)
        this.emit('error', e)
      }
    })
  }

  private async initPuppet (): Promise<void> {
    log.verbose('Wechaty', 'initPuppet() %s', this.options.puppet || '')

    let inited = false
    try {
      inited = !!this.puppet
    } catch (e) {
      inited = false
    }

    if (inited) {
      log.verbose('Wechaty', 'initPuppet(%s) had already been inited, no need to init twice', this.options.puppet)
      return
    }

    if (!this.memory) {
      throw new Error('no memory')
    }

    const puppet       = this.options.puppet || config.systemPuppetName()
    const puppetMemory = this.memory.multiplex(PUPPET_MEMORY_NAME)

    const puppetInstance = await PuppetManager.resolve({
      puppet,
      puppetOptions : this.options.puppetOptions,
      // wechaty       : this,
    })

    /**
     * Plug the Memory Card to Puppet
     */
    puppetInstance.setMemory(puppetMemory)

    this.initPuppetEventBridge(puppetInstance)
    this.initPuppetAccessory(puppetInstance)
  }

  protected initPuppetEventBridge (puppet: Puppet) {
    log.verbose('Wechaty', 'initPuppetEventBridge(%s)', puppet)

    const eventNameList: PuppetEventName[] = Object.keys(PUPPET_EVENT_DICT) as PuppetEventName[]
    for (const eventName of eventNameList) {
      log.verbose('Wechaty', 'initPuppetEventBridge() puppet.on(%s) registered', eventName)

      switch (eventName) {
        case 'dong':
          puppet.on('dong', data => {
            this.emit('dong', data)
          })
          break

        case 'error':
          puppet.on('error', error => {
            this.emit('error', new Error(error))
          })
          break

        case 'watchdog':
          puppet.on('watchdog', data => {
            /**
             * Use `watchdog` event from Puppet to `heartbeat` Wechaty.
             */
            // TODO: use a throttle queue to prevent beat too fast.
            this.emit('heartbeat', data)
          })
          break

        case 'friendship':
          puppet.on('friendship', async friendshipId => {
            const friendship = this.Friendship.load(friendshipId)
            await friendship.ready()
            this.emit('friendship', friendship)
            friendship.contact().emit('friendship', friendship)
          })
          break

        case 'login':
          puppet.on('login', async contactId => {
            const contact = this.ContactSelf.load(contactId)
            await contact.ready()
            this.emit('login', contact)
          })
          break

        case 'logout':
          puppet.on('logout', async (contactId, reason) => {
            const contact = this.ContactSelf.load(contactId)
            await contact.ready()
            this.emit('logout', contact, reason)
          })
          break

        case 'message':
          puppet.on('message', async messageId => {
            const msg = this.Message.load(messageId)
            await msg.ready()
            this.emit('message', msg)

            const room = msg.room()
            if (room) {
              room.emit('message', msg)
            }
          })
          break

        case 'ready':
          puppet.on('ready', () => {
            log.silly('Wechaty', 'initPuppetEventBridge() puppet.on(ready)')

            this.emit('ready')
            this.readyState.on(true)
          })
          break

        case 'room-invite':
          puppet.on('room-invite', async roomInvitationId => {
            const roomInvitation = this.RoomInvitation.load(roomInvitationId)
            this.emit('room-invite', roomInvitation)
          })
          break

        case 'room-join':
          puppet.on('room-join', async (roomId, inviteeIdList, inviterId, timestamp) => {
            const room = this.Room.load(roomId)
            await room.sync()

            const inviteeList = inviteeIdList.map(id => this.Contact.load(id))
            await Promise.all(inviteeList.map(c => c.ready()))

            const inviter = this.Contact.load(inviterId)
            await inviter.ready()
            const date = new Date(timestamp)

            this.emit('room-join', room, inviteeList, inviter, date)
            room.emit('join', inviteeList, inviter, date)
          })
          break

        case 'room-leave':
          puppet.on('room-leave', async (roomId, leaverIdList, removerId, timestamp) => {
            const room = this.Room.load(roomId)

            /**
             * See: https://github.com/wechaty/wechaty/pull/1833
             */
            await room.sync()

            const leaverList = leaverIdList.map(id => this.Contact.load(id))
            await Promise.all(leaverList.map(c => c.ready()))

            const remover = this.Contact.load(removerId)
            await remover.ready()
            const date = new Date(timestamp)

            this.emit('room-leave', room, leaverList, remover, date)
            room.emit('leave', leaverList, remover, date)

            // issue #254
            if (leaverIdList.includes(this.puppet.selfId())) {
              await this.puppet.roomPayloadDirty(roomId)
              await this.puppet.roomMemberPayloadDirty(roomId)
            }

          })
          break

        case 'room-topic':
          puppet.on('room-topic', async (roomId, newTopic, oldTopic, changerId, timestamp) => {
            const room = this.Room.load(roomId)
            await room.sync()

            const changer = this.Contact.load(changerId)
            await changer.ready()
            const date = new Date(timestamp)

            this.emit('room-topic', room, newTopic, oldTopic, changer, date)
            room.emit('topic', newTopic, oldTopic, changer, date)
          })
          break

        case 'scan':
          puppet.on('scan', async (qrcode, status, data) => {
            this.emit('scan', qrcode, status, data)
          })
          break

        case 'reset':
          break

        default:
          throw new Error('eventName ' + eventName + ' unsupported!')

      }
    }
  }

  protected initPuppetAccessory (puppet: Puppet) {
    log.verbose('Wechaty', 'initAccessory(%s)', puppet)

    /**
     * 1. Set Wechaty
     */
    this.Contact.wechaty        = this
    this.ContactSelf.wechaty    = this
    this.Friendship.wechaty     = this
    this.Message.wechaty        = this
    this.Room.wechaty           = this
    this.RoomInvitation.wechaty = this
    this.Tag.wechaty            = this

    /**
     * 2. Set Puppet
     */
    this.Contact.puppet        = puppet
    this.ContactSelf.puppet    = puppet
    this.Friendship.puppet     = puppet
    this.Message.puppet        = puppet
    this.Room.puppet           = puppet
    this.RoomInvitation.puppet = puppet
    this.Tag.puppet            = puppet

    this.puppet = puppet
  }

  /**
   * Start the bot, return Promise.
   *
   * @returns {Promise<void>}
   * @description
   * When you start the bot, bot will begin to login, need you wechat scan qrcode to login
   * > Tips: All the bot operation needs to be triggered after start() is done
   * @example
   * await bot.start()
   * // do other stuff with bot here
   */
  public async start (): Promise<void> {
    log.info('Wechaty', '<%s>(%s) start() v%s is starting...',
      this.options.puppet || config.systemPuppetName(),
      this.options.name   || '',
      this.version(),
    )
    log.verbose('Wechaty', 'puppet: %s',  this.options.puppet)
    log.verbose('Wechaty', 'name: %s',    this.options.name)
    log.verbose('Wechaty', 'id: %s',      this.id)

    if (this.state.on()) {
      log.silly('Wechaty', 'start() on a starting/started instance')
      await this.state.ready('on')
      log.silly('Wechaty', 'start() state.ready() resolved')
      return
    }

    this.readyState.off(true)

    if (this.lifeTimer) {
      throw new Error('start() lifeTimer exist')
    }

    this.state.on('pending')

    try {
      if (!this.memory) {
        this.memory = new MemoryCard(this.options.name)
      }

      try {
        await this.memory.load()
      } catch (e) {
        log.silly('Wechaty', 'start() memory.load() had already loaded')
      }

      await this.initPuppet()
      await this.puppet.start()

      if (this.options.ioToken) {
        this.io = new Io({
          token   : this.options.ioToken,
          wechaty : this,
        })
        await this.io.start()
      }

    } catch (e) {
      console.error(e)
      log.error('Wechaty', 'start() exception: %s', e && e.message)
      Raven.captureException(e)
      this.emit('error', e)

      try {
        await this.stop()
      } catch (e) {
        log.error('Wechaty', 'start() stop() exception: %s', e && e.message)
        Raven.captureException(e)
        this.emit('error', e)
      }
      return
    }

    this.on('heartbeat', () => this.memoryCheck())

    this.lifeTimer = setInterval(() => {
      log.silly('Wechaty', 'start() setInterval() this timer is to keep Wechaty running...')
    }, 1000 * 60 * 60)

    this.state.on(true)
    this.emit('start')
  }

  /**
   * Stop the bot
   *
   * @returns {Promise<void>}
   * @example
   * await bot.stop()
   */
  public async stop (): Promise<void> {
    log.info('Wechaty', '<%s> stop() v%s is stoping ...',
      this.options.puppet || config.systemPuppetName(),
      this.version(),
    )

    if (this.state.off()) {
      log.silly('Wechaty', 'stop() on an stopping/stopped instance')
      await this.state.ready('off')
      log.silly('Wechaty', 'stop() state.ready(off) resolved')
      return
    }

    this.readyState.off(true)

    this.state.off('pending')

    if (this.lifeTimer) {
      clearInterval(this.lifeTimer)
      this.lifeTimer = undefined
    }

    try {
      await this.puppet.stop()
    } catch (e) {
      log.warn('Wechaty', 'stop() puppet.stop() exception: %s', e.message)
    }

    try {
      if (this.io) {
        await this.io.stop()
        this.io = undefined
      }

    } catch (e) {
      log.error('Wechaty', 'stop() exception: %s', e.message)
      Raven.captureException(e)
      this.emit('error', e)
    }

    this.state.off(true)
    this.emit('stop')
  }

  public async ready (): Promise<void> {
    log.verbose('Wechaty', 'ready()')
    return this.readyState.ready('on').then(() => {
      return log.silly('Wechaty', 'ready() this.readyState.ready(on) resolved')
    })
  }

  /**
   * Logout the bot
   *
   * @returns {Promise<void>}
   * @example
   * await bot.logout()
   */
  public async logout (): Promise<void>  {
    log.verbose('Wechaty', 'logout()')

    try {
      await this.puppet.logout()
    } catch (e) {
      log.error('Wechaty', 'logout() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
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
  public logonoff (): boolean {
    try {
      return this.puppet.logonoff()
    } catch (e) {
      // https://github.com/wechaty/wechaty/issues/1878
      return false
    }
  }

  /**
   * @description
   * Should use {@link Wechaty#userSelf} instead
   * @deprecated Use `userSelf()` instead
   * @ignore
   */
  public self (): Contact {
    log.warn('Wechaty', 'self() DEPRECATED. use userSelf() instead.')
    return this.userSelf()
  }

  /**
   * Get current user
   *
   * @returns {ContactSelf}
   * @example
   * const contact = bot.userSelf()
   * console.log(`Bot is ${contact.name()}`)
   */
  public userSelf (): ContactSelf {
    const userId = this.puppet.selfId()
    const user = this.ContactSelf.load(userId)
    return user
  }

  public async say (text:     string)      : Promise<void>
  public async say (contact:  Contact)     : Promise<void>
  public async say (file:     FileBox)     : Promise<void>
  public async say (mini:     MiniProgram) : Promise<void>
  public async say (url:      UrlLink)     : Promise<void>

  public async say (...args: never[]): Promise<never>

  /**
   * Send message to userSelf, in other words, bot send message to itself.
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @param {(string | Contact | FileBox | UrlLink | MiniProgram)} something
   * send text, Contact, or file to bot. </br>
   * You can use {@link https://www.npmjs.com/package/file-box|FileBox} to send file
   *
   * @returns {Promise<void>}
   *
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * // after logged in
   *
   * // 1. send text to bot itself
   * await bot.say('hello!')
   *
   * // 2. send Contact to bot itself
   * const contact = await bot.Contact.find()
   * await bot.say(contact)
   *
   * // 3. send Image to bot itself from remote url
   * import { FileBox }  from 'file-box'
   * const fileBox = FileBox.fromUrl('https://chatie.io/wechaty/images/bot-qr-code.png')
   * await bot.say(fileBox)
   *
   * // 4. send Image to bot itself from local file
   * import { FileBox }  from 'file-box'
   * const fileBox = FileBox.fromFile('/tmp/text.jpg')
   * await bot.say(fileBox)
   *
   * // 5. send Link to bot itself
   * const linkPayload = new UrlLink ({
   *   description : 'WeChat Bot SDK for Individual Account, Powered by TypeScript, Docker, and Love',
   *   thumbnailUrl: 'https://avatars0.githubusercontent.com/u/25162437?s=200&v=4',
   *   title       : 'Welcome to Wechaty',
   *   url         : 'https://github.com/wechaty/wechaty',
   * })
   * await bot.say(linkPayload)
   *
   * // 6. send MiniProgram to bot itself
   * const miniPayload = new MiniProgram ({
   *   username           : 'gh_xxxxxxx',     //get from mp.weixin.qq.com
   *   appid              : '',               //optional, get from mp.weixin.qq.com
   *   title              : '',               //optional
   *   pagepath           : '',               //optional
   *   description        : '',               //optional
   *   thumbnailurl       : '',               //optional
   * })
   * await bot.say(miniPayload)
   */

  public async say (
    something:  string
              | Contact
              | FileBox
              | MiniProgram
              | UrlLink
  ): Promise<void> {
    log.verbose('Wechaty', 'say(%s)', something)
    // huan: to make TypeScript happy
    await this.userSelf().say(something as any)
  }

  /**
   * @ignore
   */
  public static version (gitHash = false): string {
    if (gitHash && GIT_COMMIT_HASH) {
      return `#git[${GIT_COMMIT_HASH}]`
    }
    return VERSION
  }

  /**
   * @ignore
   * Return version of Wechaty
   *
   * @param {boolean} [forceNpm=false]  - If set to true, will only return the version in package.json. </br>
   *                                      Otherwise will return git commit hash if .git exists.
   * @returns {string}                  - the version number
   * @example
   * console.log(Wechaty.instance().version())       // return '#git[af39df]'
   * console.log(Wechaty.instance().version(true))   // return '0.7.9'
   */
  public version (forceNpm = false): string {
    return Wechaty.version(forceNpm)
  }

  /**
   * @ignore
   */
  public static async sleep (millisecond: number): Promise<void> {
    await new Promise(resolve => {
      setTimeout(resolve, millisecond)
    })
  }

  /**
   * @ignore
   */
  public async sleep (millisecond: number): Promise<void> {
    return Wechaty.sleep(millisecond)
  }

  /**
   * @private
   */
  public ding (data?: string): void {
    log.silly('Wechaty', 'ding(%s)', data || '')

    try {
      this.puppet.ding(data)
    } catch (e) {
      log.error('Wechaty', 'ding() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * @ignore
   */
  private memoryCheck (minMegabyte = 4): void {
    const freeMegabyte = Math.floor(os.freemem() / 1024 / 1024)
    log.silly('Wechaty', 'memoryCheck() free: %d MB, require: %d MB',
      freeMegabyte, minMegabyte,
    )

    if (freeMegabyte < minMegabyte) {
      const e = new Error(`memory not enough: free ${freeMegabyte} < require ${minMegabyte} MB`)
      log.warn('Wechaty', 'memoryCheck() %s', e.message)
      this.emit('error', e)
    }
  }

  /**
   * @ignore
   */
  public async reset (reason?: string): Promise<void> {
    log.verbose('Wechaty', 'reset() because %s', reason || 'no reason')
    await this.puppet.stop()
    await this.puppet.start()
  }

  public unref (): void {
    log.verbose('Wechaty', 'unref()')

    if (this.lifeTimer) {
      this.lifeTimer.unref()
    }

    this.puppet.unref()
  }

}
