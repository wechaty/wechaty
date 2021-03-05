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
import QuickLru, {
  Options as QuickLruOptions,
}                             from 'quick-lru'

import { Watchdog }       from 'watchdog'
import { Constructor }    from 'clone-class'
import { StateSwitch }    from 'state-switch'
import { ThrottleQueue }  from 'rx-queue'
import { callerResolve }  from 'hot-import'

import normalize               from 'normalize-package-data'
import readPkgUp               from 'read-pkg-up'

import {
  FileBox,
  MemoryCard,
  log,
}                       from './config'

import {
  ContactPayload,
  ContactPayloadFilterFunction,
  ContactQueryFilter,
}                                 from './schemas/contact'
import {
  EventLoginPayload,
}                                 from './schemas/event'
import {
  FriendshipAddOptions,
  FriendshipPayload,
  FriendshipSearchQueryFilter,
}                                 from './schemas/friendship'
import {
  ImageType,
}                                 from './schemas/image'
import {
  MessagePayload,
  MessagePayloadFilterFunction,
  MessageQueryFilter,
  MessageType,
}                                 from './schemas/message'
import {
  RoomMemberPayload,
  RoomMemberQueryFilter,
  RoomPayload,
  RoomPayloadFilterFunction,
  RoomQueryFilter,
}                                 from './schemas/room'
import {
  RoomInvitationPayload,
}                                 from './schemas/room-invitation'
import {
  UrlLinkPayload,
}                                 from './schemas/url-link'
import {
  MiniProgramPayload,
}                                 from './schemas/mini-program'
import {
  PuppetOptions,
  YOU,
}                                 from './schemas/puppet'
import { PayloadType }             from './schemas/payload'

import { throwUnsupportedError }   from './throw-unsupported-error'
import { PuppetEventEmitter }      from './events'

const DEFAULT_WATCHDOG_TIMEOUT = 60
let   PUPPET_COUNTER           = 0

/**
 *
 * Puppet Base Class
 *
 * See: https://github.com/Chatie/wechaty/wiki/Puppet
 *
 */
export abstract class Puppet extends PuppetEventEmitter {

  /**
   * Must overwrite by child class to identify their version
   */
  public static readonly VERSION : string = '0.0.0'

  public readonly state: StateSwitch

  protected readonly cacheContactPayload        : QuickLru<string, ContactPayload>
  protected readonly cacheFriendshipPayload     : QuickLru<string, FriendshipPayload>
  protected readonly cacheMessagePayload        : QuickLru<string, MessagePayload>
  protected readonly cacheRoomPayload           : QuickLru<string, RoomPayload>
  protected readonly cacheRoomMemberPayload     : QuickLru<string, RoomMemberPayload>
  protected readonly cacheRoomInvitationPayload : QuickLru<string, RoomInvitationPayload>

  protected readonly counter : number
  protected memory          : MemoryCard

  /**
   * Login-ed User ID
   */
  protected id?: string

  protected readonly watchdog : Watchdog

  /**
   * childPkg stores the `package.json` that the NPM module who extends the `Puppet`
   */
  private readonly childPkg: normalize.Package

  /**
   * Throttle Reset Events
   */
  private resetThrottleQueue: ThrottleQueue<string>

  /**
   *
   *
   * Constructor
   *
   *
   */
  constructor (
    protected options: PuppetOptions = {},
  ) {
    super()

    this.counter = PUPPET_COUNTER++
    log.verbose('Puppet', 'constructor(%s) #%d', JSON.stringify(options), this.counter)

    this.state  = new StateSwitch(this.constructor.name, { log })

    this.memory = new MemoryCard() // dummy memory
    this.memory.load()  // load here is for testing only
      .then(() => undefined)
      .catch(e => log.warn('Puppet', 'constructor() memory.load() rejection: %s', e))

    /**
     * 1. Setup Watchdog
     *  puppet implementation class only need to do one thing:
     *  feed the watchdog by `this.emit('heartbeat', ...)`
     */
    const timeout = this.options.timeout || DEFAULT_WATCHDOG_TIMEOUT
    log.verbose('Puppet', 'constructor() watchdog timeout set to %d seconds', timeout)
    this.watchdog = new Watchdog(1000 * timeout, 'Puppet')

    /**
     * 2. Setup `reset` Event via a 1 second Throttle Queue:
     */
    this.resetThrottleQueue = new ThrottleQueue<string>(1000)
    this.resetThrottleQueue.subscribe(reason => {
      log.silly('Puppet', 'constructor() resetThrottleQueue.subscribe() reason: "%s"', reason)
      this.reset(reason)
    })

    /**
     * 3. Setup LRU Caches
     */
    const lruOptions = (maxSize = 100): QuickLruOptions<any, any> => ({ maxSize })

    this.cacheContactPayload        = new QuickLru<string, ContactPayload>(lruOptions(3000))
    this.cacheFriendshipPayload     = new QuickLru<string, FriendshipPayload>(lruOptions(100))
    this.cacheMessagePayload        = new QuickLru<string, MessagePayload>(lruOptions(500))
    this.cacheRoomPayload           = new QuickLru<string, RoomPayload>(lruOptions(500))
    this.cacheRoomInvitationPayload = new QuickLru<string, RoomInvitationPayload>(lruOptions(100))
    this.cacheRoomMemberPayload     = new QuickLru<string, RoomMemberPayload>(lruOptions(60 * 500))

    /**
     * 4. Load the package.json for Puppet Plugin version range matching
     *
     * For: dist/src/puppet/puppet.ts
     *  We need to up 3 times: ../../../package.json
     */
    try {
      const childClassPath = callerResolve('.', __filename)
      log.verbose('Puppet', 'constructor() childClassPath=%s', childClassPath)

      this.childPkg = readPkgUp.sync({ cwd: childClassPath })!.packageJson
    } catch (e) {
      log.error('Puppet', 'constructor() %s', e)
      throw e
    }

    if (!this.childPkg) {
      throw new Error('Cannot found package.json for Puppet Plugin Module')
    }

    normalize(this.childPkg)

    this.feedDog = this.feedDog.bind(this)
    this.dogReset = this.dogReset.bind(this)
    this.throttleReset = this.throttleReset.bind(this)
  }

  public toString () {
    return [
      'Puppet#',
      this.counter,
      '<',
      this.constructor.name,
      '>',
      '(',
      this.memory.name || '',
      ')',
    ].join('')
  }

  /**
   * Unref
   */
  public unref (): void {
    log.verbose('Puppet', 'unref()')
    this.watchdog.unref()
  }

  /**
   * @private
   *
   * For used by Wechaty internal ONLY.
   */
  public setMemory (memory: MemoryCard): void {
    log.verbose('Puppet', 'setMemory()')

    if (this.memory.name) {
      throw new Error('puppet has already had a named memory: ' + this.memory.name)
    }

    this.memory = memory
  }

  /**
   *
   *
   * Start / Stop
   *
   *
   */
  public async start () : Promise<void> {
    this.on('heartbeat', this.feedDog)
    this.watchdog.on('reset', this.dogReset)
    this.on('reset', this.throttleReset)
  }

  public async stop (): Promise<void> {
    this.removeListener('heartbeat', this.feedDog)
    this.watchdog.removeListener('reset', this.dogReset)
    this.removeListener('reset', this.throttleReset)

    this.watchdog.sleep()

    /**
     * FIXME: Huan(202008) clear cache when stop
     *  keep the cache as a temp workaround since wechaty-puppet-hostie has reconnect issue
     *  with un-cleared cache in wechaty-puppet will make the reconnect recoverable
     *
     * Related issue: https://github.com/wechaty/wechaty-puppet-hostie/issues/31
     */
    // this.cacheContactPayload.clear()
    // this.cacheFriendshipPayload.clear()
    // this.cacheMessagePayload.clear()
    // this.cacheRoomPayload.clear()
    // this.cacheRoomInvitationPayload.clear()
    // this.cacheRoomMemberPayload.clear()
  }

  private feedDog (payload: any) {
    this.watchdog.feed(payload)
  }

  private dogReset (lastFood: any) {
    log.warn('Puppet', 'dogReset() reason: %s', JSON.stringify(lastFood))
    this.emit('reset', lastFood)
  }

  private throttleReset (payload: any) {
    log.silly('Puppet', 'throttleReset() payload: "%s"', JSON.stringify(payload))
    if (this.resetThrottleQueue) {
      this.resetThrottleQueue.next(payload.data)
    } else {
      log.warn('Puppet', 'Drop reset since no resetThrottleQueue.')
    }
  }

  /**
   * Huan(201808):
   *  reset() Should not be called directly.
   *  `protected` is for testing, not for the child class.
   *  should use `emit('reset', 'reason')` instead.
   *
   * Huan(202008): Update from protected to private
   */
  private reset (reason: string): void {
    log.verbose('Puppet', 'reset(%s)', reason)

    /**
     * Huan(202003):
     *  do not care state.off()
     *  reset will cause the puppet to start (?)
     */
    // if (this.state.off()) {
    //   log.verbose('Puppet', 'reset(%s) state is off(), make the watchdog to sleep', reason)
    //   this.watchdog.sleep()
    //   return
    // }

    Promise.resolve()
      .then(() => this.stop())
      .then(() => this.start())
      .catch(e => {
        log.warn('Puppet', 'reset() exception: %s', e)
        this.emit('error', e)
      })
  }

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
  protected async login (userId: string): Promise<void> {
    log.verbose('Puppet', 'login(%s)', userId)

    if (this.id) {
      throw new Error('must logout first before login again!')
    }

    this.id = userId
    // console.log('this.id=', this.id)

    const payload: EventLoginPayload = {
      contactId: userId,
    }

    this.emit('login', payload)
  }

  /**
   * Need to be called internaly/externaly when the puppet need to be logouted
   * this method will emit a `logout` event,
   *
   * Note: must set `this.id = undefined` in this function.
   */
  public async logout (reason = 'logout()'): Promise<void> {
    log.verbose('Puppet', 'logout(%s)', this.id)

    if (!this.id) {
      throw new Error('must login first before logout!')
    }

    this.emit('logout', {
      contactId : this.id,
      data      : reason,
    })

    this.id = undefined
  }

  public selfId (): string {
    log.verbose('Puppet', 'selfId()')

    if (!this.id) {
      throw new Error('not logged in, no this.id yet.')
    }

    return this.id
  }

  public logonoff (): boolean {
    if (this.id) {
      return true
    } else {
      return false
    }
  }

  /**
   *
   *
   * Misc
   *
   *
   */
  /**
   * Check whether the puppet is work property.
   * @returns `false` if something went wrong
   *          'dong' if everything is OK
   */
  public abstract ding (data?: string) : void

  /**
   * Get the NPM name of the Puppet
   */
  public name () {
    return this.childPkg.name
  }

  /**
   * Get version from the Puppet Implementation
   */
  public version (): string {
    return this.childPkg.version
  }

  /**
   * will be used by semver.satisfied(version, range)
   */
  public wechatyVersionRange (strict = false): string {
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

  /**
   *
   * ContactSelf
   *
   */
  public abstract async contactSelfName (name: string)           : Promise<void>
  public abstract async contactSelfQRCode ()                     : Promise<string /* QR Code Value */>
  public abstract async contactSelfSignature (signature: string) : Promise<void>

  /**
   *
   * Tag
   *  tagContactAdd - add a tag for a Contact. Create it first if it not exist.
   *  tagContactRemove - remove a tag from the Contact
   *  tagContactDelete - delete a tag from Wechat
   *  tagContactList(id) - get tags from a specific Contact
   *  tagContactList() - get tags from all Contacts
   *
   */
  public abstract async tagContactAdd (tagId: string, contactId: string)    : Promise<void>
  public abstract async tagContactDelete (tagId: string)                    : Promise<void>
  public abstract async tagContactList (contactId: string)                  : Promise<string[]>
  public abstract async tagContactList ()                                   : Promise<string[]>
  public abstract async tagContactRemove (tagId: string, contactId: string) : Promise<void>

  /**
   *
   * Contact
   *
   */
  public abstract async contactAlias (contactId: string)                       : Promise<string>
  public abstract async contactAlias (contactId: string, alias: string | null) : Promise<void>

  public abstract async contactAvatar (contactId: string)                : Promise<FileBox>
  public abstract async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  public abstract async contactPhone (contactId: string, phoneList: string[]) : Promise<void>

  public abstract async contactCorporationRemark (contactId: string, corporationRemark: string | null): Promise<void>

  public abstract async contactDescription (contactId: string, description: string | null): Promise<void>

  public abstract async contactList ()                   : Promise<string[]>

  protected abstract async contactRawPayload (contactId: string)     : Promise<any>
  protected abstract async contactRawPayloadParser (rawPayload: any) : Promise<ContactPayload>

  public async contactRoomList (
    contactId: string,
  ): Promise<string[] /* roomId */> {
    log.verbose('Puppet', 'contactRoomList(%s)', contactId)

    const roomIdList = await this.roomList()
    const roomPayloadList = await Promise.all(
      roomIdList.map(
        roomId => this.roomPayload(roomId)
      )
    )
    const resultRoomIdList = roomPayloadList
      .filter(roomPayload => roomPayload.memberIdList.includes(contactId))
      .map(payload => payload.id)

    return resultRoomIdList
  }

  public async contactSearch (
    query?        : string | ContactQueryFilter,
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

    log.silly('Puppet', 'contactSearch() searchIdList.length = %d', searchIdList.length)

    if (!query) {
      return searchIdList
    }

    if (typeof query === 'string') {
      const nameIdList  = await this.contactSearch({ name: query },  searchIdList)
      const aliasIdList = await this.contactSearch({ alias: query }, searchIdList)

      return Array.from(
        new Set([
          ...nameIdList,
          ...aliasIdList,
        ])
      )
    }

    const filterFuncion: ContactPayloadFilterFunction = this.contactQueryFilterFactory(query)

    const BATCH_SIZE = 16
    let   batchIndex = 0

    const resultIdList: string[] = []

    const matchId = async (id: string) => {
      try {
        /**
         * Does LRU cache matter at here?
         */
        // const rawPayload = await this.contactRawPayload(id)
        // const payload    = await this.contactRawPayloadParser(rawPayload)
        const payload = await this.contactPayload(id)

        if (filterFuncion(payload)) {
          return id
        }

      } catch (e) {
        log.silly('Puppet', 'contactSearch() contactPayload exception: %s', e.message)
        await this.dirtyPayloadContact(id)
      }
      return undefined
    }

    while (BATCH_SIZE * batchIndex < searchIdList.length) {
      const batchSearchIdList  = searchIdList.slice(
        BATCH_SIZE * batchIndex,
        BATCH_SIZE * (batchIndex + 1),
      )

      const matchBatchIdFutureList = batchSearchIdList.map(matchId)
      const matchBatchIdList       = await Promise.all(matchBatchIdFutureList)

      const batchSearchIdResultList: string[] = matchBatchIdList.filter(id => !!id) as string[]

      resultIdList.push(...batchSearchIdResultList)

      batchIndex++
    }

    log.silly('Puppet', 'contactSearch() searchContactPayloadList.length = %d', resultIdList.length)

    return resultIdList
  }

  protected contactQueryFilterFactory (
    query: ContactQueryFilter,
  ): ContactPayloadFilterFunction {
    log.verbose('Puppet', 'contactQueryFilterFactory(%s)',
      JSON.stringify(query),
    )

    /**
     * Clean the query for keys with empty value
     */
    Object.keys(query).forEach(key => {
      if (query[key as keyof ContactQueryFilter] === undefined) {
        delete query[key as keyof ContactQueryFilter]
      }
    })

    if (Object.keys(query).length < 1) {
      throw new Error('query must provide at least one key. current query is empty.')
    } else if (Object.keys(query).length > 1) {
      throw new Error('query only support one key. multi key support is not availble now.')
    }

    const filterKey = Object.keys(query)[0].toLowerCase() as keyof ContactQueryFilter

    const isValid = [
      'alias',
      'id',
      'name',
      'weixin',
    ].includes(filterKey)

    if (!isValid) {
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

  /**
   * Check a Contact Id if it's still valid.
   *  For example: talk to the server, and see if it should be deleted in the local cache.
   */
  public async contactValidate (contactId: string) : Promise<boolean> {
    log.silly('Puppet', 'contactValidate(%s) base class just return `true`', contactId)
    return true
  }

  protected contactPayloadCache (contactId: string): undefined | ContactPayload {
    // log.silly('Puppet', 'contactPayloadCache(id=%s) @ %s', contactId, this)
    if (!contactId) {
      throw new Error('no id')
    }
    const cachedPayload = this.cacheContactPayload.get(contactId)

    if (cachedPayload) {
      // log.silly('Puppet', 'contactPayload(%s) cache HIT', contactId)
    } else {
      log.silly('Puppet', 'contactPayload(%s) cache MISS', contactId)
    }

    return cachedPayload
  }

  public async contactPayload (
    contactId: string,
  ): Promise<ContactPayload> {
    // log.silly('Puppet', 'contactPayload(id=%s) @ %s', contactId, this)

    if (!contactId) {
      throw new Error('no id')
    }

    /**
     * 1. Try to get from cache first
     */
    const cachedPayload = this.contactPayloadCache(contactId)
    if (cachedPayload) {
      return cachedPayload
    }

    /**
     * 2. Cache not found
     */
    const rawPayload = await this.contactRawPayload(contactId)
    const payload    = await this.contactRawPayloadParser(rawPayload)

    this.cacheContactPayload.set(contactId, payload)
    log.silly('Puppet', 'contactPayload(%s) cache SET', contactId)

    return payload
  }

  /**
   *
   * Friendship
   *
   */
  public abstract async friendshipAccept (friendshipId: string)           : Promise<void>
  public abstract async friendshipAdd (contactId: string, option?: FriendshipAddOptions) : Promise<void>

  public abstract async friendshipSearchPhone (phone: string)   : Promise<null | string>
  public abstract async friendshipSearchWeixin (weixin: string) : Promise<null | string>

  protected abstract async friendshipRawPayload (friendshipId: string)  : Promise<any>
  protected abstract async friendshipRawPayloadParser (rawPayload: any) : Promise<FriendshipPayload>

  public async friendshipSearch (
    searchQueryFilter: FriendshipSearchQueryFilter,
  ): Promise<string | null> {
    log.verbose('Puppet', 'friendshipSearch("%s")', JSON.stringify(searchQueryFilter))

    if (Object.keys(searchQueryFilter).length !== 1) {
      throw new Error('searchQueryFilter should only include one key for query!')
    }

    if (searchQueryFilter.phone) {
      return this.friendshipSearchPhone(searchQueryFilter.phone)
    } else if (searchQueryFilter.weixin) {
      return this.friendshipSearchWeixin(searchQueryFilter.weixin)
    }

    throw new Error(`unknown key from searchQueryFilter: ${Object.keys(searchQueryFilter).join('')}`)
  }

  protected friendshipPayloadCache (friendshipId: string): undefined | FriendshipPayload {
    log.silly('Puppet', 'friendshipPayloadCache(id=%s) @ %s', friendshipId, this)

    if (!friendshipId) {
      throw new Error('no id')
    }
    const cachedPayload = this.cacheFriendshipPayload.get(friendshipId)

    if (cachedPayload) {
      // log.silly('Puppet', 'friendshipPayloadCache(%s) cache HIT', friendshipId)
    } else {
      log.silly('Puppet', 'friendshipPayloadCache(%s) cache MISS', friendshipId)
    }

    return cachedPayload
  }

  /**
   * Get & Set
   */
  public async friendshipPayload (friendshipId: string)                                : Promise<FriendshipPayload>
  public async friendshipPayload (friendshipId: string, newPayload: FriendshipPayload) : Promise<void>

  public async friendshipPayload (
    friendshipId : string,
    newPayload?  : FriendshipPayload,
  ): Promise<void | FriendshipPayload> {
    log.verbose('Puppet', 'friendshipPayload(%s)',
      friendshipId,
      newPayload
        ? ',' + JSON.stringify(newPayload)
        : '',
    )

    if (typeof newPayload === 'object') {
      await this.cacheFriendshipPayload.set(friendshipId, newPayload)
      return
    }

    /**
     * 1. Try to get from cache first
     */
    const cachedPayload = this.friendshipPayloadCache(friendshipId)
    if (cachedPayload) {
      return cachedPayload
    }

    /**
     * 2. Cache not found
     */
    const rawPayload = await this.friendshipRawPayload(friendshipId)
    const payload    = await this.friendshipRawPayloadParser(rawPayload)

    this.cacheFriendshipPayload.set(friendshipId, payload)

    return payload
  }

  /**
   *
   * Message
   *
   */
  public abstract async messageContact      (messageId: string)                       : Promise<string>
  public abstract async messageFile         (messageId: string)                       : Promise<FileBox>
  public abstract async messageImage        (messageId: string, imageType: ImageType) : Promise<FileBox>
  public abstract async messageMiniProgram  (messageId: string)                       : Promise<MiniProgramPayload>
  public abstract async messageUrl          (messageId: string)                       : Promise<UrlLinkPayload>

  public abstract async messageSendContact      (conversationId: string, contactId: string)                      : Promise<void | string>
  public abstract async messageSendFile         (conversationId: string, file: FileBox)                          : Promise<void | string>
  public abstract async messageSendMiniProgram  (conversationId: string, miniProgramPayload: MiniProgramPayload) : Promise<void | string>
  public abstract async messageSendText         (conversationId: string, text: string, mentionIdList?: string[]) : Promise<void | string>
  public abstract async messageSendUrl          (conversationId: string, urlLinkPayload: UrlLinkPayload)         : Promise<void | string>

  public abstract async messageRecall (messageId: string) : Promise<boolean>

  protected abstract async messageRawPayload (messageId: string)     : Promise<any>
  protected abstract async messageRawPayloadParser (rawPayload: any) : Promise<MessagePayload>

  protected messagePayloadCache (messageId: string): undefined | MessagePayload {
    // log.silly('Puppet', 'messagePayloadCache(id=%s) @ %s', messageId, this)
    if (!messageId) {
      throw new Error('no id')
    }
    const cachedPayload = this.cacheMessagePayload.get(messageId)
    if (cachedPayload) {
      // log.silly('Puppet', 'messagePayloadCache(%s) cache HIT', messageId)
    } else {
      log.silly('Puppet', 'messagePayloadCache(%s) cache MISS', messageId)
    }

    return cachedPayload
  }

  public async messagePayload (
    messageId: string,
  ): Promise<MessagePayload> {
    log.verbose('Puppet', 'messagePayload(%s)', messageId)

    if (!messageId) {
      throw new Error('no id')
    }

    /**
     * 1. Try to get from cache first
     */
    const cachedPayload = this.messagePayloadCache(messageId)
    if (cachedPayload) {
      return cachedPayload
    }

    /**
     * 2. Cache not found
     */
    const rawPayload = await this.messageRawPayload(messageId)
    const payload    = await this.messageRawPayloadParser(rawPayload)

    this.cacheMessagePayload.set(messageId, payload)
    log.silly('Puppet', 'messagePayload(%s) cache SET', messageId)

    return payload
  }

  public messageList (): string[] {
    log.verbose('Puppet', 'messageList()')
    return [...this.cacheMessagePayload.keys()]
  }

  public async messageSearch (
    query?: MessageQueryFilter,
  ): Promise<string[] /* Message Id List */> {
    log.verbose('Puppet', 'messageSearch(%s)', JSON.stringify(query))

    const allMessageIdList: string[] = this.messageList()
    log.silly('Puppet', 'messageSearch() allMessageIdList.length=%d', allMessageIdList.length)

    if (!query || Object.keys(query).length <= 0) {
      return allMessageIdList
    }

    const messagePayloadList: MessagePayload[] = await Promise.all(
      allMessageIdList.map(
        id => this.messagePayload(id)
      ),
    )

    const filterFunction = this.messageQueryFilterFactory(query)

    const messageIdList = messagePayloadList
      .filter(filterFunction)
      .map(payload => payload.id)

    log.silly('Puppet', 'messageSearch() messageIdList filtered. result length=%d', messageIdList.length)

    return messageIdList
  }

  protected messageQueryFilterFactory (
    query: MessageQueryFilter,
  ): MessagePayloadFilterFunction {
    log.verbose('Puppet', 'messageQueryFilterFactory(%s)',
      JSON.stringify(query),
    )

    if (Object.keys(query).length < 1) {
      throw new Error('query empty')
    }

    const filterFunctionList: MessagePayloadFilterFunction[] = []

    const filterKeyList = Object.keys(query) as Array<keyof MessageQueryFilter>

    for (const filterKey of filterKeyList) {
      // TypeScript bug: have to set `undefined | string | RegExp` at here, or the later code type check will get error
      const filterValue: undefined | string | MessageType | RegExp = query[filterKey]
      if (!filterValue) {
        throw new Error('filterValue not found for filterKey: ' + filterKey)
      }

      let filterFunction: MessagePayloadFilterFunction

      if (filterValue instanceof RegExp) {
        filterFunction = (payload: MessagePayload) => filterValue.test(payload[filterKey] as string)
      } else { // if (typeof filterValue === 'string') {
        filterFunction = (payload: MessagePayload) => filterValue === payload[filterKey]
      }

      filterFunctionList.push(filterFunction)
    }

    const allFilterFunction: MessagePayloadFilterFunction = payload => filterFunctionList.every(func => func(payload))

    return allFilterFunction
  }

  public async messageForward (
    conversationId : string,
    messageId      : string,
  ): Promise<void | string> {
    log.verbose('Puppet', 'messageForward(%s, %s)', JSON.stringify(conversationId), messageId)

    const payload = await this.messagePayload(messageId)

    let newMsgId: void | string

    switch (payload.type) {

      case MessageType.Attachment:     // Attach(6),
      case MessageType.Audio:          // Audio(1), Voice(34)
      case MessageType.Image:          // Img(2), Image(3)
      case MessageType.Video:          // Video(4), Video(43)
        newMsgId = await this.messageSendFile(
          conversationId,
          await this.messageFile(messageId),
        )
        break

      case MessageType.Text:           // Text(1)
        if (payload.text) {
          newMsgId = await this.messageSendText(
            conversationId,
            payload.text,
          )
        } else {
          log.warn('Puppet', 'messageForward() payload.text is undefined.')
        }
        break

      case MessageType.MiniProgram:    // MiniProgram(33)
        newMsgId = await this.messageSendMiniProgram(
          conversationId,
          await this.messageMiniProgram(messageId)
        )
        break

      case MessageType.Url:            // Url(5)
        await this.messageSendUrl(
          conversationId,
          await this.messageUrl(messageId)
        )
        break

      case MessageType.Contact:        // ShareCard(42)
        newMsgId = await this.messageSendContact(
          conversationId,
          await this.messageContact(messageId)
        )
        break

      case MessageType.ChatHistory:    // ChatHistory(19)
      case MessageType.Location:       // Location(48)
      case MessageType.Emoticon:       // Sticker: Emoticon(15), Emoticon(47)
      case MessageType.Transfer:
      case MessageType.RedEnvelope:
      case MessageType.Recalled:       // Recalled(10002)
        throwUnsupportedError()
        break

      case MessageType.Unknown:
      default:
        throw new Error('Unsupported forward message type:' + MessageType[payload.type])
    }

    if (newMsgId) {
      return newMsgId
    }
  }

  /**
   *
   * Room Invitation
   *
   */
  protected roomInvitationPayloadCache (
    roomInvitationId: string,
  ): undefined | RoomInvitationPayload {
    // log.silly('Puppet', 'roomInvitationPayloadCache(id=%s) @ %s', friendshipId, this)
    if (!roomInvitationId) {
      throw new Error('no id')
    }
    const cachedPayload = this.cacheRoomInvitationPayload.get(roomInvitationId)

    if (cachedPayload) {
      // log.silly('Puppet', 'roomInvitationPayloadCache(%s) cache HIT', roomInvitationId)
    } else {
      log.silly('Puppet', 'roomInvitationPayloadCache(%s) cache MISS', roomInvitationId)
    }

    return cachedPayload
  }

  public abstract async roomInvitationAccept (roomInvitationId: string): Promise<void>

  protected abstract async roomInvitationRawPayload (roomInvitationId: string) : Promise<any>
  protected abstract async roomInvitationRawPayloadParser (rawPayload: any)    : Promise<RoomInvitationPayload>

  /**
   * Get & Set
   */
  public async roomInvitationPayload (roomInvitationId: string)                                    : Promise<RoomInvitationPayload>
  public async roomInvitationPayload (roomInvitationId: string, newPayload: RoomInvitationPayload) : Promise<void>

  public async roomInvitationPayload (roomInvitationId: string, newPayload?: RoomInvitationPayload): Promise<void | RoomInvitationPayload> {
    log.verbose('Puppet', 'roomInvitationPayload(%s)', roomInvitationId)

    if (typeof newPayload === 'object') {
      this.cacheRoomInvitationPayload.set(roomInvitationId, newPayload)
      return
    }

    /**
     * 1. Try to get from cache first
     */
    const cachedPayload = this.roomInvitationPayloadCache(roomInvitationId)
    if (cachedPayload) {
      return cachedPayload
    }

    /**
     * 2. Cache not found
     */

    const rawPayload = await this.roomInvitationRawPayload(roomInvitationId)
    const payload = await this.roomInvitationRawPayloadParser(rawPayload)

    return payload
  }

  /**
   *
   * Room
   *
   */
  public abstract async roomAdd (roomId: string, contactId: string)          : Promise<void>
  public abstract async roomAvatar (roomId: string)                          : Promise<FileBox>
  public abstract async roomCreate (contactIdList: string[], topic?: string) : Promise<string>
  public abstract async roomDel (roomId: string, contactId: string)          : Promise<void>
  public abstract async roomList ()                                          : Promise<string[]>
  public abstract async roomQRCode (roomId: string)                          : Promise<string>
  public abstract async roomQuit (roomId: string)                            : Promise<void>
  public abstract async roomTopic (roomId: string)                           : Promise<string>
  public abstract async roomTopic (roomId: string, topic: string)            : Promise<void>

  protected abstract async roomRawPayload (roomId: string)        : Promise<any>
  protected abstract async roomRawPayloadParser (rawPayload: any) : Promise<RoomPayload>

  /**
   *
   * RoomMember
   *
   */
  public abstract async roomAnnounce (roomId: string)               : Promise<string>
  public abstract async roomAnnounce (roomId: string, text: string) : Promise<void>
  public abstract async roomMemberList (roomId: string)             : Promise<string[]>

  protected abstract async roomMemberRawPayload (roomId: string, contactId: string) : Promise<any>
  protected abstract async roomMemberRawPayloadParser (rawPayload: any)             : Promise<RoomMemberPayload>

  public async roomMemberSearch (
    roomId : string,
    query  : (YOU | string) | RoomMemberQueryFilter,
  ): Promise<string[]> {
    log.verbose('Puppet', 'roomMemberSearch(%s, %s)', roomId, JSON.stringify(query))

    if (!this.id) {
      throw new Error('no puppet.id. need puppet to be login-ed for a search')
    }
    if (!query) {
      throw new Error('no query')
    }

    /**
     * 0. for YOU: 'You', '你' in sys message
     */
    if (query === YOU) {
      return [this.id]
    }

    /**
     * 1. for Text Query
     */
    if (typeof query === 'string') {
      let contactIdList: string[] = []
      contactIdList = contactIdList.concat(
        await this.roomMemberSearch(roomId, { roomAlias:     query }),
        await this.roomMemberSearch(roomId, { name:          query }),
        await this.roomMemberSearch(roomId, { contactAlias:  query }),
      )
      // Keep the unique id only
      // https://stackoverflow.com/a/14438954/1123955
      // return [...new Set(contactIdList)]
      return Array.from(
        new Set(contactIdList),
      )
    }

    /**
     * 2. for RoomMemberQueryFilter
     */
    const memberIdList = await this.roomMemberList(roomId)

    let idList: string[] = []

    if (query.contactAlias || query.name) {
      /**
       * We will only have `alias` or `name` set at here.
       * One is set, the other will be `undefined`
       */
      const contactQueryFilter: ContactQueryFilter = {
        alias : query.contactAlias,
        name  : query.name,
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
        contactId => this.roomMemberPayload(roomId, contactId),
      ),
    )

    if (query.roomAlias) {
      idList = idList.concat(
        memberPayloadList.filter(
          payload => payload.roomAlias === query.roomAlias,
        ).map(payload => payload.id),
      )
    }

    return idList
  }

  public async roomSearch (
    query?: RoomQueryFilter,
  ): Promise<string[] /* Room Id List */> {
    log.verbose('Puppet', 'roomSearch(%s)', query ? JSON.stringify(query) : '')

    const allRoomIdList: string[] = await this.roomList()
    log.silly('Puppet', 'roomSearch() allRoomIdList.length=%d', allRoomIdList.length)

    if (!query || Object.keys(query).length <= 0) {
      return allRoomIdList
    }

    const roomPayloadList: RoomPayload[] = []

    const BATCH_SIZE = 10
    let   batchIndex = 0

    while (batchIndex * BATCH_SIZE < allRoomIdList.length) {
      const batchRoomIds = allRoomIdList.slice(
        BATCH_SIZE * batchIndex,
        BATCH_SIZE * (batchIndex + 1),
      )

      const batchPayloads = (await Promise.all(
        batchRoomIds.map(
          async id => {
            try {
              return await this.roomPayload(id)
            } catch (e) {
              // compatible with {} payload
              log.silly('Puppet', 'roomSearch() roomPayload exception: %s', e.message)
              // Remove invalid room id from cache to avoid getting invalid room payload again
              await this.dirtyPayloadRoom(id)
              await this.dirtyPayloadRoomMember(id)
              return {} as any
            }
          }
        ),
      )).filter(payload => Object.keys(payload).length > 0)

      roomPayloadList.push(...batchPayloads)
      batchIndex++
    }

    const filterFunction = this.roomQueryFilterFactory(query)

    const roomIdList = roomPayloadList
      .filter(filterFunction)
      .map(payload => payload.id)

    log.silly('Puppet', 'roomSearch() roomIdList filtered. result length=%d', roomIdList.length)

    return roomIdList
  }

  protected roomQueryFilterFactory (
    query: RoomQueryFilter,
  ): RoomPayloadFilterFunction {
    log.verbose('Puppet', 'roomQueryFilterFactory(%s)',
      JSON.stringify(query),
    )

    if (Object.keys(query).length < 1) {
      throw new Error('query must provide at least one key. current query is empty.')
    } else if (Object.keys(query).length > 1) {
      throw new Error('query only support one key. multi key support is not availble now.')
    }

    // TypeScript bug: have to set `undefined | string | RegExp` at here, or the later code type check will get error
    const filterKey = Object.keys(query)[0].toLowerCase() as keyof RoomQueryFilter

    const isValid = [
      'topic',
      'id',
    ].includes(filterKey)

    if (!isValid) {
      throw new Error('query key unknown: ' + filterKey)
    }

    const filterValue: undefined | string | RegExp = query[filterKey]
    if (!filterValue) {
      throw new Error('filterValue not found for filterKey: ' + filterKey)
    }

    let filterFunction: RoomPayloadFilterFunction

    if (filterValue instanceof RegExp) {
      filterFunction = (payload: RoomPayload) => filterValue.test(payload[filterKey])
    } else { // if (typeof filterValue === 'string') {
      filterFunction = (payload: RoomPayload) => filterValue === payload[filterKey]
    }

    return filterFunction
  }

  /**
   * Check a Room Id if it's still valid.
   *  For example: talk to the server, and see if it should be deleted in the local cache.
   */
  public async roomValidate (roomId: string): Promise<boolean> {
    log.silly('Puppet', 'roomValidate(%s) base class just return `true`', roomId)
    return true
  }

  protected roomPayloadCache (roomId: string): undefined | RoomPayload {
    // log.silly('Puppet', 'roomPayloadCache(id=%s) @ %s', roomId, this)
    if (!roomId) {
      throw new Error('no id')
    }
    const cachedPayload = this.cacheRoomPayload.get(roomId)
    if (cachedPayload) {
      // log.silly('Puppet', 'roomPayloadCache(%s) cache HIT', roomId)
    } else {
      log.silly('Puppet', 'roomPayloadCache(%s) cache MISS', roomId)
    }

    return cachedPayload
  }

  public async roomPayload (
    roomId: string,
  ): Promise<RoomPayload> {
    log.verbose('Puppet', 'roomPayload(%s)', roomId)

    if (!roomId) {
      throw new Error('no id')
    }

    /**
     * 1. Try to get from cache first
     */
    const cachedPayload = this.roomPayloadCache(roomId)
    if (cachedPayload) {
      return cachedPayload
    }

    /**
     * 2. Cache not found
     */
    const rawPayload = await this.roomRawPayload(roomId)
    const payload    = await this.roomRawPayloadParser(rawPayload)

    this.cacheRoomPayload.set(roomId, payload)
    log.silly('Puppet', 'roomPayload(%s) cache SET', roomId)

    return payload
  }

  /**
   * Concat roomId & contactId to one string
   */
  private cacheKeyRoomMember (
    roomId    : string,
    contactId : string,
  ): string {
    return contactId + '@@@' + roomId
  }

  public async roomMemberPayload (
    roomId    : string,
    memberId : string,
  ): Promise<RoomMemberPayload> {
    log.verbose('Puppet', 'roomMemberPayload(roomId=%s, memberId=%s)',
      roomId,
      memberId,
    )

    if (!roomId || !memberId) {
      throw new Error('no id')
    }

    /**
     * 1. Try to get from cache
     */
    const CACHE_KEY     = this.cacheKeyRoomMember(roomId, memberId)
    const cachedPayload = this.cacheRoomMemberPayload.get(CACHE_KEY)

    if (cachedPayload) {
      return cachedPayload
    }

    /**
     * 2. Cache not found
     */
    const rawPayload = await this.roomMemberRawPayload(roomId, memberId)
    if (!rawPayload) {
      throw new Error('contact(' + memberId + ') is not in the Room(' + roomId + ')')
    }
    const payload    = await this.roomMemberRawPayloadParser(rawPayload)

    this.cacheRoomMemberPayload.set(CACHE_KEY, payload)
    log.silly('Puppet', 'roomMemberPayload(%s) cache SET', roomId)

    return payload
  }

  /**
   *
   * dirty payload methods
   *  See: https://github.com/Chatie/grpc/pull/79
   *
   */

  async dirtyPayload (type: PayloadType, id: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayload(%s<%s>, %s)', PayloadType[type], type, id)

    switch (type) {
      case PayloadType.Message:
        return this.dirtyPayloadMessage(id)
      case PayloadType.Contact:
        return this.dirtyPayloadContact(id)
      case PayloadType.Room:
        return this.dirtyPayloadRoom(id)
      case PayloadType.RoomMember:
        return this.dirtyPayloadRoomMember(id)
      case PayloadType.Friendship:
        return this.dirtyPayloadFriendship(id)

      default:
        throw new Error('unknown payload type: ' + type)
    }
  }

  private async dirtyPayloadRoom (roomId: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayloadRoom(%s)', roomId)
    this.cacheRoomPayload.delete(roomId)
  }

  private async dirtyPayloadContact (contactId: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayloadContact(%s)', contactId)
    this.cacheContactPayload.delete(contactId)
  }

  private async dirtyPayloadFriendship (friendshipId: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayloadFriendship(%s)', friendshipId)
    this.cacheFriendshipPayload.delete(friendshipId)
  }

  private async dirtyPayloadMessage (messageId: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayloadMessage(%s)', messageId)
    this.cacheMessagePayload.delete(messageId)
  }

  private async dirtyPayloadRoomMember (roomId: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayloadRoomMember(%s)', roomId)

    const contactIdList = await this.roomMemberList(roomId)

    let cacheKey
    contactIdList.forEach(contactId => {
      cacheKey = this.cacheKeyRoomMember(roomId, contactId)
      this.cacheRoomMemberPayload.delete(cacheKey)
    })
  }

}

export type PuppetImplementation = typeof Puppet & Constructor<Puppet>

export default Puppet
