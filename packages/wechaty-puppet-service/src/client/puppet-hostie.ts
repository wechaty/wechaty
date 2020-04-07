import util from 'util'

import grpc from 'grpc'
import WebSocket from 'ws'

// import { DebounceQueue } from 'rx-queue'

import {
  ContactPayload,

  FileBox,

  FriendshipPayload,

  MessagePayload,

  Puppet,
  PuppetOptions,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,
  UrlLinkPayload,
  MiniProgramPayload,
  ImageType,
  EventDongPayload,
  EventLogoutPayload,
  EventHeartbeatPayload,
  EventFriendshipPayload,
  EventLoginPayload,
  EventMessagePayload,
  EventReadyPayload,
  EventRoomInvitePayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  EventRoomTopicPayload,
  EventScanPayload,
  EventErrorPayload,
}                         from 'wechaty-puppet'

import {
  PuppetClient,
  EventRequest,
  EventResponse,
  ContactAliasRequest,
  StartRequest,
  StopRequest,
  LogoutRequest,
  ContactListRequest,
  ContactSelfQRCodeRequest,
  ContactAvatarRequest,
  ContactPayloadRequest,
  ContactSelfNameRequest,
  ContactSelfSignatureRequest,
  MessageMiniProgramRequest,
  MessageContactRequest,
  MessageSendMiniProgramRequest,
  MessageRecallRequest,
  MessageFileRequest,
  MessagePayloadRequest,
  MessageSendTextRequest,
  MessageSendFileRequest,
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
  MessageImageRequest,

  StringValue,
  DingRequest,

  EventType,
}                                   from '@chatie/grpc'

import {
  log,
  VERSION,
  WECHATY_PUPPET_HOSTIE_TOKEN,
  WECHATY_PUPPET_HOSTIE_ENDPOINT,
}                                   from '../config'

import {
  EventTypeRev,
}                 from '../event-type-rev'

import {
  recover$,
}             from './recover$'

export class PuppetHostie extends Puppet {

  public static readonly VERSION = VERSION

  private grpcClient?  : PuppetClient
  private eventStream? : grpc.ClientReadableStream<EventResponse>

  // Emit the last heartbeat if there's no more coming after HEATRTBEAT_DEBOUNCE_TIME seconds
  // private heartbeatDebounceQueue: DebounceQueue

  /**
   * Store the clean callback when we starting, e.g.:
   *  this.off('event', cb)
   *  sub.unsubscribe()
   *  etc...
   */
  private cleanCallbackList: (() => void)[]

  // protected recoverSubscription: Subscription

  constructor (
    public options: PuppetOptions = {},
  ) {
    super(options)
    options.endpoint = options.endpoint || WECHATY_PUPPET_HOSTIE_ENDPOINT
    options.token    = options.token    || WECHATY_PUPPET_HOSTIE_TOKEN

    if (!options.token) {
      throw new Error('wechaty-puppet-hostie: token not found. See: <https://github.com/wechaty/wechaty-puppet-hostie#1-wechaty_puppet_hostie_token>')
    }

    // this.heartbeatDebounceQueue = new DebounceQueue(HEARTBEAT_DEBOUNCE_TIME * 1000)

    this.cleanCallbackList = []

    // this.recoverSubscription =
    recover$(this).subscribe(
      x => log.verbose('PuppetHostie', 'constructor() recover$().subscribe() next(%s)', JSON.stringify(x)),
      e => log.error('PuppetHostie', 'constructor() recover$().subscribe() error(%s)', e),
      () => log.verbose('PuppetHostie', 'constructor() recover$().subscribe() complete()'),
    )
  }

  private async discoverHostieIp (
    token: string,
  ): Promise<string> {
    log.verbose('PuppetHostie', `discoverHostieIp(%s)`, token)

    // let DEBUG = true as boolean
    // if (DEBUG) {
    //   return '127.0.0.1'
    // }

    const CHATIE_ENDPOINT = 'wss://api.chatie.io/v0/websocket/token/'
    const PROTOCOL = 'puppet-hostie|0.0.1'

    const ws = new WebSocket(
      CHATIE_ENDPOINT + token,
      PROTOCOL,
    )

    try {
      return await new Promise<string>((resolve, reject) => {

        ws.once('open', function open () {
          ws.send(
            JSON.stringify(
              {
                name: 'hostie',
              },
            ),
          )
        })

        ws.on('message', function incoming (data: string) {
          const event = JSON.parse(data)
          if (event.name === 'hostie') {
            log.verbose('PuppetHostie', `discoverHostieIp() %s`, event.payload)
            return resolve(event.payload)
          } else {
            // console.info('other:', event)
          }
        })

        ws.once('error', reject)
        ws.once('close', reject)
      })
    } finally {
      ws.close()
    }
  }

  protected async startGrpcClient (): Promise<void> {
    log.verbose('PuppetHostie', `startGrpcClient()`)

    if (this.grpcClient) {
      throw new Error('puppetClient had already inited')
    }

    let endpoint = this.options.endpoint
    if (!endpoint) {
      const ip = await this.discoverHostieIp(this.options.token!)
      if (!ip || ip === '0.0.0.0') {
        throw new Error('no endpoint')
      }
      endpoint = ip + ':8788'
    }

    this.grpcClient = new PuppetClient(
      endpoint, // 'localhost:50051',
      grpc.credentials.createInsecure()
    )
  }

  protected async stopGrpcClient (): Promise<void> {
    log.verbose('PuppetHostie', `stopGrpcClient()`)

    if (!this.grpcClient) {
      throw new Error('puppetClient had not inited')
    }

    this.grpcClient.close()
    this.grpcClient = undefined
  }

  public async start (): Promise<void> {
    log.verbose('PuppetHostie', `start()`)

    if (this.state.on()) {
      log.warn('PuppetHostie', 'start() is called on a ON puppet. await ready(on) and return.')
      await this.state.ready('on')
      return
    }

    this.state.on('pending')

    try {
      await this.startGrpcClient()
      if (!this.grpcClient) {
        throw new Error('no grpc client')
      }

      this.startGrpcStream()
      // this.startDing()

      await util.promisify(
        this.grpcClient.start
          .bind(this.grpcClient)
      )(new StartRequest())

      this.state.on(true)

    } catch (e) {
      log.error('PuppetHostie', 'start() rejection: %s', e && e.message)

      this.state.off(true)
      throw e

    }
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetHostie', 'stop()')

    if (this.state.off()) {
      log.warn('PuppetHostie', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    try {
      this.state.off('pending')

      this.cleanCallbackList.forEach(cb => cb())
      this.cleanCallbackList = []

      if (this.logonoff()) {
        this.emit('logout', {
          contactId : this.selfId(),
          data      : 'PuppetHostie stop()',
        })
        this.id = undefined
      }

      this.stopGrpcStream()

      if (this.grpcClient) {
        try {
          await util.promisify(
            this.grpcClient.stop
              .bind(this.grpcClient)
          )(new StopRequest())
        } catch (e) {
          log.error('PuppetHostie', 'stop() this.grpcClient.stop() rejection: %s', e.message)
        }
      } else {
        log.warn('PuppetHostie', 'stop() this.grpcClient not exist')
      }

      await this.stopGrpcClient()

    } catch (e) {
      log.warn('PuppetHostie', 'stop() rejection: %s', e && e.message)
      // throw e
    } finally {
      this.state.off(true)
    }

  }

  private startGrpcStream (): void {
    log.verbose('PuppetHostie', 'startGrpcStream()')

    if (this.eventStream) {
      throw new Error('event stream exists')
    }

    this.eventStream = this.grpcClient!.event(new EventRequest())

    this.eventStream
      .on('data', this.onGrpcStreamEvent.bind(this))
      .on('end', () => {
        log.verbose('PuppetHostie', 'startGrpcStream() eventStream.on(end)')
      })
      .on('error', e => {
        // https://github.com/wechaty/wechaty-puppet-hostie/issues/16
        log.verbose('PuppetHostie', 'startGrpcStream() eventStream.on(error) %s', e)
        const reason = 'startGrpcStream() eventStream.on(error) ' + e
        /**
         * The `Puppet` class have a throttleQueue for receiving the `reset` events
         *  and it's the `Puppet` class's duty for call the `puppet.reset()` to reset the puppet.
         */
        this.emit('reset', { data: reason })
      })
      .on('cancel', (...args: any[]) => {
        log.verbose('PuppetHostie', 'startGrpcStream() eventStream.on(cancel), %s', JSON.stringify(args))
      })

  }

  private onGrpcStreamEvent (event: EventResponse): void {
    const type    = event.getType()
    const payload = event.getPayload()

    log.verbose('PuppetHostie',
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
        const loginPayload = JSON.parse(payload) as EventLoginPayload
        this.id = loginPayload.contactId
        this.emit('login', loginPayload)
        break
      case EventType.EVENT_TYPE_LOGOUT:
        this.id = undefined
        this.emit('logout', JSON.parse(payload) as EventLogoutPayload)
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
        log.warn('PuppetHostie', 'onGrpcStreamEvent() got an EventType.EVENT_TYPE_RESET ?')
        // the `reset` event should be dealed not send out
        break

      case EventType.EVENT_TYPE_UNSPECIFIED:
        log.error('PuppetHostie', 'onGrpcStreamEvent() got an EventType.EVENT_TYPE_UNSPECIFIED ?')
        break

      default:
        // Huan(202003): in default, the `type` type should be `never`, please check.
        throw new Error('eventType ' + type + ' unsupported! (code should not reach here)')
    }
  }

  private stopGrpcStream (): void {
    log.verbose('PuppetHostie', 'stopGrpcStream()')

    if (!this.eventStream) {
      throw new Error('no event stream')
    }

    /**
     * Huan(202003):
     *  destroy() will be enough to terminate a stream call.
     *  cancel() is not needed.
     */
    // this.eventStream.cancel()

    this.eventStream.destroy()
    this.eventStream = undefined
  }

  public async logout (): Promise<void> {
    log.verbose('PuppetHostie', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    try {
      await util.promisify(
        this.grpcClient!.logout.bind(this.grpcClient)
          .bind(this.grpcClient)
      )(new LogoutRequest())

    } catch (e) {
      log.error('PuppetHostie', 'logout() rejection: %s', e && e.message)
      throw e
    } finally {
      const payload = { contactId: this.id } as EventLogoutPayload
      this.emit('logout', payload) // becore we will throw above by logonoff() when this.user===undefined
      this.id = undefined
    }
  }

  public ding (data: string): void {
    log.silly('PuppetHostie', 'ding(%s)', data)

    const request = new DingRequest()
    request.setData(data || '')

    this.grpcClient!.ding(
      request,
      (error, _response) => {
        if (error) {
          log.error('PuppetHostie', 'ding() rejection: %s', error)
        }
      }
    )
  }

  public unref (): void {
    log.verbose('PuppetHostie', 'unref()')
    super.unref()
  }

  /**
   *
   * Contact
   *
   */
  public contactAlias (contactId: string)                      : Promise<string>
  public contactAlias (contactId: string, alias: string | null): Promise<void>

  public async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetHostie', 'contactAlias(%s, %s)', contactId, alias)

    /**
     * Get alias
     */
    if (typeof alias === 'undefined') {
      const request = new ContactAliasRequest()
      request.setId(contactId)

      const response = await util.promisify(
        this.grpcClient!.contactAlias.bind(this.grpcClient)
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
      this.grpcClient!.contactAlias.bind(this.grpcClient)
    )(request)
  }

  public async contactList (): Promise<string[]> {
    log.verbose('PuppetHostie', 'contactList()')

    const response = await util.promisify(
      this.grpcClient!.contactList.bind(this.grpcClient)
    )(new ContactListRequest())

    return response.getIdsList()
  }

  public async contactQRCode (contactId: string): Promise<string> {
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }

    const response = await util.promisify(
      this.grpcClient!.contactSelfQRCode.bind(this.grpcClient)
    )(new ContactSelfQRCodeRequest())

    return response.getQrcode()
  }

  public async contactAvatar (contactId: string)                : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar (contactId: string, fileBox?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetHostie', 'contactAvatar(%s)', contactId)

    /**
     * 1. set
     */
    if (fileBox) {
      const fileboxWrapper = new StringValue()
      fileboxWrapper.setValue(JSON.stringify(fileBox))

      const request = new ContactAvatarRequest()
      request.setId(contactId)
      request.setFilebox(fileboxWrapper)

      await util.promisify(
        this.grpcClient!.contactSelfQRCode.bind(this.grpcClient)
      )(request)

      return
    }

    /**
     * 2. get
     */
    const request = new ContactAvatarRequest()
    request.setId(contactId)

    const response = await util.promisify(
      this.grpcClient!.contactSelfQRCode.bind(this.grpcClient)
    )(request)

    const qrcode = response.getQrcode()
    return FileBox.fromQRCode(qrcode)
  }

  public async contactRawPayload (id: string): Promise<ContactPayload> {
    log.verbose('PuppetHostie', 'contactRawPayload(%s)', id)

    const request = new ContactPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.contactPayload.bind(this.grpcClient)
    )(request)

    const payload: ContactPayload = {
      address   : response.getAddress(),
      alias     : response.getAlias(),
      avatar    : response.getAvatar(),
      city      : response.getCity(),
      friend    : response.getFriend(),
      gender    : response.getGender() as number,
      id        : response.getId(),
      name      : response.getName(),
      province  : response.getProvince(),
      signature : response.getSignature(),
      star      : response.getStar(),
      type      : response.getType() as number,
      weixin    : response.getWeixin(),
    }

    return payload
  }

  public async contactRawPayloadParser (payload: ContactPayload): Promise<ContactPayload> {
    // log.silly('PuppetHostie', 'contactRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  public async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetHostie', 'contactSelfName(%s)', name)

    const request = new ContactSelfNameRequest()
    request.setName(name)

    await util.promisify(
      this.grpcClient!.contactSelfName.bind(this.grpcClient)
    )(request)
  }

  public async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetHostie', 'contactSelfQRCode()')

    const response = await util.promisify(
      this.grpcClient!.contactSelfQRCode.bind(this.grpcClient)
    )(new ContactSelfQRCodeRequest())

    return response.getQrcode()
  }

  public async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetHostie', 'contactSelfSignature(%s)', signature)

    const request = new ContactSelfSignatureRequest()
    request.setSignature(signature)

    await util.promisify(
      this.grpcClient!.contactSelfSignature.bind(this.grpcClient)
    )(request)
  }

  /**
   *
   * Message
   *
   */
  public async messageMiniProgram (
    messageId: string,
  ): Promise<MiniProgramPayload> {
    log.verbose('PuppetHostie', 'messageMiniProgram(%s)', messageId)

    const request = new MessageMiniProgramRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpcClient!.messageMiniProgram.bind(this.grpcClient)
    )(request)

    const jsonText = response.getMiniProgram()
    const payload = JSON.parse(jsonText) as MiniProgramPayload

    return payload
  }

  public async messageImage (
    messageId: string,
    imageType: ImageType,
  ): Promise<FileBox> {
    log.verbose('PuppetHostie', 'messageImage(%s, %s[%s])',
      messageId,
      imageType,
      ImageType[imageType],
    )

    const request = new MessageImageRequest()
    request.setId(messageId)
    request.setType(imageType)

    const response = await util.promisify(
      this.grpcClient!.messageImage.bind(this.grpcClient)
    )(request)

    const jsonText = response.getFilebox()
    return FileBox.fromJSON(jsonText)
  }

  public async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetHostie', 'messageContact(%s)', messageId)

    const request = new MessageContactRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpcClient!.messageContact.bind(this.grpcClient)
    )(request)

    const contactId = response.getId()
    return contactId
  }

  public async messageSendMiniProgram (
    conversationId: string,
    miniProgramPayload: MiniProgramPayload,
  ): Promise<void | string> {
    log.verbose('PuppetHostie', 'messageSendMiniProgram(%s)', conversationId, JSON.stringify(miniProgramPayload))

    const request = new MessageSendMiniProgramRequest()
    request.setConversationId(conversationId)
    request.setMiniProgram(JSON.stringify(miniProgramPayload))

    const response = await util.promisify(
      this.grpcClient!.messageSendMiniProgram.bind(this.grpcClient)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  public async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetHostie', 'messageRecall(%s)', messageId)

    const request = new MessageRecallRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpcClient!.messageRecall.bind(this.grpcClient)
    )(request)

    return response.getSuccess()
  }

  public async messageFile (id: string): Promise<FileBox> {
    log.verbose('PuppetHostie', 'messageFile(%s)', id)

    const request = new MessageFileRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.messageFile.bind(this.grpcClient)
    )(request)

    const jsonText = response.getFilebox()
    return FileBox.fromJSON(jsonText)
  }

  public async messageRawPayload (id: string): Promise<MessagePayload> {
    log.verbose('PuppetHostie', 'messageRawPayload(%s)', id)

    const request = new MessagePayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.messagePayload.bind(this.grpcClient)
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

  public async messageRawPayloadParser (payload: MessagePayload): Promise<MessagePayload> {
    // log.silly('PuppetHostie', 'messagePayload({id:%s})', payload.id)
    // passthrough
    return payload
  }

  public async messageSendText (
    conversationId : string,
    text           : string,
  ): Promise<void | string> {
    log.verbose('PuppetHostie', 'messageSend(%s, %s)', conversationId, text)

    const request = new MessageSendTextRequest()
    request.setConversationId(conversationId)
    request.setText(text)

    const response = await util.promisify(
      this.grpcClient!.messageSendText.bind(this.grpcClient)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  public async messageSendFile (
    conversationId : string,
    file           : FileBox,
  ): Promise<void | string> {
    log.verbose('PuppetHostie', 'messageSend(%s, %s)', conversationId, file)

    const request = new MessageSendFileRequest()
    request.setConversationId(conversationId)
    request.setFilebox(JSON.stringify(file))

    const response = await util.promisify(
      this.grpcClient!.messageSendFile.bind(this.grpcClient)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  public async messageSendContact (
    conversationId  : string,
    contactId       : string,
  ): Promise<void | string> {
    log.verbose('PuppetHostie', 'messageSend("%s", %s)', conversationId, contactId)

    const request = new MessageSendContactRequest()
    request.setConversationId(conversationId)
    request.setContactId(contactId)

    const response = await util.promisify(
      this.grpcClient!.messageSendContact.bind(this.grpcClient)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  public async messageSendUrl (
    conversationId: string,
    urlLinkPayload: UrlLinkPayload,
  ): Promise<void | string> {
    log.verbose('PuppetHostie', 'messageSendUrl("%s", %s)', conversationId, JSON.stringify(urlLinkPayload))

    const request = new MessageSendUrlRequest()
    request.setConversationId(conversationId)
    request.setUrlLink(JSON.stringify(urlLinkPayload))

    const response = await util.promisify(
      this.grpcClient!.messageSendUrl.bind(this.grpcClient)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  public async messageUrl (messageId: string): Promise<UrlLinkPayload> {
    log.verbose('PuppetHostie', 'messageUrl(%s)', messageId)

    const request = new MessageUrlRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpcClient!.messageUrl.bind(this.grpcClient)
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
  public async roomRawPayload (
    id: string,
  ): Promise<RoomPayload> {
    log.verbose('PuppetHostie', 'roomRawPayload(%s)', id)

    const request = new RoomPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.roomPayload.bind(this.grpcClient)
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

  public async roomRawPayloadParser (payload: RoomPayload): Promise<RoomPayload> {
    // log.silly('PuppetHostie', 'roomRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  public async roomList (): Promise<string[]> {
    log.verbose('PuppetHostie', 'roomList()')

    const response = await util.promisify(
      this.grpcClient!.roomList.bind(this.grpcClient)
    )(new RoomListRequest())

    return response.getIdsList()
  }

  public async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'roomDel(%s, %s)', roomId, contactId)

    const request = new RoomDelRequest()
    request.setId(roomId)
    request.setContactId(contactId)

    await util.promisify(
      this.grpcClient!.roomDel.bind(this.grpcClient)
    )(request)
  }

  public async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetHostie', 'roomAvatar(%s)', roomId)

    const request = new RoomAvatarRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomAvatar.bind(this.grpcClient)
    )(request)

    const jsonText = response.getFilebox()
    return FileBox.fromJSON(jsonText)
  }

  public async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'roomAdd(%s, %s)', roomId, contactId)

    const request = new RoomAddRequest()
    request.setId(roomId)
    request.setContactId(contactId)

    await util.promisify(
      this.grpcClient!.roomAdd.bind(this.grpcClient)
    )(request)
  }

  public async roomTopic (roomId: string)                : Promise<string>
  public async roomTopic (roomId: string, topic: string) : Promise<void>

  public async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetHostie', 'roomTopic(%s, %s)', roomId, topic)

    /**
     * Get
     */
    if (typeof topic === 'undefined') {
      const request = new RoomTopicRequest()
      request.setId(roomId)

      const response = await util.promisify(
        this.grpcClient!.roomTopic.bind(this.grpcClient)
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
      this.grpcClient!.roomTopic.bind(this.grpcClient)
    )(request)
  }

  public async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetHostie', 'roomCreate(%s, %s)', contactIdList, topic)

    const request = new RoomCreateRequest()
    request.setContactIdsList(contactIdList)
    request.setTopic(topic)

    const response = await util.promisify(
      this.grpcClient!.roomCreate.bind(this.grpcClient)
    )(request)

    return response.getId()
  }

  public async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetHostie', 'roomQuit(%s)', roomId)

    const request = new RoomQuitRequest()
    request.setId(roomId)

    await util.promisify(
      this.grpcClient!.roomQuit.bind(this.grpcClient)
    )(request)
  }

  public async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetHostie', 'roomQRCode(%s)', roomId)

    const request = new RoomQRCodeRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomQRCode.bind(this.grpcClient)
    )(request)

    return response.getQrcode()
  }

  public async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetHostie', 'roommemberList(%s)', roomId)

    const request = new RoomMemberListRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomMemberList.bind(this.grpcClient)
    )(request)

    return response.getMemberIdsList()
  }

  public async roomMemberRawPayload (roomId: string, contactId: string): Promise<any>  {
    log.verbose('PuppetHostie', 'roomMemberRawPayload(%s, %s)', roomId, contactId)

    const request = new RoomMemberPayloadRequest()
    request.setId(roomId)
    request.setMemberId(contactId)

    const response = await util.promisify(
      this.grpcClient!.roomMemberPayload.bind(this.grpcClient)
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

  public async roomMemberRawPayloadParser (payload: any): Promise<RoomMemberPayload>  {
    // log.silly('PuppetHostie', 'roomMemberRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  public async roomAnnounce (roomId: string)                : Promise<string>
  public async roomAnnounce (roomId: string, text: string)  : Promise<void>

  public async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    log.verbose('PuppetHostie', 'roomAnnounce(%s%s)',
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
        this.grpcClient!.roomAnnounce.bind(this.grpcClient)
      )(request)

      return
    }

    /**
     * Get
     */
    const request = new RoomAnnounceRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomAnnounce.bind(this.grpcClient)
    )(request)

    const textWrapper = response.getText()
    if (textWrapper) {
      return textWrapper.getValue()
    }
    return ''
  }

  public async roomInvitationAccept (
    roomInvitationId: string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'roomInvitationAccept(%s)', roomInvitationId)

    const request = new RoomInvitationAcceptRequest()
    request.setId(roomInvitationId)

    await util.promisify(
      this.grpcClient!.roomInvitationAccept.bind(this.grpcClient)
    )(request)
  }

  public async roomInvitationRawPayload (
    id: string,
  ): Promise<RoomInvitationPayload> {
    log.verbose('PuppetHostie', 'roomInvitationRawPayload(%s)', id)

    const request = new RoomInvitationPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.roomInvitationPayload.bind(this.grpcClient)
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

  public async roomInvitationRawPayloadParser (payload: RoomInvitationPayload): Promise<RoomInvitationPayload> {
    // log.silly('PuppetHostie', 'roomInvitationRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  /**
   *
   * Friendship
   *
   */
  public async friendshipSearchPhone (
    phone: string,
  ): Promise<string | null> {
    log.verbose('PuppetHostie', 'friendshipSearchPhone(%s)', phone)

    const request = new FriendshipSearchPhoneRequest()
    request.setPhone(phone)

    const response = await util.promisify(
      this.grpcClient!.friendshipSearchPhone.bind(this.grpcClient)
    )(request)

    const contactIdWrapper = response.getContactId()
    if (contactIdWrapper) {
      return contactIdWrapper.getValue()
    }
    return null
  }

  public async friendshipSearchWeixin (
    weixin: string,
  ): Promise<string | null> {
    log.verbose('PuppetHostie', 'friendshipSearchWeixin(%s)', weixin)

    const request = new FriendshipSearchWeixinRequest()
    request.setWeixin(weixin)

    const response = await util.promisify(
      this.grpcClient!.friendshipSearchWeixin.bind(this.grpcClient)
    )(request)

    const contactIdWrapper = response.getContactId()
    if (contactIdWrapper) {
      return contactIdWrapper.getValue()
    }
    return null
  }

  public async friendshipRawPayload (id: string): Promise<FriendshipPayload> {
    log.verbose('PuppetHostie', 'friendshipRawPayload(%s)', id)

    const request = new FriendshipPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.friendshipPayload.bind(this.grpcClient)
    )(request)

    const payload: FriendshipPayload = {
      scene    : response.getScene() as number,
      stranger : response.getStranger(),
      ticket    : response.getTicket(),
      type      : response.getType() as number,
    } as any  // FIXME: Huan(202002)

    return payload
  }

  public async friendshipRawPayloadParser (payload: FriendshipPayload) : Promise<FriendshipPayload> {
    // log.silly('PuppetHostie', 'friendshipRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  public async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'friendshipAdd(%s, %s)', contactId, hello)

    const request = new FriendshipAddRequest()
    request.setContactId(contactId)
    request.setHello(hello)

    await util.promisify(
      this.grpcClient!.friendshipAdd.bind(this.grpcClient)
    )(request)
  }

  public async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'friendshipAccept(%s)', friendshipId)

    const request = new FriendshipAcceptRequest()
    request.setId(friendshipId)

    await util.promisify(
      this.grpcClient!.frendshipAccept.bind(this.grpcClient)
    )(request)
  }

  /**
   *
   * Tag
   *
   */
  // add a tag for a Contact. Create it first if it not exist.
  public async tagContactAdd (
    id: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'tagContactAdd(%s, %s)', id, contactId)

    const request = new TagContactAddRequest()
    request.setId(id)
    request.setContactId(contactId)

    await util.promisify(
      this.grpcClient!.tagContactAdd.bind(this.grpcClient)
    )(request)
  }

  // remove a tag from the Contact
  public async tagContactRemove (
    id: string,
    contactId: string,
  ) : Promise<void> {
    log.verbose('PuppetHostie', 'tagContactRemove(%s, %s)', id, contactId)

    const request = new TagContactRemoveRequest()
    request.setId(id)
    request.setContactId(contactId)

    await util.promisify(
      this.grpcClient!.tagContactRemove.bind(this.grpcClient)
    )(request)
  }

  // delete a tag from Wechat
  public async tagContactDelete (
    id: string,
  ) : Promise<void> {
    log.verbose('PuppetHostie', 'tagContactDelete(%s)', id)

    const request = new TagContactDeleteRequest()
    request.setId(id)

    await util.promisify(
      this.grpcClient!.tagContactDelete.bind(this.grpcClient)
    )(request)
  }

  // get tags from a specific Contact
  public async tagContactList (
    contactId?: string,
  ) : Promise<string[]> {
    log.verbose('PuppetHostie', 'tagContactList(%s)', contactId)

    const request = new TagContactListRequest()

    if (typeof contactId !== 'undefined') {
      const contactIdWrapper = new StringValue()
      contactIdWrapper.setValue(contactId)
      request.setContactId(contactIdWrapper)
    }

    const response = await util.promisify(
      this.grpcClient!.tagContactList.bind(this.grpcClient)
    )(request)

    return response.getIdsList()
  }

}

export default PuppetHostie
