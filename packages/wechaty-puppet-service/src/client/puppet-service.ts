import util from 'util'

import { FileBoxType } from 'file-box'

import {
  ContactPayload,

  FileBox,

  FriendshipAddOptions,
  FriendshipPayload,

  MessagePayload,

  Puppet,
  PuppetOptions,

  EventDirtyPayload,
  EventDongPayload,
  EventErrorPayload,
  EventFriendshipPayload,
  EventHeartbeatPayload,
  EventLoginPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventReadyPayload,
  EventRoomInvitePayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  EventRoomTopicPayload,
  EventScanPayload,
  ImageType,
  MiniProgramPayload,
  PayloadType,
  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,
  UrlLinkPayload,
  throwUnsupportedError,
}                         from 'wechaty-puppet'

import {
  EventResponse,
  ContactAliasRequest,
  LogoutRequest,
  ContactListRequest,
  ContactSelfQRCodeRequest,
  ContactAvatarRequest,
  ContactPayloadRequest,
  ContactSelfNameRequest,
  ContactSelfSignatureRequest,
  MessageMiniProgramRequest,
  MessageContactRequest,
  MessageForwardRequest,
  MessageSendMiniProgramRequest,
  MessageRecallRequest,
  MessagePayloadRequest,
  MessageSendTextRequest,
  MessageSendContactRequest,
  MessageSendUrlRequest,
  MessageUrlRequest,
  RoomPayloadRequest,
  RoomListRequest,
  RoomDelRequest,
  RoomAvatarRequest,
  RoomAddRequest,
  RoomTopicRequest,
  RoomCreateRequest,
  RoomQuitRequest,
  RoomQRCodeRequest,
  RoomAnnounceRequest,
  RoomInvitationAcceptRequest,
  RoomInvitationPayloadRequest,
  FriendshipSearchPhoneRequest,
  FriendshipSearchWeixinRequest,
  FriendshipPayloadRequest,
  FriendshipAddRequest,
  FriendshipAcceptRequest,
  RoomMemberListRequest,
  RoomMemberPayloadRequest,
  TagContactAddRequest,
  TagContactRemoveRequest,
  TagContactDeleteRequest,
  TagContactListRequest,

  StringValue,
  DingRequest,

  EventType,
  DirtyPayloadRequest,
  ContactCorporationRemarkRequest,
  ContactDescriptionRequest,
  ContactPhoneRequest,
  MessageFileStreamRequest,
  MessageImageStreamRequest,
  MessageSendFileStreamResponse,
  MessageSendFileStreamRequest,
  MessageSendFileRequest,
}                                   from 'wechaty-grpc'
import { WechatyResolver }          from 'wechaty-token'

import { Subscription } from 'rxjs'

import {
  log,
  VERSION,
}                                         from '../config'

import {
  EventTypeRev,
}                 from '../event-type-rev'

import {
  packConversationIdFileBoxToPb,
  unpackFileBoxFromPb,
}                                   from '../file-box-stream/mod'
import { serializeFileBox }         from '../server/serialize-file-box'

import {
  recover$,
}             from './recover$'
import { GrpcClient } from './grpc-client'

/**
 * Huan(202108): register `wechaty` schema for gRPC service discovery
 *  so that we can use `wechaty:///__token__` for gRPC address
 *
 *  See: https://github.com/wechaty/wechaty-puppet-service/issues/155
 */
WechatyResolver.setup()

export type PuppetServiceOptions = PuppetOptions & {
  authority?   : string
  servername?  : string
  sslRootCert? : string
  /**
   * Huan(202108): only for compatible with old clients/servers
   *  for disabling SSL
   */
  noSslUnsafe? : boolean
}

export class PuppetService extends Puppet {

  static override readonly VERSION = VERSION

  private grpc?: GrpcClient

  protected recoverSubscription?: Subscription

  constructor (
    public override options: PuppetServiceOptions = {},
  ) {
    super(options)
  }

  override async start (): Promise<void> {
    await super.start()
    log.verbose('PuppetService', 'start()')

    if (this.state.on()) {
      log.warn('PuppetService', 'start() is called on a ON puppet. await ready(on) and return.')
      await this.state.ready('on')
      return
    }

    this.state.on('pending')

    if (this.grpc) {
      log.warn('PuppetService', 'start() found this.grpc is already existed. dropped.')
      this.grpc = undefined
    }

    try {
      const grpc = new GrpcClient(this.options)
      /**
       * Huan(202108): when we startedv the event stream,
       *  the `this.grpc` need to be available for all listeners.
       */
      this.grpc = grpc

      this.bridgeGrpcEventStream(grpc)
      await grpc.start()

      this.recoverSubscription = recover$(this).subscribe(
        x => log.verbose('PuppetService', 'constructor() recover$().subscribe() next(%s)', JSON.stringify(x)),
        e => log.error('PuppetService', 'constructor() recover$().subscribe() error(%s)', e),
        () => log.verbose('PuppetService', 'constructor() recover$().subscribe() complete()'),
      )

      this.state.on(true)
    } catch (e) {
      log.error('PuppetService', 'start() rejection: %s\n%s', e.message, e.stack)
      try {
        await this.grpc?.stop()
      } catch (e) {
        log.error('PuppetService', 'start() this.grpc.stop() rejection: %s\n%s', e.message, e.stack)
      } finally {
        this.state.off(true)
      }
      throw e
    }

  }

  override async stop (): Promise<void> {
    await super.stop()
    log.verbose('PuppetService', 'stop()')

    if (this.state.off()) {
      log.warn('PuppetService', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    if (this.recoverSubscription) {
      this.recoverSubscription.unsubscribe()
      this.recoverSubscription = undefined
    }

    if (this.logonoff()) {
      this.emit('logout', {
        contactId : this.selfId(),
        data      : 'PuppetService stop()',
      })
      this.id = undefined
    }

    try {
      await this.grpc?.stop()
      this.grpc = undefined
    } catch (e) {
      log.error('PuppetService', 'stop() client.stop() rejection: %s', e.message)
    } finally {
      this.state.off(true)
    }
  }

  private bridgeGrpcEventStream (client: GrpcClient): void {
    log.verbose('PuppetService', 'bridgeGrpcEventStream(client)')

    client
      .on('data', this.onGrpcStreamEvent.bind(this))
      .on('end', () => {
        log.verbose('PuppetService', 'bridgeGrpcEventStream() eventStream.on(end)')
      })
      .on('error', (e: unknown) => {
        // https://github.com/wechaty/wechaty-puppet-service/issues/16
        log.verbose('PuppetService', 'bridgeGrpcEventStream() eventStream.on(error) %s', e)
        const reason = 'bridgeGrpcEventStream() eventStream.on(error) ' + e
        /**
         * The `Puppet` class have a throttleQueue for receiving the `reset` events
         *  and it's the `Puppet` class's duty for call the `puppet.reset()` to reset the puppet.
         */
        if (this.state.on()) {
          this.emit('reset', { data: reason })
        }
      })
      .on('cancel', (...args: any[]) => {
        log.verbose('PuppetService', 'bridgeGrpcEventStream() eventStream.on(cancel), %s', JSON.stringify(args))
      })
  }

  private onGrpcStreamEvent (event: EventResponse): void {
    const type    = event.getType()
    const payload = event.getPayload()

    log.verbose('PuppetService',
      'onGrpcStreamEvent({type:%s(%s), payload:"%s"})',
      EventTypeRev[type],
      type,
      payload,
    )

    if (type !== EventType.EVENT_TYPE_HEARTBEAT) {
      this.emit('heartbeat', {
        data: `onGrpcStreamEvent(${EventTypeRev[type]})`,
      })
    }

    switch (type) {
      case EventType.EVENT_TYPE_DONG:
        this.emit('dong', JSON.parse(payload) as EventDongPayload)
        break
      case EventType.EVENT_TYPE_ERROR:
        this.emit('error', JSON.parse(payload) as EventErrorPayload)
        break
      case EventType.EVENT_TYPE_HEARTBEAT:
        this.emit('heartbeat', JSON.parse(payload) as EventHeartbeatPayload)
        break
      case EventType.EVENT_TYPE_FRIENDSHIP:
        this.emit('friendship', JSON.parse(payload) as EventFriendshipPayload)
        break
      case EventType.EVENT_TYPE_LOGIN:
        {
          const loginPayload = JSON.parse(payload) as EventLoginPayload
          this.id = loginPayload.contactId
          this.emit('login', loginPayload)
        }
        break
      case EventType.EVENT_TYPE_LOGOUT:
        this.id = undefined
        this.emit('logout', JSON.parse(payload) as EventLogoutPayload)
        break
      case EventType.EVENT_TYPE_DIRTY:
        this.emit('dirty', JSON.parse(payload) as EventDirtyPayload)
        break
      case EventType.EVENT_TYPE_MESSAGE:
        this.emit('message', JSON.parse(payload) as EventMessagePayload)
        break
      case EventType.EVENT_TYPE_READY:
        this.emit('ready', JSON.parse(payload) as EventReadyPayload)
        break
      case EventType.EVENT_TYPE_ROOM_INVITE:
        this.emit('room-invite', JSON.parse(payload) as EventRoomInvitePayload)
        break
      case EventType.EVENT_TYPE_ROOM_JOIN:
        this.emit('room-join', JSON.parse(payload) as EventRoomJoinPayload)
        break
      case EventType.EVENT_TYPE_ROOM_LEAVE:
        this.emit('room-leave', JSON.parse(payload) as EventRoomLeavePayload)
        break
      case EventType.EVENT_TYPE_ROOM_TOPIC:
        this.emit('room-topic', JSON.parse(payload) as EventRoomTopicPayload)
        break
      case EventType.EVENT_TYPE_SCAN:
        this.emit('scan', JSON.parse(payload) as EventScanPayload)
        break
      case EventType.EVENT_TYPE_RESET:
        log.warn('PuppetService', 'onGrpcStreamEvent() got an EventType.EVENT_TYPE_RESET ?')
        // the `reset` event should be dealed not send out
        break

      case EventType.EVENT_TYPE_UNSPECIFIED:
        log.error('PuppetService', 'onGrpcStreamEvent() got an EventType.EVENT_TYPE_UNSPECIFIED ?')
        break

      default:
        // Huan(202003): in default, the `type` type should be `never`, please check.
        throw new Error('eventType ' + type + ' unsupported! (code should not reach here)')
    }
  }

  override async logout (): Promise<void> {
    log.verbose('PuppetService', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    try {
      await util.promisify(
        this.grpc!.client!.logout.bind(this.grpc!.client!)
      )(new LogoutRequest())

    } catch (e) {
      log.error('PuppetService', 'logout() rejection: %s', e && e.message)
      throw e
    }
  }

  override ding (data: string): void {
    log.silly('PuppetService', 'ding(%s)', data)

    const request = new DingRequest()
    request.setData(data || '')

    if (!this.grpc?.client) {
      log.info('PuppetService', 'ding() Skip ding since client is not connected.')
      return
    }

    this.grpc.client.ding(
      request,
      (error, _response) => {
        if (error) {
          log.error('PuppetService', 'ding() rejection: %s', error)
        }
      }
    )
  }

  override async dirtyPayload (type: PayloadType, id: string) {
    await super.dirtyPayload(type, id)
    if (!this.grpc?.client) {
      throw new Error('PuppetService dirtyPayload() can not execute due to no grpcClient.')
    }
    const request = new DirtyPayloadRequest()
    request.setId(id)
    request.setType(type)
    try {
      await util.promisify(
        this.grpc.client.dirtyPayload.bind(this.grpc.client)
      )(request)

    } catch (e) {
      log.error('PuppetService', 'dirtyPayload() rejection: %s', e && e.message)
      throw e
    }
  }

  override unref (): void {
    log.verbose('PuppetService', 'unref()')
    super.unref()
  }

  /**
   *
   * Contact
   *
   */
  override contactAlias (contactId: string)                      : Promise<string>
  override contactAlias (contactId: string, alias: string | null): Promise<void>

  override async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetService', 'contactAlias(%s, %s)', contactId, alias)

    /**
     * Get alias
     */
    if (typeof alias === 'undefined') {
      const request = new ContactAliasRequest()
      request.setId(contactId)

      const response = await util.promisify(
        this.grpc!.client!.contactAlias.bind(this.grpc!.client!)
      )(request)

      const aliasWrapper = response.getAlias()

      if (!aliasWrapper) {
        throw new Error('can not get aliasWrapper')
      }

      return aliasWrapper.getValue()
    }

    /**
     * Set alias
     */
    const aliasWrapper = new StringValue()
    aliasWrapper.setValue(alias || '')  // null -> '', in server, we treat '' as null

    const request = new ContactAliasRequest()
    request.setId(contactId)
    request.setAlias(aliasWrapper)

    await util.promisify(
      this.grpc!.client!.contactAlias.bind(this.grpc!.client!)
    )(request)
  }

  override async contactPhone (contactId: string, phoneList: string[]): Promise<void> {
    log.verbose('PuppetService', 'contactPhone(%s, %s)', contactId, phoneList)

    const request = new ContactPhoneRequest()
    request.setContactId(contactId)
    request.setPhoneListList(phoneList)

    await util.promisify(
      this.grpc!.client!.contactPhone.bind(this.grpc!.client!)
    )(request)
  }

  override async contactCorporationRemark (contactId: string, corporationRemark: string | null) {
    log.verbose('PuppetService', 'contactCorporationRemark(%s, %s)', contactId, corporationRemark)

    const corporationRemarkWrapper = new StringValue()
    if (corporationRemark) {
      corporationRemarkWrapper.setValue(corporationRemark)
    }

    const request = new ContactCorporationRemarkRequest()
    request.setContactId(contactId)
    request.setCorporationRemark(corporationRemarkWrapper)

    await util.promisify(
      this.grpc!.client!.contactCorporationRemark.bind(this.grpc!.client!)
    )(request)
  }

  override async contactDescription (contactId: string, description: string | null) {
    log.verbose('PuppetService', 'contactDescription(%s, %s)', contactId, description)

    const descriptionWrapper = new StringValue()
    if (description) {
      descriptionWrapper.setValue(description)
    }

    const request = new ContactDescriptionRequest()
    request.setContactId(contactId)
    request.setDescription(descriptionWrapper)

    await util.promisify(
      this.grpc!.client!.contactDescription.bind(this.grpc!.client!)
    )(request)
  }

  override async contactList (): Promise<string[]> {
    log.verbose('PuppetService', 'contactList()')

    const response = await util.promisify(
      this.grpc!.client!.contactList.bind(this.grpc!.client!)
    )(new ContactListRequest())

    return response.getIdsList()
  }

  // override async contactQrCode (contactId: string): Promise<string> {
  //   if (contactId !== this.selfId()) {
  //     throw new Error('can not set avatar for others')
  //   }

  //   const response = await util.promisify(
  //     this.grpc!.client!.contactSelfQRCode.bind(this.grpc!.client!)
  //   )(new ContactSelfQRCodeRequest())

  //   return response.getQrcode()
  // }

  override async contactAvatar (contactId: string)                : Promise<FileBox>
  override async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  override async contactAvatar (contactId: string, fileBox?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetService', 'contactAvatar(%s)', contactId)

    /**
     * 1. set
     */
    if (fileBox) {
      const fileboxWrapper = new StringValue()
      fileboxWrapper.setValue(await serializeFileBox(fileBox))

      const request = new ContactAvatarRequest()
      request.setId(contactId)
      request.setFilebox(fileboxWrapper)

      await util.promisify(
        this.grpc!.client!.contactAvatar.bind(this.grpc!.client!)
      )(request)

      return
    }

    /**
     * 2. get
     */
    const request = new ContactAvatarRequest()
    request.setId(contactId)

    const response = await util.promisify(
      this.grpc!.client!.contactAvatar.bind(this.grpc!.client!)
    )(request)

    const textWrapper = response.getFilebox()

    if (!textWrapper) {
      throw new Error('can not get textWrapper')
    }

    const jsonText = textWrapper.getValue()
    return FileBox.fromJSON(jsonText)
  }

  override async contactRawPayload (id: string): Promise<ContactPayload> {
    log.verbose('PuppetService', 'contactRawPayload(%s)', id)

    const request = new ContactPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpc!.client!.contactPayload.bind(this.grpc!.client!)
    )(request)

    const payload: ContactPayload = {
      address     : response.getAddress(),
      alias       : response.getAlias(),
      avatar      : response.getAvatar(),
      city        : response.getCity(),
      corporation : response.getCorporation(),
      coworker    : response.getCoworker(),
      description : response.getDescription(),
      friend      : response.getFriend(),
      gender      : response.getGender() as number,
      id          : response.getId(),
      name        : response.getName(),
      phone       : response.getPhoneList(),
      province    : response.getProvince(),
      signature   : response.getSignature(),
      star        : response.getStar(),
      title       : response.getTitle(),
      type        : response.getType() as number,
      weixin      : response.getWeixin(),
    }

    return payload
  }

  override async contactRawPayloadParser (payload: ContactPayload): Promise<ContactPayload> {
    // log.silly('PuppetService', 'contactRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  override async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetService', 'contactSelfName(%s)', name)

    const request = new ContactSelfNameRequest()
    request.setName(name)

    await util.promisify(
      this.grpc!.client!.contactSelfName.bind(this.grpc!.client!)
    )(request)
  }

  override async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetService', 'contactSelfQRCode()')

    const response = await util.promisify(
      this.grpc!.client!.contactSelfQRCode.bind(this.grpc!.client!)
    )(new ContactSelfQRCodeRequest())

    return response.getQrcode()
  }

  override async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetService', 'contactSelfSignature(%s)', signature)

    const request = new ContactSelfSignatureRequest()
    request.setSignature(signature)

    await util.promisify(
      this.grpc!.client!.contactSelfSignature.bind(this.grpc!.client!)
    )(request)
  }

  /**
   *
   * Conversation
   *
   */
  override conversationReadMark (
    conversationId: string,
    hasRead = true,
  ) : Promise<void> {
    log.verbose('PuppetService', 'conversationMarkRead(%s, %s)', conversationId, hasRead)
    throwUnsupportedError('not implemented. See https://github.com/wechaty/wechaty-puppet/pull/132')
  }

  /**
   *
   * Message
   *
   */
  override async messageMiniProgram (
    messageId: string,
  ): Promise<MiniProgramPayload> {
    log.verbose('PuppetService', 'messageMiniProgram(%s)', messageId)

    const request = new MessageMiniProgramRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpc!.client!.messageMiniProgram.bind(this.grpc!.client!)
    )(request)

    const jsonText = response.getMiniProgram()
    const payload = JSON.parse(jsonText) as MiniProgramPayload

    return payload
  }

  override async messageImage (
    messageId: string,
    imageType: ImageType,
  ): Promise<FileBox> {
    log.verbose('PuppetService', 'messageImage(%s, %s[%s])',
      messageId,
      imageType,
      ImageType[imageType],
    )

    const request = new MessageImageStreamRequest()
    request.setId(messageId)
    request.setType(imageType)

    if (!this.grpc?.client) {
      throw new Error('Can not get image from message since no grpc client.')
    }
    const pbStream = this.grpc.client.messageImageStream(request)
    const fileBox = await unpackFileBoxFromPb(pbStream)
    // const fileBoxChunkStream = unpackFileBoxChunk(stream)
    // return unpackFileBox(fileBoxChunkStream)
    return fileBox
  }

  override async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetService', 'messageContact(%s)', messageId)

    const request = new MessageContactRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpc!.client!.messageContact.bind(this.grpc!.client!)
    )(request)

    const contactId = response.getId()
    return contactId
  }

  override async messageSendMiniProgram (
    conversationId: string,
    miniProgramPayload: MiniProgramPayload,
  ): Promise<void | string> {
    log.verbose('PuppetService', 'messageSendMiniProgram(%s)', conversationId, JSON.stringify(miniProgramPayload))

    const request = new MessageSendMiniProgramRequest()
    request.setConversationId(conversationId)
    request.setMiniProgram(JSON.stringify(miniProgramPayload))

    const response = await util.promisify(
      this.grpc!.client!.messageSendMiniProgram.bind(this.grpc!.client!)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  override async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetService', 'messageRecall(%s)', messageId)

    const request = new MessageRecallRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpc!.client!.messageRecall.bind(this.grpc!.client!)
    )(request)

    return response.getSuccess()
  }

  override async messageFile (id: string): Promise<FileBox> {
    log.verbose('PuppetService', 'messageFile(%s)', id)

    const request = new MessageFileStreamRequest()
    request.setId(id)

    if (!this.grpc?.client) {
      throw new Error('Can not get file from message since no grpc client.')
    }
    const pbStream = this.grpc.client.messageFileStream(request)
    // const fileBoxChunkStream = unpackFileBoxChunk(pbStream)
    // return unpackFileBox(fileBoxChunkStream)
    const fileBox = await unpackFileBoxFromPb(pbStream)
    return fileBox
  }

  override async messageForward (
    conversationId: string,
    messageId: string,
  ): Promise<string | void> {
    log.verbose('PuppetService', 'messageForward(%s, %s)', conversationId, messageId)

    const request = new MessageForwardRequest()
    request.setConversationId(conversationId)
    request.setMessageId(messageId)

    const response = await util.promisify(
      this.grpc!.client!.messageForward.bind(this.grpc!.client!)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  override async messageRawPayload (id: string): Promise<MessagePayload> {
    log.verbose('PuppetService', 'messageRawPayload(%s)', id)

    const request = new MessagePayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpc!.client!.messagePayload.bind(this.grpc!.client!)
    )(request)

    const payload: MessagePayload = {
      filename      : response.getFilename(),
      fromId        : response.getFromId(),
      id            : response.getId(),
      mentionIdList : response.getMentionIdsList(),
      roomId        : response.getRoomId(),
      text          : response.getText(),
      timestamp     : response.getTimestamp(),
      toId          : response.getToId(),
      type          : response.getType() as number,
    }

    return payload
  }

  override async messageRawPayloadParser (payload: MessagePayload): Promise<MessagePayload> {
    // log.silly('PuppetService', 'messagePayload({id:%s})', payload.id)
    // passthrough
    return payload
  }

  override async messageSendText (
    conversationId : string,
    text           : string,
    mentionIdList? : string[],
  ): Promise<void | string> {
    log.verbose('PuppetService', 'messageSend(%s, %s)', conversationId, text)

    const request = new MessageSendTextRequest()
    request.setConversationId(conversationId)
    request.setText(text)
    if (typeof mentionIdList !== 'undefined') {
      request.setMentonalIdsList(mentionIdList)
    }

    const response = await util.promisify(
      this.grpc!.client!.messageSendText.bind(this.grpc!.client!)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  override async messageSendFile (
    conversationId : string,
    file           : FileBox,
  ): Promise<void | string> {
    log.verbose('PuppetService', 'messageSend(%s, %s)', conversationId, file)

    const fileBoxStreamTypes = [
      FileBoxType.Base64,
      FileBoxType.Buffer,
      FileBoxType.File,
      FileBoxType.Stream,
    ]

    if (fileBoxStreamTypes.includes(file.type())) {
      return this.messageSendFileStream(conversationId, file)
    } else {
      return this.messageSendFileNonStream(conversationId, file)
    }
  }

  override async messageSendContact (
    conversationId  : string,
    contactId       : string,
  ): Promise<void | string> {
    log.verbose('PuppetService', 'messageSend("%s", %s)', conversationId, contactId)

    const request = new MessageSendContactRequest()
    request.setConversationId(conversationId)
    request.setContactId(contactId)

    const response = await util.promisify(
      this.grpc!.client!.messageSendContact.bind(this.grpc!.client!)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  override async messageSendUrl (
    conversationId: string,
    urlLinkPayload: UrlLinkPayload,
  ): Promise<void | string> {
    log.verbose('PuppetService', 'messageSendUrl("%s", %s)', conversationId, JSON.stringify(urlLinkPayload))

    const request = new MessageSendUrlRequest()
    request.setConversationId(conversationId)
    request.setUrlLink(JSON.stringify(urlLinkPayload))

    const response = await util.promisify(
      this.grpc!.client!.messageSendUrl.bind(this.grpc!.client!)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  override async messageUrl (messageId: string): Promise<UrlLinkPayload> {
    log.verbose('PuppetService', 'messageUrl(%s)', messageId)

    const request = new MessageUrlRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpc!.client!.messageUrl.bind(this.grpc!.client!)
    )(request)

    const jsonText = response.getUrlLink()

    const payload = JSON.parse(jsonText) as UrlLinkPayload
    return payload
  }

  /**
   *
   * Room
   *
   */
  override async roomRawPayload (
    id: string,
  ): Promise<RoomPayload> {
    log.verbose('PuppetService', 'roomRawPayload(%s)', id)

    const request = new RoomPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpc!.client!.roomPayload.bind(this.grpc!.client!)
    )(request)

    const payload: RoomPayload = {
      adminIdList  : response.getAdminIdsList(),
      avatar       : response.getAvatar(),
      id           : response.getId(),
      memberIdList : response.getMemberIdsList(),
      ownerId      : response.getOwnerId(),
      topic        : response.getTopic(),
    }

    return payload
  }

  override async roomRawPayloadParser (payload: RoomPayload): Promise<RoomPayload> {
    // log.silly('PuppetService', 'roomRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  override async roomList (): Promise<string[]> {
    log.verbose('PuppetService', 'roomList()')

    const response = await util.promisify(
      this.grpc!.client!.roomList.bind(this.grpc!.client!)
    )(new RoomListRequest())

    return response.getIdsList()
  }

  override async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetService', 'roomDel(%s, %s)', roomId, contactId)

    const request = new RoomDelRequest()
    request.setId(roomId)
    request.setContactId(contactId)

    await util.promisify(
      this.grpc!.client!.roomDel.bind(this.grpc!.client!)
    )(request)
  }

  override async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetService', 'roomAvatar(%s)', roomId)

    const request = new RoomAvatarRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpc!.client!.roomAvatar.bind(this.grpc!.client!)
    )(request)

    const jsonText = response.getFilebox()
    return FileBox.fromJSON(jsonText)
  }

  override async roomAdd (
    roomId     : string,
    contactId  : string,
    inviteOnly : boolean,
  ): Promise<void> {
    log.verbose('PuppetService', 'roomAdd(%s, %s)', roomId, contactId)

    const request = new RoomAddRequest()
    request.setId(roomId)
    request.setContactId(contactId)
    request.setInviteOnly(inviteOnly)

    await util.promisify(
      this.grpc!.client!.roomAdd.bind(this.grpc!.client!)
    )(request)
  }

  override async roomTopic (roomId: string)                : Promise<string>
  override async roomTopic (roomId: string, topic: string) : Promise<void>

  override async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetService', 'roomTopic(%s, %s)', roomId, topic)

    /**
     * Get
     */
    if (typeof topic === 'undefined') {
      const request = new RoomTopicRequest()
      request.setId(roomId)

      const response = await util.promisify(
        this.grpc!.client!.roomTopic.bind(this.grpc!.client!)
      )(request)

      const topicWrapper = response.getTopic()
      if (topicWrapper) {
        return topicWrapper.getValue()
      }
      return ''
    }

    /**
     * Set
     */
    const topicWrapper = new StringValue()
    topicWrapper.setValue(topic)

    const request = new RoomTopicRequest()
    request.setId(roomId)
    request.setTopic(topicWrapper)

    await util.promisify(
      this.grpc!.client!.roomTopic.bind(this.grpc!.client!)
    )(request)
  }

  override async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetService', 'roomCreate(%s, %s)', contactIdList, topic)

    const request = new RoomCreateRequest()
    request.setContactIdsList(contactIdList)
    request.setTopic(topic)

    const response = await util.promisify(
      this.grpc!.client!.roomCreate.bind(this.grpc!.client!)
    )(request)

    return response.getId()
  }

  override async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetService', 'roomQuit(%s)', roomId)

    const request = new RoomQuitRequest()
    request.setId(roomId)

    await util.promisify(
      this.grpc!.client!.roomQuit.bind(this.grpc!.client!)
    )(request)
  }

  override async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetService', 'roomQRCode(%s)', roomId)

    const request = new RoomQRCodeRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpc!.client!.roomQRCode.bind(this.grpc!.client!)
    )(request)

    return response.getQrcode()
  }

  override async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetService', 'roomMemberList(%s)', roomId)

    const request = new RoomMemberListRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpc!.client!.roomMemberList.bind(this.grpc!.client!)
    )(request)

    return response.getMemberIdsList()
  }

  override async roomMemberRawPayload (roomId: string, contactId: string): Promise<any>  {
    log.verbose('PuppetService', 'roomMemberRawPayload(%s, %s)', roomId, contactId)

    const request = new RoomMemberPayloadRequest()
    request.setId(roomId)
    request.setMemberId(contactId)

    const response = await util.promisify(
      this.grpc!.client!.roomMemberPayload.bind(this.grpc!.client!)
    )(request)

    const payload: RoomMemberPayload = {
      avatar    : response.getAvatar(),
      id        : response.getId(),
      inviterId : response.getInviterId(),
      name      : response.getName(),
      roomAlias : response.getRoomAlias(),
    }

    return payload
  }

  override async roomMemberRawPayloadParser (payload: any): Promise<RoomMemberPayload>  {
    // log.silly('PuppetService', 'roomMemberRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  override async roomAnnounce (roomId: string)                : Promise<string>
  override async roomAnnounce (roomId: string, text: string)  : Promise<void>

  override async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    log.verbose('PuppetService', 'roomAnnounce(%s%s)',
      roomId,
      typeof text === 'undefined'
        ? ''
        : `, ${text}`
    )

    /**
     * Set
     */
    if (text) {
      const textWrapper = new StringValue()
      textWrapper.setValue(text)

      const request = new RoomAnnounceRequest()
      request.setId(roomId)
      request.setText(textWrapper)

      await util.promisify(
        this.grpc!.client!.roomAnnounce.bind(this.grpc!.client!)
      )(request)

      return
    }

    /**
     * Get
     */
    const request = new RoomAnnounceRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpc!.client!.roomAnnounce.bind(this.grpc!.client!)
    )(request)

    const textWrapper = response.getText()
    if (textWrapper) {
      return textWrapper.getValue()
    }
    return ''
  }

  override async roomInvitationAccept (
    roomInvitationId: string,
  ): Promise<void> {
    log.verbose('PuppetService', 'roomInvitationAccept(%s)', roomInvitationId)

    const request = new RoomInvitationAcceptRequest()
    request.setId(roomInvitationId)

    await util.promisify(
      this.grpc!.client!.roomInvitationAccept.bind(this.grpc!.client!)
    )(request)
  }

  override async roomInvitationRawPayload (
    id: string,
  ): Promise<RoomInvitationPayload> {
    log.verbose('PuppetService', 'roomInvitationRawPayload(%s)', id)

    const request = new RoomInvitationPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpc!.client!.roomInvitationPayload.bind(this.grpc!.client!)
    )(request)

    const payload: RoomInvitationPayload = {
      avatar       : response.getAvatar(),
      id           : response.getId(),
      invitation   : response.getInvitation(),
      inviterId    : response.getInviterId(),
      memberCount  : response.getMemberCount(),
      memberIdList : response.getMemberIdsList(),
      receiverId   : response.getReceiverId(),
      timestamp    : response.getTimestamp(),
      topic        : response.getTopic(),
    }

    return payload
  }

  override async roomInvitationRawPayloadParser (payload: RoomInvitationPayload): Promise<RoomInvitationPayload> {
    // log.silly('PuppetService', 'roomInvitationRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  /**
   *
   * Friendship
   *
   */
  override async friendshipSearchPhone (
    phone: string,
  ): Promise<string | null> {
    log.verbose('PuppetService', 'friendshipSearchPhone(%s)', phone)

    const request = new FriendshipSearchPhoneRequest()
    request.setPhone(phone)

    const response = await util.promisify(
      this.grpc!.client!.friendshipSearchPhone.bind(this.grpc!.client!)
    )(request)

    const contactIdWrapper = response.getContactId()
    if (contactIdWrapper) {
      return contactIdWrapper.getValue()
    }
    return null
  }

  override async friendshipSearchWeixin (
    weixin: string,
  ): Promise<string | null> {
    log.verbose('PuppetService', 'friendshipSearchWeixin(%s)', weixin)

    const request = new FriendshipSearchWeixinRequest()
    request.setWeixin(weixin)

    const response = await util.promisify(
      this.grpc!.client!.friendshipSearchWeixin.bind(this.grpc!.client!)
    )(request)

    const contactIdWrapper = response.getContactId()
    if (contactIdWrapper) {
      return contactIdWrapper.getValue()
    }
    return null
  }

  override async friendshipRawPayload (id: string): Promise<FriendshipPayload> {
    log.verbose('PuppetService', 'friendshipRawPayload(%s)', id)

    const request = new FriendshipPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpc!.client!.friendshipPayload.bind(this.grpc!.client!)
    )(request)

    const payload: FriendshipPayload = {
      contactId : response.getContactId(),
      hello: response.getHello(),
      id,
      scene     : response.getScene() as number,
      stranger  : response.getStranger(),
      ticket    : response.getTicket(),
      type      : response.getType() as number,
    } as any  // FIXME: Huan(202002)

    return payload
  }

  override async friendshipRawPayloadParser (payload: FriendshipPayload) : Promise<FriendshipPayload> {
    // log.silly('PuppetService', 'friendshipRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  override async friendshipAdd (
    contactId : string,
    options   : FriendshipAddOptions,
  ): Promise<void> {
    log.verbose('PuppetService', 'friendshipAdd(%s, %s)', contactId, JSON.stringify(options))

    const request = new FriendshipAddRequest()
    request.setContactId(contactId)

    // FIXME: for backward compatibility, need to be removed after all puppet has updated.
    if (typeof options === 'string') {
      request.setHello(options)
    } else {
      request.setHello(options.hello!)
      const contactIdWrapper = new StringValue()
      contactIdWrapper.setValue(options.contactId || '')
      const roomIdWrapper = new StringValue()
      roomIdWrapper.setValue(options.roomId || '')
      request.setSourceRoomId(roomIdWrapper)
      request.setSourceContactId(contactIdWrapper)
    }

    await util.promisify(
      this.grpc!.client!.friendshipAdd.bind(this.grpc!.client!)
    )(request)
  }

  override async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetService', 'friendshipAccept(%s)', friendshipId)

    const request = new FriendshipAcceptRequest()
    request.setId(friendshipId)

    await util.promisify(
      this.grpc!.client!.friendshipAccept.bind(this.grpc!.client!)
    )(request)
  }

  /**
   *
   * Tag
   *
   */
  // add a tag for a Contact. Create it first if it not exist.
  override async tagContactAdd (
    id: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetService', 'tagContactAdd(%s, %s)', id, contactId)

    const request = new TagContactAddRequest()
    request.setId(id)
    request.setContactId(contactId)

    await util.promisify(
      this.grpc!.client!.tagContactAdd.bind(this.grpc!.client!)
    )(request)
  }

  // remove a tag from the Contact
  override async tagContactRemove (
    id: string,
    contactId: string,
  ) : Promise<void> {
    log.verbose('PuppetService', 'tagContactRemove(%s, %s)', id, contactId)

    const request = new TagContactRemoveRequest()
    request.setId(id)
    request.setContactId(contactId)

    await util.promisify(
      this.grpc!.client!.tagContactRemove.bind(this.grpc!.client!)
    )(request)
  }

  // delete a tag from Wechat
  override async tagContactDelete (
    id: string,
  ) : Promise<void> {
    log.verbose('PuppetService', 'tagContactDelete(%s)', id)

    const request = new TagContactDeleteRequest()
    request.setId(id)

    await util.promisify(
      this.grpc!.client!.tagContactDelete.bind(this.grpc!.client!)
    )(request)
  }

  // get tags from a specific Contact
  override async tagContactList (
    contactId?: string,
  ) : Promise<string[]> {
    log.verbose('PuppetService', 'tagContactList(%s)', contactId)

    const request = new TagContactListRequest()

    if (typeof contactId !== 'undefined') {
      const contactIdWrapper = new StringValue()
      contactIdWrapper.setValue(contactId)
      request.setContactId(contactIdWrapper)
    }

    const response = await util.promisify(
      this.grpc!.client!.tagContactList.bind(this.grpc!.client!)
    )(request)

    return response.getIdsList()
  }

  private async messageSendFileStream (
    conversationId : string,
    file           : FileBox,
  ): Promise<void | string> {
    const request = await packConversationIdFileBoxToPb(MessageSendFileStreamRequest)(conversationId, file)

    const response = await new Promise<MessageSendFileStreamResponse>((resolve, reject) => {
      if (!this.grpc?.client) {
        reject(new Error('Can not send message file since no grpc client.'))
        return
      }
      const stream = this.grpc.client.messageSendFileStream((err, response) => {
        if (err) {
          reject(err)
        } else {
          resolve(response)
        }
      })
      request.pipe(stream)
    })

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  private async messageSendFileNonStream (
    conversationId : string,
    file           : FileBox,
  ): Promise<void | string> {
    const request = new MessageSendFileRequest()
    request.setConversationId(conversationId)
    request.setFilebox(JSON.stringify(file))

    const response = await util.promisify(
      this.grpc!.client!.messageSendFile.bind(this.grpc!.client!)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

}

export default PuppetService
