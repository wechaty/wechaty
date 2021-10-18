/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
import uuid             from 'uuid'
import os               from 'os'

import {
  FileBox,
  log,
  MemoryCard,
  PayloadType,
  PUPPET_EVENT_DICT,
  PuppetEventName,
  PuppetOptions,
  StateSwitch,
  PuppetInterface,
}                       from 'wechaty-puppet'
import {
  instanceToClass,
}                       from 'clone-class'

import { captureException } from './raven.js'

import {
  config,
  VERSION,
  GIT_COMMIT_HASH,
}                       from './config.js'

import type {
  Sayable,
  SayableMessage,
}                       from './types.js'

import {
  Io,
}                       from './io.js'
import type {
  PuppetModuleName,
}                       from './puppet-config.js'
import {
  PuppetManager,
}                       from './puppet-manager.js'

import {
  Contact,
  ContactSelf,
  Friendship,
  Image,
  Message,
  MiniProgram,
  Room,
  RoomInvitation,
  Tag,
  UrlLink,
  Location,

  wechatifyUserClass,
}                       from './user/mod.js'

import { timestampToDate } from './helper-functions/pure/timestamp-to-date.js'

import {
  WechatyEventEmitter,
  WechatyEventName,
}                             from './events/wechaty-events.js'

import {
  WechatyPlugin,
  WechatyPluginUninstaller,
  isWechatyPluginUninstaller,
}                             from './plugin.js'

export interface WechatyOptions {
  memory?        : MemoryCard,
  name?          : string,                              // Wechaty Name

  puppet?        : PuppetModuleName | PuppetInterface,  // Puppet name or instance
  puppetOptions? : PuppetOptions,                       // Puppet TOKEN
  ioToken?       : string,                              // Io TOKEN
}

const PUPPET_MEMORY_NAME = 'puppet'

/**
 * Main bot class.
 *
 * A `Bot` is a WeChat client depends on which puppet you use.
 * It may equals
 * - web-WeChat, when you use: [puppet-puppeteer](https://github.com/wechaty/wechaty-puppet-puppeteer)/[puppet-wechat4u](https://github.com/wechaty/wechaty-puppet-wechat4u)
 * - ipad-WeChat, when you use: [puppet-padchat](https://github.com/wechaty/wechaty-puppet-padchat)
 * - ios-WeChat, when you use: puppet-ioscat
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
 * bot.on('scan',    (qrCode, status) => console.log('https://wechaty.js.org/qrcode/' + encodeURIComponent(qrcode)))
 * bot.on('login',   user => console.log(`User ${user} logged in`))
 * bot.on('message', message => console.log(`Message: ${message}`))
 * bot.start()
 */
class Wechaty extends WechatyEventEmitter implements Sayable {

  static   readonly VERSION = VERSION
  static   readonly log     = log

  readonly log              = log
  readonly state   : StateSwitch
  readonly wechaty : Wechaty

  private  readonly readyState : StateSwitch

  /**
   * singleton globalInstance
   * @ignore
   */
  private static globalInstance?: Wechaty

  private static globalPluginList: WechatyPlugin[] = []

  private pluginUninstallerList: WechatyPluginUninstaller[]

  private memory?: MemoryCard

  private io?        : Io

  protected readonly cleanCallbackList: Function[] = []

  #puppet?: PuppetInterface
  get puppet (): PuppetInterface {
    if (!this.#puppet) {
      throw new Error('no puppet')
    }
    return this.#puppet
  }

  /**
   * the cuid
   * @ignore
   */
  readonly id : string

  #wechatifiedContact?        : typeof Contact
  #wechatifiedContactSelf?    : typeof ContactSelf
  #wechatifiedFriendship?     : typeof Friendship
  #wechatifiedImage?          : typeof Image
  #wechatifiedMessage?        : typeof Message
  #wechatifiedMiniProgram?    : typeof MiniProgram
  #wechatifiedRoom?           : typeof Room
  #wechatifiedRoomInvitation? : typeof RoomInvitation
  #wechatifiedTag?            : typeof Tag
  #wechatifiedUrlLink?        : typeof UrlLink
  #wechatifiedLocation?       : typeof Location

  get Contact ()        : typeof Contact         { return guardWechatify(this.#wechatifiedContact)        }
  get ContactSelf ()    : typeof ContactSelf     { return guardWechatify(this.#wechatifiedContactSelf)    }
  get Friendship ()     : typeof Friendship      { return guardWechatify(this.#wechatifiedFriendship)     }
  get Image ()          : typeof Image           { return guardWechatify(this.#wechatifiedImage)          }
  get Message ()        : typeof Message         { return guardWechatify(this.#wechatifiedMessage)        }
  get MiniProgram ()    : typeof MiniProgram     { return guardWechatify(this.#wechatifiedMiniProgram)    }
  get Room ()           : typeof Room            { return guardWechatify(this.#wechatifiedRoom)           }
  get RoomInvitation () : typeof RoomInvitation  { return guardWechatify(this.#wechatifiedRoomInvitation) }
  get Tag ()            : typeof Tag             { return guardWechatify(this.#wechatifiedTag)            }
  get UrlLink ()        : typeof UrlLink         { return guardWechatify(this.#wechatifiedUrlLink)        }
  get Location ()       : typeof Location        { return guardWechatify(this.#wechatifiedLocation)       }

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
   * .on('login',       user => console.log(`User ${user} logged in`))
   * .on('message',  message => console.log(`Message: ${message}`))
   * .start()
   */
  static instance (
    options?: WechatyOptions,
  ) {
    if (options && this.globalInstance) {
      throw new Error('instance can be only initialized once by options!')
    }
    if (!this.globalInstance) {
      this.globalInstance = new Wechaty(options)
    }
    return this.globalInstance
  }

  /**
   * @param   {WechatyPlugin[]} plugins      - The plugins you want to use
   *
   * @return  {Wechaty}                      - this for chaining,
   *
   * @desc
   * For wechaty ecosystem, allow user to define a 3rd party plugin for the all wechaty instances
   *
   * @example
   * // Report all chat message to my server.
   *
   * function WechatyReportPlugin(options: { url: string }) {
   *   return function (this: Wechaty) {
   *     this.on('message', message => http.post(options.url, { data: message }))
   *   }
   * }
   *
   * bot.use(WechatyReportPlugin({ url: 'http://somewhere.to.report.your.data.com' })
   */
  static use (
    ...plugins:  (WechatyPlugin | WechatyPlugin[])[]
  ) {
    const pluginList = plugins.flat()
    this.globalPluginList = this.globalPluginList.concat(pluginList)
  }

  /**
   * The term [Puppet](https://github.com/wechaty/wechaty/wiki/Puppet) in Wechaty is an Abstract Class for implementing protocol plugins.
   * The plugins are the component that helps Wechaty to control the WeChat(that's the reason we call it puppet).
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
   * - Using the WebSocket protocol to connect with a Protocol Server for controlling the iPad WeChat program.
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
   *          This file stores the login information for bot. </br>
   *          If the file is valid, the bot can auto login so you don't need to scan the qrCode to login again. </br>
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
    log.verbose('Wechaty', 'constructor()')

    this.memory = this.options.memory

    this.id                = uuid.v4()
    this.cleanCallbackList = []

    this.state      = new StateSwitch('Wechaty', { log })
    this.readyState = new StateSwitch('WechatyReady', { log })

    this.wechaty = this

    /**
     * Huan(202008):
     *
     * Set max listeners to 1K, so that we can add lots of listeners without the warning message.
     * The listeners might be one of the following functionilities:
     *  1. Plugins
     *  2. Redux Observables
     *  3. etc...
     */
    super.setMaxListeners(1024)

    this.pluginUninstallerList = []
    this.installGlobalPlugin()
  }

  /**
   * @ignore
   */
  override toString () {
    if (Object.keys(this.options).length <= 0) {
      return this.constructor.name
    }

    return [
      'Wechaty#',
      this.id,
      `<${(this.options.puppet) || ''}>`,
      `(${(this.memory && this.memory.name) || ''})`,
    ].join('')
  }

  /**
   * Wechaty bot name set by `options.name`
   * default: `wechaty`
   */
  name () {
    return this.options.name || 'wechaty'
  }

  override on (event: WechatyEventName, listener: (...args: any[]) => any): this {
    log.verbose('Wechaty', 'on(%s, listener) registering... listenerCount: %s',
      event,
      this.listenerCount(event),
    )

    return super.on(event, listener)
  }

  /**
   * @param   {WechatyPlugin[]} plugins      - The plugins you want to use
   *
   * @return  {Wechaty}                      - this for chaining,
   *
   * @desc
   * For wechaty ecosystem, allow user to define a 3rd party plugin for the current wechaty instance.
   *
   * @example
   * // The same usage with Wechaty.use().
   *
   */
  use (...plugins: (WechatyPlugin | WechatyPlugin[])[]) {
    const pluginList = plugins.flat() as WechatyPlugin[]
    const uninstallerList = pluginList
      .map(plugin => plugin(this))
      .filter(isWechatyPluginUninstaller)

    this.pluginUninstallerList.push(
      ...uninstallerList,
    )
    return this
  }

  private installGlobalPlugin () {

    const uninstallerList = instanceToClass(this, Wechaty)
      .globalPluginList
      .map(plugin => plugin(this))
      .filter(isWechatyPluginUninstaller)

    this.pluginUninstallerList.push(
      ...uninstallerList,
    )
  }

  private async initPuppet (): Promise<void> {
    log.verbose('Wechaty', 'initPuppet() %s', this.options.puppet || '')

    if (this.#puppet) {
      log.warn('Wechaty', 'initPuppet(%s) had already been initialized, no need to init twice', this.options.puppet)
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

    this.#puppet = puppetInstance

    this.initPuppetEventBridge(puppetInstance)
    this.wechatifyUserModules()

    /**
      * Private Event
      *  emit puppet when set
      *
      * Huan(202005)
      */
    ;(this.emit as any)('puppet', puppetInstance)
  }

  protected initPuppetEventBridge (puppet: PuppetInterface) {
    log.verbose('Wechaty', 'initPuppetEventBridge(%s)', puppet)

    const eventNameList: PuppetEventName[] = Object.keys(PUPPET_EVENT_DICT) as PuppetEventName[]
    for (const eventName of eventNameList) {
      log.verbose('Wechaty',
        'initPuppetEventBridge() puppet.on(%s) (listenerCount:%s) registering...',
        eventName,
        puppet.listenerCount(eventName),
      )

      switch (eventName) {
        case 'dong':
          puppet.on('dong', payload => {
            this.emit('dong', payload.data)
          })
          break

        case 'error':
          puppet.on('error', payload => {
            this.emit('error', new Error(payload.data))
          })
          break

        case 'heartbeat':
          puppet.on('heartbeat', payload => {
            /**
             * Use `watchdog` event from Puppet to `heartbeat` Wechaty.
             */
            // TODO: use a throttle queue to prevent beat too fast.
            this.emit('heartbeat', payload.data)
          })
          break

        case 'friendship':
          puppet.on('friendship', async payload => {
            const friendship = this.Friendship.load(payload.friendshipId)
            try {
              await friendship.ready()
              this.emit('friendship', friendship)
              friendship.contact().emit('friendship', friendship)
            } catch (e) {
              this.emit('error', (e as Error))
            }
          })
          break

        case 'login':
          puppet.on('login', async payload => {
            const contact = this.ContactSelf.load(payload.contactId)
            try {
              await contact.ready()
              this.emit('login', contact)
            } catch (e) {
              this.emit('error', (e as Error))
            }
          })
          break

        case 'logout':
          puppet.on('logout', async payload => {
            const contact = this.ContactSelf.load(payload.contactId)
            try {
              await contact.ready()
              this.emit('logout', contact, payload.data)
            } catch (e) {
              this.emit('error', (e as Error))
            }
          })
          break

        case 'message':
          puppet.on('message', async payload => {
            const msg = this.Message.load(payload.messageId)
            try {
              await msg.ready()
              this.emit('message', msg)

              const room     = msg.room()
              const listener = msg.listener()

              if (room) {
                room.emit('message', msg)
              } else if (listener) {
                listener.emit('message', msg)
              } else {
                this.emit('error', new Error('message without room or listener'))
              }
            } catch (e) {
              this.emit('error', (e as Error))
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
          puppet.on('room-invite', async payload => {
            const roomInvitation = this.RoomInvitation.load(payload.roomInvitationId)
            this.emit('room-invite', roomInvitation)
          })
          break

        case 'room-join':
          puppet.on('room-join', async payload => {
            const room = this.Room.load(payload.roomId)
            try {
              await room.sync()

              const inviteeList = payload.inviteeIdList.map(id => this.Contact.load(id))
              await Promise.all(inviteeList.map(c => c.ready()))

              const inviter = this.Contact.load(payload.inviterId)
              await inviter.ready()
              const date = timestampToDate(payload.timestamp)

              this.emit('room-join', room, inviteeList, inviter, date)
              room.emit('join', inviteeList, inviter, date)
            } catch (e) {
              this.emit('error', (e as Error))
            }
          })
          break

        case 'room-leave':
          puppet.on('room-leave', async payload => {
            try {
              const room = this.Room.load(payload.roomId)

              /**
               * See: https://github.com/wechaty/wechaty/pull/1833
               */
              await room.sync()

              const leaverList = payload.removeeIdList.map(id => this.Contact.load(id))
              await Promise.all(leaverList.map(c => c.ready()))

              const remover = this.Contact.load(payload.removerId)
              await remover.ready()
              const date = timestampToDate(payload.timestamp)

              this.emit('room-leave', room, leaverList, remover, date)
              room.emit('leave', leaverList, remover, date)

              // issue #254
              if (payload.removeeIdList.includes(this.puppet.currentUserId)) {
                await this.puppet.dirtyPayload(PayloadType.Room, payload.roomId)
                await this.puppet.dirtyPayload(PayloadType.RoomMember, payload.roomId)
              }
            } catch (e) {
              this.emit('error', (e as Error))
            }
          })
          break

        case 'room-topic':
          puppet.on('room-topic', async payload => {
            try {
              const room = this.Room.load(payload.roomId)
              await room.sync()

              const changer = this.Contact.load(payload.changerId)
              await changer.ready()
              const date = timestampToDate(payload.timestamp)

              this.emit('room-topic', room, payload.newTopic, payload.oldTopic, changer, date)
              room.emit('topic', payload.newTopic, payload.oldTopic, changer, date)
            } catch (e) {
              this.emit('error', (e as Error))
            }
          })
          break

        case 'scan':
          puppet.on('scan', async payload => {
            this.emit('scan', payload.qrcode || '', payload.status, payload.data)
          })
          break

        case 'reset':
          // Do not propagation `reset` event from puppet
          break

        case 'dirty':
          /**
           * https://github.com/wechaty/wechaty-puppet-service/issues/43
           */
          puppet.on('dirty', async ({ payloadType, payloadId }) => {
            try {
              switch (payloadType) {
                case PayloadType.RoomMember:
                case PayloadType.Contact:
                  await this.Contact.load(payloadId).sync()
                  break
                case PayloadType.Room:
                  await this.Room.load(payloadId).sync()
                  break

                /**
                 * Huan(202008): noop for the following
                 */
                case PayloadType.Friendship:
                  // Friendship has no payload
                  break
                case PayloadType.Message:
                  // Message does not need to dirty (?)
                  break

                case PayloadType.Unknown:
                default:
                  throw new Error('unknown payload type: ' + payloadType)
              }
            } catch (e) {
              this.emit('error', (e as Error))
            }
          })
          break

        default:
          /**
           * Check: The eventName here should have the type `never`
           */
          throw new Error('eventName ' + eventName + ' unsupported!')

      }
    }
  }

  protected wechatifyUserModules () {
    log.verbose('Wechaty', 'wechatifyUserModules()')

    if (this.#wechatifiedContactSelf) {
      throw new Error('can not be initialized twice!')
    }

    /**
     * Wechatify User Classes
     *  1. Binding the wechaty instance to the class
     */
    this.#wechatifiedContact        = wechatifyUserClass(Contact)(this)
    this.#wechatifiedContactSelf    = wechatifyUserClass(ContactSelf)(this)
    this.#wechatifiedFriendship     = wechatifyUserClass(Friendship)(this)
    this.#wechatifiedImage          = wechatifyUserClass(Image)(this)
    this.#wechatifiedMessage        = wechatifyUserClass(Message)(this)
    this.#wechatifiedMiniProgram    = wechatifyUserClass(MiniProgram)(this)
    this.#wechatifiedRoom           = wechatifyUserClass(Room)(this)
    this.#wechatifiedRoomInvitation = wechatifyUserClass(RoomInvitation)(this)
    this.#wechatifiedTag            = wechatifyUserClass(Tag)(this)
    this.#wechatifiedUrlLink        = wechatifyUserClass(UrlLink)(this)
    this.#wechatifiedLocation       = wechatifyUserClass(Location)(this)
  }

  /**
   * Start the bot, return Promise.
   *
   * @returns {Promise<void>}
   * @description
   * When you start the bot, bot will begin to login, need you WeChat scan qrcode to login
   * > Tips: All the bot operation needs to be triggered after start() is done
   * @example
   * await bot.start()
   * // do other stuff with bot here
   */
  async start (): Promise<void> {
    log.verbose('Wechaty', 'start()')

    if (this.state.on()) {
      log.warn('Wechaty', 'start() found that is starting/started, waiting stable ...')
      await this.state.ready('on')
      log.warn('Wechaty', 'start() found that is starting/started, waiting stable ... done')
      return
    }

    if (this.state.off() === 'pending') {
      log.warn('Wechaty', 'start() found that is stopping, waiting stable ...')

      const TIMEOUT_SECONDS = 5
      const timeoutFuture = new Promise((resolve, reject) => {
        void resolve
        setTimeout(
          () => reject(new Error(TIMEOUT_SECONDS + ' seconds timeout')),
          TIMEOUT_SECONDS * 1000,
        )
      })

      try {
        await Promise.all([
          this.state.ready('off'),
          timeoutFuture,
        ])
        log.warn('Wechaty', 'start() found that is stopping, waiting stable ... done')
      } catch (e) {
        log.warn('Wechaty', 'start() found that is stopping, waiting stable ... %s',
          (e as Error).message,
        )
      }
    }

    this.state.on('pending')

    try {
      await this.onStart()
      this.state.on(true)
      this.emit('start')

    } catch (e) {
      console.error(e)
      log.error('Wechaty', 'start() rejection: %s', e && (e as Error).message)
      captureException((e as Error))

      await this.stop()
      this.emit('error', e as Error)
    }
  }

  protected async onStart (): Promise<void> {
    log.verbose('Wechaty', '<%s>(%s) onStart() v%s is starting...',
      this.options.puppet || config.systemPuppetName(),
      this.options.name   || '',
      this.version(),
    )
    log.verbose('Wechaty', 'id: %s', this.id)

    /**
     * Init the `wechaty.ready()` state
     */
    this.readyState.off(true)

    if (!this.memory) {
      this.memory = new MemoryCard(this.options.name)
      try {
        await this.memory.load()
      } catch (e) {
        log.silly('Wechaty', 'onStart() memory.load() had already loaded')
      }
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

    const memoryCheck = () => this.memoryCheck()
    this.on('heartbeat', memoryCheck)
    this.cleanCallbackList.push(() => this.off('heartbeat', memoryCheck))

    const lifeTimer = setInterval(() => {
      log.silly('Wechaty', 'onStart() setInterval() this timer is to keep Wechaty running...')
    }, 1000 * 60 * 60)
    this.cleanCallbackList.push(() => clearInterval(lifeTimer))
  }

  /**
   * Stop the bot
   *
   * @returns {Promise<void>}
   * @example
   * await bot.stop()
   */
  async stop (): Promise<void> {
    log.verbose('Wechaty', 'stop()')

    if (this.state.off()) {
      log.warn('Wechaty', 'stop() found that is stopping/stopped ...')
      await this.state.ready('off')
      log.warn('Wechaty', 'stop() found that is stopping/stopped ... done')
      return
    }

    if (this.state.on() === 'pending') {
      log.warn('Wechaty', 'stop() found that is starting, waiting stable ...')

      const TIMEOUT_SECONDS = 5
      const timeoutFuture = new Promise((resolve, reject) => {
        void resolve
        setTimeout(
          () => reject(new Error(TIMEOUT_SECONDS + ' seconds timeout')),
          TIMEOUT_SECONDS * 1000,
        )
      })

      try {
        await Promise.all([
          this.state.ready('on'),
          timeoutFuture,
        ])
        log.warn('Wechaty', 'stop() found that is starting, waiting stable ... done')
      } catch (e) {
        log.warn('Wechaty', 'stop() found that is starting, waiting stable ... %s',
          (e as Error).message,
        )
      }
    }

    this.state.off('pending')

    try {
      await this.onStop()

    } catch (e) {
      log.error('Wechaty', 'stop() rejection: %s', e && (e as Error).message)
      captureException((e as Error))

      this.emit('error', e as Error)

    } finally {
      this.state.off(true)
      this.emit('stop')
    }
  }

  protected async onStop (): Promise<void> {
    log.verbose('Wechaty', '<%s> onStop() v%s is stopping ...',
      this.options.puppet || config.systemPuppetName(),
      this.version(),
    )

    /**
     * Uninstall Plugins
     *  no matter the state is `ON` or `OFF`.
     */
    while (this.pluginUninstallerList.length > 0) {
      const uninstaller = this.pluginUninstallerList.pop()
      if (uninstaller) uninstaller()
    }

    while (this.cleanCallbackList.length > 0) {
      const cleaner = this.cleanCallbackList.pop()
      if (cleaner) cleaner()
    }

    try {
      await this.puppet.stop()
    } catch (e) {
      log.warn('Wechaty', 'onStop() puppet.stop() exception: %s', (e as Error).message)
    }

    try {
      if (this.io) {
        await this.io.stop()
        this.io = undefined
      }

    } catch (e) {
      log.error('Wechaty', 'onStop() exception: %s', (e as Error).message)
      captureException((e as Error))
      this.emit('error', (e as Error))
    }
  }

  async ready (): Promise<void> {
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
  async logout (): Promise<void>  {
    log.verbose('Wechaty', 'logout()')

    try {
      await this.puppet.logout()
    } catch (e) {
      log.error('Wechaty', 'logout() exception: %s', (e as Error).message)
      captureException(e as Error)
      throw e
    }
  }

  /**
   * Get the logon / logoff state
   *
   * @returns {boolean}
   * @example
   * if (bot.logonoff()) {
   *   console.log('Bot logged in')
   * } else {
   *   console.log('Bot not logged in')
   * }
   */
  logonoff (): boolean {
    try {
      return this.puppet.logonoff()
    } catch (e) {
      // https://github.com/wechaty/wechaty/issues/1878
      return false
    }
  }

  /**
   * Get current user
   *
   * @returns {ContactSelf}
   * @example
   * const contact = bot.currentUser()
   * console.log(`Bot is ${contact.name()}`)
   */
  currentUser (): ContactSelf {
    const userId = this.puppet.currentUserId
    const user = this.ContactSelf.load(userId)
    return user
  }

  /**
   * Will be removed after Dec 31, 2022
   * @deprecated use {@link Wechaty#currentUser} instead
   */
  userSelf () {
    log.warn('Wechaty', 'userSelf() deprecated: use currentUser() instead.\n%s',
      new Error().stack,
    )
    return this.currentUser()
  }

  async say (text:    string)      : Promise<void>
  async say (contact: Contact)     : Promise<void>
  async say (file:    FileBox)     : Promise<void>
  async say (mini:    MiniProgram) : Promise<void>
  async say (url:     UrlLink)     : Promise<void>
  async say (url:     Location)    : Promise<void>

  async say (...args: never[]): Promise<never>

  /**
   * Send message to currentUser, in other words, bot send message to itself.
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @param {(string | Contact | FileBox | UrlLink | MiniProgram | Location)} sayableMsg
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
   * import { FileBox }  from 'wechaty'
   * const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
   * await bot.say(fileBox)
   *
   * // 4. send Image to bot itself from local file
   * import { FileBox }  from 'wechaty'
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

  async say (
    sayableMsg: SayableMessage,
  ): Promise<void> {
    log.verbose('Wechaty', 'say(%s)', sayableMsg)
    // huan: to make TypeScript happy
    await this.currentUser().say(sayableMsg as any)
  }

  /**
   * @ignore
   */
  static version (gitHash = false): string {
    if (gitHash) {
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
  version (forceNpm = false): string {
    return Wechaty.version(forceNpm)
  }

  /**
   * @ignore
   */
  static async sleep (millisecond: number): Promise<void> {
    await new Promise<void>(resolve => {
      setTimeout(resolve, millisecond)
    })
  }

  /**
   * @ignore
   */
  async sleep (millisecond: number): Promise<void> {
    return Wechaty.sleep(millisecond)
  }

  /**
   * @private
   */
  ding (data?: string): void {
    log.silly('Wechaty', 'ding(%s)', data || '')

    try {
      this.puppet.ding(data)
    } catch (e) {
      log.error('Wechaty', 'ding() exception: %s', (e as Error).message)
      captureException((e as Error))
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
  reset (reason?: string): void {
    log.verbose('Wechaty', 'reset() with reason: %s, call stack: %s',
      reason || 'no reason',
      // https://stackoverflow.com/a/2060330/1123955
      new Error().stack,
    )

    this.puppet.stop()
      .then(() => this.puppet.start())
      .finally(() => {
        log.verbose('Wechaty', 'reset() done.')
      })
      .catch(e => {
        log.warn('Wechaty', 'reset() rejection: %s', e && e.message)

        /**
         * Dealing with https://github.com/wechaty/wechaty/issues/2197
         */
        setTimeout(
          () => this.reset(),
          Math.floor(
            (
              10 + 10 * Math.random()
            ) * 1000,
          ),
        )

      })
  }

  // unref (): void {
  //   log.verbose('Wechaty', 'unref()')

  //   if (this.lifeTimer) {
  //     this.lifeTimer.unref()
  //   }

  //   this.puppet.unref()
  // }

}

/**
 * Huan(202008): we will bind the wechaty puppet with user modules (Contact, Room, etc) together inside the start() method
 */
function guardWechatify<T extends Function> (userModule?: T): T {
  if (!userModule) {
    throw new Error('Wechaty user module (for example, wechaty.Room) can not be used before wechaty.start()!')
  }
  return userModule
}

export {
  Wechaty,
}
