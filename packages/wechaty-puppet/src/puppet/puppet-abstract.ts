/**
 * Canonical abstract Puppet class for Wechaty puppet providers.
 *
 * Implements a composition architecture replacing the legacy 17-mixin inheritance tower.
 * Encapsulates memory persistence, authentication lifecycle, payload caching, watchdog monitoring,
 * and service state machines using native ECMAScript #private state fields (Node.js 26+ / TS 7+),
 * while exposing strongly-typed domain APIs for contacts, rooms, messages, friendships, posts, and tags.
 */
import {
  FileBox,
  type FileBoxInterface,
}                       from 'file-box'
import {
  timeoutPromise,
}                       from 'gerror'
import { MemoryCard }   from 'memory-card'
import {
  BooleanIndicator,
  BusyIndicator,
  StateSwitch,
}                       from 'state-switch'

import {
  log,
  NAME,
  VERSION,
}                       from '../config.ts'
import { throwUnsupportedError } from '../throw-unsupported-error.ts'
import { WechatyEvent } from '../events/event-target.ts'
import {
  CacheAgent,
  WatchdogAgent,
}                       from '../agents/mod.ts'
import {
  interfaceOfPuppet,
  looseInstanceOfPuppet,
}                       from './interface-of.ts'
import type { PuppetScanListener } from './events.ts'
import { PuppetSkeleton }          from './puppet-skeleton.ts'

import type {
  ContactPayload,
  ContactPayloadFilterFunction,
  ContactQueryFilter,
}                                 from '../schemas/contact.ts'
import {
  DirtyType,
  type EventDirtyPayload,
  ScanStatus,
}                                 from '../schemas/mod.ts'
import type {
  FriendshipAddOptions,
  FriendshipPayload,
  FriendshipSearchQueryFilter,
}                                 from '../schemas/friendship.ts'
import type { ImageType }         from '../schemas/image.ts'
import type { LocationPayload }    from '../schemas/location.ts'
import type {
  MessagePayload,
  MessagePayloadFilterFunction,
  MessageQueryFilter,
}                                 from '../schemas/message.ts'
import { MessageType }            from '../schemas/message.ts'
import type { MiniProgramPayload } from '../schemas/mini-program.ts'
import type { UrlLinkPayload }     from '../schemas/url-link.ts'
import type {
  PaginationRequest,
  PaginationResponse,
}                                 from '../schemas/pagination.ts'
import type {
  PostPayload,
  PostQueryFilter,
}                                 from '../schemas/post.ts'
import type { PuppetOptions }     from '../schemas/puppet.ts'
import { YOU }                    from '../schemas/puppet.ts'
import type {
  RoomInvitationPayload,
}                                 from '../schemas/room-invitation.ts'
import type {
  RoomMemberPayload,
  RoomMemberQueryFilter,
  RoomPayload,
  RoomPayloadFilterFunction,
  RoomQueryFilter,
}                                 from '../schemas/room.ts'
import {
  type SayablePayload,
  sayablePayloads,
  sayableTypes,
}                                 from '../schemas/sayable.ts'
import type {
  TapPayload,
  TapQueryFilter,
  TapType,
}                                 from '../schemas/tap.ts'
import { typeName }               from '../schemas/type-name.ts'

const filebox = (fb: string | FileBoxInterface): FileBoxInterface =>
  typeof fb === 'string' ? FileBox.fromJSON(fb) : fb

let PUPPET_COUNTER = 0

/**
 * Puppet Base Implementation Class
 *
 * Implements the full provider puppet contract with unified internal services
 * and native private brand state.
 */
abstract class PuppetImpl extends PuppetSkeleton {

  static readonly VERSION = VERSION

  // --- ECMAScript Hard Private Brands (Node 26+ / TS 7+) ---
  readonly #options: PuppetOptions
  readonly #state: StateSwitch
  readonly #resettingIndicator: BusyIndicator
  readonly #watchdog: WatchdogAgent
  readonly #readyIndicator: BooleanIndicator
  readonly #cache: CacheAgent
  readonly #cacheCleanCallbackList: (() => void)[] = []
  readonly #loginCleanCallbackList: (() => void)[] = []
  readonly #counter: number

  #memory: MemoryCard
  #currentUserId?: string
  #authQrCode?: string

  constructor (
    options: PuppetOptions = {},
  ) {
    super(options)
    log.verbose('Puppet', 'constructor(%s)', JSON.stringify(options))

    this.#options = options
    this.#counter = PUPPET_COUNTER++
    this.#memory = new MemoryCard()
    this.#cache = new CacheAgent(options.cache)
    this.#state = new StateSwitch('Puppet', { log })
    this.#resettingIndicator = new BusyIndicator('PuppetReset', { log })
    this.#watchdog = new WatchdogAgent(this)
    this.#readyIndicator = new BooleanIndicator()
  }

  // ==========================================
  // Memory Management
  // ==========================================

  get memory (): MemoryCard {
    return this.#memory
  }

  get _memory (): MemoryCard {
    return this.#memory
  }

  setMemory (memory: MemoryCard): void {
    log.verbose('Puppet', 'setMemory(%s)', memory.name)
    if (this.#memory.name) {
      throw new Error('Puppet memory can be only set once')
    }
    this.#memory = memory
  }

  // ==========================================
  // Authentication & Login
  // ==========================================

  get currentUserId (): string {
    log.silly('Puppet', 'get currentUserId()')
    if (!this.#currentUserId) {
      throw new Error('not logged in, no this.__currentUserId yet.')
    }
    return this.#currentUserId
  }

  get isLoggedIn (): boolean {
    return !!this.#currentUserId
  }

  get authQrCode (): string | undefined {
    return this.#authQrCode
  }

  get __currentUserId (): string | undefined {
    return this.#currentUserId
  }

  set __currentUserId (id: string | undefined) {
    this.#currentUserId = id
  }

  get __authQrCode (): string | undefined {
    return this.#authQrCode
  }

  set __authQrCode (code: string | undefined) {
    this.#authQrCode = code
  }

  login (userId: string): void {
    log.verbose('Puppet', 'login(%s)', userId)
    if (this.#currentUserId) {
      throw new Error('must logout first before login again!')
    }
    this.#currentUserId = userId
    this.dispatchEvent(new WechatyEvent('login', {
      detail: { contactId: userId },
    }))
  }

  async logout (reason = 'logout()'): Promise<void> {
    log.verbose('Puppet', 'logout(%s)', reason)
    if (!this.isLoggedIn) {
      log.verbose('Puppet', 'logout() isLoggedIn === false, do nothing')
      return
    }

    this.dispatchEvent(new WechatyEvent('logout', {
      detail: {
        contactId: this.currentUserId,
        data: reason,
      },
    }))

    await new Promise<void>(resolve => setTimeout(() => {
      this.#currentUserId = undefined
      resolve()
    }, 0))
  }

  /**
   * @deprecated use `currentUserId` instead. (will be removed in v2.0)
   */
  selfId (): string {
    log.warn('Puppet', 'selfId() is deprecated, use `currentUserId` instead:\n%s', new Error().stack)
    return this.currentUserId
  }

  /**
   * @deprecated use `isLoggedIn` instead. (will be removed in v2.0)
   */
  logonoff (): boolean {
    log.warn('Puppet', 'logonoff() is deprecated, use `isLoggedIn` instead:\n%s', new Error().stack)
    return this.isLoggedIn
  }

  // ==========================================
  // Cache & Dirty Invalidation
  // ==========================================

  get cache (): CacheAgent {
    return this.#cache
  }

  get __cacheMixinCleanCallbackList (): (() => void)[] {
    return this.#cacheCleanCallbackList
  }

  dirtyPayload (
    type : DirtyType,
    id   : string,
  ): void {
    log.verbose('Puppet', 'dirtyPayload(%s<%s>, %s)', typeName(DirtyType, type), type, id)
    setTimeout(() => this.dispatchEvent(new WechatyEvent('dirty', {
      detail: {
        payloadId   : id,
        payloadType : type,
      },
    })), 0)
  }

  onDirty (
    {
      payloadType,
      payloadId,
    }: EventDirtyPayload,
  ): void {
    log.verbose('Puppet', 'onDirty(%s<%s>, %s)', typeName(DirtyType, payloadType), payloadType, payloadId)
    const dirtyFuncMap = {
      [DirtyType.Contact]:      (id: string) => this.#cache.contact.delete(id),
      [DirtyType.Friendship]:   (id: string) => this.#cache.friendship.delete(id),
      [DirtyType.Message]:      (id: string) => this.#cache.message.delete(id),
      [DirtyType.Post]:         (id: string) => this.#cache.post.delete(id),
      [DirtyType.Room]:         (id: string) => this.#cache.room.delete(id),
      [DirtyType.RoomMember]:   (id: string) => this.#cache.roomMember.delete(id),
      [DirtyType.Unspecified]:  (id: string) => { throw new Error('Unspecified type with id: ' + id) },
    }
    const dirtyFunc = dirtyFuncMap[payloadType]
    dirtyFunc(payloadId)
  }

  async __dirtyPayloadAwait (
    type : DirtyType,
    id   : string,
  ): Promise<void> {
    log.verbose('Puppet', '__dirtyPayloadAwait(%s<%s>, %s)', typeName(DirtyType, type), type, id)
    if (!this.#currentUserId) {
      log.verbose('Puppet', '__dirtyPayloadAwait() will not dirty any payload when the puppet is not logged in')
      return
    }

    const isCurrentDirtyEvent = (event: EventDirtyPayload) =>
      event.payloadId === id && event.payloadType === type

    const onDirtyResolve = (resolve: () => void) => {
      const onDirty = (event: EventDirtyPayload) => {
        if (isCurrentDirtyEvent(event)) {
          resolve()
        }
      }
      return onDirty
    }

    let onDirty: ReturnType<typeof onDirtyResolve>
    const future = new Promise<void>(resolve => {
      onDirty = onDirtyResolve(resolve)
      this.on('dirty', onDirty)
    })

    this.dirtyPayload(type, id)

    try {
      await timeoutPromise(future, 5 * 1000)
        .finally(() => this.off('dirty', onDirty))
    } catch (e) {
      log.warn('Puppet',
        [
          '__dirtyPayloadAwait() timeout.',
          'The `dirty` event should be received but no one found.',
          'Learn more from https://github.com/wechaty/puppet/issues/158',
          'payloadType: %s(%s)',
          'payloadId: %s',
          'error: %s',
          'stack: %s',
        ].join('\n  '),
        typeName(DirtyType, type),
        type,
        id,
        (e as Error).message,
        (e as Error).stack,
      )
    }

    await new Promise<void>(resolve => setTimeout(resolve, 0))
  }

  // ==========================================
  // Lifecycle & State Management
  // ==========================================

  get state (): StateSwitch {
    return this.#state
  }

  get readyIndicator (): BooleanIndicator {
    return this.#readyIndicator
  }

  get __counter (): number {
    return this.#counter
  }

  get __watchdog (): WatchdogAgent {
    return this.#watchdog
  }

  get __serviceCtlResettingIndicator (): BusyIndicator {
    return this.#resettingIndicator
  }

  get __serviceCtlLogger () {
    return log
  }

  get puppetOptions (): PuppetOptions {
    return this.#options
  }

  abstract onStart (): Promise<void>
  abstract onStop  (): Promise<void>

  override async start (): Promise<void> {
    log.verbose('Puppet', 'start()')
    if (this.#state.active()) {
      log.warn('Puppet', 'start() found that is starting/started ...')
      await this.#state.stable('active')
      log.warn('Puppet', 'start() found that is starting/started ... done')
      return
    }

    if (this.#state.inactive() === 'pending') {
      log.warn('Puppet', 'start() found that is stopping, waiting stable ...')
      try {
        await timeoutPromise(this.#state.stable('inactive'), 15 * 1000)
        log.warn('Puppet', 'start() found that is stopping, waiting stable ... done')
      } catch (e) {
        this.emit('error', e)
        log.warn('Puppet', 'start() found that is stopping, waiting stable ... timeout')
      }
    }

    this.#state.active('pending')

    try {
      await super.start()

      try {
        await this.#memory.load()
      } catch (_) {
        log.silly('Puppet', 'start() memory has already been loaded before')
      }

      this.#cache.start()
      const onDirty = this.onDirty.bind(this)
      this.on('dirty', onDirty)
      this.#cacheCleanCallbackList.push(() => {
        this.off('dirty', onDirty)
      })

      const cleanAuthQrCode = () => {
        this.#authQrCode = undefined
      }
      const onScan: PuppetScanListener = ({ qrcode, status }) => {
        switch (status) {
          case ScanStatus.Cancel:
          case ScanStatus.Confirmed:
          case ScanStatus.Scanned:
            cleanAuthQrCode()
            break
          case ScanStatus.Timeout:
          case ScanStatus.Waiting:
            this.#authQrCode = qrcode
            break
          case ScanStatus.Unknown:
          default:
            break
        }
      }
      this.addListener('scan', onScan)
      this.addListener('login', cleanAuthQrCode)
      this.addListener('stop', cleanAuthQrCode)
      this.#loginCleanCallbackList.push(() => {
        this.removeListener('scan', onScan)
        this.removeListener('login', cleanAuthQrCode)
        this.removeListener('stop', cleanAuthQrCode)
      })

      const onReady = () => this.#readyIndicator.value(true)
      const onLogout = () => this.#readyIndicator.value(false)
      const onReset = () => this.#readyIndicator.value(false)
      this.on('ready', onReady)
      this.on('logout', onLogout)
      this.on('reset', onReset)
      this.#loginCleanCallbackList.push(() => {
        this.off('ready', onReady)
        this.off('logout', onLogout)
        this.off('reset', onReset)
      })

      this.#watchdog.start()

      await this.onStart()

      this.dispatchEvent(new WechatyEvent('start'))
      this.#state.active(true)
    } catch (e: any) {
      log.error('Puppet', 'start() exception: %s', e.message)
      const cleanupErrors = await this.__serviceCtlShutdown()
      this.#state.inactive(true)
      this.__serviceCtlEmitErrors([e, ...cleanupErrors])
      throw e
    }
  }

  override async stop (): Promise<void> {
    log.verbose('Puppet', 'stop()')
    if (this.#state.inactive()) {
      log.warn('Puppet', 'stop() found that is stopping/stopped ...')
      await this.#state.stable('inactive')
      log.warn('Puppet', 'stop() found that is stopping/stopped ... done')
      return
    }

    if (this.#state.active() === 'pending') {
      log.warn('Puppet', 'stop() found that is starting, waiting stable ...')
      try {
        await timeoutPromise(this.#state.stable('active'), 15 * 1000)
        log.warn('Puppet', 'stop() found that is starting, waiting stable ... done')
      } catch (e) {
        this.emit('error', e)
        log.warn('Puppet', 'stop() found that is starting, waiting stable ... timeout')
      }
    }

    this.#state.inactive('pending')

    this.#readyIndicator.value(false)
    this.#watchdog.stop()

    const cleanupErrors = await this.__serviceCtlShutdown()

    if (this.isLoggedIn) {
      this.dispatchEvent(new WechatyEvent('logout', {
        detail: {
          contactId: this.currentUserId,
          data: 'puppet stop()',
        },
      }))
      await new Promise<void>(resolve => setTimeout(() => {
        this.#currentUserId = undefined
        resolve()
      }, 0))
    }

    this.#cache.stop()
    while (this.#cacheCleanCallbackList.length) {
      const fn = this.#cacheCleanCallbackList.shift()
      if (fn) {
        setTimeout(fn, 0)
      }
    }

    while (this.#loginCleanCallbackList.length) {
      const fn = this.#loginCleanCallbackList.shift()
      if (fn) {
        fn()
      }
    }
    this.#authQrCode = undefined

    try {
      await super.stop()
    } catch (e) {
      cleanupErrors.push(e)
    }

    this.dispatchEvent(new WechatyEvent('stop'))
    this.#state.inactive(true)
    this.__serviceCtlEmitErrors(cleanupErrors)
  }

  async reset (): Promise<void> {
    log.verbose('Puppet', 'reset()')
    if (this.#resettingIndicator.busy()) {
      log.warn('Puppet', 'reset() found that is resetting, waiting idle ...')
      try {
        await timeoutPromise(this.#resettingIndicator.idle(), 15 * 1000)
        log.warn('Puppet', 'reset() found that is resetting, waiting idle ... done')
      } catch (e) {
        log.error('Puppet', 'reset() timeout: %s', (e as Error).message)
        this.emit('error', e)
        throw e
      }
      return
    }

    if (this.#state.inactive()) {
      log.warn('Puppet', 'reset() found that is NOT active, doing nothing')
      return
    }

    this.#resettingIndicator.busy(true)
    try {
      try {
        await timeoutPromise(this.#state.stable(), 45 * 1000)
      } catch (e) {
        this.emit('error', e)
        log.warn('Puppet', 'reset() wait stable timeout: %s', (e as Error).message)
      }
      await this.stop()
      await this.start()
    } finally {
      this.#resettingIndicator.busy(false)
    }
  }

  async __serviceCtlShutdown (): Promise<unknown[]> {
    const errors: unknown[] = []
    try {
      await this.onStop()
    } catch (e) {
      log.error('Puppet', 'stop() onStop() exception: %s', (e as Error).message)
      errors.push(e)
    }
    return errors
  }

  __serviceCtlEmitErrors (errors: readonly unknown[]): void {
    for (const e of errors) {
      this.emit('error', e)
    }
  }

  // ==========================================
  // Misc Methods
  // ==========================================

  override toString (): string {
    let memoryName
    try {
      memoryName = this.#memory.name || 'NONAME'
    } catch (_) {
      memoryName = 'NOMEMORY'
    }
    return [
      'Puppet',
      '<',
      this.constructor.name,
      '>',
      '(',
      memoryName,
      ')',
    ].join('')
  }

  abstract ding (data?: string): void

  name (): string {
    return NAME
  }

  version (): string {
    return VERSION
  }

  wechatyVersionRange (strict = false): string {
    if (strict) {
      return '^0.16.0'
    }
    return '*'
  }

  // ==========================================
  // Validation Static Methods
  // ==========================================

  static validInterface (target: unknown): target is Puppet {
    return interfaceOfPuppet(target)
  }

  static validInstance (target: unknown): target is Puppet {
    return looseInstanceOfPuppet(target)
  }

  static valid (target: unknown): target is Puppet {
    return this.validInstance(target) || this.validInterface(target)
  }

  // ==========================================
  // Contact Domain API
  // ==========================================

  abstract contactSelfName (name: string): Promise<void>
  abstract contactSelfQRCode (): Promise<string>
  abstract contactSelfSignature (signature: string): Promise<void>

  abstract contactAlias (contactId: string): Promise<string>
  abstract contactAlias (contactId: string, alias: string | null): Promise<void>

  abstract contactAvatar (contactId: string): Promise<FileBoxInterface>
  abstract contactAvatar (contactId: string, file: FileBoxInterface): Promise<void>

  abstract contactPhone (contactId: string, phoneList: string[]): Promise<void>
  abstract contactCorporationRemark (contactId: string, corporationRemark: string | null): Promise<void>
  abstract contactDescription (contactId: string, description: string | null): Promise<void>
  abstract contactList (): Promise<string[]>

  abstract contactRawPayload (contactId: string): Promise<any>
  abstract contactRawPayloadParser (rawPayload: any): Promise<ContactPayload>

  async contactSearch (
    query?        : string | ContactQueryFilter,
    searchIdList? : string[],
  ): Promise<string[]> {
    log.verbose('Puppet', 'contactSearch(query=%s, %s)',
      JSON.stringify(query),
      searchIdList ? `idList.length = ${searchIdList.length}` : '',
    )

    if (typeof query !== 'string' && query?.id) {
      try {
        await this.contactPayload(query.id)
        return [ query.id ]
      } catch (e) {
        log.verbose('Puppet', 'contactSearch() payload not found for id "%s"', query.id)
        await this.contactPayloadDirty(query.id)
        return []
      }
    }

    if (!searchIdList) {
      searchIdList = await this.contactList()
    }

    if (!query) {
      return searchIdList
    }

    if (typeof query === 'string') {
      const nameIdList  = await this.contactSearch({ name: query },  searchIdList)
      const aliasIdList = await this.contactSearch({ alias: query }, searchIdList)
      return Array.from(new Set([...nameIdList, ...aliasIdList]))
    }

    const filterFunction: ContactPayloadFilterFunction = this.contactQueryFilterFactory(query)
    const BATCH_SIZE = 16
    let   batchIndex = 0
    const resultIdList: string[] = []

    const matchId = async (id: string) => {
      try {
        const payload = await this.contactPayload(id)
        if (filterFunction(payload)) {
          return id
        }
      } catch (e) {
        this.dispatchEvent(new WechatyEvent('error', { detail: e }))
        await this.contactPayloadDirty(id)
      }
      return undefined
    }

    while (BATCH_SIZE * batchIndex < searchIdList.length) {
      const batchSearchIdList = searchIdList.slice(
        BATCH_SIZE * batchIndex,
        BATCH_SIZE * (batchIndex + 1),
      )
      const matchBatchIdFutureList = batchSearchIdList.map(matchId)
      const matchBatchIdList = await Promise.all(matchBatchIdFutureList)
      const batchSearchIdResultList = matchBatchIdList.filter(id => !!id) as string[]
      resultIdList.push(...batchSearchIdResultList)
      batchIndex++
    }

    return resultIdList
  }

  contactQueryFilterFactory (
    query: ContactQueryFilter,
  ): ContactPayloadFilterFunction {
    log.verbose('Puppet', 'contactQueryFilterFactory(%s)', JSON.stringify(query))

    Object.keys(query).forEach(key => {
      if (query[key as keyof ContactQueryFilter] === undefined) {
        delete query[key as keyof ContactQueryFilter]
      }
    })

    if (Object.keys(query).length < 1) {
      throw new Error('query must provide at least one key. current query is empty.')
    } else if (Object.keys(query).length > 1) {
      throw new Error('query only support one key. multi key support is not available now.')
    }

    const filterKey = Object.keys(query)[0]!.toLowerCase() as keyof ContactQueryFilter
    const isValid = ['alias', 'id', 'name', 'weixin'].includes(filterKey)

    if (!isValid) {
      throw new Error('key not supported: ' + filterKey)
    }

    const filterValue: undefined | string | RegExp = query[filterKey]
    if (!filterValue) {
      throw new Error('filterValue not found for filterKey: ' + filterKey)
    }

    let filterFunction: ContactPayloadFilterFunction
    if (typeof filterValue === 'string') {
      filterFunction = (payload: ContactPayload) => filterValue === payload[filterKey]
    } else if (filterValue instanceof RegExp) {
      filterFunction = (payload: ContactPayload) => !!payload[filterKey] && filterValue.test(payload[filterKey]!)
    } else {
      throw new Error('unsupported filterValue type: ' + typeof filterValue)
    }

    return filterFunction
  }

  async contactValidate (contactId: string): Promise<boolean> {
    log.silly('Puppet', 'contactValidate(%s) base class just return `true`', contactId)
    return true
  }

  contactPayloadCache (contactId: string): undefined | ContactPayload {
    if (!contactId) {
      throw new Error('no id')
    }
    return this.#cache.contact.get(contactId)
  }

  async contactPayload (contactId: string): Promise<ContactPayload> {
    if (!contactId) {
      throw new Error('no id')
    }

    const cachedPayload = this.contactPayloadCache(contactId)
    if (cachedPayload) {
      return cachedPayload
    }

    const rawPayload = await this.contactRawPayload(contactId)
    const payload    = await this.contactRawPayloadParser(rawPayload)
    this.#cache.contact.set(contactId, payload)
    return payload
  }

  async contactPayloadDirty (id: string): Promise<void> {
    log.verbose('Puppet', 'contactPayloadDirty(%s)', id)
    await this.__dirtyPayloadAwait(DirtyType.Contact, id)
  }

  // ==========================================
  // Room Member Domain API
  // ==========================================

  abstract roomMemberList (roomId: string): Promise<string[]>
  abstract roomMemberRawPayload (roomId: string, contactId: string): Promise<any>
  abstract roomMemberRawPayloadParser (rawPayload: any): Promise<RoomMemberPayload>

  async roomMemberSearch (
    roomId : string,
    query  : (symbol | string) | RoomMemberQueryFilter,
    memberIdList?: string[],
  ): Promise<string[]> {
    log.verbose('Puppet', 'roomMemberSearch(%s, %s)', roomId, JSON.stringify(query))

    if (!this.isLoggedIn) {
      throw new Error('no puppet.id. need puppet to be login-ed for a search')
    }
    if (!query) {
      throw new Error('no query')
    }

    if (typeof query === 'symbol') {
      if (query === YOU) {
        return [ this.currentUserId ]
      }
      throw new Error('unknown symbol found: ' + String(query))
    }

    if (!memberIdList) {
      memberIdList = await this.roomMemberList(roomId)
    }

    if (typeof query === 'string') {
      let contactIdList: string[] = []
      const contactIds = await Promise.all([
        this.roomMemberSearch(roomId, { roomAlias:    query }, memberIdList),
        this.roomMemberSearch(roomId, { name:         query }, memberIdList),
        this.roomMemberSearch(roomId, { contactAlias: query }, memberIdList),
      ])
      contactIdList = contactIdList.concat(...contactIds)
      return Array.from(new Set(contactIdList))
    }

    let idList: string[] = []

    if (query.contactAlias || query.name) {
      const contactQueryFilter: ContactQueryFilter = {
        alias : query.contactAlias,
        name  : query.name,
      }
      idList = idList.concat(
        await this.contactSearch(contactQueryFilter, memberIdList),
      )
    }

    if (query.roomAlias) {
      const memberPayloadList = await Promise.all(
        memberIdList.map(contactId => this.roomMemberPayload(roomId, contactId)),
      )
      idList = idList.concat(
        memberPayloadList
          .filter(payload => payload.roomAlias === query.roomAlias)
          .map(payload => payload.id),
      )
    }

    return idList
  }

  async roomMemberPayload (
    roomId   : string,
    memberId : string,
  ): Promise<RoomMemberPayload> {
    log.verbose('Puppet', 'roomMemberPayload(roomId=%s, memberId=%s)', roomId, memberId)

    if (!roomId || !memberId) {
      throw new Error('no id')
    }

    const cachedPayload = this.#cache.roomMember.get(roomId)
    const memberPayload = cachedPayload && cachedPayload[memberId]
    if (memberPayload) {
      return memberPayload
    }

    const rawPayload = await this.roomMemberRawPayload(roomId, memberId)
    if (!rawPayload) {
      throw new Error('contact(' + memberId + ') is not in the Room(' + roomId + ')')
    }
    const payload = await this.roomMemberRawPayloadParser(rawPayload)

    this.#cache.roomMember.set(roomId, {
      ...cachedPayload,
      [memberId]: payload,
    })
    return payload
  }

  async roomMemberPayloadDirty (id: string): Promise<void> {
    log.verbose('Puppet', 'roomMemberPayloadDirty(%s)', id)
    await this.__dirtyPayloadAwait(DirtyType.RoomMember, id)
  }

  // ==========================================
  // Room Domain API
  // ==========================================

  abstract roomAdd (roomId: string, contactId: string | string[], inviteOnly?: boolean): Promise<void>
  abstract roomAvatar (roomId: string): Promise<FileBoxInterface>
  abstract roomCreate (contactIdList: string[], topic?: string): Promise<string>
  abstract roomDel (roomId: string, contactId: string | string[]): Promise<void>
  abstract roomList (): Promise<string[]>
  abstract roomQRCode (roomId: string): Promise<string>
  abstract roomQuit (roomId: string): Promise<void>
  abstract roomTopic (roomId: string): Promise<string>
  abstract roomTopic (roomId: string, topic: string): Promise<void>
  abstract roomRawPayload (roomId: string): Promise<any>
  abstract roomRawPayloadParser (rawPayload: any): Promise<RoomPayload>
  abstract roomAnnounce (roomId: string): Promise<string>
  abstract roomAnnounce (roomId: string, text: string): Promise<void>

  async roomSearch (
    query?: RoomQueryFilter,
  ): Promise<string[]> {
    log.verbose('Puppet', 'roomSearch(%s)', query ? JSON.stringify(query) : '')

    if (query?.id) {
      try {
        await this.roomPayload(query.id)
        return [ query.id ]
      } catch (e) {
        log.verbose('Puppet', 'roomSearch() payload not found for id "%s"', query.id)
        await this.roomPayloadDirty(query.id)
        return []
      }
    }

    const allRoomIdList: string[] = await this.roomList()
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
        batchRoomIds.map(async id => {
          try {
            return await this.roomPayload(id)
          } catch (e) {
            this.dispatchEvent(new WechatyEvent('error', { detail: e }))
            await this.roomPayloadDirty(id)
            await this.roomMemberPayloadDirty(id)
            return {} as any
          }
        }),
      )).filter(payload => Object.keys(payload).length > 0)

      roomPayloadList.push(...batchPayloads)
      batchIndex++
    }

    const filterFunction = this.roomQueryFilterFactory(query)
    return roomPayloadList.filter(filterFunction).map(payload => payload.id)
  }

  roomQueryFilterFactory (
    query: RoomQueryFilter,
  ): RoomPayloadFilterFunction {
    log.verbose('Puppet', 'roomQueryFilterFactory(%s)', JSON.stringify(query))

    if (Object.keys(query).length < 1) {
      throw new Error('query must provide at least one key. current query is empty.')
    } else if (Object.keys(query).length > 1) {
      throw new Error('query only support one key. multi key support is not available now.')
    }

    const filterKey = Object.keys(query)[0]!.toLowerCase() as keyof RoomQueryFilter
    const isValid = ['topic', 'id'].includes(filterKey)

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
    } else {
      filterFunction = (payload: RoomPayload) => filterValue === payload[filterKey]
    }

    return filterFunction
  }

  async roomValidate (roomId: string): Promise<boolean> {
    log.silly('Puppet', 'roomValidate(%s) base class just return `true`', roomId)
    return true
  }

  roomPayloadCache (roomId: string): undefined | RoomPayload {
    if (!roomId) {
      throw new Error('no id')
    }
    return this.#cache.room.get(roomId)
  }

  async roomPayload (roomId: string): Promise<RoomPayload> {
    log.verbose('Puppet', 'roomPayload(%s)', roomId)
    if (!roomId) {
      throw new Error('no id')
    }

    const cachedPayload = this.roomPayloadCache(roomId)
    if (cachedPayload) {
      return cachedPayload
    }

    const rawPayload = await this.roomRawPayload(roomId)
    const payload    = await this.roomRawPayloadParser(rawPayload)
    this.#cache.room.set(roomId, payload)
    return payload
  }

  async roomPayloadDirty (id: string): Promise<void> {
    log.verbose('Puppet', 'roomPayloadDirty(%s)', id)
    await this.__dirtyPayloadAwait(DirtyType.Room, id)
  }

  // ==========================================
  // Friendship Domain API
  // ==========================================

  abstract friendshipAccept (friendshipId: string): Promise<void>
  abstract friendshipAdd (contactId: string, option?: FriendshipAddOptions): Promise<void>
  abstract friendshipSearchPhone (phone: string): Promise<null | string>
  abstract friendshipSearchHandle (handle: string): Promise<null | string>
  abstract friendshipRawPayload (friendshipId: string): Promise<any>
  abstract friendshipRawPayloadParser (rawPayload: any): Promise<FriendshipPayload>

  friendshipSearchWeixin (weixin: string): Promise<null | string> {
    log.warn('Puppet', 'friendshipSearchWeixin() is deprecated. use `friendshipSearchHandle()` instead.')
    return this.friendshipSearchHandle(weixin)
  }

  async friendshipSearch (
    searchQueryFilter: FriendshipSearchQueryFilter,
  ): Promise<string | null> {
    log.verbose('Puppet', 'friendshipSearch("%s")', JSON.stringify(searchQueryFilter))

    if (Object.keys(searchQueryFilter).length !== 1) {
      throw new Error('searchQueryFilter should only include one key for query!')
    }

    if (searchQueryFilter.phone) {
      return this.friendshipSearchPhone(searchQueryFilter.phone)
    } else if (searchQueryFilter.weixin) {
      log.warn('Puppet', 'friendshipSearch() `{ weixin: ... }` is deprecated. use `{ handle: ... }` instead.')
      return this.friendshipSearchHandle(searchQueryFilter.weixin)
    } else if (searchQueryFilter.handle) {
      return this.friendshipSearchHandle(searchQueryFilter.handle)
    }

    throw new Error(`unknown key from searchQueryFilter: ${Object.keys(searchQueryFilter).join('')}`)
  }

  friendshipPayloadCache (friendshipId: string): undefined | FriendshipPayload {
    if (!friendshipId) {
      throw new Error('no id')
    }
    return this.#cache.friendship.get(friendshipId)
  }

  async friendshipPayload (friendshipId: string): Promise<FriendshipPayload>
  async friendshipPayload (friendshipId: string, newPayload: FriendshipPayload): Promise<void>
  async friendshipPayload (
    friendshipId : string,
    newPayload?  : FriendshipPayload,
  ): Promise<void | FriendshipPayload> {
    log.verbose('Puppet', 'friendshipPayload(%s)', friendshipId, newPayload ? ',' + JSON.stringify(newPayload) : '')

    if (typeof newPayload === 'object') {
      await this.#cache.friendship.set(friendshipId, newPayload)
      return
    }

    const cachedPayload = this.friendshipPayloadCache(friendshipId)
    if (cachedPayload) {
      return cachedPayload
    }

    const rawPayload = await this.friendshipRawPayload(friendshipId)
    const payload    = await this.friendshipRawPayloadParser(rawPayload)
    this.#cache.friendship.set(friendshipId, payload)
    return payload
  }

  async friendshipPayloadDirty (id: string): Promise<void> {
    log.verbose('Puppet', 'friendshipPayloadDirty(%s)', id)
    await this.__dirtyPayloadAwait(DirtyType.Friendship, id)
  }

  // ==========================================
  // Tag Domain API
  // ==========================================

  abstract tagContactAdd (tagId: string, contactId: string): Promise<void>
  abstract tagContactDelete (tagId: string): Promise<void>
  abstract tagContactList (contactId?: string): Promise<string[]>
  abstract tagContactRemove (tagId: string, contactId: string): Promise<void>

  // ==========================================
  // Room Invitation Domain API
  // ==========================================

  abstract roomInvitationAccept (roomInvitationId: string): Promise<void>
  abstract roomInvitationRawPayload (roomInvitationId: string): Promise<any>
  abstract roomInvitationRawPayloadParser (rawPayload: any): Promise<RoomInvitationPayload>

  roomInvitationPayloadCache (
    roomInvitationId: string,
  ): undefined | RoomInvitationPayload {
    if (!roomInvitationId) {
      throw new Error('no id')
    }
    return this.#cache.roomInvitation.get(roomInvitationId)
  }

  async roomInvitationPayload (roomInvitationId: string): Promise<RoomInvitationPayload>
  async roomInvitationPayload (roomInvitationId: string, newPayload: RoomInvitationPayload): Promise<void>
  async roomInvitationPayload (
    roomInvitationId: string,
    newPayload?: RoomInvitationPayload,
  ): Promise<void | RoomInvitationPayload> {
    log.verbose('Puppet', 'roomInvitationPayload(%s)', roomInvitationId)

    if (typeof newPayload === 'object') {
      this.#cache.roomInvitation.set(roomInvitationId, newPayload)
      return
    }

    const cachedPayload = this.roomInvitationPayloadCache(roomInvitationId)
    if (cachedPayload) {
      return cachedPayload
    }

    const rawPayload = await this.roomInvitationRawPayload(roomInvitationId)
    const payload    = await this.roomInvitationRawPayloadParser(rawPayload)
    return payload
  }

  // ==========================================
  // Message & Conversation Domain API
  // ==========================================

  abstract conversationReadMark (conversationId: string, hasRead?: boolean): Promise<void | boolean>
  abstract messageContact (messageId: string): Promise<string>
  abstract messageFile (messageId: string): Promise<FileBoxInterface>
  abstract messageImage (messageId: string, imageType: ImageType): Promise<FileBoxInterface>
  abstract messageMiniProgram (messageId: string): Promise<MiniProgramPayload>
  abstract messageUrl (messageId: string): Promise<UrlLinkPayload>
  abstract messageLocation (messageId: string): Promise<LocationPayload>

  abstract messageForward (conversationId: string, messageId: string): Promise<void | string>
  abstract messageSendContact (conversationId: string, contactId: string): Promise<void | string>
  abstract messageSendFile (conversationId: string, file: FileBoxInterface): Promise<void | string>
  abstract messageSendLocation (conversationId: string, locationPayload: LocationPayload): Promise<void | string>
  abstract messageSendMiniProgram (conversationId: string, miniProgramPayload: MiniProgramPayload): Promise<void | string>
  /**
   * Send a post as a message. Provider puppets override if supported.
   * Default implementation throws an unsupported API error.
   */
  async messageSendPost (conversationId: string, _postPayload: PostPayload): Promise<void | string> {
    log.verbose('Puppet', 'messageSendPost(%s, ...)', conversationId)
    return throwUnsupportedError('messageSendPost() is not supported by this puppet')
  }
  abstract messageSendText (conversationId: string, text: string, mentionIdList?: string[]): Promise<void | string>
  abstract messageSendUrl (conversationId: string, urlLinkPayload: UrlLinkPayload): Promise<void | string>
  abstract messageRecall (messageId: string): Promise<boolean>

  abstract messageRawPayload (messageId: string): Promise<any>
  abstract messageRawPayloadParser (rawPayload: any): Promise<MessagePayload>

  messagePayloadCache (messageId: string): undefined | MessagePayload {
    if (!messageId) {
      throw new Error('no id')
    }
    return this.#cache.message.get(messageId)
  }

  async messagePayload (messageId: string): Promise<MessagePayload> {
    log.verbose('Puppet', 'messagePayload(%s)', messageId)
    if (!messageId) {
      throw new Error('no id')
    }

    const cachedPayload = this.messagePayloadCache(messageId)
    if (cachedPayload) {
      return cachedPayload
    }

    const rawPayload = await this.messageRawPayload(messageId)
    const payload    = await this.messageRawPayloadParser(rawPayload)
    this.#cache.message.set(messageId, payload)
    return payload
  }

  messageList (): string[] {
    log.verbose('Puppet', 'messageList()')
    return [ ...this.#cache.message.keys() ]
  }

  async messageSearch (
    query?: MessageQueryFilter,
  ): Promise<string[]> {
    log.verbose('Puppet', 'messageSearch(%s)', JSON.stringify(query))

    if (query?.id) {
      try {
        await this.messagePayload(query.id)
        return [ query.id ]
      } catch (e) {
        log.verbose('Puppet', 'messageSearch() payload not found for id "%s"', query.id)
        return []
      }
    }

    const allMessageIdList: string[] = this.messageList()
    if (!query || Object.keys(query).length <= 0) {
      return allMessageIdList
    }

    const messagePayloadList: MessagePayload[] = await Promise.all(
      allMessageIdList.map(id => this.messagePayload(id)),
    )

    const filterFunction = this.messageQueryFilterFactory(query)
    return messagePayloadList.filter(filterFunction).map(payload => payload.id)
  }

  messageQueryFilterFactory (
    query: MessageQueryFilter,
  ): MessagePayloadFilterFunction {
    log.verbose('Puppet', 'messageQueryFilterFactory(%s)', JSON.stringify(query))

    if (Object.keys(query).length <= 0) {
      throw new Error('query empty')
    }

    const filterFunctionList: MessagePayloadFilterFunction[] = []
    const filterKeyList = Object.keys(query) as Array<keyof MessageQueryFilter>

    for (const filterKey of filterKeyList) {
      const filterValue = query[filterKey]
      if (!filterValue) {
        throw new Error('filterValue not found for filterKey: ' + filterKey)
      }

      let filterFunction: MessagePayloadFilterFunction
      if (filterValue instanceof RegExp) {
        filterFunction = (payload: MessagePayload) => filterValue.test(payload[filterKey] as string)
      } else {
        filterFunction = (payload: MessagePayload) => filterValue === payload[filterKey]
      }

      filterFunctionList.push(filterFunction)
    }

    return (payload: MessagePayload) => filterFunctionList.every(func => func(payload))
  }

  async messagePayloadDirty (id: string): Promise<void> {
    log.verbose('Puppet', 'messagePayloadDirty(%s)', id)
    await this.__dirtyPayloadAwait(DirtyType.Message, id)
  }

  messageSend (
    conversationId: string,
    sayable: SayablePayload,
  ): Promise<void | string> {
    log.verbose('Puppet', 'messageSend(%s, {type:%s})', conversationId, sayable.type)

    switch (sayable.type) {
      case sayableTypes.Attachment:
      case sayableTypes.Audio:
      case sayableTypes.Emoticon:
      case sayableTypes.Image:
      case sayableTypes.Video:
        return this.messageSendFile(conversationId, filebox(sayable.payload.filebox))
      case sayableTypes.Contact:
        return this.messageSendContact(conversationId, sayable.payload.contactId)
      case sayableTypes.Location:
        return this.messageSendLocation(conversationId, sayable.payload)
      case sayableTypes.MiniProgram:
        return this.messageSendMiniProgram(conversationId, sayable.payload)
      case sayableTypes.Url:
        return this.messageSendUrl(conversationId, sayable.payload)
      case sayableTypes.Text:
        return this.messageSendText(conversationId, sayable.payload.text, sayable.payload.mentions)
      case sayableTypes.Post:
        return this.messageSendPost(conversationId, sayable.payload)
      default:
        throw new Error('unsupported sayable payload: ' + JSON.stringify(sayable))
    }
  }

  // ==========================================
  // Post Domain API
  // ==========================================

  /**
   * Post Domain API (optional capability). Provider puppets override if supported.
   * Default implementations throw an unsupported API error.
   */
  async postRawPayload (postId: string): Promise<any> {
    log.verbose('Puppet', 'postRawPayload(%s)', postId)
    return throwUnsupportedError('postRawPayload() is not supported by this puppet')
  }

  async postRawPayloadParser (_rawPayload: any): Promise<PostPayload> {
    log.verbose('Puppet', 'postRawPayloadParser(...)')
    return throwUnsupportedError('postRawPayloadParser() is not supported by this puppet')
  }

  async postPublish (_payload: PostPayload): Promise<void | string> {
    log.verbose('Puppet', 'postPublish(...)')
    return throwUnsupportedError('postPublish() is not supported by this puppet')
  }

  async postSearch (
    _filter: PostQueryFilter,
    _pagination?: PaginationRequest,
  ): Promise<PaginationResponse<string[]>> {
    log.verbose('Puppet', 'postSearch(...)')
    return throwUnsupportedError('postSearch() is not supported by this puppet')
  }

  postPayloadCache (postId: string): undefined | PostPayload {
    if (!postId) {
      throw new Error('no id')
    }
    return this.#cache.post.get(postId)
  }

  async postPayload (postId: string): Promise<PostPayload> {
    log.verbose('Puppet', 'postPayload(%s)', postId)
    if (!postId) {
      throw new Error('no id')
    }

    const cachedPayload = this.postPayloadCache(postId)
    if (cachedPayload) {
      return cachedPayload
    }

    const rawPayload = await this.postRawPayload(postId)
    const payload    = await this.postRawPayloadParser(rawPayload)
    this.#cache.post.set(postId, payload)
    return payload
  }

  postList (): string[] {
    log.verbose('Puppet', 'postList()')
    return [ ...this.#cache.post.keys() ]
  }

  async postPayloadDirty (id: string): Promise<void> {
    log.verbose('Puppet', 'postPayloadDirty(%s)', id)
    await this.__dirtyPayloadAwait(DirtyType.Post, id)
  }

  // ==========================================
  // Sayable Domain API
  // ==========================================

  async sayablePayload (
    sayableId: string,
  ): Promise<undefined | SayablePayload> {
    log.verbose('Puppet', 'sayablePayload(%s)', sayableId)

    const payload = await this.messagePayload(sayableId)

    switch (payload.type) {
      case MessageType.Text:
        return sayablePayloads.text(payload.text || '')
      case MessageType.Image:
      case MessageType.Attachment:
      case MessageType.Audio:
      case MessageType.Video:
      case MessageType.Emoticon: {
        const fileBox = await this.messageFile(sayableId)
        return sayablePayloads.attatchment(fileBox)
      }
      case MessageType.Contact: {
        const contactId = await this.messageContact(sayableId)
        return sayablePayloads.contact(contactId)
      }
      case MessageType.Url: {
        const urlLinkPayload = await this.messageUrl(sayableId)
        return sayablePayloads.url(urlLinkPayload)
      }
      case MessageType.MiniProgram: {
        const miniProgramPayload = await this.messageMiniProgram(sayableId)
        return sayablePayloads.miniProgram(miniProgramPayload)
      }
      case MessageType.Location: {
        const locationPayload = await this.messageLocation(sayableId)
        return sayablePayloads.location(locationPayload)
      }
      case MessageType.Post: {
        const postPayload = await this.postPayload(sayableId)
        return sayablePayloads.post(postPayload)
      }
      default:
        log.warn('Puppet',
          'sayablePayload() can not convert not re-sayable type: %s(%s) for %s\n%s',
          typeName(MessageType, payload.type),
          payload.type,
          sayableId,
          new Error().stack,
        )
        return undefined
    }
  }

  // ==========================================
  // Tap Domain API
  // ==========================================

  /**
   * Tap Domain API (optional capability). Provider puppets override if supported.
   * Default implementations throw an unsupported API error.
   */
  async tap (
    postId : string,
    type?  : TapType,
    tap?   : boolean,
  ): Promise<void | boolean> {
    log.verbose('Puppet', 'tap(%s, %s, %s)', postId, type, tap)
    return throwUnsupportedError('tap() is not supported by this puppet')
  }

  async tapSearch (
    postId       : string,
    _query?      : TapQueryFilter,
    _pagination? : PaginationRequest,
  ): Promise<PaginationResponse<TapPayload>> {
    log.verbose('Puppet', 'tapSearch(%s, ...)', postId)
    return throwUnsupportedError('tapSearch() is not supported by this puppet')
  }

}

/**
 * Preserves canonical class name `Puppet` for runtime reflection and `looseInstanceOfClass`
 * compatibility across duplicate package installations.
 */
Object.defineProperty(PuppetImpl, 'name', {
  configurable: true,
  value: 'Puppet',
})

/**
 * Union of protected and internal properties that are omitted from the canonical
 * doc-typed `Puppet` interface.
 */
type PuppetProtectedProperty =
  | '_memory'
  | 'memory'
  | '__authQrCode'
  | '__currentUserId'
  | 'login'
  | 'logonoff'
  | 'cache'
  | 'onDirty'
  | '__cacheMixinCleanCallbackList'
  | '__dirtyPayloadAwait'
  | 'contactRawPayload'
  | 'contactRawPayloadParser'
  | 'contactQueryFilterFactory'
  | 'contactPayloadCache'
  | 'roomMemberRawPayload'
  | 'roomMemberRawPayloadParser'
  | 'roomQueryFilterFactory'
  | 'roomRawPayload'
  | 'roomRawPayloadParser'
  | 'roomPayloadCache'
  | 'friendshipRawPayload'
  | 'friendshipRawPayloadParser'
  | 'friendshipPayloadCache'
  | 'roomInvitationPayloadCache'
  | 'roomInvitationRawPayload'
  | 'roomInvitationRawPayloadParser'
  | 'messagePayloadCache'
  | 'messageQueryFilterFactory'
  | 'messageRawPayload'
  | 'messageRawPayloadParser'
  | '__counter'
  | '__watchdog'
  | '__serviceCtlResettingIndicator'
  | '__serviceCtlLogger'
  | 'postPayloadCache'
  | 'postRawPayload'
  | 'postRawPayloadParser'

/**
 * Pure doc-typed interface contract for puppet instances, omitting all internal
 * state, protected properties, and private members prefixed with `_`.
 */
type Puppet = Omit<
  PuppetImpl,
  PuppetProtectedProperty | `_${string}`
>

/**
 * Abstract class constructor type for `Puppet`.
 *
 * Implements TypeScript Declaration Merging allowing provider classes to extend `Puppet`
 * and consumers to type instances as `Puppet`.
 */
type PuppetAbstractConstructor = (abstract new (...args: any[]) => PuppetImpl) & {
  readonly prototype: Puppet
} & Omit<typeof PuppetImpl, 'prototype'>

const Puppet = PuppetImpl as unknown as PuppetAbstractConstructor

export {
  Puppet,
  PuppetImpl,
  type PuppetProtectedProperty,
}
