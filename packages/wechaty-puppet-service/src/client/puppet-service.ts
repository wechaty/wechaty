/**
 * `PuppetService`: client-side `wechaty-puppet` implementation connecting
 * to a remote puppet service over ConnectRPC and standard gRPC.
 */
import type { LifecycleClock, LifecycleScope } from 'scopelet'
import * as PUPPET from 'wechaty-puppet'

import type {
  FileBoxInterface,
  FileBox,
} from 'file-box'
import {
  EventType,
  type EventResponse,
} from 'wechaty-grpc'

import {
  uuidifyFileBoxGrpc,
  normalizeFileBoxUuid,
} from '../file-box-helper/mod.ts'
import {
  envVars,
  log,
  VERSION,
} from '../config.ts'
import {
  EventTypeRev,
} from '../event-type-rev.ts'
import { packageJson } from '../package-json.ts'

import {
  GrpcManager,
  type GrpcReconnectOptions,
} from './grpc-manager.ts'
import { PayloadStore } from './payload-store.ts'
import { millisecondsFromTimestamp } from '../pure-functions/timestamp.ts'

export type PuppetServiceOptions = PUPPET.PuppetOptions & {
  authority?     : string
  /** Optional clock for deterministic reconnect backoff and stop-timeout testing. */
  clock?         : LifecycleClock
  /** Maximum milliseconds to wait for `GrpcManager.stop()` before force-closing. */
  stopTimeoutMs? : number
  /** Options controlling automatic stream-loss reconnection in `GrpcManager`. */
  reconnect?     : GrpcReconnectOptions
  tls?: {
    caCert?     : string
    serverName? : string
    disable?    : boolean
  }
}

class PuppetService extends PUPPET.Puppet {

  static override readonly VERSION = VERSION

  protected _cleanupCallbackList: (() => void)[]
  protected _payloadStore: PayloadStore
  private authQueue: Promise<void> = Promise.resolve()

  protected _grpcManager?: GrpcManager
  get grpcManager (): GrpcManager {
    if (!this._grpcManager) {
      throw new Error('no grpc manager')
    }
    return this._grpcManager
  }

  protected FileBoxUuid: typeof FileBox

  declare options: PuppetServiceOptions

  constructor (
    options: PuppetServiceOptions = {},
  ) {
    super(options)
    this._payloadStore = new PayloadStore({
      token: envVars.WECHATY_PUPPET_SERVICE_TOKEN(this.options.token),
    })

    this.hookPayloadStore()

    this._cleanupCallbackList = []

    this.FileBoxUuid = uuidifyFileBoxGrpc(() => this.grpcManager.client)
  }

  protected async serializeFileBox (fileBox: FileBoxInterface): Promise<string> {
    const normalizedFileBox = await normalizeFileBoxUuid(this.FileBoxUuid)(fileBox)
    return JSON.stringify(normalizedFileBox)
  }

  override name () {
    return packageJson.name || 'wechaty-puppet-service'
  }

  override version () {
    return packageJson.version || '0.0.0'
  }

  /** Start the client and bind `GrpcManager` as a child of Puppet's lifecycle scope. */
  override async onStart (signal?: AbortSignal, scope?: LifecycleScope): Promise<void> {
    log.verbose('PuppetService', 'onStart()')
    signal?.throwIfAborted()

    if (this._grpcManager) {
      log.warn('PuppetService', 'onStart() found this.grpc is already existed. dropped.')
      this._grpcManager = undefined
    }

    log.verbose('PuppetService', 'start() instantiating GrpcManager ...')
    const grpcManager = new GrpcManager(this.options)
    this._grpcManager = grpcManager

    log.verbose('PuppetService', 'start() setting up bridge grpc event stream ...')
    this.bridgeGrpcEventStream(grpcManager)

    log.verbose('PuppetService', 'start() starting grpc manager...')
    if (scope) {
      await scope.start(grpcManager)
    } else {
      await grpcManager.start({ signal })
    }

    log.verbose('PuppetService', 'onStart() ... done')
  }

  override async onStop (): Promise<void> {
    log.verbose('PuppetService', 'onStop()')

    this._cleanupCallbackList.map(setImmediate)
    this._cleanupCallbackList.length = 0

    try {
      if (this._grpcManager) {
        log.verbose('PuppetService', 'onStop() stopping grpc manager ...')
        const grpcManager = this._grpcManager
        this._grpcManager = undefined
        await grpcManager.stop()
        log.verbose('PuppetService', 'onStop() stopping grpc manager ... done')
      }
    } finally {
      await this.authQueue.catch(() => {})
      await this._payloadStore.stop()
    }
    log.verbose('PuppetService', 'onStop() ... done')
  }

  protected hookPayloadStore (): void {
    log.verbose('PuppetService', 'hookPayloadStore()')

    this.on('login', async ({ contactId }) => {
      try {
        log.verbose('PuppetService', 'hookPayloadStore() this.on(login) contactId: "%s"', contactId)
        await this._payloadStore.start(contactId)
      } catch (e) {
        log.verbose('PuppetService', 'hookPayloadStore() this.on(login) rejection "%s"', (e as Error).message)
      }
    })

    this.on('logout', async ({ contactId }) => {
      log.verbose('PuppetService', 'hookPayloadStore() this.on(logout) contactId: "%s"', contactId)
      try {
        await this._payloadStore.stop()
      } catch (e) {
        log.verbose('PuppetService', 'hookPayloadStore() this.on(logout) rejection "%s"', (e as Error).message)
      }
    })
  }

  protected bridgeGrpcEventStream (client: GrpcManager): void {
    log.verbose('PuppetService', 'bridgeGrpcEventStream(client)')

    client
      .on('data', this.onGrpcStreamEvent.bind(this))
      .on('end', () => {
        log.verbose('PuppetService', 'bridgeGrpcEventStream() eventStream.on(end)')
      })
      .on('error', (e: unknown) => {
        this.emit('error', e)
      })
  }

  /** Serialize stream-driven login/logout transitions and skip them once stopped. */
  private enqueueAuthTransition (fn: () => Promise<void>): void {
    this.authQueue = this.authQueue
      .then(async () => {
        if (!this.isActive) {
          return
        }
        await fn()
      })
      .catch(e => {
        log.error('PuppetService', 'onGrpcStreamEvent() auth transition rejection %s',
          (e as Error).message,
        )
      })
  }

  private onGrpcStreamEvent (event: EventResponse): void {
    const type    = event.type
    const payload = event.payload

    log.verbose('PuppetService',
      'onGrpcStreamEvent({type:%s(%s), payload(len:%s)})',
      EventTypeRev[type],
      type,
      payload.length,
    )

    if (type !== EventType.HEARTBEAT) {
      this.emit('heartbeat', {
        data: `onGrpcStreamEvent(${EventTypeRev[type]})`,
      })
    }

    switch (type) {
      case EventType.DONG:
        this.emit('dong', JSON.parse(payload) as PUPPET.payloads.EventDong)
        break
      case EventType.ERROR:
        this.emit('error', JSON.parse(payload) as PUPPET.payloads.EventError)
        break
      case EventType.HEARTBEAT:
        this.emit('heartbeat', JSON.parse(payload) as PUPPET.payloads.EventHeartbeat)
        break
      case EventType.FRIENDSHIP:
        this.emit('friendship', JSON.parse(payload) as PUPPET.payloads.EventFriendship)
        break
      case EventType.LOGIN:
        {
          const loginPayload = JSON.parse(payload) as PUPPET.payloads.EventLogin
          this.enqueueAuthTransition(async () => {
            if (this.isLoggedIn) {
              if (this.currentUserId === loginPayload.contactId) {
                return
              }
              await super.logout('re-login')
            }
            if (!this.isActive) {
              return
            }
            await this.login(loginPayload.contactId)
          })
        }
        break
      case EventType.LOGOUT:
        {
          const logoutPayload = JSON.parse(payload) as PUPPET.payloads.EventLogout
          this.enqueueAuthTransition(async () => {
            await super.logout(logoutPayload.data)
          })
        }
        break
      case EventType.DIRTY:
        this.emit('dirty', JSON.parse(payload) as PUPPET.payloads.EventDirty)
        break
      case EventType.MESSAGE:
        this.emit('message', JSON.parse(payload) as PUPPET.payloads.EventMessage)
        break
      case EventType.POST:
        this.emit('post', JSON.parse(payload) as PUPPET.payloads.EventPost)
        break
      case EventType.READY:
        this.emit('ready', JSON.parse(payload) as PUPPET.payloads.EventReady)
        break
      case EventType.ROOM_INVITE:
        this.emit('room-invite', JSON.parse(payload) as PUPPET.payloads.EventRoomInvite)
        break
      case EventType.ROOM_JOIN:
        this.emit('room-join', JSON.parse(payload) as PUPPET.payloads.EventRoomJoin)
        break
      case EventType.ROOM_LEAVE:
        this.emit('room-leave', JSON.parse(payload) as PUPPET.payloads.EventRoomLeave)
        break
      case EventType.ROOM_TOPIC:
        this.emit('room-topic', JSON.parse(payload) as PUPPET.payloads.EventRoomTopic)
        break
      case EventType.SCAN:
        this.emit('scan', JSON.parse(payload) as PUPPET.payloads.EventScan)
        break
      case EventType.RESET:
        this.emit('reset', JSON.parse(payload) as PUPPET.payloads.EventReset)
        break
      default:
        break
    }
  }

  override async logout (reason?: string): Promise<void> {
    log.verbose('PuppetService', 'logout(%s)', reason ? `"${reason}"` : '')
    await super.logout(reason)
    try {
      await this.grpcManager.client.logout({})
    } catch (e) {
      log.silly('PuppetService', 'logout() no grpc client')
    }
  }

  override ding (data: string): void {
    log.silly('PuppetService', 'ding(%s)', data)
    this.grpcManager.client.ding({ data: data || '' }).catch(error => {
      log.error('PuppetService', 'ding() rejection: %s', error)
    })
  }

  override async dirtyPayload (type: PUPPET.types.Dirty, id: string) {
    log.verbose('PuppetService', 'dirtyPayload(%s, %s)', type, id)
    await this.grpcManager.client.dirtyPayload({ id, type: type as any })
  }

  override onDirty (
    {
      payloadType,
      payloadId,
    }: PUPPET.payloads.EventDirty,
  ): void {
    log.verbose('PuppetService', 'onDirty(%s<%s>, %s)', PUPPET.helpers.typeName(PUPPET.types.Dirty, payloadType), payloadType, payloadId)

    const dirtyMap = {
      [PUPPET.types.Dirty.Contact]:      async (id: string) => this._payloadStore.contact?.delete(id),
      [PUPPET.types.Dirty.Friendship]:   async (_: string) => {},
      [PUPPET.types.Dirty.Message]:      async (_: string) => {},
      [PUPPET.types.Dirty.Post]:         async (_: string) => {},
      [PUPPET.types.Dirty.Room]:         async (id: string) => this._payloadStore.room?.delete(id),
      [PUPPET.types.Dirty.RoomMember]:   async (id: string) => this._payloadStore.roomMember?.delete(id),
      [PUPPET.types.Dirty.Unspecified]:  async (id: string) => { throw new Error('Unspecified type with id: ' + id) },
    }

    const dirtyFuncSync = this.wrapAsync(dirtyMap[payloadType])
    dirtyFuncSync(payloadId)

    super.onDirty({ payloadId, payloadType })
  }

  // Contact
  override contactAlias (contactId: string): Promise<string>
  override contactAlias (contactId: string, alias: string | null): Promise<void>
  override async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetService', 'contactAlias(%s, %s)', contactId, alias)
    if (typeof alias === 'undefined') {
      const response = await this.grpcManager.client.contactAlias({ id: contactId })
      return response.alias || ''
    }
    await this.grpcManager.client.contactAlias({ id: contactId, alias: alias || '' })
  }

  override contactPhone (contactId: string): Promise<string[]>
  override contactPhone (contactId: string, phoneList: string[]): Promise<void>
  override async contactPhone (contactId: string, phoneList?: string[]): Promise<void | string[]> {
    log.verbose('PuppetService', 'contactPhone(%s, %s)', contactId, phoneList)
    if (typeof phoneList === 'undefined') {
      const payload = await this.contactPayload(contactId)
      return payload.phone
    }
    await this.grpcManager.client.contactPhone({ contactId, phones: phoneList })
  }

  override async contactCorporationRemark (contactId: string, corporationRemark: string | null): Promise<void> {
    log.verbose('PuppetService', 'contactCorporationRemark(%s, %s)', contactId, corporationRemark)
    await this.grpcManager.client.contactCorporationRemark({
      contactId,
      corporationRemark: corporationRemark || '',
    })
  }

  override async contactDescription (contactId: string, description: string | null): Promise<void> {
    log.verbose('PuppetService', 'contactDescription(%s, %s)', contactId, description)
    await this.grpcManager.client.contactDescription({
      contactId,
      description: description || '',
    })
  }

  override async contactList (): Promise<string[]> {
    log.verbose('PuppetService', 'contactList()')
    const response = await this.grpcManager.client.contactList({})
    return response.ids
  }

  override async contactRawPayload (id: string): Promise<PUPPET.payloads.Contact> {
    log.verbose('PuppetService', 'contactRawPayload(%s)', id)

    const cachedPayload = await this._payloadStore.contact?.get(id)
    if (cachedPayload) {
      log.silly('PuppetService', 'contactRawPayload(%s) cache HIT', id)
      return cachedPayload
    }

    const res = await this.grpcManager.client.contactPayload({ id })
    const payload: PUPPET.payloads.Contact = {
      address: res.address || undefined,
      alias: res.alias || undefined,
      avatar: res.avatar,
      city: res.city || undefined,
      corporation: res.corporation || undefined,
      coworker: res.coworker,
      description: res.description || undefined,
      friend: res.friend,
      gender: res.gender as unknown as PUPPET.types.ContactGender,
      id: res.id,
      name: res.name,
      phone: res.phones,
      province: res.province || undefined,
      signature: res.signature || undefined,
      star: res.star,
      title: res.title || undefined,
      type: res.type as unknown as PUPPET.types.Contact,
      weixin: res.weixin || undefined,
      handle: res.weixin || undefined,
    }

    await this._payloadStore.contact?.set(id, payload)
    log.silly('PuppetService', 'contactRawPayload(%s) cache SET', id)

    return payload
  }

  override async contactRawPayloadParser (payload: PUPPET.payloads.Contact): Promise<PUPPET.payloads.Contact> {
    return payload
  }

  override contactAvatar (contactId: string): Promise<FileBoxInterface>
  override contactAvatar (contactId: string, fileBox: FileBoxInterface): Promise<void>
  override async contactAvatar (contactId: string, fileBox?: FileBoxInterface): Promise<void | FileBoxInterface> {
    log.verbose('PuppetService', 'contactAvatar(%s, %s)', contactId, fileBox)
    if (fileBox) {
      const serialized = await this.serializeFileBox(fileBox)
      await this.grpcManager.client.contactAvatar({ id: contactId, fileBox: serialized })
      return
    }
    const response = await this.grpcManager.client.contactAvatar({ id: contactId })
    return this.FileBoxUuid.fromJSON(response.fileBox)
  }

  override async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetService', 'contactSelfName(%s)', name)
    await this.grpcManager.client.contactSelfName({ name })
  }

  override async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetService', 'contactSelfQRCode()')
    const response = await this.grpcManager.client.contactSelfQRCode({})
    return response.qrcode
  }

  override async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetService', 'contactSelfSignature(%s)', signature)
    await this.grpcManager.client.contactSelfSignature({ signature })
  }

  override tap (
    postId : string,
    type?  : PUPPET.types.Tap,
    tap?   : boolean,
  ): Promise<void | boolean> {
    log.verbose('PuppetService', 'tap(%s, %s, %s)', postId, type, tap)
    return PUPPET.throwUnsupportedError('tap() is not in the gRPC protocol')
  }

  override tapSearch (
    postId      : string,
    query?      : PUPPET.filters.Tap,
    pagination? : PUPPET.filters.PaginationRequest,
  ): Promise<PUPPET.filters.PaginationResponse<PUPPET.payloads.Tap>> {
    log.verbose('PuppetService', 'tapSearch(%s, %s, %s)', postId, JSON.stringify(query), JSON.stringify(pagination))
    return PUPPET.throwUnsupportedError('tapSearch() is not in the gRPC protocol')
  }

  // Conversation
  override async conversationReadMark (
    conversationId: string,
    hasRead = true,
  ): Promise<void | boolean> {
    log.verbose('PuppetService', 'conversationReadMark(%s, %s)', conversationId, hasRead)
    const response = await this.grpcManager.client.conversationRead({ conversationId, hasRead })
    return response.hasRead
  }

  // Message
  override async messageContact (messageId: string): Promise<string> {
    log.verbose('PuppetService', 'messageContact(%s)', messageId)
    const response = await this.grpcManager.client.messageContact({ id: messageId })
    return response.id
  }

  override async messageFile (messageId: string): Promise<FileBoxInterface> {
    log.verbose('PuppetService', 'messageFile(%s)', messageId)
    const response = await this.grpcManager.client.messageFile({ id: messageId })
    return this.FileBoxUuid.fromJSON(response.fileBox)
  }

  override async messageImage (messageId: string, imageType: PUPPET.types.Image): Promise<FileBoxInterface> {
    log.verbose('PuppetService', 'messageImage(%s, %s)', messageId, imageType)
    const response = await this.grpcManager.client.messageImage({ id: messageId, type: imageType })
    return this.FileBoxUuid.fromJSON(response.fileBox)
  }

  override async messageRecall (messageId: string): Promise<boolean> {
    log.verbose('PuppetService', 'messageRecall(%s)', messageId)
    const response = await this.grpcManager.client.messageRecall({ id: messageId })
    return response.success
  }

  override async messageSendContact (conversationId: string, contactId: string): Promise<void | string> {
    log.verbose('PuppetService', 'messageSendContact(%s, %s)', conversationId, contactId)
    const response = await this.grpcManager.client.messageSendContact({ conversationId, contactId })
    return response.id || undefined
  }

  override async messageSendFile (conversationId: string, file: FileBoxInterface): Promise<void | string> {
    log.verbose('PuppetService', 'messageSendFile(%s, %s)', conversationId, file)
    const serialized = await this.serializeFileBox(file)
    const response = await this.grpcManager.client.messageSendFile({ conversationId, fileBox: serialized })
    return response.id || undefined
  }

  override async messageSendLocation (conversationId: string, locationPayload: PUPPET.payloads.Location): Promise<void | string> {
    log.verbose('PuppetService', 'messageSendLocation(%s, %s)', conversationId, JSON.stringify(locationPayload))
    const response = await this.grpcManager.client.messageSendLocation({
      conversationId,
      location: locationPayload,
    })
    return response.id || undefined
  }

  override async messageSendMiniProgram (conversationId: string, miniProgramPayload: PUPPET.payloads.MiniProgram): Promise<void | string> {
    log.verbose('PuppetService', 'messageSendMiniProgram(%s, %s)', conversationId, JSON.stringify(miniProgramPayload))
    const response = await this.grpcManager.client.messageSendMiniProgram({
      conversationId,
      miniProgram: miniProgramPayload,
    })
    return response.id || undefined
  }

  override async messageSendText (conversationId: string, text: string, mentionIdList?: string[]): Promise<void | string> {
    log.verbose('PuppetService', 'messageSendText(%s, %s, %s)', conversationId, text, mentionIdList)
    const response = await this.grpcManager.client.messageSendText({
      conversationId,
      mentionalIds: mentionIdList || [],
      text,
    })
    return response.id || undefined
  }

  override async messageSendUrl (conversationId: string, urlLinkPayload: PUPPET.payloads.UrlLink): Promise<void | string> {
    log.verbose('PuppetService', 'messageSendUrl(%s, %s)', conversationId, JSON.stringify(urlLinkPayload))
    const response = await this.grpcManager.client.messageSendUrl({
      conversationId,
      urlLink: urlLinkPayload,
    })
    return response.id || undefined
  }

  override async messageForward (conversationId: string, messageId: string): Promise<void | string> {
    log.verbose('PuppetService', 'messageForward(%s, %s)', conversationId, messageId)
    const response = await this.grpcManager.client.messageForward({ conversationId, messageId })
    return response.id || undefined
  }

  override async messageRawPayload (id: string): Promise<PUPPET.payloads.Message> {
    log.verbose('PuppetService', 'messageRawPayload(%s)', id)
    const res = await this.grpcManager.client.messagePayload({ id })
    return {
      filename: res.filename || undefined,
      fromId: res.talkerId,
      id: res.id,
      listenerId: res.listenerId || undefined,
      mentionIdList: res.mentionIds,
      roomId: res.roomId || undefined,
      talkerId: res.talkerId,
      text: res.text || undefined,
      timestamp: res.receiveTime ? millisecondsFromTimestamp(res.receiveTime) : Number(res.timestampDeprecated || 0n),
      toId: res.listenerId || undefined,
      type: res.type as PUPPET.types.Message,
    } as PUPPET.payloads.Message
  }

  override async messageRawPayloadParser (payload: PUPPET.payloads.Message): Promise<PUPPET.payloads.Message> {
    return payload
  }

  override async messageLocation (messageId: string): Promise<PUPPET.payloads.Location> {
    log.verbose('PuppetService', 'messageLocation(%s)', messageId)
    const res = await this.grpcManager.client.messageLocation({ id: messageId })
    const loc = res.location
    return {
      accuracy: loc?.accuracy || 0,
      address: loc?.address || '',
      latitude: loc?.latitude || 0,
      longitude: loc?.longitude || 0,
      name: loc?.name || '',
    }
  }

  override async messageMiniProgram (messageId: string): Promise<PUPPET.payloads.MiniProgram> {
    log.verbose('PuppetService', 'messageMiniProgram(%s)', messageId)
    const res = await this.grpcManager.client.messageMiniProgram({ id: messageId })
    const mp = res.miniProgram
    return {
      appid: mp?.appid || undefined,
      description: mp?.description || undefined,
      iconUrl: mp?.iconUrl || undefined,
      pagePath: mp?.pagePath || undefined,
      shareId: mp?.shareId || undefined,
      thumbKey: mp?.thumbKey || undefined,
      thumbUrl: mp?.thumbUrl || undefined,
      title: mp?.title || undefined,
      username: mp?.username || undefined,
    }
  }

  override async messageUrl (messageId: string): Promise<PUPPET.payloads.UrlLink> {
    log.verbose('PuppetService', 'messageUrl(%s)', messageId)
    const res = await this.grpcManager.client.messageUrl({ id: messageId })
    const u = res.urlLink
    return {
      description: u?.description || undefined,
      thumbnailUrl: u?.thumbnailUrl || undefined,
      title: u?.title || '',
      url: u?.url || '',
    }
  }

  // Room
  override async roomAdd (roomId: string, contactId: string, inviteOnly = false): Promise<void> {
    log.verbose('PuppetService', 'roomAdd(%s, %s, %s)', roomId, contactId, inviteOnly)
    await this.grpcManager.client.roomAdd({ contactId, id: roomId, inviteOnly })
  }

  override async roomAvatar (roomId: string): Promise<FileBoxInterface> {
    log.verbose('PuppetService', 'roomAvatar(%s)', roomId)
    const res = await this.grpcManager.client.roomAvatar({ id: roomId })
    return this.FileBoxUuid.fromJSON(res.fileBox)
  }

  override async roomCreate (contactIdList: string[], topic: string): Promise<string> {
    log.verbose('PuppetService', 'roomCreate(%s, %s)', contactIdList, topic)
    const res = await this.grpcManager.client.roomCreate({ contactIds: contactIdList, topic })
    return res.id
  }

  override async roomDel (roomId: string, contactId: string): Promise<void> {
    log.verbose('PuppetService', 'roomDel(%s, %s)', roomId, contactId)
    await this.grpcManager.client.roomDel({ contactId, id: roomId })
  }

  override async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetService', 'roomInvitationAccept(%s)', roomInvitationId)
    await this.grpcManager.client.roomInvitationAccept({ id: roomInvitationId })
  }

  override async roomInvitationRawPayload (id: string): Promise<PUPPET.payloads.RoomInvitation> {
    log.verbose('PuppetService', 'roomInvitationRawPayload(%s)', id)
    const res = await this.grpcManager.client.roomInvitationPayload({ id })
    return {
      avatar: res.avatar,
      id: res.id,
      invitation: res.invitation,
      inviterId: res.inviterId,
      memberCount: res.memberCount,
      memberIdList: res.memberIds,
      receiverId: res.receiverId,
      timestamp: res.receiveTime ? millisecondsFromTimestamp(res.receiveTime) : Number(res.timestampUint64Deprecated || 0n),
      topic: res.topic,
    }
  }

  override async roomInvitationRawPayloadParser (payload: PUPPET.payloads.RoomInvitation): Promise<PUPPET.payloads.RoomInvitation> {
    return payload
  }

  override async roomList (): Promise<string[]> {
    log.verbose('PuppetService', 'roomList()')
    const res = await this.grpcManager.client.roomList({})
    return res.ids
  }

  override async roomMemberList (roomId: string): Promise<string[]> {
    log.verbose('PuppetService', 'roomMemberList(%s)', roomId)
    const res = await this.grpcManager.client.roomMemberList({ id: roomId })
    return res.memberIds
  }

  override async roomMemberRawPayload (roomId: string, memberId: string): Promise<PUPPET.payloads.RoomMember> {
    log.verbose('PuppetService', 'roomMemberRawPayload(%s, %s)', roomId, memberId)

    const cachedPayload = await this._payloadStore.roomMember?.get(roomId)
    const cachedRoomMemberPayload = cachedPayload && cachedPayload[memberId]
    if (cachedRoomMemberPayload) {
      log.silly('PuppetService', 'roomMemberRawPayload(%s, %s) cache HIT', roomId, memberId)
      return cachedRoomMemberPayload
    }

    const res = await this.grpcManager.client.roomMemberPayload({ id: roomId, memberId })
    const payload: PUPPET.payloads.RoomMember = {
      avatar: res.avatar,
      id: res.id,
      inviterId: res.inviterId || undefined,
      name: res.name,
      roomAlias: res.roomAlias || undefined,
    }

    await this._payloadStore.roomMember?.set(roomId, {
      ...cachedPayload,
      [memberId]: payload,
    })
    log.silly('PuppetService', 'roomMemberRawPayload(%s, %s) cache SET', roomId, memberId)

    return payload
  }

  override async roomMemberRawPayloadParser (payload: PUPPET.payloads.RoomMember): Promise<PUPPET.payloads.RoomMember> {
    return payload
  }

  override async roomRawPayload (id: string): Promise<PUPPET.payloads.Room> {
    log.verbose('PuppetService', 'roomRawPayload(%s)', id)

    const cachedPayload = await this._payloadStore.room?.get(id)
    if (cachedPayload) {
      log.silly('PuppetService', 'roomRawPayload(%s) cache HIT', id)
      return cachedPayload
    }

    const res = await this.grpcManager.client.roomPayload({ id })
    const payload: PUPPET.payloads.Room = {
      adminIdList: res.adminIds,
      avatar: res.avatar || undefined,
      handle: res.handle || undefined,
      id: res.id,
      memberIdList: res.memberIds,
      ownerId: res.ownerId || undefined,
      topic: res.topic,
    }

    await this._payloadStore.room?.set(id, payload)
    log.silly('PuppetService', 'roomRawPayload(%s) cache SET', id)

    return payload
  }

  override async roomRawPayloadParser (payload: PUPPET.payloads.Room): Promise<PUPPET.payloads.Room> {
    return payload
  }

  override async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetService', 'roomQRCode(%s)', roomId)
    const res = await this.grpcManager.client.roomQRCode({ id: roomId })
    return res.qrcode
  }

  override async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetService', 'roomQuit(%s)', roomId)
    await this.grpcManager.client.roomQuit({ id: roomId })
  }

  override roomTopic (roomId: string): Promise<string>
  override roomTopic (roomId: string, topic: string): Promise<void>
  override async roomTopic (roomId: string, topic?: string): Promise<void | string> {
    log.verbose('PuppetService', 'roomTopic(%s, %s)', roomId, topic)
    if (typeof topic === 'undefined') {
      const res = await this.grpcManager.client.roomTopic({ id: roomId })
      return res.topic
    }
    await this.grpcManager.client.roomTopic({ id: roomId, topic })
  }

  override roomAnnounce (roomId: string): Promise<string>
  override roomAnnounce (roomId: string, text: string): Promise<void>
  override async roomAnnounce (roomId: string, text?: string): Promise<void | string> {
    log.verbose('PuppetService', 'roomAnnounce(%s, %s)', roomId, text)
    if (typeof text === 'undefined') {
      const res = await this.grpcManager.client.roomAnnounce({ id: roomId })
      return res.text
    }
    await this.grpcManager.client.roomAnnounce({ id: roomId, text })
  }

  // Friendship
  override async friendshipSearchPhone (phone: string): Promise<string | null> {
    log.verbose('PuppetService', 'friendshipSearchPhone(%s)', phone)
    const res = await this.grpcManager.client.friendshipSearchPhone({ phone })
    return res.contactId || null
  }

  override async friendshipSearchHandle (handle: string): Promise<string | null> {
    log.verbose('PuppetService', 'friendshipSearchHandle(%s)', handle)
    const res = await this.grpcManager.client.friendshipSearchHandle({ weixin: handle })
    return res.contactId || null
  }

  override async friendshipRawPayload (id: string): Promise<PUPPET.payloads.Friendship> {
    log.verbose('PuppetService', 'friendshipRawPayload(%s)', id)
    const res = await this.grpcManager.client.friendshipPayload({ id })
    return {
      contactId: res.contactId,
      hello: res.hello || undefined,
      id,
      scene: res.scene as any,
      stranger: res.stranger || undefined,
      ticket: res.ticket,
      type: res.type as any,
    } as any
  }

  override async friendshipRawPayloadParser (payload: PUPPET.payloads.Friendship): Promise<PUPPET.payloads.Friendship> {
    return payload
  }

  override async friendshipAdd (contactId: string, options: PUPPET.types.FriendshipAddOptions): Promise<void> {
    log.verbose('PuppetService', 'friendshipAdd(%s, %s)', contactId, JSON.stringify(options))
    const hello = typeof options === 'string' ? options : options.hello || ''
    const referrer = typeof options === 'object' ? options : undefined
    await this.grpcManager.client.friendshipAdd({
      contactId,
      hello,
      referrer,
    })
  }

  override async friendshipAccept (friendshipId: string): Promise<void> {
    log.verbose('PuppetService', 'friendshipAccept(%s)', friendshipId)
    await this.grpcManager.client.friendshipAccept({ id: friendshipId })
  }

  // Tag
  override async tagContactAdd (id: string, contactId: string): Promise<void> {
    log.verbose('PuppetService', 'tagContactAdd(%s, %s)', id, contactId)
    await this.grpcManager.client.tagContactAdd({ contactId, id })
  }

  override async tagContactRemove (id: string, contactId: string): Promise<void> {
    log.verbose('PuppetService', 'tagContactRemove(%s, %s)', id, contactId)
    await this.grpcManager.client.tagContactRemove({ contactId, id })
  }

  override async tagContactDelete (id: string): Promise<void> {
    log.verbose('PuppetService', 'tagContactDelete(%s)', id)
    await this.grpcManager.client.tagContactDelete({ id })
  }

  override async tagContactList (contactId?: string): Promise<string[]> {
    log.verbose('PuppetService', 'tagContactList(%s)', contactId)
    const res = await this.grpcManager.client.tagContactList({ contactId })
    return res.ids
  }

}

export {
  PuppetService,
}
export default PuppetService
