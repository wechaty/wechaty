/**
 * `puppetImplementation()`: ConnectRPC service handlers for the Wechaty Puppet service,
 * mapping incoming requests to the underlying `wechaty-puppet` implementation.
 */
import { Readable } from 'node:stream'
import {
  EventType,
  VERSION,
  type EventResponse,
} from 'wechaty-grpc'
import {
  FileBox,
  type FileBoxInterface,
} from 'file-box'
import * as PUPPET from 'wechaty-puppet'
import { timeoutPromise } from 'gerror'
import { ConnectError, Code } from '@connectrpc/connect'

import { normalizeFileBoxUuid } from '../file-box-helper/mod.ts'
import { log } from '../config.ts'
import { EventStreamManager, type EventStreamSink } from './event-stream-manager.ts'
import { timestampFromMilliseconds } from '../pure-functions/timestamp.ts'

export function puppetImplementation (
  puppet      : PUPPET.impls.PuppetInterface,
  FileBoxUuid : typeof FileBox,
) {
  let scanPayload: undefined  | PUPPET.payloads.EventScan
  let readyPayload: undefined | PUPPET.payloads.EventReady
  let readyTimeout: undefined | ReturnType<typeof setTimeout>

  puppet.on('scan', payload  => { scanPayload = payload })
  puppet.on('ready', payload => { readyPayload = payload })
  puppet.on('logout', _      => {
    readyPayload = undefined
    if (readyTimeout) {
      clearTimeout(readyTimeout)
    }
  })
  puppet.on('login', _       => {
    scanPayload = undefined
    readyTimeout = setTimeout(() => {
      if (readyPayload) {
        eventStreamManager.grpcEmit(EventType.READY, readyPayload)
      }
    }, 5 * 1000)
  })

  const eventStreamManager = new EventStreamManager(puppet)

  const serializeFileBox = async (fileBox: FileBoxInterface) => {
    const normalizedFileBox = await normalizeFileBoxUuid(FileBoxUuid)(fileBox)
    return JSON.stringify(normalizedFileBox)
  }

  return {

    // Base RPCs
    start: async () => {
      log.verbose('PuppetServiceImpl', 'start()')
      await timeoutPromise(puppet.start(), 15 * 1000)
      return {}
    },

    stop: async () => {
      log.verbose('PuppetServiceImpl', 'stop()')
      if (eventStreamManager.busy()) {
        eventStreamManager.stop()
      }
      readyPayload = undefined
      await timeoutPromise(puppet.stop(), 15 * 1000)
      return {}
    },

    version: async () => {
      log.verbose('PuppetServiceImpl', 'version() v%s', puppet.version())
      return { version: puppet.version() || VERSION }
    },

    logout: async () => {
      log.verbose('PuppetServiceImpl', 'logout()')
      await puppet.logout()
      return {}
    },

    ding: async (req: { data?: string }) => {
      log.verbose('PuppetServiceImpl', 'ding()')
      await puppet.ding(req.data)
      return {}
    },

    dirtyPayload: async (req: { type: number; id: string }) => {
      log.verbose('PuppetServiceImpl', 'dirtyPayload()')
      await puppet.dirtyPayload(req.type as PUPPET.types.Dirty, req.id)
      return {}
    },

    // Event Stream
    event: async function* (_req: unknown, ctx?: { signal?: AbortSignal }) {
      log.verbose('PuppetServiceImpl', 'event()')
      if (ctx?.signal?.aborted) {
        return
      }
      if (eventStreamManager.busy()) {
        throw new ConnectError('GrpcServerImpl.event() can not call twice.', Code.AlreadyExists)
      }

      const queue: EventResponse[] = []
      let notify: (() => void) | null = null
      let finished = false

      const streamSink: EventStreamSink = {
        write: (res: EventResponse) => {
          queue.push(res)
          if (notify) {
            const n = notify
            notify = null
            n()
          }
        },
        end: () => {
          finished = true
          if (notify) {
            const n = notify
            notify = null
            n()
          }
        },
      }

      eventStreamManager.start(streamSink)
      if (scanPayload) {
        eventStreamManager.grpcEmit(EventType.SCAN, scanPayload)
      }

      const abortHandler = () => {
        finished = true
        eventStreamManager.stop()
        if (notify) {
          const n = notify
          notify = null
          n()
        }
      }

      ctx?.signal?.addEventListener('abort', abortHandler, { once: true })

      try {
        while (!finished || queue.length > 0) {
          if (queue.length === 0) {
            await new Promise<void>((r) => { notify = r })
          }
          while (queue.length > 0) {
            yield queue.shift()!
          }
        }
      } finally {
        ctx?.signal?.removeEventListener('abort', abortHandler)
        eventStreamManager.stop()
      }
    },

    // Contact RPCs
    contactAlias: async (req: { id: string; alias?: string }) => {
      log.verbose('PuppetServiceImpl', 'contactAlias()')
      if (typeof req.alias === 'string') {
        await puppet.contactAlias(req.id, req.alias)
        return {}
      }
      const alias = await puppet.contactAlias(req.id)
      return { alias }
    },

    contactAvatar: async (req: { id: string; fileBox?: string }) => {
      log.verbose('PuppetServiceImpl', 'contactAvatar()')
      if (req.fileBox) {
        const fileBox = FileBoxUuid.fromJSON(req.fileBox)
        await puppet.contactAvatar(req.id, fileBox)
        return {}
      }
      const fileBox = await puppet.contactAvatar(req.id)
      const serialized = await serializeFileBox(fileBox)
      return { fileBox: serialized }
    },

    contactCorporationRemark: async (req: { contactId: string; corporationRemark?: string }) => {
      log.verbose('PuppetServiceImpl', 'contactCorporationRemark()')
      await puppet.contactCorporationRemark(req.contactId, req.corporationRemark || null)
      return {}
    },

    contactDescription: async (req: { contactId: string; description?: string }) => {
      log.verbose('PuppetServiceImpl', 'contactDescription()')
      await puppet.contactDescription(req.contactId, req.description || null)
      return {}
    },

    contactList: async () => {
      log.verbose('PuppetServiceImpl', 'contactList()')
      const ids = await puppet.contactList()
      return { ids }
    },

    contactPayload: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'contactPayload()')
      const payload = await puppet.contactPayload(req.id)
      return {
        address: payload.address || '',
        alias: payload.alias || '',
        avatar: payload.avatar || '',
        city: payload.city || '',
        corporation: payload.corporation || '',
        coworker: payload.coworker || false,
        description: payload.description || '',
        friend: payload.friend || false,
        gender: payload.gender,
        id: payload.id,
        name: payload.name || '',
        phones: payload.phone || [],
        province: payload.province || '',
        signature: payload.signature || '',
        star: payload.star || false,
        title: payload.title || '',
        type: payload.type,
        weixin: payload.handle || payload.weixin || '',
      }
    },

    contactPhone: async (req: { contactId: string; phones: string[] }) => {
      log.verbose('PuppetServiceImpl', 'contactPhone()')
      await puppet.contactPhone(req.contactId, req.phones)
      return {}
    },

    contactSelfName: async (req: { name: string }) => {
      log.verbose('PuppetServiceImpl', 'contactSelfName("%s")', req.name)
      await puppet.contactSelfName(req.name)
      return {}
    },

    contactSelfQRCode: async () => {
      log.verbose('PuppetServiceImpl', 'contactSelfQRCode()')
      const qrcode = await puppet.contactSelfQRCode()
      return { qrcode }
    },

    contactSelfSignature: async (req: { signature: string }) => {
      log.verbose('PuppetServiceImpl', 'contactSelfSignature()')
      await puppet.contactSelfSignature(req.signature)
      return {}
    },

    // Conversation RPCs
    conversationRead: async (req: { conversationId: string; hasRead?: boolean }) => {
      log.verbose('PuppetServiceImpl', 'conversationRead()')
      const result = await puppet.conversationReadMark(req.conversationId, req.hasRead)
      return { hasRead: typeof result === 'boolean' ? result : req.hasRead }
    },

    // Message RPCs
    messageContact: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'messageContact()')
      const id = await puppet.messageContact(req.id)
      return { id }
    },

    messageFile: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'messageFile()')
      const fileBox = await puppet.messageFile(req.id)
      const serialized = await serializeFileBox(fileBox)
      return { fileBox: serialized }
    },

    messageForward: async (req: { conversationId: string; messageId: string }) => {
      log.verbose('PuppetServiceImpl', 'messageForward()')
      const id = await puppet.messageForward(req.conversationId, req.messageId)
      return id ? { id } : {}
    },

    messageImage: async (req: { id: string; type: number }) => {
      log.verbose('PuppetServiceImpl', 'messageImage()')
      const fileBox = await puppet.messageImage(req.id, req.type as PUPPET.types.Image)
      const serialized = await serializeFileBox(fileBox)
      return { fileBox: serialized }
    },

    messageLocation: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'messageLocation()')
      const payload = await puppet.messageLocation(req.id)
      return {
        location: {
          accuracy: payload.accuracy,
          address: payload.address,
          latitude: payload.latitude,
          longitude: payload.longitude,
          name: payload.name,
        },
      }
    },

    messageMiniProgram: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'messageMiniProgram()')
      const payload = await puppet.messageMiniProgram(req.id)
      return {
        miniProgram: {
          appid: payload.appid || '',
          description: payload.description || '',
          iconUrl: payload.iconUrl || '',
          pagePath: payload.pagePath || '',
          shareId: payload.shareId || '',
          thumbKey: payload.thumbKey || '',
          thumbUrl: payload.thumbUrl || '',
          title: payload.title || '',
          username: payload.username || '',
        },
      }
    },

    messagePayload: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'messagePayload()')
      const payload = await puppet.messagePayload(req.id)
      const mentionIdList = ('mentionIdList' in payload) ? payload.mentionIdList || [] : []
      return {
        filename: payload.filename || '',
        id: payload.id,
        listenerId: payload.listenerId || payload.toId || '',
        mentionIds: mentionIdList,
        receiveTime: typeof payload.timestamp === 'number' ? timestampFromMilliseconds(payload.timestamp) : undefined,
        roomId: payload.roomId || '',
        talkerId: payload.talkerId || payload.fromId || '',
        text: payload.text || '',
        type: payload.type as any,
      }
    },

    messageRecall: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'messageRecall()')
      const success = await puppet.messageRecall(req.id)
      return { success }
    },

    messageSendContact: async (req: { conversationId: string; contactId: string }) => {
      log.verbose('PuppetServiceImpl', 'messageSendContact()')
      const id = await puppet.messageSendContact(req.conversationId, req.contactId)
      return id ? { id } : {}
    },

    messageSendFile: async (req: { conversationId: string; fileBox: string }) => {
      log.verbose('PuppetServiceImpl', 'messageSendFile()')
      const fileBox = FileBoxUuid.fromJSON(req.fileBox)
      const id = await puppet.messageSendFile(req.conversationId, fileBox)
      return id ? { id } : {}
    },

    messageSendLocation: async (req: { conversationId: string; location?: any }) => {
      log.verbose('PuppetServiceImpl', 'messageSendLocation()')
      const id = await puppet.messageSendLocation(req.conversationId, req.location)
      return id ? { id } : {}
    },

    messageSendMiniProgram: async (req: { conversationId: string; miniProgram?: any }) => {
      log.verbose('PuppetServiceImpl', 'messageSendMiniProgram()')
      const id = await puppet.messageSendMiniProgram(req.conversationId, req.miniProgram)
      return id ? { id } : {}
    },

    messageSendText: async (req: { conversationId: string; text: string; mentionIds?: string[]; mentionalIds?: string[] }) => {
      log.verbose('PuppetServiceImpl', 'messageSendText()')
      const mentionIds = req.mentionalIds ?? req.mentionIds
      const id = await puppet.messageSendText(req.conversationId, req.text, mentionIds)
      return id ? { id } : {}
    },

    messageSendUrl: async (req: { conversationId: string; urlLink?: any }) => {
      log.verbose('PuppetServiceImpl', 'messageSendUrl()')
      const id = await puppet.messageSendUrl(req.conversationId, req.urlLink)
      return id ? { id } : {}
    },

    messageUrl: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'messageUrl()')
      const payload = await puppet.messageUrl(req.id)
      return {
        urlLink: {
          description: payload.description || '',
          thumbnailUrl: payload.thumbnailUrl || '',
          title: payload.title || '',
          url: payload.url || '',
        },
      }
    },

    // Room RPCs
    roomAdd: async (req: { id: string; contactId: string; inviteOnly?: boolean }) => {
      log.verbose('PuppetServiceImpl', 'roomAdd()')
      await puppet.roomAdd(req.id, req.contactId, req.inviteOnly)
      return {}
    },

    roomAnnounce: async (req: { id: string; text?: string }) => {
      log.verbose('PuppetServiceImpl', 'roomAnnounce()')
      if (typeof req.text === 'string') {
        await puppet.roomAnnounce(req.id, req.text)
        return {}
      }
      const text = await puppet.roomAnnounce(req.id)
      return { text }
    },

    roomAvatar: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'roomAvatar()')
      const fileBox = await puppet.roomAvatar(req.id)
      const serialized = await serializeFileBox(fileBox)
      return { fileBox: serialized }
    },

    roomCreate: async (req: { contactIds: string[]; topic: string }) => {
      log.verbose('PuppetServiceImpl', 'roomCreate()')
      const id = await puppet.roomCreate(req.contactIds, req.topic)
      return { id }
    },

    roomDel: async (req: { id: string; contactId: string }) => {
      log.verbose('PuppetServiceImpl', 'roomDel()')
      await puppet.roomDel(req.id, req.contactId)
      return {}
    },

    roomInvitationAccept: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'roomInvitationAccept()')
      await puppet.roomInvitationAccept(req.id)
      return {}
    },

    roomInvitationPayload: async (req: { id: string; payload?: string }) => {
      log.verbose('PuppetServiceImpl', 'roomInvitationPayload()')
      if (req.payload) {
        await puppet.roomInvitationPayload(req.id, JSON.parse(req.payload))
        return {}
      }
      const payload = await puppet.roomInvitationPayload(req.id)
      return {
        avatar: payload.avatar,
        id: payload.id,
        invitation: payload.invitation,
        inviterId: payload.inviterId,
        memberCount: payload.memberCount,
        memberIds: payload.memberIdList,
        receiverId: payload.receiverId,
        receiveTime: typeof payload.timestamp === 'number' ? timestampFromMilliseconds(payload.timestamp) : undefined,
        topic: payload.topic,
      }
    },

    roomList: async () => {
      log.verbose('PuppetServiceImpl', 'roomList()')
      const ids = await puppet.roomList()
      return { ids }
    },

    roomMemberList: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'roomMemberList()')
      const memberIds = await puppet.roomMemberList(req.id)
      return { memberIds }
    },

    roomMemberPayload: async (req: { id: string; memberId: string }) => {
      log.verbose('PuppetServiceImpl', 'roomMemberPayload()')
      const payload = await puppet.roomMemberPayload(req.id, req.memberId)
      return {
        avatar: payload.avatar,
        id: payload.id,
        inviterId: payload.inviterId || '',
        name: payload.name,
        roomAlias: payload.roomAlias || '',
      }
    },

    roomPayload: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'roomPayload()')
      const payload = await puppet.roomPayload(req.id)
      return {
        adminIds: payload.adminIdList,
        avatar: payload.avatar || '',
        handle: payload.handle || '',
        id: payload.id,
        memberIds: payload.memberIdList,
        ownerId: payload.ownerId || '',
        topic: payload.topic,
      }
    },

    roomQRCode: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'roomQRCode()')
      const qrcode = await puppet.roomQRCode(req.id)
      return { qrcode }
    },

    roomQuit: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'roomQuit()')
      await puppet.roomQuit(req.id)
      return {}
    },

    roomTopic: async (req: { id: string; topic?: string }) => {
      log.verbose('PuppetServiceImpl', 'roomTopic()')
      if (typeof req.topic === 'string') {
        await puppet.roomTopic(req.id, req.topic)
        return {}
      }
      const topic = await puppet.roomTopic(req.id)
      return { topic }
    },

    // Friendship RPCs
    friendshipAccept: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'friendshipAccept()')
      await puppet.friendshipAccept(req.id)
      return {}
    },

    friendshipAdd: async (req: { contactId: string; hello?: string; referrer?: any }) => {
      log.verbose('PuppetServiceImpl', 'friendshipAdd()')
      const options: PUPPET.types.FriendshipAddOptions = {
        hello: req.hello,
        ...req.referrer,
      }
      await puppet.friendshipAdd(req.contactId, options)
      return {}
    },

    friendshipPayload: async (req: { id: string; payload?: string }) => {
      log.verbose('PuppetServiceImpl', 'friendshipPayload()')
      if (req.payload) {
        await puppet.friendshipPayload(req.id, JSON.parse(req.payload))
        return {}
      }
      const payload = await puppet.friendshipPayload(req.id)
      const payloadReceive = payload as PUPPET.payloads.FriendshipReceive
      return {
        contactId: payload.contactId,
        hello: payload.hello || '',
        id: payload.id,
        scene: payloadReceive.scene || PUPPET.types.FriendshipScene.Unknown,
        stranger: payloadReceive.stranger || '',
        ticket: payloadReceive.ticket,
        type: payload.type,
      }
    },

    friendshipSearchHandle: async (req: { weixin?: string; handle?: string }) => {
      log.verbose('PuppetServiceImpl', 'friendshipSearchHandle()')
      const handle = req.handle || req.weixin || ''
      const contactId = await puppet.friendshipSearchHandle(handle)
      return contactId ? { contactId } : {}
    },

    friendshipSearchPhone: async (req: { phone: string }) => {
      log.verbose('PuppetServiceImpl', 'friendshipSearchPhone()')
      const contactId = await puppet.friendshipSearchPhone(req.phone)
      return contactId ? { contactId } : {}
    },

    friendshipSearchWeixin: async (req: { weixin?: string; handle?: string }) => {
      log.verbose('PuppetServiceImpl', 'friendshipSearchWeixin()')
      const handle = req.handle || req.weixin || ''
      const contactId = await puppet.friendshipSearchHandle(handle)
      return contactId ? { contactId } : {}
    },

    // Tag RPCs
    tagContactAdd: async (req: { id: string; contactId: string }) => {
      log.verbose('PuppetServiceImpl', 'tagContactAdd()')
      await puppet.tagContactAdd(req.id, req.contactId)
      return {}
    },

    tagContactDelete: async (req: { id: string }) => {
      log.verbose('PuppetServiceImpl', 'tagContactDelete()')
      await puppet.tagContactDelete(req.id)
      return {}
    },

    tagContactList: async (req: { contactId?: string }) => {
      log.verbose('PuppetServiceImpl', 'tagContactList()')
      if (req.contactId) {
        const ids = await puppet.tagContactList(req.contactId)
        return { ids }
      }
      const ids = await puppet.tagContactList()
      return { ids }
    },

    tagContactRemove: async (req: { id: string; contactId: string }) => {
      log.verbose('PuppetServiceImpl', 'tagContactRemove()')
      await puppet.tagContactRemove(req.id, req.contactId)
      return {}
    },

    // Download / Upload RPCs
    download: async function* (req: { id: string }) {
      log.verbose('PuppetServiceImpl', 'download()')
      const fileBox = FileBoxUuid.fromUuid(req.id, { name: 'uuid.dat' })
      const stream = await fileBox.toStream()
      for await (const chunk of stream) {
        const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk
        yield {
          chunk: bytes,
        }
      }
    },

    upload: async (reqStream: AsyncIterable<{ chunk?: Uint8Array }>) => {
      log.verbose('PuppetServiceImpl', 'upload()')
      async function* toChunks () {
        for await (const req of reqStream) {
          if (req.chunk && req.chunk.length > 0) {
            yield req.chunk
          }
        }
      }
      const fileBox = FileBoxUuid.fromStream(Readable.from(toChunks()), 'uuid.dat')
      const uuid = await fileBox.toUuid()
      return { id: uuid }
    },

    // Deprecated streaming RPCs
    messageFileStream: async function* (req: { id: string }) {
      log.verbose('PuppetServiceImpl', 'messageFileStream()')
      const fileBox = await puppet.messageFile(req.id)
      yield {
        fileBoxChunk: {
          name: fileBox.name,
        },
      }
      const stream = await fileBox.toStream()
      for await (const chunk of stream) {
        const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk
        yield {
          fileBoxChunk: {
            data: bytes,
          },
        }
      }
    },

    messageImageStream: async function* (req: { id: string; type: number }) {
      log.verbose('PuppetServiceImpl', 'messageImageStream()')
      const fileBox = await puppet.messageImage(req.id, req.type as PUPPET.types.Image)
      yield {
        fileBoxChunk: {
          name: fileBox.name,
        },
      }
      const stream = await fileBox.toStream()
      for await (const chunk of stream) {
        const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk
        yield {
          fileBoxChunk: {
            data: bytes,
          },
        }
      }
    },

    messageSendFileStream: async (reqStream: AsyncIterable<any>) => {
      log.verbose('PuppetServiceImpl', 'messageSendFileStream()')
      const iterator = reqStream[Symbol.asyncIterator]()
      const first = await iterator.next()
      if (first.done || !first.value) {
        throw new ConnectError('empty stream', Code.InvalidArgument)
      }
      const conversationId = first.value.conversationId || ''
      async function* toChunks () {
        if (first.value.fileBoxChunk?.data) {
          yield first.value.fileBoxChunk.data
        }
        for await (const req of { [Symbol.asyncIterator]: () => iterator }) {
          if (req.fileBoxChunk?.data) {
            yield req.fileBoxChunk.data
          }
        }
      }
      const fileBox = FileBox.fromStream(Readable.from(toChunks()), 'stream.dat')
      const id = await puppet.messageSendFile(conversationId, fileBox)
      return id ? { id } : { id: '' }
    },

  }
}
