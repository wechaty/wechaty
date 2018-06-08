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

import normalize   from 'normalize-package-data'
import readPkgUp   from 'read-pkg-up'
import LRU         from 'lru-cache'

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

// import {
//   PUPPET_EVENT_DICT,
// }                       from './schemas/puppet'
import {
  Sayable,
  log,
}                       from '../config'

import {
  ContactPayload,
  ContactQueryFilter,
  ContactPayloadFilterFunction,
}                                 from './schemas/contact'
import {
  FriendRequestPayload,
}                                 from './schemas/friend-request'
import {
  MessagePayload,
}                                 from './schemas/message'
import {
  RoomPayload,
  RoomQueryFilter,
  RoomMemberQueryFilter,
  RoomPayloadFilterFunction,
  RoomMemberPayload,
}                                 from './schemas/room'

import {
  PuppetEventName,
  PuppetOptions,
  Receiver,
}                       from './schemas/puppet'

let PUPPET_COUNTER = 0

/**
 *
 * Puppet Base Class
 *
 * See: https://github.com/Chatie/wechaty/wiki/Puppet
 *
 */
export abstract class Puppet extends EventEmitter implements Sayable {

  public readonly cacheContactPayload       : LRU.Cache<string, ContactPayload>
  public readonly cacheFriendRequestPayload : LRU.Cache<string, FriendRequestPayload>
  public readonly cacheMessagePayload       : LRU.Cache<string, MessagePayload>
  public readonly cacheRoomPayload          : LRU.Cache<string, RoomPayload>
  public readonly cacheRoomMemberPayload    : LRU.Cache<string, RoomMemberPayload>

  protected readonly state    : StateSwitch
  protected readonly watchdog : Watchdog
  protected readonly counter  : number

  /**
   * childPkg stores the `package.json` that the NPM module who extends the `Puppet`
   */
  private readonly childPkg: undefined | normalize.Package

  /**
   * Login-ed User ID
   */
  protected id?: string

  /**
   *
   *
   * Constructor
   *
   *
   */
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
    this.cacheRoomMemberPayload    = new LRU<string, RoomMemberPayload>(lruOptions)

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
    return [
      `Puppet#`,
      this.counter,
      '<',
      this.constructor.name,
      '>',
      '(',
      this.options.memory.name,
      ')',
    ].join('')
  }

  /**
   *
   *
   * Events
   *
   *
   */
  public emit(event: 'error',       error: string)                                                      : boolean
  public emit(event: 'friend',      requestId: string)                                                  : boolean
  public emit(event: 'login',       contactId: string)                                                  : boolean
  public emit(event: 'logout',      contactId: string)                                                  : boolean
  public emit(event: 'message',     messageId: string)                                                  : boolean
  public emit(event: 'room-join',   roomId: string, inviteeIdList: string[],  inviterId: string)        : boolean
  public emit(event: 'room-leave',  roomId: string, leaverIdList: string[], remover?: string)           : boolean
  public emit(event: 'room-topic',  roomId: string, topic: string, oldTopic: string, changerId: string) : boolean
  public emit(event: 'scan',        qrCode: string, status: number, data?: string)                      : boolean
  public emit(event: 'start')                                                                           : boolean
  public emit(event: 'stop')                                                                            : boolean
  // Internal Usage: watchdog
  public emit(event: 'watchdog',    food: WatchdogFood) : boolean

  public emit(event: never, ...args: never[]): never

  public emit(
    event:   PuppetEventName,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }

  /**
   *
   *
   * Listeners
   *
   *
   */
  public on(event: 'error',       listener: (error: string) => void)                                                      : this
  public on(event: 'friend',      listener: (requestId: string) => void)                                                  : this
  public on(event: 'login',       listener: (contactId: string) => void)                                                  : this
  public on(event: 'logout',      listener: (contactId: string) => void)                                                  : this
  public on(event: 'message',     listener: (messageId: string) => void)                                                  : this
  public on(event: 'room-join',   listener: (roomId: string, inviteeIdList: string[], inviterId:  string) => void)        : this
  public on(event: 'room-leave',  listener: (roomId: string, leaverIdList : string[], removerId?: string) => void)        : this
  public on(event: 'room-topic',  listener: (roomId: string, topic: string, oldTopic: string, changerId: string) => void) : this
  public on(event: 'scan',        listener: (qrCode: string, status: number, data?: string) => void)                      : this
  public on(event: 'start',       listener: () => void)                                                                   : this
  public on(event: 'stop',        listener: () => void)                                                                   : this
  // Internal Usage: watchdog
  public on(event: 'watchdog',    listener: (data: WatchdogFood) => void) : this

  public on(event: never, listener: never): never

  public on(
    event:    PuppetEventName,
    listener: (...args: any[]) => void,
  ): this {
    super.on(event, listener)
    return this
  }

  /**
   *
   *
   * Start / Stop
   *
   *
   */
  public abstract async start() : Promise<void>
  public abstract async stop()  : Promise<void>

  /**
   *
   *
   * Login / Logout
   *
   *
   */

   /**
    * Need to be called internaly when the puppet is logined.
    * this method will emit a `login` event
    */
  protected async login(userId: string): Promise<void> {
    log.verbose('Puppet', 'login(%s)', userId)

    if (this.id) {
      throw new Error('must logout first before login again!')
    }

    this.id = userId
    // console.log('this.id=', this.id)
    this.emit('login', userId)
  }

  /**
   * Need to be called internaly/externaly when the puppet need to be logouted
   * this method will emit a `logout` event,
   *
   * Note: must set `this.id = undefined` in this function.
   */
  public abstract async logout(): Promise<void>

  public selfId(): string {
    log.verbose('Puppet', 'self()')

    if (!this.id) {
      throw new Error('not logged in, no userSelf yet.')
    }

    return this.id
  }

  public logonoff(): boolean {
    if (this.id) {
      return true
    } else {
      return false
    }
  }

  /**
   *
   * Misc
   *
   */
  public abstract async ding(data?: any) : Promise<string>

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
   *
   * Contact
   *
   */
  public abstract async contactAlias(contactId: string)                       : Promise<string>
  public abstract async contactAlias(contactId: string, alias: string | null) : Promise<void>
  public abstract async contactAlias(contactId: string, alias?: string|null)  : Promise<string | void>
  public abstract async contactAvatar(contactId: string)                      : Promise<FileBox>
  public abstract async contactList()                                         : Promise<string[]>

  public abstract async contactRawPayload(contactId: string)     : Promise<any>
  public abstract async contactRawPayloadParser(rawPayload: any) : Promise<ContactPayload>

  public async contactSearch(
    query?        : ContactQueryFilter,
    searchIdList? : string[],
  ): Promise<string[]> {
    log.verbose('Puppet', 'contactSearch(query=%s, %s)',
                          JSON.stringify(query),
                          searchIdList
                            ? `idList.length = ${searchIdList.length}`
                            : '',
                )

    if (!searchIdList) {
      searchIdList = await this.contactList()
    }

    if (!query) {
      return searchIdList
    }

    const searchContactPayloadList: ContactPayload[] = await Promise.all(
      searchIdList.map(
        id => this.contactPayload(id),
      ),
    )

    const filterFuncion: ContactPayloadFilterFunction = this.contactQueryFilterFactory(query)

    const idList: string[] = searchContactPayloadList
                    .filter(filterFuncion)
                    .map(payload => payload.id)

    return idList
  }

  protected contactQueryFilterFactory(
    query: ContactQueryFilter,
  ): ContactPayloadFilterFunction {
    log.verbose('Puppet', 'contactQueryFilterFactory(%s)',
                            JSON.stringify(query),
                )

    Object.keys(query).forEach(key => {
      if (query[key as keyof ContactQueryFilter] === undefined) {
        delete query[key as keyof ContactQueryFilter]
      }
    })

    if (Object.keys(query).length !== 1) {
      throw new Error('query only support one key. multi key support is not availble now.')
    }

    const filterKey = Object.keys(query)[0] as keyof ContactQueryFilter

    if (!/^name|alias$/.test(filterKey)) {
      throw new Error('key not supported: ' + filterKey)
    }

    // TypeScript bug: have to set `undefined | string | RegExp` at here, or the later code type check will get error
    const filterValue: undefined | string | RegExp = query[filterKey]
    if (!filterValue) {
      throw new Error('filterValue not found for filterKey: ' + filterKey)
    }

    let filterFunction

    if (typeof filterValue === 'string') {
      filterFunction = (payload: ContactPayload) => filterValue === payload[filterKey]
    } else if (filterValue instanceof RegExp) {
      filterFunction = (payload: ContactPayload) => !!payload[filterKey] && filterValue.test(payload[filterKey]!)
    } else {
      throw new Error('unsupport filterValue type: ' + typeof filterValue)
    }

    return filterFunction
  }

  public contactPayloadCache(contactId: string): undefined | ContactPayload {
    log.silly('Puppet', 'contactPayloadCache(id=%s) @ %s', contactId, this)
    if (!contactId) {
      throw new Error('no id')
    }
    const cachedPayload = this.cacheContactPayload.get(contactId)

    if (cachedPayload) {
      log.silly('Puppet', 'contactPayload() cache HIT')
    } else {
      log.silly('Puppet', 'contactPayload() cache MISS')
    }

    return cachedPayload
  }

  public async contactPayload(
    contactId: string,
    noCache = false,
  ): Promise<ContactPayload> {
    log.silly('Puppet', 'contactPayload(id=%s, noCache=%s) @ %s', contactId, noCache, this)

    if (!contactId) {
      throw new Error('no id')
    }

    if (noCache) {
      log.silly('Puppet', 'contactPayload() cache PURGE')

      this.cacheContactPayload.del(contactId)

    } else {
      const cachedPayload = this.contactPayloadCache(contactId)
      if (cachedPayload) {

        return cachedPayload

      }
    }

    /**
     * Cache not found
     */
    const rawPayload = await this.contactRawPayload(contactId)
    const payload    = await this.contactRawPayloadParser(rawPayload)

    this.cacheContactPayload.set(contactId, payload)
    log.silly('Puppet', 'contactPayload() cache SET')

    return payload
  }

  /**
   *
   * FriendRequest
   *
   */
  public abstract async friendRequestSend(contactId: string, hello?: string)   : Promise<void>
  public abstract async friendRequestAccept(contactId: string, ticket: string) : Promise<void>

  public abstract async friendRequestRawPayload(friendRequestId: string) : Promise<any>
  public abstract async friendRequestRawPayloadParser(rawPayload: any)   : Promise<FriendRequestPayload>

  public friendRequestPayloadCache(friendRequestId: string): undefined | FriendRequestPayload {
    log.silly('Puppet', 'friendRequestPayloadCache(id=%s) @ %s', friendRequestId, this)
    if (!friendRequestId) {
      throw new Error('no id')
    }
    const cachedPayload = this.cacheFriendRequestPayload.get(friendRequestId)

    if (cachedPayload) {
      log.silly('Puppet', 'friendRequestPayload() cache HIT')
    } else {
      log.silly('Puppet', 'friendRequestPayload() cache MISS')
    }

    return cachedPayload
  }

  public async friendRequestPayload(
    friendRequestId: string,
    noCache = false,
  ): Promise<FriendRequestPayload> {
    log.verbose('Puppet', 'friendRequestPayload(id=%s, noCache=%s)', friendRequestId, noCache)

    if (!friendRequestId) {
      throw new Error('no id')
    }

    if (noCache) {
      log.silly('Puppet', 'friendRequestPayload() cache PURGE')

      this.cacheFriendRequestPayload.del(friendRequestId)

    } else {
      const cachedPayload = this.friendRequestPayloadCache(friendRequestId)
      if (cachedPayload) {

        return cachedPayload

      }
    }

    /**
     * Cache not found
     */
    const rawPayload = await this.friendRequestRawPayload(friendRequestId)
    const payload    = await this.friendRequestRawPayloadParser(rawPayload)

    this.cacheFriendRequestPayload.set(friendRequestId, payload)

    return payload
  }

  /**
   *
   * Message
   *
   */
  public abstract async messageFile(messageId: string)                        : Promise<FileBox>
  public abstract async messageForward(receiver: Receiver, messageId: string) : Promise<void>
  public abstract async messageSendText(receiver: Receiver, text: string)     : Promise<void>
  public abstract async messageSendFile(receiver: Receiver, file: FileBox)    : Promise<void>

  public abstract async messageRawPayload(messageId: string)     : Promise<any>
  public abstract async messageRawPayloadParser(rawPayload: any) : Promise<MessagePayload>

  public messagePayloadCache(messageId: string): undefined | MessagePayload {
    log.silly('Puppet', 'messagePayloadCache(id=%s) @ %s', messageId, this)
    if (!messageId) {
      throw new Error('no id')
    }
    const cachedPayload = this.cacheMessagePayload.get(messageId)
    if (cachedPayload) {
      log.silly('Puppet', 'messagePayloadCache() cache HIT')
    } else {
      log.silly('Puppet', 'messagePayloadCache() cache MISS')
    }

    return cachedPayload
  }

  public async messagePayload(
    messageId: string,
    noCache = false,
  ): Promise<MessagePayload> {
    log.verbose('Puppet', 'messagePayload(id=%s, noCache=%s)', messageId, noCache)

    if (!messageId) {
      throw new Error('no id')
    }

    if (noCache) {
      log.silly('Puppet', 'messagePayload() cache PURGE')

      this.cacheMessagePayload.del(messageId)

    } else {
      const cachedPayload = this.messagePayloadCache(messageId)
      if (cachedPayload) {

        return cachedPayload

      }
    }

    /**
     * Cache not found
     */
    const rawPayload = await this.messageRawPayload(messageId)
    const payload    = await this.messageRawPayloadParser(rawPayload)

    this.cacheMessagePayload.set(messageId, payload)
    log.silly('Puppet', 'messagePayload() cache SET')

    return payload
  }

  /**
   *
   * Room
   *
   */
  public abstract async roomAdd(roomId: string, contactId: string)          : Promise<void>
  public abstract async roomAvatar(roomId: string)                          : Promise<FileBox>
  public abstract async roomCreate(contactIdList: string[], topic?: string) : Promise<string>
  public abstract async roomDel(roomId: string, contactId: string)          : Promise<void>
  public abstract async roomQuit(roomId: string)                            : Promise<void>

  public abstract async roomTopic(roomId: string)                 : Promise<string>
  public abstract async roomTopic(roomId: string, topic: string)  : Promise<void>
  public abstract async roomTopic(roomId: string, topic?: string) : Promise<string | void>

  public abstract async roomList()                     : Promise<string[]>
  public abstract async roomMemberList(roomId: string) : Promise<string[]>

  public abstract async roomRawPayload(roomId: string)        : Promise<any>
  public abstract async roomRawPayloadParser(rawPayload: any) : Promise<RoomPayload>

  public abstract async roomMemberRawPayload(roomId: string, contactId: string) : Promise<any>
  public abstract async roomMemberRawPayloadParser(rawPayload: any)             : Promise<RoomMemberPayload>

  public async roomMemberSearch(
    roomId : string,
    query  : string | RoomMemberQueryFilter,
  ): Promise<string[]> {
    log.verbose('Puppet', 'roomMemberSearch(%s, %s)', roomId, JSON.stringify(query))

    /**
     * 1. for Text Query
     */
    if (typeof query === 'string') {
      let contactIdList: string[] = []
      contactIdList = contactIdList.concat(
        await this.roomMemberSearch(roomId, { name:          query }),
        await this.roomMemberSearch(roomId, { contactAlias:  query }),
        await this.roomMemberSearch(roomId, { roomAlias:     query }),
      )
      // Keep the unique id only
      // https://stackoverflow.com/a/14438954/1123955
      return [...new Set(contactIdList)]
    }

    /**
     * 2. for RoomMemberQueryFilter
     */
    // const roomPayload = await this.roomPayload(roomId)
    const memberIdList = await this.roomMemberList(roomId)

    let idList: string[] = []

    if (query.contactAlias || query.name) {
      const contactQueryFilter: ContactQueryFilter = {
        name  : query.name,
        alias : query.contactAlias,
      }

      idList = idList.concat(
        await this.contactSearch(
          contactQueryFilter,
          memberIdList,
        ),
      )
    }

    const memberPayloadList = await Promise.all(
      memberIdList.map(
        async contactId => await this.roomMemberPayload(roomId, contactId),
      ),
    )

    if (query.roomAlias) {
      idList = idList.concat(
        // Object.keys(roomPayload.aliasDict).filter(
        //   id => roomPayload.aliasDict[id] === query.roomAlias,
        // ),
        memberPayloadList.filter(
          payload => payload.roomAlias === query.roomAlias,
        ).map(payload => payload.id),
      )
    }

    return idList
  }

  public async roomSearch(query?: RoomQueryFilter): Promise<string[]> {
    log.verbose('Puppet', 'roomSearch(%s)', JSON.stringify(query))

    const allRoomIdList: string[] = await this.roomList()
    log.silly('Puppet', 'roomSearch() allRoomIdList.length=%d', allRoomIdList.length)

    if (!query || Object.keys(query).length <= 0) {
      return allRoomIdList
    }

    const roomPayloadList = await Promise.all(
      allRoomIdList.map(
        id => this.roomPayload(id),
      ),
    )
    console.log('roomPayload resolved.')

    const filterFunction = this.roomQueryFilterFactory(query)

    const roomIdList = roomPayloadList
                        .filter(filterFunction)
                        .map(payload => payload.id)

    console.log('roomIdList filtered. result length=' + roomIdList.length)

    return roomIdList
  }

  protected roomQueryFilterFactory(
    query: RoomQueryFilter,
  ): RoomPayloadFilterFunction {
    log.verbose('Puppet', 'roomQueryFilterFactory(%s)',
                            JSON.stringify(query),
                )

    if (Object.keys(query).length !== 1) {
      throw new Error('query only support one key. multi key support is not availble now.')
    }

    // TypeScript bug: have to set `undefined | string | RegExp` at here, or the later code type check will get error
    const filterKey = Object.keys(query)[0] as keyof RoomQueryFilter
    if (filterKey !== 'topic') {
      throw new Error('query key unknown: ' + filterKey)
    }

    const filterValue: undefined | string | RegExp = query[filterKey]
    if (!filterValue) {
      throw new Error('filterValue not found for filterKey: ' + filterKey)
    }

    let filterFunction: RoomPayloadFilterFunction

    if (filterValue instanceof RegExp) {
      filterFunction = (payload: RoomPayload) => filterValue.test(payload[filterKey])
    } else if (typeof filterValue === 'string') {
      filterFunction = (payload: RoomPayload) => filterValue === payload[filterKey]
    } else {
      throw new Error('unsupport filterValue: ' + typeof filterValue)
    }

    return filterFunction
  }

  public roomPayloadCache(roomId: string): undefined | RoomPayload {
    log.silly('Puppet', 'roomPayloadCache(id=%s) @ %s', roomId, this)
    if (!roomId) {
      throw new Error('no id')
    }
    const cachedPayload = this.cacheRoomPayload.get(roomId)
    if (cachedPayload) {
      log.silly('Puppet', 'roomPayloadCache() cache HIT')
    } else {
      log.silly('Puppet', 'roomPayloadCache() cache MISS')
    }

    return cachedPayload
  }

  public async roomPayload(
    roomId: string,
    noCache = false,
  ): Promise<RoomPayload> {
    log.verbose('Puppet', 'roomPayload(id=%s, noCache=%s)', roomId, noCache)

    if (!roomId) {
      throw new Error('no id')
    }

    if (noCache) {
      log.silly('Puppet', 'roomPayload() cache PURGE')

      this.cacheRoomPayload.del(roomId)

    } else {
      const cachedPayload = this.roomPayloadCache(roomId)
      if (cachedPayload) {

        return cachedPayload

      }
    }

    /**
     * Cache not found
     */
    const rawPayload = await this.roomRawPayload(roomId)
    const payload    = await this.roomRawPayloadParser(rawPayload)

    this.cacheRoomPayload.set(roomId, payload)
    log.silly('Puppet', 'roomPayload() cache SET')

    return payload
  }

  private cacheKeyRoomMember(
    roomId    : string,
    contactId : string,
  ): string {
    return contactId + '@@@' + roomId
  }

  public roomMemberPayloadCache(roomId: string, contactId: string): undefined | RoomMemberPayload {
    log.silly('Puppet', 'roomMemberPayloadCache(id=%s) @ %s', roomId, this)

    if (!roomId || !contactId) {
      throw new Error('no id')
    }

    const cacheKey      = this.cacheKeyRoomMember(roomId, contactId)
    const cachedPayload = this.cacheRoomMemberPayload.get(cacheKey)

    if (cachedPayload) {
      log.silly('Puppet', 'roomMemberPayloadCache() cache HIT')
    } else {
      log.silly('Puppet', 'roomMemberPayloadCache() cache MISS')
    }

    return cachedPayload
  }

  public async roomMemberPayload(
    roomId    : string,
    contactId : string,
    noCache = false,
  ): Promise<RoomMemberPayload> {
    log.verbose('Puppet', 'roomMemberPayload(roomId=%s, contactId=%s noCache=%s)', roomId, contactId, noCache)

    if (!roomId || !contactId) {
      throw new Error('no id')
    }

    const cacheKey = this.cacheKeyRoomMember(roomId, contactId)

    if (noCache) {
      log.silly('Puppet', 'roomMemberPayload() cache PURGE')

      this.cacheRoomMemberPayload.del(cacheKey)

    } else {
      const cachedPayload = this.roomMemberPayloadCache(roomId, contactId)

      if (cachedPayload) {
        return cachedPayload
      }
    }

    /**
     * Cache not found
     */
    const rawPayload = await this.roomMemberRawPayload(roomId, contactId)
    const payload    = await this.roomMemberRawPayloadParser(rawPayload)

    this.cacheRoomMemberPayload.set(cacheKey, payload)
    log.silly('Puppet', 'roomMemberPayload() cache SET')

    return payload
  }

}

export default Puppet
