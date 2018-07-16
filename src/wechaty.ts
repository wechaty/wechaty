/**
 *   Wechaty - https://github.com/chatie/wechaty
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
import semver  from 'semver'

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
  StateSwitch,
}                   from 'state-switch'
import {
  MemoryCard,
}                   from 'memory-card'

import {
  Puppet,
  PuppetOptions,

  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,
  PuppetEventName,
}                       from 'wechaty-puppet'

import {
  Accessory,
}                       from './accessory'
import {
  VERSION,
  config,
  log,
  Raven,
  Sayable,
}                       from './config'

import {
  Io,
}                       from './io'
import {
  PuppetName,
  puppetResolver,
}                       from './puppet-config'

import {
  Contact,
  ContactSelf,
  Friendship,
  Message,
  Room,
}                       from './user/'

export const WECHATY_EVENT_DICT = {
  ...CHAT_EVENT_DICT,
  dong      : 'tbw',
  error     : 'tbw',
  heartbeat : 'tbw',
  start     : 'tbw',
  stop      : 'tbw',
}

export type WechatyEventName  = keyof typeof WECHATY_EVENT_DICT

export interface WechatyOptions {
  profile?       : null | string,           // Wechaty Name
  puppet?        : PuppetName | Puppet,     // Puppet name or instance
  puppetOptions? : PuppetOptions,           // Puppet TOKEN
  ioToken?       : string,                  // Io TOKEN
}

/**
 * Main bot class.
 *
 * A `Bot` is a wechat client depends on which puppet you use.
 * It may equals
 * - web-wechat, when you use: [puppet-puppeteer](https://github.com/chatie/wechaty-puppet-puppeteer)/[puppet-wechat4u](https://github.com/chatie/wechaty-puppet-wechat4u)
 * - ipad-wechat, when you use: [puppet-padchat](https://github.com/lijiarui/wechaty-puppet-padchat)
 * - ios-wechat, when you use: puppet-ioscat
 *
 * See more:
 * - [What is a Puppet in Wechaty](https://github.com/Chatie/wechaty-getting-started/wiki/FAQ-EN#31-what-is-a-puppet-in-wechaty)
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

  public readonly state  : StateSwitch

  /**
   * singleton globalInstance
   * @private
   */
  private static globalInstance: Wechaty

  private readonly memory : MemoryCard

  private lifeTimer? : NodeJS.Timer
  private io?        : Io

  /**
   * the cuid
   * @private
   */
  public readonly id : string

  /**
   * @private
   */
  // tslint:disable-next-line:variable-name
  public readonly Contact       : typeof Contact

  /**
   * @private
   */
  // tslint:disable-next-line:variable-name
  public readonly ContactSelf   : typeof ContactSelf

  /**
   * @private
   */
  // tslint:disable-next-line:variable-name
  public readonly Friendship    : typeof Friendship

  /**
   * @private
   */
  // tslint:disable-next-line:variable-name
  public readonly Message       : typeof Message

  /**
   * @private
   */
  // tslint:disable-next-line:variable-name
  public readonly Room          : typeof Room

  /**
   * Get the global instance of Wechaty
   *
   * @param {WechatyOptions} [options={}]
   *
   * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
   * const { Wechaty } = require('wechaty')
   *
   * Wechaty.instance() // Global instance
   * .on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
   * .on('login',       user => console.log(`User ${user} logined`))
   * .on('message',  message => console.log(`Message: ${message}`))
   * .start()
   */
  public static instance(
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
   * The term [Puppet](https://github.com/Chatie/wechaty/wiki/Puppet) in Wechaty is an Abstract Class for implementing protocol plugins.
   * The plugins are the component that helps Wechaty to control the Wechat(that's the reason we call it puppet).
   * The plugins are named XXXPuppet, for example:
   * - [PuppetPuppeteer](https://github.com/Chatie/wechaty-puppet-puppeteer):
   * - [PuppetPadchat](https://github.com/lijiarui/wechaty-puppet-padchat)
   *
   * @typedef    PuppetName
   * @property   {string}  wechat4u
   * The default puppet, using the [wechat4u](https://github.com/nodeWechat/wechat4u) to control the [WeChat Web API](https://wx.qq.com/) via a chrome browser.
   * @property   {string}  padchat
   * - Using the WebSocket protocol to connect with a Protocol Server for controlling the iPad Wechat program.
   * @property   {string}  puppeteer
   * - Using the [google puppeteer](https://github.com/GoogleChrome/puppeteer) to control the [WeChat Web API](https://wx.qq.com/) via a chrome browser.
   * @property   {string}  mock
   * - Using the mock data to mock wechat operation, just for test.
   */

  /**
   * The option parameter to create a wechaty instance
   *
   * @typedef    WechatyOptions
   * @property   {string}                 profile            -Wechaty Name. </br>
   *          When you set this: </br>
   *          `new Wechaty({profile: 'wechatyName'}) ` </br>
   *          it will generate a file called `wechatyName.memory-card.json`. </br>
   *          This file stores the bot's login information. </br>
   *          If the file is valid, the bot can auto login so you don't need to scan the qrcode to login again. </br>
   *          Also, you can set the environment variable for `WECHATY_PROFILE` to set this value when you start. </br>
   *          eg:  `WECHATY_PROFILE="your-cute-bot-name" node bot.js`
   * @property   {PuppetName | Puppet}    puppet             -Puppet name or instance
   * @property   {Partial<PuppetOptions>} puppetOptions      -Puppet TOKEN
   * @property   {string}                 ioToken            -Io TOKEN
   */

  /**
   * Creates an instance of Wechaty.
   * @param {WechatyOptions} [options={}]
   *
   */
  constructor(
    private options: WechatyOptions = {},
  ) {
    super()
    log.verbose('Wechaty', 'contructor()')

    options.profile = options.profile === null
                      ? null
                      : (options.profile || config.default.DEFAULT_PROFILE)

    this.memory = new MemoryCard(options.profile || undefined)
    this.state  = new StateSwitch('Wechaty', log)
    this.id     = cuid()

    /**
     * @ignore
     * Clone Classes for this bot and attach the `puppet` to the Class
     *
     *   https://stackoverflow.com/questions/36886082/abstract-constructor-type-in-typescript
     *   https://github.com/Microsoft/TypeScript/issues/5843#issuecomment-290972055
     *   https://github.com/Microsoft/TypeScript/issues/19197
     */
    // TODO: make Message & Room constructor private???
    this.Contact     = cloneClass(Contact)
    this.ContactSelf = cloneClass(ContactSelf)
    this.Friendship  = cloneClass(Friendship)
    this.Message     = cloneClass(Message)
    this.Room        = cloneClass(Room)
  }

  /**
   * @private
   */
  public toString() {
    if (!this.options) {
      return this.constructor.name
    }

    return [
      'Wechaty#',
      this.id,
      `<${this.options && this.options.puppet || ''}>`,
      `(${this.memory  && this.memory.name    || ''})`,
    ].join('')
  }

  public emit(event: 'dong'       , data?: string)                                                    : boolean
  public emit(event: 'error'      , error: Error)                                                     : boolean
  public emit(event: 'friendship' , friendship: Friendship)                                           : boolean
  public emit(event: 'heartbeat'  , data: any)                                                        : boolean
  public emit(event: 'logout'     , user: ContactSelf)                                                : boolean
  public emit(event: 'login'      , user: ContactSelf)                                                : boolean
  public emit(event: 'message'    , message: Message)                                                 : boolean
  public emit(event: 'room-join'  , room: Room, inviteeList : Contact[], inviter  : Contact)          : boolean
  public emit(event: 'room-leave' , room: Room, leaverList  : Contact[], remover? : Contact)          : boolean
  public emit(event: 'room-topic' , room: Room, newTopic: string, oldTopic: string, changer: Contact) : boolean
  public emit(event: 'scan'       , qrcode: string, status: number, data?: string)                    : boolean
  public emit(event: 'start')                                                                         : boolean
  public emit(event: 'stop')                                                                          : boolean

  // guard for the above event: make sure it includes all the possible values
  public emit(event: never, listener: never): never

  public emit(
    event:   WechatyEventName,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }

  public on(event: 'dong'       , listener: string | ((this: Wechaty, data?: string) => void))                                                     : this
  public on(event: 'error'      , listener: string | ((this: Wechaty, error: Error) => void))                                                     : this
  public on(event: 'friendship' , listener: string | ((this: Wechaty, friendship: Friendship) => void))                                           : this
  public on(event: 'heartbeat'  , listener: string | ((this: Wechaty, data: any) => void))                                                        : this
  public on(event: 'logout'     , listener: string | ((this: Wechaty, user: ContactSelf) => void))                                                : this
  public on(event: 'login'      , listener: string | ((this: Wechaty, user: ContactSelf) => void))                                                : this
  public on(event: 'message'    , listener: string | ((this: Wechaty, message: Message) => void))                                                 : this
  public on(event: 'room-join'  , listener: string | ((this: Wechaty, room: Room, inviteeList: Contact[],  inviter: Contact) => void))            : this
  public on(event: 'room-leave' , listener: string | ((this: Wechaty, room: Room, leaverList: Contact[], remover?: Contact) => void))             : this
  public on(event: 'room-topic' , listener: string | ((this: Wechaty, room: Room, newTopic: string, oldTopic: string, changer: Contact) => void)) : this
  public on(event: 'scan'       , listener: string | ((this: Wechaty, qrcode: string, status: number, data?: string) => void))                    : this
  public on(event: 'start'      , listener: string | ((this: Wechaty) => void))                                                                   : this
  public on(event: 'stop'       , listener: string | ((this: Wechaty) => void))                                                                   : this

  // guard for the above event: make sure it includes all the possible values
  public on(event: never, listener: never): never

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
   * @property   {string}  scan       - A scan event will be emitted when the bot needs to show you a QR Code for scanning. </br>
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
   * @property   {Function} room-join       -(this: Wechaty, room: Room, inviteeList: Contact[],  inviter: Contact) => void
   * @property   {Function} room-topic      -(this: Wechaty, room: Room, newTopic: string, oldTopic: string, changer: Contact) => void
   * @property   {Function} room-leave      -(this: Wechaty, room: Room, leaverList: Contact[]) => void
   */

  /**
   * @listens Wechaty
   * @param   {WechatyEventName}      event      - Emit WechatyEvent
   * @param   {WechatyEventFunction}  listener   - Depends on the WechatyEvent
   *
   * @return  {Wechaty}                          - this for chaining,
   * see advanced {@link https://github.com/Chatie/wechaty-getting-started/wiki/FAQ-EN#36-why-wechatyonevent-listener-return-wechaty|chaining usage}
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
   * bot.on('scan', (url: string, code: number) => {
   *   console.log(`[${code}] Scan ${url} to login.` )
   * })
   *
   * @example <caption>Event:login </caption>
   * // Login Event will emit when bot login full successful.
   *
   * bot.on('login', (user: ContactSelf) => {
   *   console.log(`user ${user} login`)
   * })
   *
   * @example <caption>Event:logout </caption>
   * // Logout Event will emit when bot detected log out.
   *
   * bot.on('logout', (user: ContactSelf) => {
   *   console.log(`user ${user} logout`)
   * })
   *
   * @example <caption>Event:message </caption>
   * // Message Event will emit when there's a new message.
   *
   * wechaty.on('message', (message: Message) => {
   *   console.log(`message ${message} received`)
   * })
   *
   * @example <caption>Event:friendship </caption>
   * // Friendship Event will emit when got a new friend request, or friendship is confirmed.
   *
   * bot.on('friendship', (friendship: Friendship) => {
   *   if(friendship.type() === Friendship.Type.RECEIVE){ // 1. receive new friendship request from new contact
   *     const contact = friendship.contact()
   *     let result = await friendship.accept()
   *       if(result){
   *         console.log(`Request from ${contact.name()} is accept succesfully!`)
   *       } else{
   *         console.log(`Request from ${contact.name()} failed to accept!`)
   *       }
   * 	  } else if (friendship.type() === Friendship.Type.CONFIRM) { // 2. confirm friendship
   *       console.log(`new friendship confirmed with ${contact.name()}`)
   *    }
   *  })
   *
   * @example <caption>Event:room-join </caption>
   * // room-join Event will emit when someone join the room.
   *
   * bot.on('room-join', (room: Room, inviteeList: Contact[], inviter: Contact) => {
   *   const nameList = inviteeList.map(c => c.name()).join(',')
   *   console.log(`Room ${room.topic()} got new member ${nameList}, invited by ${inviter}`)
   * })
   *
   * @example <caption>Event:room-leave </caption>
   * // room-leave Event will emit when someone leave the room.
   *
   * bot.on('room-leave', (room: Room, leaverList: Contact[]) => {
   *   const nameList = leaverList.map(c => c.name()).join(',')
   *   console.log(`Room ${room.topic()} lost member ${nameList}`)
   * })
   *
   * @example <caption>Event:room-topic </caption>
   * // room-topic Event will emit when someone change the room's topic.
   *
   * bot.on('room-topic', (room: Room, topic: string, oldTopic: string, changer: Contact) => {
   *   console.log(`Room ${room.topic()} topic changed from ${oldTopic} to ${topic} by ${changer.name()}`)
   * })
   *
   * @example <caption>Event:error </caption>
   * // error Event will emit when there's an error occurred.
   *
   * bot.on('error', (error) => {
   *   console.error(error)
   * })
   */
  public on(event: WechatyEventName, listener: string | ((...args: any[]) => any)): this {
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

  private addListenerModuleFile(event: WechatyEventName, modulePath: string): void {
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

  private addListenerFunction(event: WechatyEventName, listener: Function): void {
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

  private async initPuppet(): Promise<void> {
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

    const puppet = await this.initPuppetResolver(this.options.puppet)

    this.initPuppetVersionSatisfy(puppet)
    this.initPuppetEventBridge(puppet)

    this.initPuppetAccessory(puppet)
  }

  /**
   * @private
   */
  private initPuppetVersionSatisfy(puppet: Puppet): void {
    log.verbose('Wechaty', 'initPuppetVersionSatisfy(%s)', puppet)

    if (this.initPuppetSemverSatisfy(
      puppet.wechatyVersionRange(),
    )) {
      return
    }

    throw new Error(`The Puppet Plugin(${puppet.constructor.name}) `
      + `requires a version range(${puppet.wechatyVersionRange()}) `
      + `that is not satisfying the Wechaty version: ${this.version()}.`,
    )
  }

  /**
   * @private
   *
   * Init the Puppet
   */
  private async initPuppetResolver(puppet?: PuppetName | Puppet): Promise<Puppet> {
    log.verbose('Wechaty', 'initPuppetResolver(%s)', puppet)

    if (!puppet) {
      puppet = config.systemPuppetName()
      log.info('Wechaty', 'initPuppet() using puppet: %s', puppet)
    }

    let puppetName = puppet as string
    if (typeof puppetName !== 'string') {
      puppetName = puppet.toString()
    }
    const puppetMemory = this.memory.sub(puppetName)

    let puppetInstance: Puppet

    if (typeof puppet === 'string') {
      // tslint:disable-next-line:variable-name
      const MyPuppet = await puppetResolver(puppet)
      if (!MyPuppet) {
        throw new Error('no such puppet: ' + puppet)
      }

      /**
       * We will meet the following error:
       *
       *  [ts] Cannot use 'new' with an expression whose type lacks a call or construct signature.
       *
       * When we have different puppet with different `constructor()` args.
       * For example: PuppetA allow `constructor()` but PuppetB requires `constructor(options)`
       *
       * SOLUTION: we enforce all the PuppetImplenmentation to have `options` and should not allow default parameter.
       * Issue: https://github.com/Chatie/wechaty-puppet/issues/2
       */
      puppetInstance = new MyPuppet(this.options.puppetOptions)

    } else if (puppet instanceof Puppet) {
      puppetInstance = puppet

    } else {
      throw new Error('unsupported options.puppet: ' + puppet)
    }

    // give puppet the memory
    puppetInstance.setMemory(puppetMemory)

    log.info('Wechaty', 'initPuppet() inited puppet: %s', puppetInstance.toString())

    return puppetInstance
  }

  /**
   * @private
   *
   * Plugin Version Range Check
   */
  private initPuppetSemverSatisfy(versionRange: string) {
    log.verbose('Wechaty', 'initPuppetSemverSatisfy(%s)', versionRange)
    return semver.satisfies(
      this.version(true),
      versionRange,
    )
  }

  protected initPuppetEventBridge(puppet: Puppet) {
    const eventNameList: PuppetEventName[] = Object.keys(PUPPET_EVENT_DICT) as any
    for (const eventName of eventNameList) {
      log.verbose('Wechaty', 'initPuppetEventBridge() puppet.on(%s) registered', eventName)

      switch (eventName) {
        case 'dong':
          puppet.removeAllListeners('dong')
          puppet.on('dong', data => {
            this.emit('dong', data)
          })
          break

        case 'error':
          puppet.removeAllListeners('error')
          puppet.on('error', error => {
            this.emit('error', new Error(error))
          })
          break

        case 'watchdog':
          puppet.removeAllListeners('heartbeat')
          puppet.on('watchdog', data => {
            /**
             * Use `watchdog` event from Puppet to `heartbeat` Wechaty.
             */
            // TODO: use a throttle queue to prevent beat too fast.
            this.emit('heartbeat', data)
          })
          break

        case 'start':
        case 'stop':
          // do not emit 'start'/'stop' again for wechaty:
          // because both puppet & wechaty should have their own
          // `start`/`stop` event seprately
          break

        // case 'start':
        //   puppet.removeAllListeners('start')
        //   puppet.on('start', () => {
        //     this.emit('start')
        //   } )
        //   break

        // case 'stop':
        //   puppet.removeAllListeners('stop')
        //   puppet.on('stop', () => {
        //     this.emit('stop')
        //   } )
        //   break

        case 'friendship':
          puppet.removeAllListeners('friendship')
          puppet.on('friendship', async friendshipId => {
            const friendship = this.Friendship.load(friendshipId)
            await friendship.ready()
            this.emit('friendship', friendship)
            friendship.contact().emit('friendship', friendship)

            // support deprecated event name: friend.
            // Huan LI 201806
            this.emit('friend' as any, friendship as any)
          })
          break

        case 'login':
          puppet.removeAllListeners('login')
          puppet.on('login', async contactId => {
            const contact = this.ContactSelf.load(contactId)
            await contact.ready()
            this.emit('login', contact)
          })
          break

        case 'logout':
          puppet.removeAllListeners('logout')
          puppet.on('logout', async contactId => {
            const contact = this.ContactSelf.load(contactId)
            await contact.ready()
            this.emit('logout', contact)
          })
          break

        case 'message':
          puppet.removeAllListeners('message')
          puppet.on('message', async messageId => {
            const msg = this.Message.create(messageId)
            await msg.ready()
            this.emit('message', msg)
          })
          break

        case 'room-join':
          puppet.removeAllListeners('room-join')
          puppet.on('room-join', async (roomId, inviteeIdList, inviterId) => {
            const room = this.Room.load(roomId)
            await room.ready()

            const inviteeList = inviteeIdList.map(id => this.Contact.load(id))
            await Promise.all(inviteeList.map(c => c.ready()))

            const inviter = this.Contact.load(inviterId)
            await inviter.ready()

            this.emit('room-join', room, inviteeList, inviter)
            room.emit('join', inviteeList, inviter)
          })
          break

        case 'room-leave':
          puppet.removeAllListeners('room-leave')
          puppet.on('room-leave', async (roomId, leaverIdList, removerId) => {
            const room = this.Room.load(roomId)
            await room.ready()

            const leaverList = leaverIdList.map(id => this.Contact.load(id))
            await Promise.all(leaverList.map(c => c.ready()))

            let remover: undefined | Contact = undefined
            if (removerId) {
              remover = this.Contact.load(removerId)
              await remover.ready()
            }

            this.emit('room-leave', room, leaverList, remover)
            room.emit('leave', leaverList, remover)
          })
          break

        case 'room-topic':
          puppet.removeAllListeners('room-topic')
          puppet.on('room-topic', async (roomId, newTopic, oldTopic, changerId) => {
            const room = this.Room.load(roomId)
            await room.ready()

            const changer = this.Contact.load(changerId)
            await changer.ready()

            this.emit('room-topic', room, newTopic, oldTopic, changer)
            room.emit('topic', newTopic, oldTopic, changer)
          })
          break

        case 'scan':
          puppet.removeAllListeners('scan')
          puppet.on('scan', async (qrcode, status, data) => {
            this.emit('scan', qrcode, status, data)
          })
          break

        case 'watchdog':
        case 'reset':
          break

        default:
          throw new Error('eventName ' + eventName + ' unsupported!')

      }
    }
  }

  protected initPuppetAccessory(puppet: Puppet) {
    log.verbose('Wechaty', 'initAccessory(%s)', puppet)

    /**
     * 1. Set Wechaty
     */
    this.Contact.wechaty     = this
    this.ContactSelf.wechaty = this
    this.Friendship.wechaty  = this
    this.Message.wechaty     = this
    this.Room.wechaty        = this

    /**
     * 2. Set Puppet
     */
    this.Contact.puppet     = puppet
    this.ContactSelf.puppet = puppet
    this.Friendship.puppet  = puppet
    this.Message.puppet     = puppet
    this.Room.puppet        = puppet

    this.puppet               = puppet
  }

  /**
   * @desc
   * use {@link Wechaty#start} instead
   * @deprecated
   */
  public async init(): Promise<void> {
    log.warn('Wechaty', 'init() DEPRECATED. use start() instead.')
    return this.start()
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
  public async start(): Promise<void> {
    log.info('Wechaty', '<%s> start() v%s is starting...' ,
                        this.options.puppet || config.systemPuppetName(),
                        this.version(),
            )
    log.verbose('Wechaty', 'puppet: %s'   , this.options.puppet)
    log.verbose('Wechaty', 'profile: %s'  , this.options.profile)
    log.verbose('Wechaty', 'id: %s'       , this.id)

    if (this.state.on()) {
      log.silly('Wechaty', 'start() on a starting/started instance')
      await this.state.ready('on')
      log.silly('Wechaty', 'start() state.ready() resolved')
      return
    }

    if (this.lifeTimer) {
      throw new Error('start() lifeTimer exist')
    }

    this.state.on('pending')

    try {
      await this.memory.load()

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
      } finally {
        return
      }
    }

    this.on('heartbeat', () => this.memoryCheck())

    this.lifeTimer = setInterval(() => {
      log.silly('Wechaty', 'start() setInterval() this timer is to keep Wechaty running...')
    }, 1000 * 60 * 60)

    this.state.on(true)
    this.emit('start')

    return
  }

  /**
   * Stop the bot
   *
   * @returns {Promise<void>}
   * @example
   * await bot.stop()
   */
  public async stop(): Promise<void> {
    log.info('Wechaty', '<%s> stop() v%s is stoping ...' ,
                        this.options.puppet || config.systemPuppetName(),
                        this.version(),
            )

    if (this.state.off()) {
      log.silly('Wechaty', 'stop() on an stopping/stopped instance')
      await this.state.ready('off')
      log.silly('Wechaty', 'stop() state.ready(off) resolved')
      return
    }

    this.state.off('pending')
    await this.memory.save()

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

    /**
     * MUST use setImmediate at here(the end of this function),
     * because we need to run the micro task registered by the `emit` method
     */
    setImmediate(() => this.puppet.removeAllListeners())

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
    return this.puppet.logonoff()
  }

  /**
   * @description
   * Should use {@link Wechaty#userSelf} instead
   * @deprecated Use `userSelf()` instead
   */
  public self(): Contact {
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
  public userSelf(): ContactSelf {
    const userId = this.puppet.selfId()
    const user = this.ContactSelf.load(userId)
    return user
  }

  /**
   * Send message to userSelf, in other words, bot send message to itself.
   * > Tips:
   * - [wechat4u](https://github.com/chatie/wechaty-puppet-wechat4u) and [puppeteer](https://github.com/chatie/wechaty-puppet-puppeteer) not support `Wechaty.say(Contact)`
   * - [padchat](https://github.com/lijiarui/wechaty-puppet-padchat) support `Wechaty.say(Contact)`
   *
   * @param {(string | Contact | FileBox)} textOrContactOrFile
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
   * const contact = bot.Contact.load('contactId')
   * await bot.say(contact)
   *
   * // 3. send Image to bot itself from remote url
   * import { FileBox }  from 'file-box'
   * const fileBox = FileBox.fromUrl('https://chatie.io/wechaty/images/bot-qr-code.png')
   * await bot.say(fileBox)
   *
   * // 4. send Image to bot itself from local file
   * import { FileBox }  from 'file-box'
   * const fileBox = FileBox.fromLocal('/tmp/text.jpg')
   * await bot.say(fileBox)
   */
  public async say(textOrContactOrFile: string | Contact | FileBox): Promise<void> {
    log.verbose('Wechaty', 'say(%s)', textOrContactOrFile)

    // Make Typescript Happy:
    if (typeof textOrContactOrFile === 'string') {
      await this.userSelf().say(textOrContactOrFile)
    } else if (textOrContactOrFile instanceof Contact) {
      await this.userSelf().say(textOrContactOrFile)
    } else if (textOrContactOrFile instanceof FileBox) {
      await this.userSelf().say(textOrContactOrFile)
    } else {
      throw new Error('unsupported')
    }
  }

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
  * @private
  * Return version of Wechaty
  *
  * @param {boolean} [forceNpm=false]  - If set to true, will only return the version in package.json. </br>
  *                                      Otherwise will return git commit hash if .git exists.
  * @returns {string}                  - the version number
  * @example
  * console.log(Wechaty.instance().version())       // return '#git[af39df]'
  * console.log(Wechaty.instance().version(true))   // return '0.7.9'
  */
  public version(forceNpm = false): string {
    return Wechaty.version(forceNpm)
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
  public ding(data?: string): void {
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
    log.verbose('Wechaty', 'reset() because %s', reason || 'no reason')
    await this.puppet.stop()
    await this.puppet.start()
    return
  }

  public unref(): void {
    log.verbose('Wechaty', 'unref()')

    if (this.lifeTimer) {
      this.lifeTimer.unref()
    }

    this.puppet.unref()
  }
}

export default Wechaty
