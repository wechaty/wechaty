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
import * as uuid  from 'uuid'
import os         from 'os'

import * as PUPPET      from 'wechaty-puppet'
import {
  MemoryCard,
}                       from 'memory-card'
import {
  GError,
}                       from 'gerror'
import {
  StateSwitch,
  serviceCtlMixin,
}                       from 'state-switch'
import type {
  StateSwitchInterface,
}                       from 'state-switch'
import {
  instanceToClass,
}                       from 'clone-class'
import type { Loggable } from 'brolog'

import { captureException } from './raven.js'

import {
  config,
  log,
  VERSION,
  GIT_COMMIT_HASH,
}                       from './config.js'

import type {
  Sayable,
  SayableMessage,
}                       from './interface/mod.js'

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
  ContactImpl,
  ContactSelfImpl,
  FriendshipImpl,
  ImageImpl,
  MessageImpl,
  MiniProgramImpl,
  RoomImpl,
  RoomInvitationImpl,
  DelayImpl,
  TagImpl,
  UrlLinkImpl,
  LocationImpl,

  ContactConstructor,
  ContactSelfConstructor,
  FriendshipConstructor,
  ImageConstructor,
  MessageConstructor,
  MiniProgramConstructor,
  RoomConstructor,
  RoomInvitationConstructor,
  TagConstructor,
  DelayConstructor,
  UrlLinkConstructor,
  LocationConstructor,

  Contact,
  ContactSelf,
  // Friendship,
  // Image,
  // Message,
  // MiniProgram,
  // Room,
  // RoomInvitation,
  // Tag,
  // Delay,
  // UrlLink,
  // Location,

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
import type {
  Wechaty,
  WechatyConstructor,
}                       from './interface/wechaty-interface.js'
import { WechatyBuilder } from './wechaty-builder.js'

export interface WechatyOptions {
  memory?        : MemoryCard,
  name?          : string,                                // Wechaty Name

  puppet?        : PuppetModuleName | PUPPET.impl.Puppet, // Puppet name or instance
  puppetOptions? : PUPPET.PuppetOptions,                  // Puppet TOKEN
  ioToken?       : string,                                // Io TOKEN
}

const PUPPET_MEMORY_NAME = 'puppet'

const mixinBase = serviceCtlMixin('Wechaty', { log })(WechatyEventEmitter)
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
 * import { Wechaty } from 'wechaty'
 * const bot = new Wechaty()
 * bot.on('scan',    (qrCode, status) => console.log('https://wechaty.js.org/qrcode/' + encodeURIComponent(qrcode)))
 * bot.on('login',   user => console.log(`User ${user} logged in`))
 * bot.on('message', message => console.log(`Message: ${message}`))
 * bot.start()
 */
class WechatyImpl extends mixinBase implements Sayable {

  static   override readonly VERSION = VERSION
  static   readonly log: Loggable = log

  readonly log: Loggable = log
  readonly wechaty : Wechaty

  private  readonly _readyState : StateSwitchInterface

  private static _globalPluginList: WechatyPlugin[] = []
  private _pluginUninstallerList: WechatyPluginUninstaller[]
  private _memory?: MemoryCard
  private _io?: Io

  protected readonly _cleanCallbackList: Function[] = []
  protected _puppet?: PUPPET.impl.Puppet
  get puppet (): PUPPET.impl.Puppet {
    if (!this._puppet) {
      throw new Error('NOPUPPET')
    }
    return this._puppet
  }

  /**
   * the cuid
   * @ignore
   */
  readonly id : string

  protected _wechatifiedContact?        : ContactConstructor
  protected _wechatifiedContactSelf?    : ContactSelfConstructor
  protected _wechatifiedFriendship?     : FriendshipConstructor
  protected _wechatifiedImage?          : ImageConstructor
  protected _wechatifiedMessage?        : MessageConstructor
  protected _wechatifiedMiniProgram?    : MiniProgramConstructor
  protected _wechatifiedRoom?           : RoomConstructor
  protected _wechatifiedRoomInvitation? : RoomInvitationConstructor
  protected _wechatifiedDelay?          : DelayConstructor
  protected _wechatifiedTag?            : TagConstructor
  protected _wechatifiedUrlLink?        : UrlLinkConstructor
  protected _wechatifiedLocation?       : LocationConstructor

  get Contact ()        : ContactConstructor        { return guardWechatify(this._wechatifiedContact)        }
  get ContactSelf ()    : ContactSelfConstructor    { return guardWechatify(this._wechatifiedContactSelf)    }
  get Friendship ()     : FriendshipConstructor     { return guardWechatify(this._wechatifiedFriendship)     }
  get Image ()          : ImageConstructor          { return guardWechatify(this._wechatifiedImage)          }
  get Message ()        : MessageConstructor        { return guardWechatify(this._wechatifiedMessage)        }
  get MiniProgram ()    : MiniProgramConstructor    { return guardWechatify(this._wechatifiedMiniProgram)    }
  get Room ()           : RoomConstructor           { return guardWechatify(this._wechatifiedRoom)           }
  get RoomInvitation () : RoomInvitationConstructor { return guardWechatify(this._wechatifiedRoomInvitation) }
  get Delay ()          : DelayConstructor          { return guardWechatify(this._wechatifiedDelay)        }
  get Tag ()            : TagConstructor            { return guardWechatify(this._wechatifiedTag)            }
  get UrlLink ()        : UrlLinkConstructor        { return guardWechatify(this._wechatifiedUrlLink)        }
  get Location ()       : LocationConstructor       { return guardWechatify(this._wechatifiedLocation)       }

  /**
   * Get the global instance of Wechaty (Singleton)
   *
   * @param {WechatyOptions} [options={}]
   *
   * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
   * import { singletonWechaty } from 'wechaty'
   *
   * singletonWechaty() // Global instance
   * .on('scan', (url, status) => console.log(`Scan QR Code to login: ${status}\n${url}`))
   * .on('login',       user => console.log(`User ${user} logged in`))
   * .on('message',  message => console.log(`Message: ${message}`))
   * .start()
   *
   * @deprecated will be removed after Dec 31, 2022. Use `new WechatyBuilder().singleton().build()` instead
   * @see https://github.com/wechaty/wechaty/issues/2276
   */
  static instance (
    options?: WechatyOptions,
  ): Wechaty {
    return new WechatyBuilder()
      .singleton()
      .options(options)
      .build()
  }

  /**
   * Wechaty.create() will return a `WechatyInterface` instance.
   * @deprecated will be removed after Dec 31, 2022. Use `new WechatyBuilder().build()` instead
   * @see https://github.com/wechaty/wechaty/issues/2276
   */
  static create (
    options?: WechatyOptions,
  ): Wechaty {
    log.warn('Wechaty', 'create() is DEPRECATED. Use createWechaty() instead.\n%s\n%s',
      '@see https://github.com/wechaty/wechaty/issues/2276',
      new Error().stack,
    )
    return new this(options)
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
  ): WechatyConstructor {
    const pluginList = plugins.flat()
    this._globalPluginList = this._globalPluginList.concat(pluginList)
    return this
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
   * Wrap promise in sync way (catch error by emitting it)
   *  1. convert a async callback function to be sync function
   *    by catcing any errors and emit them to error event
   *  2. wrap a Promise by catcing any errors and emit them to error event
   */
  wrapAsync: PUPPET.helper.WrapAsync = PUPPET.helper.wrapAsyncError((e: any) => this.emit('error', e))

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

    this._memory = this.options.memory

    this.id                = uuid.v4()
    this._cleanCallbackList = []

    this.state      = new StateSwitch('Wechaty', { log })
    this._readyState = new StateSwitch('WechatyReady', { log })

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

    this._pluginUninstallerList = []
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
      `(${(this._memory && this._memory.name) || ''})`,
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

    return super.on(event, this.wrapAsync(listener))
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
  use (
    ...plugins: (
      WechatyPlugin | WechatyPlugin[]
    )[]
  ): Wechaty {
    const pluginList = plugins.flat() as WechatyPlugin[]
    const uninstallerList = pluginList
      .map(plugin => plugin(this))
      .filter(isWechatyPluginUninstaller)

    this._pluginUninstallerList.push(
      ...uninstallerList,
    )
    return this
  }

  private installGlobalPlugin () {

    const uninstallerList = instanceToClass(this, WechatyImpl)
      ._globalPluginList
      .map(plugin => plugin(this))
      .filter(isWechatyPluginUninstaller)

    this._pluginUninstallerList.push(
      ...uninstallerList,
    )
  }

  private async initPuppet (): Promise<void> {
    log.verbose('Wechaty', 'initPuppet() %s', this.options.puppet || '')

    if (this._puppet) {
      log.warn('Wechaty', 'initPuppet(%s) had already been initialized, no need to init twice', this.options.puppet)
      return
    }

    if (!this._memory) {
      throw new Error('no memory')
    }

    const puppet       = this.options.puppet || config.systemPuppetName()
    const puppetMemory = this._memory.multiplex(PUPPET_MEMORY_NAME)

    const puppetInstance = await PuppetManager.resolve({
      puppet,
      puppetOptions : this.options.puppetOptions,
      // wechaty       : this,
    })

    /**
     * Plug the Memory Card to Puppet
     */
    puppetInstance.setMemory(puppetMemory)

    this._puppet = puppetInstance

    this.initPuppetEventBridge(puppetInstance)
    this.wechatifyUserModules()

    /**
      * Private Event
      *   - Huan(202005): emit puppet when set
      *   - Huan(202110): what's the purpose of this? (who is using this?)
      */
    ;(this.emit as any)('puppet', puppetInstance)
  }

  protected initPuppetEventBridge (puppet: PUPPET.impl.Puppet) {
    log.verbose('Wechaty', 'initPuppetEventBridge(%s)', puppet)

    const eventNameList: PUPPET.type.PuppetEventName[] = Object.keys(PUPPET.type.PUPPET_EVENT_DICT) as PUPPET.type.PuppetEventName[]
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
            this.emit('error', payload)
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
              this.emit('error', e)
            }
          })
          break

        case 'login':
          puppet.on('login', async payload => {
            try {
              const contact = await this.ContactSelf.find({ id: payload.contactId })
              if (!contact) {
                throw new Error('no contact found for id: ' + payload.contactId)
              }
              this.emit('login', contact)
            } catch (e) {
              this.emit('error', e)
            }
          })
          break

        case 'logout':
          puppet.on('logout', async payload => {
            try {
              const contact = await this.ContactSelf.find({ id: payload.contactId })
              if (!contact) {
                throw new Error('no self contact for id: ' + payload.contactId)
              }
              this.emit('logout', contact, payload.data)
            } catch (e) {
              this.emit('error', e)
            }
          })
          break

        case 'message':
          puppet.on('message', async payload => {
            try {
              const msg = await this.Message.find({ id: payload.messageId })
              if (!msg) {
                throw new Error('message not found for id: ' + payload.messageId)
              }
              this.emit('message', msg)

              const room     = msg.room()
              const listener = msg.listener()

              if (room) {
                room.emit('message', msg)
              } else if (listener) {
                listener.emit('message', msg)
              } else {
                this.emit('error', 'message without room and listener')
              }
            } catch (e) {
              this.emit('error', e)
            }
          })
          break

        case 'ready':
          puppet.on('ready', () => {
            log.silly('Wechaty', 'initPuppetEventBridge() puppet.on(ready)')

            this.emit('ready')
            this._readyState.active(true)
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
            try {
              const room = await this.Room.find({ id: payload.roomId })
              if (!room) {
                throw new Error('no room found for id: ' + payload.roomId)
              }
              await room.sync()

              const inviteeListAll = await Promise.all(
                payload.inviteeIdList.map(id => this.Contact.find({ id })),
              )
              const inviteeList = inviteeListAll.filter(c => !!c) as Contact[]

              const inviter = await this.Contact.find({ id: payload.inviterId })
              if (!inviter) {
                throw new Error('no inviter found for id: ' + payload.inviterId)
              }

              const date = timestampToDate(payload.timestamp)

              this.emit('room-join', room, inviteeList, inviter, date)
              room.emit('join', inviteeList, inviter, date)
            } catch (e) {
              this.emit('error', e)
            }
          })
          break

        case 'room-leave':
          puppet.on('room-leave', async payload => {
            try {
              const room = await this.Room.find({ id: payload.roomId })
              if (!room) {
                throw new Error('no room found for id: ' + payload.roomId)
              }

              /**
               * See: https://github.com/wechaty/wechaty/pull/1833
               */
              await room.sync()

              const leaverListAll = await Promise.all(
                payload.removeeIdList.map(id => this.Contact.find({ id })),
              )
              const leaverList = leaverListAll.filter(c => !!c) as Contact[]

              const remover = await this.Contact.find({ id: payload.removerId })
              if (!remover) {
                throw new Error('no remover found for id: ' + payload.removerId)
              }
              const date = timestampToDate(payload.timestamp)

              this.emit('room-leave', room, leaverList, remover, date)
              room.emit('leave', leaverList, remover, date)

              // issue #254
              if (payload.removeeIdList.includes(this.puppet.currentUserId)) {
                await this.puppet.dirtyPayload(PUPPET.type.Payload.Room, payload.roomId)
                await this.puppet.dirtyPayload(PUPPET.type.Payload.RoomMember, payload.roomId)
              }
            } catch (e) {
              this.emit('error', e)
            }
          })
          break

        case 'room-topic':
          puppet.on('room-topic', async payload => {
            try {
              const room = await this.Room.find({ id: payload.roomId })
              if (!room) {
                throw new Error('no room found for id: ' + payload.roomId)
              }
              await room.sync()

              const changer = await this.Contact.find({ id: payload.changerId })
              if (!changer) {
                throw new Error('no changer found for id: ' + payload.changerId)
              }
              const date = timestampToDate(payload.timestamp)

              this.emit('room-topic', room, payload.newTopic, payload.oldTopic, changer, date)
              room.emit('topic', payload.newTopic, payload.oldTopic, changer, date)
            } catch (e) {
              this.emit('error', e)
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
                case PUPPET.type.Payload.RoomMember:
                case PUPPET.type.Payload.Contact:
                  await (await this.Contact.find({ id: payloadId }))?.sync()
                  break
                case PUPPET.type.Payload.Room:
                  await (await this.Room.find({ id: payloadId }))?.sync()
                  break

                /**
                 * Huan(202008): noop for the following
                 */
                case PUPPET.type.Payload.Friendship:
                  // Friendship has no payload
                  break
                case PUPPET.type.Payload.Message:
                  // Message does not need to dirty (?)
                  break

                case PUPPET.type.Payload.Unknown:
                default:
                  throw new Error('unknown payload type: ' + payloadType)
              }
            } catch (e) {
              this.emit('error', e)
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

    if (this._wechatifiedMessage) {
      throw new Error('can not be initialized twice!')
    }

    /**
     * Wechatify User Classes
     *  1. Binding the wechaty instance to the class
     */
    this._wechatifiedContact        = wechatifyUserClass(ContactImpl)(this)
    this._wechatifiedContactSelf    = wechatifyUserClass(ContactSelfImpl)(this)
    this._wechatifiedFriendship     = wechatifyUserClass(FriendshipImpl)(this)
    this._wechatifiedImage          = wechatifyUserClass(ImageImpl)(this)
    this._wechatifiedMessage        = wechatifyUserClass(MessageImpl)(this)
    this._wechatifiedMiniProgram    = wechatifyUserClass(MiniProgramImpl)(this)
    this._wechatifiedRoom           = wechatifyUserClass(RoomImpl)(this)
    this._wechatifiedRoomInvitation = wechatifyUserClass(RoomInvitationImpl)(this)
    this._wechatifiedDelay          = wechatifyUserClass(DelayImpl)(this)
    this._wechatifiedTag            = wechatifyUserClass(TagImpl)(this)
    this._wechatifiedUrlLink        = wechatifyUserClass(UrlLinkImpl)(this)
    this._wechatifiedLocation       = wechatifyUserClass(LocationImpl)(this)
  }

  /**
   * Wechaty internally can use `emit('error' whatever)` to emit any error
   * But the external call can only emit GError.
   * That's the reason why we need the below `emitError(e: any)
   */
  emitError (e: any): void {
    this.emit('error', e)
  }

  /**
   * Convert any error to GError,
   *  and emit `error` event with GError
   */
  override emit (event: any, ...args: any) {
    if (event !== 'error') {
      return super.emit(event, ...args)
    }

    /**
     * Dealing with the `error` event
     */
    const arg0 = args[0]
    let gerror: GError

    if (arg0 instanceof GError) {
      gerror = arg0
    } else {
      gerror = GError.from(arg0)
    }

    captureException(gerror)
    return super.emit('error', gerror)
  }

  override async onStart (): Promise<void> {
    log.verbose('Wechaty', '<%s>(%s) onStart() v%s is starting...',
      this.options.puppet || config.systemPuppetName(),
      this.options.name   || '',
      this.version(),
    )
    log.verbose('Wechaty', 'id: %s', this.id)

    /**
     * Init the `wechaty.ready()` state
     */
    this._readyState.inactive(true)

    if (!this._memory) {
      this._memory = new MemoryCard(this.options.name)
      try {
        await this._memory.load()
      } catch (_) {
        log.silly('Wechaty', 'onStart() memory.load() had already loaded')
      }
    }

    await this.initPuppet()
    await this.puppet.start()

    if (this.options.ioToken) {
      this._io = new Io({
        token   : this.options.ioToken,
        wechaty : this,
      })
      await this._io.start()
    }

    const memoryCheck = () => this.memoryCheck()
    this.on('heartbeat', memoryCheck)
    this._cleanCallbackList.push(() => this.off('heartbeat', memoryCheck))

    const lifeTimer = setInterval(() => {
      log.silly('Wechaty', 'onStart() setInterval() this timer is to keep Wechaty running...')
    }, 1000 * 60 * 60)
    this._cleanCallbackList.push(() => clearInterval(lifeTimer))

    this.emit('start')
  }

  override async onStop (): Promise<void> {
    log.verbose('Wechaty', '<%s> onStop() v%s is stopping ...',
      this.options.puppet || config.systemPuppetName(),
      this.version(),
    )

    /**
     * Uninstall Plugins
     *  no matter the state is `ON` or `OFF`.
     */
    while (this._pluginUninstallerList.length > 0) {
      const uninstaller = this._pluginUninstallerList.pop()
      if (uninstaller) uninstaller()
    }

    while (this._cleanCallbackList.length > 0) {
      const cleaner = this._cleanCallbackList.pop()
      if (cleaner) cleaner()
    }

    try {
      await this.puppet.stop()
    } catch (e) {
      this.emit('error', e)
    }

    try {
      if (this._io) {
        await this._io.stop()
        this._io = undefined
      }

    } catch (e) {
      this.emit('error', e)
    }

    this.emit('stop')
  }

  async ready (): Promise<void> {
    log.verbose('Wechaty', 'ready()')
    await this._readyState.stable('on')
    log.silly('Wechaty', 'ready() this.readyState.stable(on) resolved')
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
      this.emit('error', e)
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
      this.emit('error', e)
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
    const user = (this.ContactSelf as typeof ContactSelfImpl).load(userId)
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
    await this.currentUser().say(sayableMsg)
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
    return WechatyImpl.version(forceNpm)
  }

  /**
   * @ignore
   */
  static async sleep (milliseconds: number): Promise<void> {
    await new Promise<void>(resolve => {
      setTimeout(resolve, milliseconds)
    })
  }

  /**
   * @ignore
   */
  async sleep (milliseconds: number): Promise<void> {
    return WechatyImpl.sleep(milliseconds)
  }

  /**
   * @private
   */
  ding (data?: string): void {
    log.silly('Wechaty', 'ding(%s)', data || '')

    try {
      this.puppet.ding(data)
    } catch (e) {
      this.emit('error', e)
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
      this.emit('error', `memory not enough: free ${freeMegabyte} < require ${minMegabyte} MB`)
    }
  }

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
  WechatyImpl,
}
