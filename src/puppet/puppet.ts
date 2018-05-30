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
 */
import { EventEmitter } from 'events'

import * as normalize   from 'normalize-package-data'
import * as readPkgUp   from 'read-pkg-up'
import * as LRU         from 'lru-cache'

import {
  FileBox,
}                       from 'file-box'
import {
  callerResolve,
}                       from 'hot-import'
import {
  StateSwitch,
}                       from 'state-switch'
import {
  Watchdog,
  WatchdogFood,
}                       from 'watchdog'

import {
  WECHATY_EVENT_DICT,
  // Wechaty,
}                       from '../wechaty'
import {
  Sayable,
  log,
}                       from '../config'
import Profile          from '../profile'

import {
  // Contact,
  ContactPayload,
  ContactQueryFilter,
}                       from '../contact'
import {
  FriendRequestType,
  FriendRequestPayload,
}                       from '../friend-request'
import {
  // Message,
  MessagePayload,
}                       from '../message'
import {
  // Room,
  RoomPayload,
  RoomQueryFilter,
}                       from '../room'

export interface ScanPayload {
  code  : number,   // Code
  data? : string,   // Image Data URL
  url   : string,   // QR Code URL
}

export const PUPPET_EVENT_DICT = {
  ...WECHATY_EVENT_DICT,
  watchdog: 'tbw',
}

export type PuppetEventName = keyof typeof PUPPET_EVENT_DICT

export interface PuppetOptions {
  profile : Profile,
  // wechaty : Wechaty,
}

export interface Receiver {
  contactId? : string,
  roomId?    : string,
}

let PUPPET_COUNTER = 0

/**
 * Abstract Puppet Class
 */
export abstract class Puppet extends EventEmitter implements Sayable {

  protected readonly watchdog : Watchdog
  protected readonly counter  : number

  protected readonly cacheContactPayload       : LRU.Cache<string, ContactPayload>
  protected readonly cacheFriendRequestPayload : LRU.Cache<string, FriendRequestPayload>
  protected readonly cacheMessagePayload       : LRU.Cache<string, MessagePayload>
  protected readonly cacheRoomPayload          : LRU.Cache<string, RoomPayload>

  protected id?: string

  // /* tslint:disable:variable-name */
  // public readonly Contact       : typeof Contact
  // /* tslint:disable:variable-name */
  // public readonly FriendRequest : typeof FriendRequest
  // /* tslint:disable:variable-name */
  // public readonly Message       : typeof Message
  // /* tslint:disable:variable-name */
  // public readonly Room          : typeof Room

  public readonly state : StateSwitch

  /**
   * childPkg stores the `package.json` that the NPM module who extends the `Puppet`
   */
  private readonly childPkg: undefined | normalize.Package

  constructor(
    public options: PuppetOptions,
  ) {
    super()

    this.counter = PUPPET_COUNTER++

    const WATCHDOG_TIMEOUT = 1 * 60 * 1000  // default 1 minute

    this.state    = new StateSwitch(this.constructor.name, log)
    this.watchdog = new Watchdog(WATCHDOG_TIMEOUT, 'Puppet')

    const lruOptions: LRU.Options = {
      max: 10000,
      // length: function (n) { return n * 2},
      dispose: function (key: string, val: Object) {
        log.silly('Puppet', 'constructor() lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
      },
      maxAge: 1000 * 60 * 60,
    }

    this.cacheContactPayload       = new LRU<string, ContactPayload>(lruOptions)
    this.cacheFriendRequestPayload = new LRU<string, FriendRequestPayload>(lruOptions)
    this.cacheMessagePayload       = new LRU<string, MessagePayload>(lruOptions)
    this.cacheRoomPayload          = new LRU<string, RoomPayload>(lruOptions)

    /**
     * 1. Init Classes
     */
    // if (  !this.options.wechaty.Contact
    //   || !this.options.wechaty.FriendRequest
    //   || !this.options.wechaty.Message
    //   || !this.options.wechaty.Room
    // ) {
    //   throw new Error('wechaty classes are not inited')
    // }

    // this.Contact       = this.options.wechaty.Contact
    // this.FriendRequest = this.options.wechaty.FriendRequest
    // this.Message       = this.options.wechaty.Message
    // this.Room          = this.options.wechaty.Room

    /**
     * Make sure that Wechaty had attached to this puppet
     *
     * When we declare a wechaty without a puppet instance,
     * the wechaty need to attach to puppet later.
     */
    // this.options.wechaty.attach(this)

    /**
     * 2. Load the package.json for Puppet Plugin version range matching
     *
     * For: dist/src/puppet/puppet.ts
     *  We need to up 3 times: ../../../package.json
     */
    try {
      const childClassPath = callerResolve('.', __filename)
      log.verbose('Puppet', 'constructor() childClassPath=%s', childClassPath)

      this.childPkg = readPkgUp.sync({ cwd: childClassPath }).pkg
    } finally {
      if (!this.childPkg) {
        throw new Error('Cannot found package.json for Puppet Plugin Module')
      }
    }
    normalize(this.childPkg)
  }

  public toString() {
    return `Puppet#${this.counter}<${this.constructor.name}>(${this.options.profile.name})`
  }

  // private abstract async emitError(err: string)                                                            : Promise<void>
  // private abstract async emitFriend(payload: FriendRequestPayload)                                         : Promise<void>
  // private abstract async emitHeartbeat(data: string)                                                       : Promise<void>
  // private abstract async emitLogin(contactId: string)                                                      : Promise<void>
  // private abstract async emitLogout(contactId: string)                                                     : Promise<void>
  // private abstract async emitMessage(messageId: string)                                                    : Promise<void>
  // private abstract async emitRoomJoin(roomId: string, inviteeIdList: string[], inviterId: string)          : Promise<void>
  // private abstract async emitRoomLeave(roomId: string, leaverIdList: string[])                             : Promise<void>
  // private abstract async emitRoomTopic(roomId: string, topic: string, oldTopic: string, changerId: string) : Promise<void>
  // private abstract async emitScan(url: string, code: number, data?: string)                                : Promise<void>
  // private abstract async emitWatchdog(...)                                                                 : Promise<void>

  // public emit(event: 'error',       e: Error)                                                      : boolean
  // public emit(event: 'friend',      request: FriendRequest)                                        : boolean
  // public emit(event: 'heartbeat',   data: string)                                                  : boolean
  // public emit(event: 'login',       user: Contact)                                                 : boolean
  // public emit(event: 'logout',      user: Contact)                                                 : boolean
  // public emit(event: 'message',     message: Message)                                              : boolean
  // public emit(event: 'room-join',   room: Room, inviteeList: Contact[],  inviter: Contact)         : boolean
  // public emit(event: 'room-leave',  room: Room, leaverList: Contact[])                             : boolean
  // public emit(event: 'room-topic',  room: Room, topic: string, oldTopic: string, changer: Contact) : boolean
  // public emit(event: 'scan',        url: string, code: number, data?: string)                      : boolean
  // public emit(event: 'watchdog',    food: WatchdogFood)                                            : boolean

  public emit(event: 'error',       error: string)                                                      : boolean
  public emit(event: 'friend',      requestId: string)                                                  : boolean
  public emit(event: 'heartbeat',   data: string)                                                       : boolean
  public emit(event: 'login',       contactId: string)                                                  : boolean
  public emit(event: 'logout',      contactId: string)                                                  : boolean
  public emit(event: 'message',     messageId: string)                                                  : boolean
  public emit(event: 'room-join',   roomId: string, inviteeIdList: string[],  inviterId: string)        : boolean
  public emit(event: 'room-leave',  roomId: string, leaverIdList: string[])                             : boolean
  public emit(event: 'room-topic',  roomId: string, topic: string, oldTopic: string, changerId: string) : boolean
  public emit(event: 'scan',        qrCode: string, code: number, data?: string)                        : boolean
  public emit(event: 'start')                                                                           : boolean
  public emit(event: 'stop')                                                                            : boolean

  /**
   * Internal Usage
   */
  public emit(event: 'watchdog',    food: WatchdogFood) : boolean

  public emit(event: never, ...args: never[]): never

  public emit(
    event:   PuppetEventName,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }

  // public on(event: 'error',       listener: (e: Error) => void)                                                      : this
  // public on(event: 'friend',      listener: (request: FriendRequest) => void)                                        : this
  // public on(event: 'heartbeat',   listener: (data: string) => void)                                                  : this
  // public on(event: 'login',       listener: (user: Contact) => void)                                                 : this
  // public on(event: 'logout',      listener: (user: Contact) => void)                                                 : this
  // public on(event: 'message',     listener: (message: Message) => void)                                              : this
  // public on(event: 'room-join',   listener: (room: Room, inviteeList: Contact[],  inviter: Contact) => void)         : this
  // public on(event: 'room-leave',  listener: (room: Room, leaverList: Contact[]) => void)                             : this
  // public on(event: 'room-topic',  listener: (room: Room, topic: string, oldTopic: string, changer: Contact) => void) : this
  // public on(event: 'scan',        listener: (info: ScanPayload) => void)                                             : this

  // /**
  //  * Internal Usage
  //  */
  // public on(event: 'watchdog',    listener: (data: WatchdogFood) => void) : this

  public on(event: 'error',       listener: (error: string) => void)                                                      : this
  public on(event: 'friend',      listener: (payload: string) => void)                                                    : this
  public on(event: 'heartbeat',   listener: (data: string) => void)                                                       : this
  public on(event: 'login',       listener: (contactId: string) => void)                                                  : this
  public on(event: 'logout',      listener: (contactId: string) => void)                                                  : this
  public on(event: 'message',     listener: (messageId: string) => void)                                                  : this
  public on(event: 'room-join',   listener: (roomId: string, inviteeIdList: string[],  inviterId: string) => void)        : this
  public on(event: 'room-leave',  listener: (roomId: string, leaverIdList: string[]) => void)                             : this
  public on(event: 'room-topic',  listener: (roomId: string, topic: string, oldTopic: string, changerId: string) => void) : this
  public on(event: 'scan',        listener: (qrCode: string, code: number, data?: string) => void)                        : this
  public on(event: 'start',       listener: () => void)                                                                   : this
  public on(event: 'stop',        listener: () => void)                                                                   : this
  /**
   * Internal Usage
   */
  public on(event: 'watchdog',    listener: (data: WatchdogFood) => void) : this

  public on(event: never, listener: never): never

  public on(
    event:    PuppetEventName,
    listener: (...args: any[]) => void,
  ): this {
    super.on(event, listener)
    return this
  }

  public version(): string {
    if (this.childPkg) {
      return this.childPkg.version
    }
    return '0.0.0'
  }

  /**
   * will be used by semver.satisfied(version, range)
   */
  public wechatyVersionRange(strict = false): string {
    // FIXME: for development, we use `*` if not set
    if (strict) {
      return '^0.16.0'
    }

    return '*'

    // TODO: test and uncomment the following codes after promote the `wehcaty-puppet` as a solo NPM module

    // if (this.pkg.dependencies && this.pkg.dependencies.wechaty) {
    //   throw new Error('Wechaty Puppet Implementation should add `wechaty` from `dependencies` to `peerDependencies` in package.json')
    // }

    // if (!this.pkg.peerDependencies || !this.pkg.peerDependencies.wechaty) {
    //   throw new Error('Wechaty Puppet Implementation should add `wechaty` to `peerDependencies`')
    // }

    // if (!this.pkg.engines || !this.pkg.engines.wechaty) {
    //   throw new Error('Wechaty Puppet Implementation must define `package.engines.wechaty` for a required Version Range')
    // }

    // return this.pkg.engines.wechaty
  }

  public abstract async start() : Promise<void>
  public abstract async stop()  : Promise<void>

  public selfId(): string {
    log.verbose('Puppet', 'self()')

    if (!this.id) {
      throw new Error('not logged in, no userSelf yet.')
    }

    return this.id
  }

  public async say(textOrFile: string | FileBox) : Promise<void> {
    if (!this.logonoff()) {
      throw new Error('can not say before login')
    }

    if (typeof textOrFile === 'string') {
      await this.messageSendText({
        contactId: this.selfId(),
      }, textOrFile)
    } else if (textOrFile instanceof FileBox) {
      await this.messageSendFile({
        contactId: this.selfId(),
      }, textOrFile)
    } else {
      throw new Error('say() arg unknown')
    }
  }

  /**
   * Login / Logout
   */
  public logonoff(): boolean {
    if (this.id) {
      return true
    } else {
      return false
    }
  }

  public abstract async logout(): Promise<void>
  protected async login(userId: string): Promise<void> {
    log.verbose('Puppet', 'login(%s)', userId)

    if (this.id) {
      throw new Error('can only login once!')
    }

    this.id = userId
    // console.log('this.id=', this.id)
    this.emit('login', userId)
  }

  /**
   *
   * Message
   *
   */
  public abstract async messageFile(messageId: string)                  : Promise<FileBox>
  public abstract async messageForward(to: Receiver, messageId: string) : Promise<void>
  public abstract async messageSendText(to: Receiver, text: string)     : Promise<void>
  public abstract async messageSendFile(to: Receiver, file: FileBox)    : Promise<void>

  public abstract async messageRawPayload(id: string)            : Promise<any>
  public abstract async messageRawPayloadParser(rawPayload: any) : Promise<MessagePayload>

  public async messagePayload(
    id: string,
    noCache = false,
  ): Promise<MessagePayload> {
    log.verbose('Puppet', 'messagePayload(id=%s, noCache=%s)', id, noCache)

    if (noCache) {
      log.silly('Puppet', 'messagePayload() cache PURGE')
      this.cacheMessagePayload.del(id)
    }

    const hitPayload = this.cacheMessagePayload.get(id)

    if (hitPayload) {
      log.silly('Puppet', 'messagePayload() cache HIT')

      return hitPayload
    }

    log.silly('Puppet', 'messagePayload() cache MISS')

    const rawPayload = await this.messageRawPayload(id)
    const payload    = await this.messageRawPayloadParser(rawPayload)

    return payload
  }

  /**
   *
   * FriendRequest
   *
   */
  public abstract async friendRequestSend(contactId: string, hello?: string)   : Promise<void>
  public abstract async friendRequestAccept(contactId: string, ticket: string) : Promise<void>

  public async friendRequestPayload(
    id: string,
    noCache = false,
  ): Promise<FriendRequestPayload> {
    log.verbose('Puppet', 'friendRequestPayload(id=%s, noCache=%s)', id, noCache)

    if (noCache) {
      log.silly('Puppet', 'friendRequestPayload() cache PURGE')
      this.cacheFriendRequestPayload.del(id)
    }

    const hitPayload = this.cacheFriendRequestPayload.get(id)

    if (hitPayload) {
      log.silly('Puppet', 'friendRequestPayload() cache HIT')
      return hitPayload
    }

    log.silly('Puppet', 'friendRequestPayload() cache MISS')

    throw new Error('no payload')
  }
  /**
   *
   * Room
   *
   */
  public abstract async roomAdd(roomId: string, contactId: string)          : Promise<void>
  public abstract async roomCreate(contactIdList: string[], topic?: string) : Promise<string>
  public abstract async roomDel(roomId: string, contactId: string)          : Promise<void>
  public abstract async roomFindAll(query?: RoomQueryFilter)                : Promise<string[]>
  public abstract async roomQuit(roomId: string)                            : Promise<void>
  public abstract async roomTopic(roomId: string, topic?: string)           : Promise<string | void>

  public abstract async roomRawPayload(id: string)            : Promise<any>
  public abstract async roomRawPayloadParser(rawPayload: any) : Promise<RoomPayload>

  public async roomPayload(
    id: string,
    noCache = false,
  ): Promise<RoomPayload> {
    log.verbose('Puppet', 'roomPayload(id=%s, noCache=%s)', id, noCache)

    if (noCache) {
      log.silly('Puppet', 'roomPayload() cache PURGE')
      this.cacheRoomPayload.del(id)
    }

    const hitPayload = this.cacheRoomPayload.get(id)

    if (hitPayload) {
      log.silly('Puppet', 'roomPayload() cache HIT')
      return hitPayload
    }

    log.silly('Puppet', 'roomPayload() cache MISS')

    const rawPayload = await this.roomRawPayload(id)
    const payload    = await this.roomRawPayloadParser(rawPayload)
    return payload
  }

  /**
   *
   * Contact
   *
   */
  public abstract async contactAlias(contactId: string)                       : Promise<string>
  public abstract async contactAlias(contactId: string, alias: string | null) : Promise<void>
  public abstract async contactAlias(contactId: string, alias?: string|null)  : Promise<string | void>
  public abstract async contactAvatar(contactId: string)                      : Promise<FileBox>
  public abstract async contactFindAll(query?: ContactQueryFilter)            : Promise<string[]>

  public abstract async contactRawPayload(id: string)            : Promise<any>
  public abstract async contactRawPayloadParser(rawPayload: any) : Promise<ContactPayload>

  public async contactPayload(
    id: string,
    noCache = false,
  ): Promise<ContactPayload> {
    log.silly('Puppet', 'contactPayload(id=%s, noCache=%s) @ %s', id, noCache, this)

    if (noCache) {
      log.silly('Puppet', 'contactPayload() cache PURGE')
      this.cacheContactPayload.del(id)
    }

    const hitPayload = this.cacheContactPayload.get(id)

    if (hitPayload) {
      log.silly('Puppet', 'contactPayload() cache HIT')
      return hitPayload
    }

    log.silly('Puppet', 'contactPayload() cache MISS')

    const rawPayload = await this.contactRawPayload(id)
    const payload    = await this.contactRawPayloadParser(rawPayload)
    return payload
  }

  /**
   *
   * Misc
   *
   */
  public abstract async ding(data?: any) : Promise<string>

}

// export class WechatError extends Error {
//   public code: WechatErrorCode
// }

export default Puppet
