import path  from 'path'

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

  Receiver,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,

  UrlLinkPayload,

  throwUnsupportedError,
}                         from 'wechaty-puppet'

import {
  FileBox,
}             from 'file-box'

import {
  EMPTY,
  PuppetClient,
}                   from './grpc/puppet-client'

import {
  log,
  VERSION,
}                   from './config'

export class PuppetHostie extends Puppet {

  public static readonly VERSION = VERSION

  private grpcClient?: PuppetClient

  constructor (
    public options: PuppetOptions = {},
  ) {
    super(options)
  }

  protected initGrpcClient (): void {
    log.verbose('PuppetHostie', `initGrpcClient()`)

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
  }

  public async start (): Promise<void> {
    log.verbose('PuppetHostie', `start()`)

    if (this.state.on()) {
      log.warn('PuppetHostie', 'start() is called on a ON puppet. await ready(on) and return.')
      await this.state.ready('on')
      return
    }

    this.state.on('pending')

    this.initGrpcClient()

    await new Promise((resolve, reject) => {
      this.grpcClient!.start(EMPTY, (error, response) => {
        if (error) {
          return reject(error)
        }
        return resolve(response)
      })
    })

    this.state.on(true)
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetHostie', 'quit()')

    if (!this.grpcClient) {
      throw new Error('no puppetClient')
    }

    if (this.state.off()) {
      log.warn('PuppetHostie', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    await new Promise((resolve, reject) => {
      this.grpcClient!.stop(EMPTY, (error, response) => {
        if (error) {
          return reject(error)
        }
        return resolve(response)
      })
    })

    this.grpcClient.close()
    this.grpcClient = undefined

    this.state.off(true)
  }

  public async logout (): Promise<void> {
    log.verbose('PuppetHostie', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    this.emit('logout', this.id) // becore we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // TODO: do the logout job
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

    if (typeof alias === 'undefined') {
      return 'mock alias'
    }
  }

  public async contactList (): Promise<string[]> {
    log.verbose('PuppetHostie', 'contactList()')

    return new Promise<string[]>((resolve, reject) => {
      this.grpcClient!.contactList(EMPTY, (err, response) => {
        if (err) {
          return reject(err)
        }

        const pbIdList = response.getIdList()
        const idList   = pbIdList.map(pbId => pbId.getId())

        return resolve(idList)
      })
    })
  }

  public async contactQrcode (contactId: string): Promise<string> {
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }

    throw new Error('not supported')
  }

  public async contactAvatar (contactId: string)                : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar (contactId: string, file?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetHostie', 'contactAvatar(%s)', contactId)

    /**
     * 1. set
     */
    if (file) {
      return
    }

    /**
     * 2. get
     */
    const WECHATY_ICON_PNG = path.resolve('../../docs/images/wechaty-icon.png')
    return FileBox.fromFile(WECHATY_ICON_PNG)
  }

  public async contactRawPayload (id: string): Promise<ContactPayload> {
    log.verbose('PuppetHostie', 'contactRawPayload(%s)', id)
    const payload: ContactPayload = {
      name : 'mock name',
    } as any
    return payload
  }

  public async contactRawPayloadParser (rawPayload: ContactPayload): Promise<ContactPayload> {
    log.verbose('PuppetHostie', 'contactRawPayloadParser(%s)', rawPayload)

    return rawPayload
  }

  public async contactSelfName (name: string): Promise<void> {
    return throwUnsupportedError(name)
  }

  public async contactSelfQrcode (): Promise<string> {
    return throwUnsupportedError()
  }

  public async contactSelfSignature (signature: string): Promise<void> {
    throwUnsupportedError(signature)
  }

  /**
   *
   * Message
   *
   */
  public async messageFile (id: string): Promise<FileBox> {
    return FileBox.fromBase64(
      'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ==',
      'mock-file' + id + '.txt',
    )
  }

  public async messageRawPayload (id: string): Promise<MessagePayload> {
    log.verbose('PuppetHostie', 'messageRawPayload(%s)', id)
    const rawPayload: MessagePayload = {
      from : 'from_id',
      id   : 'id',
      text : 'mock message text',
      to   : 'to_id',
    } as any
    return rawPayload
  }

  public async messageRawPayloadParser (rawPayload: MessagePayload): Promise<MessagePayload> {
    log.verbose('PuppetHostie', 'messagePayload(%s)', rawPayload)
    return rawPayload
  }

  public async messageSendText (
    receiver : Receiver,
    text     : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'messageSend(%s, %s)', receiver, text)
  }

  public async messageSendFile (
    receiver : Receiver,
    file     : FileBox,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'messageSend(%s, %s)', receiver, file)
  }

  public async messageSendContact (
    receiver  : Receiver,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'messageSend("%s", %s)', JSON.stringify(receiver), contactId)
  }

  public async messageForward (
    receiver  : Receiver,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'messageForward(%s, %s)',
      receiver,
      messageId,
    )
  }

  public async messageSendUrl (
    receiver: Receiver,
    urlLinkPayload: UrlLinkPayload,
  ): Promise<void> {
    return throwUnsupportedError(receiver, urlLinkPayload)
  }

  public async messageUrl (messageId: string): Promise<UrlLinkPayload> {
    return throwUnsupportedError(messageId)
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

    const rawPayload: RoomPayload = {
      memberList: [],
      ownerId   : 'mock_room_owner_id',
      topic     : 'mock topic',
    } as any
    return rawPayload
  }

  public async roomRawPayloadParser (
    rawPayload: RoomPayload,
  ): Promise<RoomPayload> {
    log.verbose('PuppetHostie', 'roomRawPayloadParser(%s)', rawPayload)
    return rawPayload
  }

  public async roomList (): Promise<string[]> {
    log.verbose('PuppetHostie', 'roomList()')

    return []
  }

  public async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'roomDel(%s, %s)', roomId, contactId)
  }

  public async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetHostie', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    return FileBox.fromUrl(payload.avatar!)
  }

  public async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'roomAdd(%s, %s)', roomId, contactId)
  }

  public async roomTopic (roomId: string)                : Promise<string>
  public async roomTopic (roomId: string, topic: string) : Promise<void>

  public async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetHostie', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }
  }

  public async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetHostie', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'mock_room_id'
  }

  public async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetHostie', 'roomQuit(%s)', roomId)
  }

  public async roomQrcode (roomId: string): Promise<string> {
    return roomId + ' mock qrcode'
  }

  public async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetHostie', 'roommemberList(%s)', roomId)
    return []
  }

  public async roomMemberRawPayload (roomId: string, contactId: string): Promise<any>  {
    log.verbose('PuppetHostie', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    return {}
  }

  public async roomMemberRawPayloadParser (rawPayload: any): Promise<RoomMemberPayload>  {
    log.verbose('PuppetHostie', 'roomMemberRawPayloadParser(%s)', rawPayload)
    return {
      avatar    : 'mock-avatar-data',
      id        : 'xx',
      name      : 'mock-name',
      roomAlias : 'yy',
    }
  }

  public async roomAnnounce (roomId: string)                : Promise<string>
  public async roomAnnounce (roomId: string, text: string)  : Promise<void>

  public async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    if (text) {
      return
    }
    return 'mock announcement for ' + roomId
  }

  public async roomInvitationAccept (
    roomInvitationId: string,
  ): Promise<void> {
    throwUnsupportedError(roomInvitationId)
  }

  public async roomInvitationRawPayload (
    roomInvitationId: string,
  ): Promise<any> {
    throwUnsupportedError(roomInvitationId)
  }

  public roomInvitationRawPayloadParser (
    rawPayload: any,
  ): Promise<RoomInvitationPayload> {
    return throwUnsupportedError(rawPayload)
  }

  /**
   *
   * Friendship
   *
   */
  public async friendshipRawPayload (id: string)            : Promise<any> {
    return { id } as any
  }
  public async friendshipRawPayloadParser (rawPayload: any) : Promise<FriendshipPayload> {
    return rawPayload
  }

  public async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'friendshipAdd(%s, %s)', contactId, hello)
  }

  public async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetHostie', 'friendshipAccept(%s)', friendshipId)
  }

  public ding (data?: string): void {
    log.silly('PuppetHostie', 'ding(%s)', data || '')
    this.emit('dong', data)
  }

  public unref (): void {
    log.verbose('PuppetHostie', 'unref()')
    super.unref()
  }

}

export default PuppetHostie
