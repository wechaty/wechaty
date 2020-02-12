/// <reference path="./typings.d.ts" />

import util from 'util'

import grpc from 'grpc'

import {
  // ContactGender,
  ContactPayload,
  // ContactType,

  FriendshipPayload,

  MessagePayload,
  // MessageType,

  Puppet,
  PuppetOptions,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,
  UrlLinkPayload,
  MiniProgramPayload,
}                         from 'wechaty-puppet'

import {
  FileBox,
}             from 'file-box'

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
  // EventType,
}                                   from '@chatie/grpc'

import { StringValue } from 'google-protobuf/google/protobuf/wrappers_pb'

import {
  log,
  VERSION,
  WECHATY_PUPPET_HOSTIE_TOKEN,
  WECHATY_PUPPET_HOSTIE_ENDPOINT,
}                                   from '../config'

export class PuppetHostieGrpc extends Puppet {

  public static readonly VERSION = VERSION

  private grpcClient?: PuppetClient
  private eventStream?: grpc.ClientReadableStream<EventResponse>

  constructor (
    public options: PuppetOptions = {},
  ) {
    super(options)
    options.endpoint = options.endpoint || WECHATY_PUPPET_HOSTIE_ENDPOINT || '0.0.0.0:8788'
    options.token = options.token || WECHATY_PUPPET_HOSTIE_TOKEN

    if (!options.token) {
      throw new Error('wechaty-puppet-hostie: token not found. See: <https://github.com/wechaty/wechaty-puppet-hostie#1-wechaty_puppet_hostie_token>')
    }
  }

  protected async startGrpcClient (): Promise<void> {
    log.verbose('PuppetHostieGrpc', `startGrpcClient()`)

    if (this.grpcClient) {
      throw new Error('puppetClient had already inited')
    }

    const endpoint = this.options.endpoint
    if (!endpoint) {
      throw new Error('no endpoint')
    }

    this.grpcClient = new PuppetClient(
      endpoint, // 'localhost:50051',
      grpc.credentials.createInsecure()
    )

    await util.promisify(
      this.grpcClient.start
        .bind(this.grpcClient)
    )(new StartRequest())
  }

  protected async stopGrpcClient (): Promise<void> {
    log.verbose('PuppetHostieGrpc', `stopGrpcClient()`)

    if (!this.grpcClient) {
      throw new Error('puppetClient had not inited')
    }

    await util.promisify(
      this.grpcClient.stop
        .bind(this.grpcClient)
    )(new StopRequest())

    this.grpcClient.close()
    this.grpcClient = undefined
  }

  public async start (): Promise<void> {
    log.verbose('PuppetHostieGrpc', `start()`)

    if (this.state.on()) {
      log.warn('PuppetHostieGrpc', 'start() is called on a ON puppet. await ready(on) and return.')
      await this.state.ready('on')
      return
    }

    this.state.on('pending')

    try {
      await this.startGrpcClient()
      if (!this.grpcClient) {
        throw new Error('no grpc client')
      }

      this.startEvent()

      this.state.on(true)

    } catch (e) {
      log.error('PuppetHostieGrpc', 'start() rejection: %s', e && e.message)

      this.state.off(true)
      throw e

    }
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetHostieGrpc', 'stop()')

    if (this.state.off()) {
      log.warn('PuppetHostieGrpc', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    try {
      await this.stopGrpcClient()

      this.stopEvent()

    } catch (e) {
      log.warn('PuppetHostieGrpc', 'stop() rejection: %s', e && e.message)
      throw e
    } finally {
      this.state.off(true)
    }

  }

  private startEvent (): void {
    log.verbose('PuppetHostieGrpc', 'startEvent()')

    if (this.eventStream) {
      throw new Error('event stream exists')
    }

    this.eventStream = this.grpcClient!.event(new EventRequest())

    this.eventStream
      .on('data', (chunk: EventResponse) => {
        console.info('payload:', chunk.getPayload())
      })
      .on('end', () => {
        console.info('eventStream.on(end)')
      })
  }

  private stopEvent (): void {
    log.verbose('PuppetHostieGrpc', 'stopEvent()')

    if (!this.eventStream) {
      throw new Error('no event stream')
    }

    this.eventStream.cancel()
    this.eventStream.destroy()
    this.eventStream = undefined
  }

  public async logout (): Promise<void> {
    log.verbose('PuppetHostieGrpc', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    try {
      await util.promisify(
        this.grpcClient!.logout
          .bind(this.grpcClient)
      )(new LogoutRequest())

    } catch (e) {
      log.error('PuppetHostieGrpc', 'logout() rejection: %s', e && e.message)
      throw e
    } finally {
      this.emit('logout', this.id) // becore we will throw above by logonoff() when this.user===undefined
      this.id = undefined
    }
  }

  public ding (data?: string): void {
    log.silly('PuppetHostieGrpc', 'ding(%s)', data || '')

    this.grpcClient!.logout(
      new LogoutRequest(),
      (error, _response) => {
        if (error) {
          log.error('PuppetHostieGrpc', 'ding() rejection: %s', error)
        }
      }
    )
  }

  public unref (): void {
    log.verbose('PuppetHostieGrpc', 'unref()')
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
    log.verbose('PuppetHostieGrpc', 'contactAlias(%s, %s)', contactId, alias)

    /**
     * Get alias
     */
    if (typeof alias === 'undefined') {
      const request = new ContactAliasRequest()
      request.setId(contactId)

      const response = await util.promisify(
        this.grpcClient!.contactAlias
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
      this.grpcClient!.contactAlias
    )(request)
  }

  public async contactList (): Promise<string[]> {
    log.verbose('PuppetHostieGrpc', 'contactList()')

    const response = await util.promisify(
      this.grpcClient!.contactList
    )(new ContactListRequest())

    return response.getIdsList()
  }

  public async contactQRCode (contactId: string): Promise<string> {
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }

    const response = await util.promisify(
      this.grpcClient!.contactSelfQRCode
    )(new ContactSelfQRCodeRequest())

    return response.getQrcode()
  }

  public async contactAvatar (contactId: string)                : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar (contactId: string, fileBox?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetHostieGrpc', 'contactAvatar(%s)', contactId)

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
        this.grpcClient!.contactSelfQRCode
      )(request)

      return
    }

    /**
     * 2. get
     */
    const request = new ContactAvatarRequest()
    request.setId(contactId)

    const response = await util.promisify(
      this.grpcClient!.contactSelfQRCode
    )(request)

    const qrcode = response.getQrcode()
    return FileBox.fromQRCode(qrcode)
  }

  public async contactRawPayload (id: string): Promise<ContactPayload> {
    log.verbose('PuppetHostieGrpc', 'contactRawPayload(%s)', id)

    const request = new ContactPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.contactPayload
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
    log.silly('PuppetHostieGrpc', 'contactRawPayloadParser(%s)', payload)
    // passthrough
    return payload
  }

  public async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetHostieGrpc', 'contactSelfName(%s)', name)

    const request = new ContactSelfNameRequest()
    request.setName(name)

    await util.promisify(
      this.grpcClient!.contactSelfName
    )(request)
  }

  public async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetHostieGrpc', 'contactSelfQRCode()')

    const response = await util.promisify(
      this.grpcClient!.contactSelfQRCode
    )(new ContactSelfQRCodeRequest())

    return response.getQrcode()
  }

  public async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetHostieGrpc', 'contactSelfSignature(%s)', signature)

    const request = new ContactSelfSignatureRequest()
    request.setSignature(signature)

    await util.promisify(
      this.grpcClient!.contactSelfSignature
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
    log.verbose('PuppetHostieGrpc', 'messageMiniProgram(%s)', messageId)

    const request = new MessageMiniProgramRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpcClient!.messageMiniProgram
    )(request)

    const jsonText = response.getMiniProgram()
    const payload = JSON.parse(jsonText) as MiniProgramPayload

    return payload
  }

  public async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetHostieGrpc', 'messageContact(%s)', messageId)

    const request = new MessageContactRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpcClient!.messageContact
    )(request)

    const contactId = response.getId()
    return contactId
  }

  public async messageSendMiniProgram (
    conversationId: string,
    miniProgramPayload: MiniProgramPayload,
  ): Promise<void | string> {
    log.verbose('PuppetHostieGrpc', 'messageSendMiniProgram(%s)', conversationId, JSON.stringify(miniProgramPayload))

    const request = new MessageSendMiniProgramRequest()
    request.setConversationId(conversationId)
    request.setMiniProgram(JSON.stringify(miniProgramPayload))

    const response = await util.promisify(
      this.grpcClient!.messageSendMiniProgram
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  public async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetHostieGrpc', 'messageRecall(%s)', messageId)

    const request = new MessageRecallRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpcClient!.messageRecall
    )(request)

    return response.getSuccess()
  }

  public async messageFile (id: string): Promise<FileBox> {
    log.verbose('PuppetHostieGrpc', 'messageFile(%s)', id)

    const request = new MessageFileRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.messageFile
    )(request)

    const jsonText = response.getFilebox()
    return FileBox.fromJSON(jsonText)
  }

  public async messageRawPayload (id: string): Promise<MessagePayload> {
    log.verbose('PuppetHostieGrpc', 'messageRawPayload(%s)', id)

    const request = new MessagePayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.messagePayload
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
    log.silly('PuppetHostieGrpc', 'messagePayload(%s)', payload)
    // passthrough
    return payload
  }

  public async messageSendText (
    conversationId : string,
    text           : string,
  ): Promise<void | string> {
    log.verbose('PuppetHostieGrpc', 'messageSend(%s, %s)', conversationId, text)

    const request = new MessageSendTextRequest()
    request.setConversationId(conversationId)
    request.setText(text)

    const response = await util.promisify(
      this.grpcClient!.messageSendText
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
    log.verbose('PuppetHostieGrpc', 'messageSend(%s, %s)', conversationId, file)

    const request = new MessageSendFileRequest()
    request.setConversationId(conversationId)
    request.setFilebox(JSON.stringify(file))

    const response = await util.promisify(
      this.grpcClient!.messageSendFile
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
    log.verbose('PuppetHostieGrpc', 'messageSend("%s", %s)', conversationId, contactId)

    const request = new MessageSendContactRequest()
    request.setConversationId(conversationId)
    request.setContactId(contactId)

    const response = await util.promisify(
      this.grpcClient!.messageSendContact
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
    log.verbose('PuppetHostieGrpc', 'messageSendUrl("%s", %s)', conversationId, JSON.stringify(urlLinkPayload))

    const request = new MessageSendUrlRequest()
    request.setConversationId(conversationId)
    request.setUrlLink(JSON.stringify(urlLinkPayload))

    const response = await util.promisify(
      this.grpcClient!.messageSendUrl
    )(request)

    const messageIdWrapper = response.getId()

    if (messageIdWrapper) {
      return messageIdWrapper.getValue()
    }
  }

  public async messageUrl (messageId: string): Promise<UrlLinkPayload> {
    log.verbose('PuppetHostieGrpc', 'messageUrl(%s)', messageId)

    const request = new MessageUrlRequest()
    request.setId(messageId)

    const response = await util.promisify(
      this.grpcClient!.messageUrl
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
    log.verbose('PuppetHostieGrpc', 'roomRawPayload(%s)', id)

    const request = new RoomPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.roomPayload
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
    log.silly('PuppetHostieGrpc', 'roomRawPayloadParser(%s)', payload)
    // passthrough
    return payload
  }

  public async roomList (): Promise<string[]> {
    log.verbose('PuppetHostieGrpc', 'roomList()')

    const response = await util.promisify(
      this.grpcClient!.roomList
    )(new RoomListRequest())

    return response.getIdsList()
  }

  public async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetHostieGrpc', 'roomDel(%s, %s)', roomId, contactId)

    const request = new RoomDelRequest()
    request.setId(roomId)
    request.setContactId(contactId)

    await util.promisify(
      this.grpcClient!.roomDel
    )(request)
  }

  public async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetHostieGrpc', 'roomAvatar(%s)', roomId)

    const request = new RoomAvatarRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomAvatar
    )(request)

    const jsonText = response.getFilebox()
    return FileBox.fromJSON(jsonText)
  }

  public async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetHostieGrpc', 'roomAdd(%s, %s)', roomId, contactId)

    const request = new RoomAddRequest()
    request.setId(roomId)
    request.setContactId(contactId)

    await util.promisify(
      this.grpcClient!.roomAdd
    )(request)
  }

  public async roomTopic (roomId: string)                : Promise<string>
  public async roomTopic (roomId: string, topic: string) : Promise<void>

  public async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetHostieGrpc', 'roomTopic(%s, %s)', roomId, topic)

    /**
     * Get
     */
    if (typeof topic === 'undefined') {
      const request = new RoomTopicRequest()
      request.setId(roomId)

      const response = await util.promisify(
        this.grpcClient!.roomTopic
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
      this.grpcClient!.roomTopic
    )(request)
  }

  public async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetHostieGrpc', 'roomCreate(%s, %s)', contactIdList, topic)

    const request = new RoomCreateRequest()
    request.setContactIdsList(contactIdList)
    request.setTopic(topic)

    const response = await util.promisify(
      this.grpcClient!.roomCreate
    )(request)

    return response.getId()
  }

  public async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetHostieGrpc', 'roomQuit(%s)', roomId)

    const request = new RoomQuitRequest()
    request.setId(roomId)

    await util.promisify(
      this.grpcClient!.roomQuit
    )(request)
  }

  public async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetHostieGrpc', 'roomQRCode(%s)', roomId)

    const request = new RoomQRCodeRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomQRCode
    )(request)

    return response.getQrcode()
  }

  public async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetHostieGrpc', 'roommemberList(%s)', roomId)

    const request = new RoomMemberListRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomMemberList
    )(request)

    return response.getMemberIdsList()
  }

  public async roomMemberRawPayload (roomId: string, contactId: string): Promise<any>  {
    log.verbose('PuppetHostieGrpc', 'roomMemberRawPayload(%s, %s)', roomId, contactId)

    const request = new RoomMemberPayloadRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomMemberPayload
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
    log.silly('PuppetHostieGrpc', 'roomMemberRawPayloadParser(%s)', payload)
    // passthrough
    return payload
  }

  public async roomAnnounce (roomId: string)                : Promise<string>
  public async roomAnnounce (roomId: string, text: string)  : Promise<void>

  public async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    log.verbose('PuppetHostieGrpc', 'roomAnnounce(%s%s)',
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
        this.grpcClient!.roomAnnounce
      )(request)

      return
    }

    /**
     * Get
     */
    const request = new RoomAnnounceRequest()
    request.setId(roomId)

    const response = await util.promisify(
      this.grpcClient!.roomAnnounce
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
    log.verbose('PuppetHostieGrpc', 'roomInvitationAccept(%s)', roomInvitationId)

    const request = new RoomInvitationAcceptRequest()
    request.setId(roomInvitationId)

    await util.promisify(
      this.grpcClient!.roomInvitationAccept
    )(request)
  }

  public async roomInvitationRawPayload (
    roomInvitationId: string,
  ): Promise<RoomInvitationPayload> {
    log.verbose('PuppetHostieGrpc', 'roomInvitationRawPayload(%s)', roomInvitationId)

    const request = new RoomInvitationPayloadRequest()
    request.setId(roomInvitationId)

    const response = await util.promisify(
      this.grpcClient!.roomInvitationPayload
    )(request)

    const payload: RoomInvitationPayload = {
      avatar       : response.getAvatar(),
      id           : response.getId(),
      invitation   : response.getInvitation(),
      inviterId    : response.getInviterId(),
      memberCount  : response.getMemberCount(),
      memberIdList : response.getMemberIdsList(),
      timestamp    : response.getTimestamp(),
      topic        : response.getTopic(),
    }

    return payload
  }

  public async roomInvitationRawPayloadParser (payload: RoomInvitationPayload): Promise<RoomInvitationPayload> {
    log.silly('PuppetHostieGrpc', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(payload))
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
    log.verbose('PuppetHostieGrpc', 'friendshipSearchPhone(%s)', phone)

    const request = new FriendshipSearchPhoneRequest()
    request.setPhone(phone)

    const response = await util.promisify(
      this.grpcClient!.friendshipSearchPhone
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
    log.verbose('PuppetHostieGrpc', 'friendshipSearchWeixin(%s)', weixin)

    const request = new FriendshipSearchWeixinRequest()
    request.setWeixin(weixin)

    const response = await util.promisify(
      this.grpcClient!.friendshipSearchWeixin
    )(request)

    const contactIdWrapper = response.getContactId()
    if (contactIdWrapper) {
      return contactIdWrapper.getValue()
    }
    return null
  }

  public async friendshipRawPayload (id: string): Promise<FriendshipPayload> {
    log.verbose('PuppetHostieGrpc', 'friendshipRawPayload(%s)', id)

    const request = new FriendshipPayloadRequest()
    request.setId(id)

    const response = await util.promisify(
      this.grpcClient!.friendshipPayload
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
    log.silly('PuppetHostieGrpc', 'friendshipRawPayloadParser(%s)', JSON.stringify(payload))
    return payload
  }

  public async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetHostieGrpc', 'friendshipAdd(%s, %s)', contactId, hello)

    const request = new FriendshipAddRequest()
    request.setContactId(contactId)
    request.setHello(hello)

    await util.promisify(
      this.grpcClient!.friendshipAdd
    )(request)
  }

  public async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetHostieGrpc', 'friendshipAccept(%s)', friendshipId)

    const request = new FriendshipAcceptRequest()
    request.setId(friendshipId)

    await util.promisify(
      this.grpcClient!.frendshipAccept
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
    log.verbose('PuppetHostieGrpc', 'tagContactAdd(%s, %s)', id, contactId)

    const request = new TagContactAddRequest()
    request.setId(id)
    request.setContactId(contactId)

    await util.promisify(
      this.grpcClient!.tagContactAdd
    )(request)
  }

  // remove a tag from the Contact
  public async tagContactRemove (
    id: string,
    contactId: string,
  ) : Promise<void> {
    log.verbose('PuppetHostieGrpc', 'tagContactRemove(%s, %s)', id, contactId)

    const request = new TagContactRemoveRequest()
    request.setId(id)
    request.setContactId(contactId)

    await util.promisify(
      this.grpcClient!.tagContactRemove
    )(request)
  }

  // delete a tag from Wechat
  public async tagContactDelete (
    id: string,
  ) : Promise<void> {
    log.verbose('PuppetHostieGrpc', 'tagContactDelete(%s)', id)

    const request = new TagContactDeleteRequest()
    request.setId(id)

    await util.promisify(
      this.grpcClient!.tagContactDelete
    )(request)
  }

  // get tags from a specific Contact
  public async tagContactList (
    contactId?: string,
  ) : Promise<string[]> {
    log.verbose('PuppetHostieGrpc', 'tagContactList(%s)', contactId)

    const request = new TagContactListRequest()

    if (typeof contactId !== 'undefined') {
      const contactIdWrapper = new StringValue()
      contactIdWrapper.setValue(contactId)
      request.setContactId(contactIdWrapper)
    }

    const response = await util.promisify(
      this.grpcClient!.tagContactList
    )(request)

    return response.getIdsList()
  }

}

export default PuppetHostieGrpc
