import util from 'util'

import { FileBoxType } from 'file-box'
import https from 'https'
import http from 'http'

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
  grpc,
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

import { Subscription } from 'rxjs'

import {
  log,
  VERSION,
  GRPC_OPTIONS,
  GET_WECHATY_PUPPET_SERVICE_TOKEN,
  GET_WECHATY_PUPPET_SERVICE_ENDPOINT,
  GET_WECHATY_SERVICE_DISCOVERY_ENDPOINT,
}                                   from '../config'

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

const MAX_SERVICE_IP_DISCOVERY_RETRIES = 10
const MAX_GRPC_CONNECTION_RETRIES = 5

export class PuppetService extends Puppet {

  static override readonly VERSION = VERSION

  private grpcClient?  : PuppetClient
  private eventStream? : grpc.ClientReadableStream<EventResponse>

  // Emit the last heartbeat if there's no more coming after HEARTBEAT_DEBOUNCE_TIME seconds
  // private heartbeatDebounceQueue: DebounceQueue

  /**
   * Store the clean callback when we starting, e.g.:
   *  this.off('event', cb)
   *  sub.unsubscribe()
   *  etc...
   */
  private cleanCallbackList: (() => void)[]

  protected recoverSubscription?: Subscription

  private reconnectTimer?: NodeJS.Timeout

  constructor (
    public override options: PuppetOptions = {},
  ) {
    super(options)
    options.endpoint = GET_WECHATY_PUPPET_SERVICE_ENDPOINT(options.endpoint)
    options.token    = GET_WECHATY_PUPPET_SERVICE_TOKEN(options.token)

    // this.heartbeatDebounceQueue = new DebounceQueue(HEARTBEAT_DEBOUNCE_TIME * 1000)

    this.cleanCallbackList = []
  }

  private async discoverServiceIp (
    token: string,
  ): Promise<{ ip?: string, port?: number }> {
    log.verbose('PuppetService', 'discoverServiceIp(%s)', token)

    const chatieEndpoint = GET_WECHATY_SERVICE_DISCOVERY_ENDPOINT()

    try {
      return Promise.race<
        Promise<{
          ip: string,
          port: number
        }>
      >([
        this.getServiceIp(chatieEndpoint, token),
        // eslint-disable-next-line promise/param-names
        new Promise((_, reject) => setTimeout(
          () => reject(new Error('ETIMEOUT')),
          /**
           * Huan(202106): Better deal with the timeout error
           *  Related to https://github.com/wechaty/wechaty/issues/2197
           */
          5 * 1000,
        )),
      ])
    } catch (e) {
      log.warn(`discoverServiceIp() failed to get any ip info from all service endpoints.\n${e.stack}`)
      return {}
    }
  }

  private async getServiceIp (endpoint: string, token: string) {
    const url = `${endpoint}/v0/hosties/${token}`

    return new Promise<{ port: number, ip: string }>((resolve, reject) => {
      const httpClient = /^https:\/\//.test(url) ? https : http
      httpClient.get(url, function (res) {
        let body = ''
        res.on('data', function (chunk) {
          body += chunk
        })
        res.on('end', function () {
          resolve(JSON.parse(body))
        })
      }).on('error', function (e) {
        reject(new Error(`PuppetService discoverServiceIp() endpoint<${url}> rejection: ${e}`))
      })
    })
  }

  protected async startGrpcClient (): Promise<void> {
    log.verbose('PuppetService', 'startGrpcClient()')

    if (this.grpcClient) {
      throw new Error('puppetClient had already initialized')
    }

    let endpoint = this.options.endpoint
    if (!endpoint) {
      let serviceIpResult = await this.discoverServiceIp(this.options.token!)

      let retries = MAX_SERVICE_IP_DISCOVERY_RETRIES
      while (retries > 0 && (!serviceIpResult.ip || serviceIpResult.ip === '0.0.0.0')) {
        log.warn(`No endpoint when starting grpc client, ${retries--} retry left. Reconnecting in 10 seconds...`)
        await new Promise(resolve => setTimeout(resolve, 10 * 1000))
        serviceIpResult = await this.discoverServiceIp(this.options.token!)
      }

      if (!serviceIpResult.ip || serviceIpResult.ip === '0.0.0.0') {
        return
      }

      endpoint = serviceIpResult.ip + ':' + serviceIpResult.port
    }

    const clientOptions = {
      ...GRPC_OPTIONS,
      'grpc.default_authority': this.options.token,
    }
    this.grpcClient = new PuppetClient(
      endpoint, // 'localhost:50051',
      grpc.credentials.createInsecure(),
      clientOptions
    )
  }

  protected async stopGrpcClient (): Promise<void> {
    log.verbose('PuppetService', 'stopGrpcClient()')

    if (!this.grpcClient) {
      throw new Error('puppetClient had not initialized')
    }

    this.grpcClient.close()
    this.grpcClient = undefined
  }

  override async start (): Promise<void> {
    await super.start()
    log.verbose('PuppetService', 'start()')

    if (!this.options.token) {
      const tokenNotFoundError = 'wechaty-puppet-service: WECHATY_PUPPET_SERVICE_TOKEN not found'

      console.error([
        '',
        tokenNotFoundError,
        '(save token to WECHATY_PUPPET_SERVICE_TOKEN env var or pass it to puppet options is required.).',
        '',
        'To learn how to get Wechaty Puppet Service Token,',
        'please visit <https://wechaty.js.org/docs/puppet-services/>',
        'to see our Wechaty Puppet Service Providers.',
        '',
      ].join('\n'))

      throw new Error(tokenNotFoundError)
    }

    if (this.state.on()) {
      log.warn('PuppetService', 'start() is called on a ON puppet. await ready(on) and return.')
      await this.state.ready('on')
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.state.on('pending')

    try {
      await this.startGrpcClient()
      if (!this.grpcClient) {
        log.warn('PuppetService', 'start() failed to start grpc client, resetting self...')
        this.emit('reset', { data: 'failed to connect grpc client' })
        return
      }

      await this.startGrpcStream()
      // this.startDing()

      await this.grpcClientStart()

      this.state.on(true)

      this.recoverSubscription = recover$(this).subscribe(
        x => log.verbose('PuppetService', 'constructor() recover$().subscribe() next(%s)', JSON.stringify(x)),
        e => log.error('PuppetService', 'constructor() recover$().subscribe() error(%s)', e),
        () => log.verbose('PuppetService', 'constructor() recover$().subscribe() complete()'),
      )

    } catch (e) {
      log.error('PuppetService', 'start() rejection: %s\n%s', e && e.message, e.stack)

      if (this.grpcClient) {
        this.grpcClient.close()
        this.grpcClient = undefined
      }

      this.state.off(true)
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

    while (this.cleanCallbackList.length > 0) {
      const cb = this.cleanCallbackList.pop()
      try { cb && cb() } catch (e) {
        log.error('PuppetService', 'stop() cleanCallbackList rejection: %s', e.message)
      }
    }

    if (this.grpcClient) {
      try {
        this.stopGrpcStream()

        await util.promisify(
          this.grpcClient.stop
            .bind(this.grpcClient)
        )(new StopRequest())

        await this.stopGrpcClient()
      } catch (e) {
        log.error('PuppetService', 'stop() stop GRPC rejection: %s', e.message)
      } finally {
        this.grpcClient = undefined
      }

    } else {
      log.warn('PuppetService', 'stop() this.grpcClient not exist')
    }

    if (this.logonoff()) {
      this.emit('logout', {
        contactId : this.selfId(),
        data      : 'PuppetService stop()',
      })
      this.id = undefined
    }

    this.state.off(true)
  }

  private async startGrpcStream (): Promise<void> {
    log.verbose('PuppetService', 'startGrpcStream()')

    if (this.eventStream) {
      throw new Error('event stream exists')
    }

    let retry = MAX_GRPC_CONNECTION_RETRIES
    while (!this.eventStream) {
      try {
        this.eventStream = this.grpcClient!.event(new EventRequest())
      } catch (e) {
        if (retry-- > 0) {
          log.verbose('PuppetService', `startGrpcStream() connection failed, ${retry} retries left, reconnecting in 2 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 2 * 1000))
        } else {
          log.error('PuppetService', `startGrpcStream() connection failed and max retries has been reached. Error:\n${e.stack}`)
          break
        }
      }
    }

    if (!this.eventStream) {
      this.emit('reset', { data: 'startGrpcStream() failed to connect to grpc server' })
      return
    }

    this.eventStream
      .on('data', this.onGrpcStreamEvent.bind(this))
      .on('end', () => {
        log.verbose('PuppetService', 'startGrpcStream() eventStream.on(end)')
      })
      .on('error', (e: unknown) => {
        // https://github.com/wechaty/wechaty-puppet-service/issues/16
        log.verbose('PuppetService', 'startGrpcStream() eventStream.on(error) %s', e)
        const reason = 'startGrpcStream() eventStream.on(error) ' + e
        /**
         * The `Puppet` class have a throttleQueue for receiving the `reset` events
         *  and it's the `Puppet` class's duty for call the `puppet.reset()` to reset the puppet.
         */
        this.emit('reset', { data: reason })
      })
      .on('cancel', (...args: any[]) => {
        log.verbose('PuppetService', 'startGrpcStream() eventStream.on(cancel), %s', JSON.stringify(args))
      })

  }

  private async grpcClientStart (): Promise<void> {
    log.verbose('PuppetService', 'grpcClientStart()')

    try {
      await util.promisify(
        this.grpcClient!.start
          .bind(this.grpcClient)
      )(new StartRequest())
    } catch (error) {
      const msgDetail = error.details
      if (msgDetail === 'No connection established') {
        await new Promise(resolve => setTimeout(resolve, 2000))
        this.emit('reset', { data: msgDetail })
      } else {
        throw error
      }
    }
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

  private stopGrpcStream (): void {
    log.verbose('PuppetService', 'stopGrpcStream()')

    if (!this.eventStream) {
      log.verbose('PuppetService', 'no eventStream when stop, skip destroy.')
      return
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

  override async logout (): Promise<void> {
    log.verbose('PuppetService', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    try {
      await util.promisify(
        this.grpcClient!.logout.bind(this.grpcClient)
          .bind(this.grpcClient)
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

    if (!this.grpcClient) {
      log.info('PuppetService', 'ding() Skip ding since grpcClient is not connected.')
      return
    }

    this.grpcClient.ding(
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
    if (!this.grpcClient) {
      throw new Error('PuppetService dirtyPayload() can not execute due to no grpcClient.')
    }
    const request = new DirtyPayloadRequest()
    request.setId(id)
    request.setType(type)
    try {
      await util.promisify(
        this.grpcClient.dirtyPayload.bind(this.grpcClient)
          .bind(this.grpcClient)
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

  override async contactPhone (contactId: string, phoneList: string[]): Promise<void> {
    log.verbose('PuppetService', 'contactPhone(%s, %s)', contactId, phoneList)

    const request = new ContactPhoneRequest()
    request.setContactId(contactId)
    request.setPhoneListList(phoneList)

    await util.promisify(
      this.grpcClient!.contactPhone.bind(this.grpcClient)
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
      this.grpcClient!.contactCorporationRemark.bind(this.grpcClient)
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
      this.grpcClient!.contactDescription.bind(this.grpcClient)
    )(request)
  }

  override async contactList (): Promise<string[]> {
    log.verbose('PuppetService', 'contactList()')

    const response = await util.promisify(
      this.grpcClient!.contactList.bind(this.grpcClient)
    )(new ContactListRequest())

    return response.getIdsList()
  }

  // override async contactQrCode (contactId: string): Promise<string> {
  //   if (contactId !== this.selfId()) {
  //     throw new Error('can not set avatar for others')
  //   }

  //   const response = await util.promisify(
  //     this.grpcClient!.contactSelfQRCode.bind(this.grpcClient)
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
        this.grpcClient!.contactAvatar.bind(this.grpcClient)
      )(request)

      return
    }

    /**
     * 2. get
     */
    const request = new ContactAvatarRequest()
    request.setId(contactId)

    const response = await util.promisify(
      this.grpcClient!.contactAvatar.bind(this.grpcClient)
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
      this.grpcClient!.contactPayload.bind(this.grpcClient)
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
      this.grpcClient!.contactSelfName.bind(this.grpcClient)
    )(request)
  }

  override async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetService', 'contactSelfQRCode()')

    const response = await util.promisify(
      this.grpcClient!.contactSelfQRCode.bind(this.grpcClient)
    )(new ContactSelfQRCodeRequest())

    return response.getQrcode()
  }

  override async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetService', 'contactSelfSignature(%s)', signature)

    const request = new ContactSelfSignatureRequest()
    request.setSignature(signature)

    await util.promisify(
      this.grpcClient!.contactSelfSignature.bind(this.grpcClient)
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
      this.grpcClient!.messageMiniProgram.bind(this.grpcClient)
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

    if (!this.grpcClient) {
      throw new Error('Can not get image from message since no grpc client.')
    }
    const pbStream = this.grpcClient.messageImageStream(request)
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
      this.grpcClient!.messageContact.bind(this.grpcClient)
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
      this.grpcClient!.messageSendMiniProgram.bind(this.grpcClient)
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
      this.grpcClient!.messageRecall.bind(this.grpcClient)
    )(request)

    return response.getSuccess()
  }

  override async messageFile (id: string): Promise<FileBox> {
    log.verbose('PuppetService', 'messageFile(%s)', id)

    const request = new MessageFileStreamRequest()
    request.setId(id)

    if (!this.grpcClient) {
      throw new Error('Can not get file from message since no grpc client.')
    }
    const pbStream = this.grpcClient.messageFileStream(request)
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
      this.grpcClient!.messageForward.bind(this.grpcClient)
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
      this.grpcClient!.messageSendText.bind(this.grpcClient)
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
      this.grpcClient!.messageSendContact.bind(this.grpcClient)
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
      this.grpcClient!.messageSendUrl.bind(this.grpcClient)
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
  override async roomRawPayload (
    id: string,
  ): Promise<RoomPayload> {
    log.verbose('PuppetService', 'roomRawPayload(%s)', id)

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

  override async roomRawPayloadParser (payload: RoomPayload): Promise<RoomPayload> {
    // log.silly('PuppetService', 'roomRawPayloadParser({id:%s})', payload.id)
    // passthrough
    return payload
  }

  override async roomList (): Promise<string[]> {
    log.verbose('PuppetService', 'roomList()')

    const response = await util.promisify(
      this.grpcClient!.roomList.bind(this.grpcClient)
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
      this.grpcClient!.roomDel.bind(this.grpcClient)
    )(request)
  }

  override async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetService', 'roomAvatar(%s)', roomId)

    const request = new RoomAvatarRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomAvatar.bind(this.grpcClient)
    )(request)

    const jsonText = response.getFilebox()
    return FileBox.fromJSON(jsonText)
  }

  override async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetService', 'roomAdd(%s, %s)', roomId, contactId)

    const request = new RoomAddRequest()
    request.setId(roomId)
    request.setContactId(contactId)

    await util.promisify(
      this.grpcClient!.roomAdd.bind(this.grpcClient)
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

  override async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetService', 'roomCreate(%s, %s)', contactIdList, topic)

    const request = new RoomCreateRequest()
    request.setContactIdsList(contactIdList)
    request.setTopic(topic)

    const response = await util.promisify(
      this.grpcClient!.roomCreate.bind(this.grpcClient)
    )(request)

    return response.getId()
  }

  override async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetService', 'roomQuit(%s)', roomId)

    const request = new RoomQuitRequest()
    request.setId(roomId)

    await util.promisify(
      this.grpcClient!.roomQuit.bind(this.grpcClient)
    )(request)
  }

  override async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetService', 'roomQRCode(%s)', roomId)

    const request = new RoomQRCodeRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomQRCode.bind(this.grpcClient)
    )(request)

    return response.getQrcode()
  }

  override async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetService', 'roomMemberList(%s)', roomId)

    const request = new RoomMemberListRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomMemberList.bind(this.grpcClient)
    )(request)

    return response.getMemberIdsList()
  }

  override async roomMemberRawPayload (roomId: string, contactId: string): Promise<any>  {
    log.verbose('PuppetService', 'roomMemberRawPayload(%s, %s)', roomId, contactId)

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

  override async roomInvitationAccept (
    roomInvitationId: string,
  ): Promise<void> {
    log.verbose('PuppetService', 'roomInvitationAccept(%s)', roomInvitationId)

    const request = new RoomInvitationAcceptRequest()
    request.setId(roomInvitationId)

    await util.promisify(
      this.grpcClient!.roomInvitationAccept.bind(this.grpcClient)
    )(request)
  }

  override async roomInvitationRawPayload (
    id: string,
  ): Promise<RoomInvitationPayload> {
    log.verbose('PuppetService', 'roomInvitationRawPayload(%s)', id)

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
      this.grpcClient!.friendshipSearchPhone.bind(this.grpcClient)
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
      this.grpcClient!.friendshipSearchWeixin.bind(this.grpcClient)
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
      this.grpcClient!.friendshipPayload.bind(this.grpcClient)
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
      this.grpcClient!.friendshipAdd.bind(this.grpcClient)
    )(request)
  }

  override async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetService', 'friendshipAccept(%s)', friendshipId)

    const request = new FriendshipAcceptRequest()
    request.setId(friendshipId)

    await util.promisify(
      this.grpcClient!.friendshipAccept.bind(this.grpcClient)
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
      this.grpcClient!.tagContactAdd.bind(this.grpcClient)
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
      this.grpcClient!.tagContactRemove.bind(this.grpcClient)
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
      this.grpcClient!.tagContactDelete.bind(this.grpcClient)
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
      this.grpcClient!.tagContactList.bind(this.grpcClient)
    )(request)

    return response.getIdsList()
  }

  private async messageSendFileStream (
    conversationId : string,
    file           : FileBox,
  ): Promise<void | string> {
    const request = await packConversationIdFileBoxToPb(MessageSendFileStreamRequest)(conversationId, file)

    const response = await new Promise<MessageSendFileStreamResponse>((resolve, reject) => {
      if (!this.grpcClient) {
        reject(new Error('Can not send message file since no grpc client.'))
        return
      }
      const stream = this.grpcClient.messageSendFileStream((err, response) => {
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
      this.grpcClient!.messageSendFile.bind(this.grpcClient)
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

}

export default PuppetService
