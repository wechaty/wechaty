import {
  Puppet,
  FileBox,
  ContactPayload,
  FriendshipPayload,
  ImageType,
  MiniProgramPayload,
  UrlLinkPayload,
  MessagePayload,
  MessageQueryFilter,
  RoomInvitationPayload,
  RoomPayload,
  RoomMemberPayload,
  RoomQueryFilter,
  ContactQueryFilter,
}                           from '../../../src/mod'

/**
 * expose to public for internal methods:
 */
import { MessagePayloadFilterFunction } from '../../../src/schemas/message'
import { RoomPayloadFilterFunction }    from '../../../src/schemas/room'
import { ContactPayloadFilterFunction } from '../../../src/schemas/contact'
import { FriendshipAddOptions } from '../../../src/schemas/friendship'

export class PuppetTest extends Puppet {

  public async start () : Promise<void> { return super.start() }
  public async stop ()  : Promise<void> { return super.stop() }

  public async ding (data?: string)   : Promise<void> { return data as any as void }
  public async logout () : Promise<void> { return {} as any }

  /**
   *
   * ContactSelf
   *
   *
   */
  public async contactSelfQRCode ()                     : Promise<string> { return '' }
  public async contactSelfName (name: string)           : Promise<void> { return void name }
  public async contactSelfSignature (signature: string) : Promise<void> { return void signature }

  /**
   *
   * Tag
   *
   */
  public async tagContactAdd (tagId: string, contactId: string) : Promise<void> { return void { contactId, tagId } }
  public async tagContactRemove (tagId: string, contactId: string) : Promise<void> { return void { contactId, tagId } }
  public async tagContactDelete (tagId: string) : Promise<void> { return void { tagId } }
  public async tagContactList (contactId?: string) : Promise<string[]> { return [contactId || ''] }

  /**
   *
   * Contact
   *
   */
  public async contactAlias (contactId: string)                        : Promise<string>
  public async contactAlias (contactId: string, alias: string | null)  : Promise<void>
  public async contactAlias (contactId: string, alias?: string | null) : Promise<string | void> { return { alias, contactId } as any }

  public async contactAvatar (contactId: string)                 : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox)  : Promise<void>
  public async contactAvatar (contactId: string, file?: FileBox) : Promise<void | FileBox> { return { contactId, file } as any }

  public async contactPhone (contactId: string, phoneList: string[]): Promise<void> { return { contactId, phoneList } as any }

  public async contactList ()                    : Promise<string[]> { return {} as any }

  public async contactCorporationRemark (contactId: string, corporationRemark: string | null) : Promise<void> { return { contactId, corporationRemark } as any }

  public async contactDescription (contactId: string, description: string | null): Promise<void> { return { contactId, description } as any }

  public async contactRawPayload (id: string)            : Promise<any> { return { id } as any }
  public async contactRawPayloadParser (rawPayload: any) : Promise<ContactPayload> { return { rawPayload } as any }

  /**
   *
   * Friendship
   *
   */
  public async friendshipRawPayload (id: string)            : Promise<any> { return { id } as any }
  public async friendshipRawPayloadParser (rawPayload: any) : Promise<FriendshipPayload> { return rawPayload }

  public async friendshipSearchPhone (phone: string) : Promise<null | string> { return phone }
  public async friendshipSearchWeixin (weixin: string) : Promise<null | string> { return weixin }
  public async friendshipAdd (contactId: string, option?: FriendshipAddOptions) : Promise<void> { return { contactId, option } as any }
  public async friendshipAccept (friendshipId: string)           : Promise<void> { return { friendshipId } as any }

  /**
   *
   * Message
   *
   */
  public async messageContact     (messageId: string)                       : Promise<string> { return { messageId } as any }
  public async messageFile        (messageId: string)                       : Promise<FileBox> { return { messageId } as any }
  public async messageImage       (messageId: string, imageType: ImageType) : Promise<FileBox> { return { imageType, messageId } as any }
  public async messageMiniProgram (messageId: string)                       : Promise<MiniProgramPayload> { return { messageId } as any }
  public async messageUrl         (messageId: string)                       : Promise<UrlLinkPayload> { return { messageId } as any }

  public async messageForward         (conversationId: string, messageId: string)                      : Promise<void | string> { return { conversationId, messageId } as any }
  public async messageSendContact     (conversationId: string, contactId: string)                      : Promise<void | string> { return { contactId, conversationId } as any }
  public async messageSendFile        (conversationId: string, file: FileBox)                          : Promise<void | string> { return { conversationId, file } as any }
  public async messageSendText        (conversationId: string, text: string)                           : Promise<void | string> { return { conversationId, text } as any }
  public async messageSendUrl         (conversationId: string, urlLinkPayload: UrlLinkPayload)         : Promise<void | string> { return { conversationId, urlLinkPayload } as any }
  public async messageSendMiniProgram (conversationId: string, miniProgramPayload: MiniProgramPayload) : Promise<void | string> { return { conversationId, miniProgramPayload } as any }

  public async messageRawPayload (id: string)            : Promise<any> { return { id } as any }
  public async messageRawPayloadParser (rawPayload: any) : Promise<MessagePayload> { return { rawPayload } as any }

  public async messageRecall (messageId: string)                : Promise<boolean> { return { messageId } as any }

  /**
   *
   * Room Invitation
   *
   */
  public async roomInvitationAccept (_: string): Promise<void> { }

  public async roomInvitationRawPayload (roomInvitationId: string) : Promise<any> { return { roomInvitationId } as any }
  public async roomInvitationRawPayloadParser (rawPayload: any)    : Promise<RoomInvitationPayload> { return rawPayload }

  /**
   *
   * Room
   *
   */
  public async roomAnnounce (roomId: string)                : Promise<string>
  public async roomAnnounce (roomId: string, text: string)  : Promise<void>
  public async roomAnnounce (roomId: string, text?: string) : Promise<void | string> { return { roomId, text } as any }

  public async roomAdd (roomId: string, contactId: string)          : Promise<void> { return { contactId, roomId } as any }
  public async roomAvatar (roomId: string)                          : Promise<FileBox> { return { roomId } as any }
  public async roomCreate (contactIdList: string[], topic?: string) : Promise<string> { return { contactIdList, topic } as any }
  public async roomDel (roomId: string, contactId: string)          : Promise<void> { return { contactId, roomId } as any }
  public async roomQuit (roomId: string)                            : Promise<void> { return { roomId } as any }
  public async roomQRCode (roomId: string)                          : Promise<string> { return { roomId } as any }

  public async roomTopic (roomId: string)                 : Promise<string>
  public async roomTopic (roomId: string, topic: string)  : Promise<void>
  public async roomTopic (roomId: string, topic?: string) : Promise<string | void> { return { roomId, topic } as any }

  public async roomList ()                     : Promise<string[]> { return {} as any }
  public async roomMemberList (roomId: string) : Promise<string[]> { return { roomId } as any }

  public async roomRawPayload (id: string)            : Promise<any> { return { id } as any }
  public async roomRawPayloadParser (rawPayload: any) : Promise<RoomPayload> { return { rawPayload } as any }

  public async roomMemberRawPayload (roomId: string, contactId: string) : Promise<any> { return { contactId, roomId } as any }
  public async roomMemberRawPayloadParser (rawPayload: any)             : Promise<RoomMemberPayload> { return rawPayload }

  /**
   * expose to public for internal methods:
   */
  public messageQueryFilterFactory (
    query: MessageQueryFilter,
  ): MessagePayloadFilterFunction {
    return super.messageQueryFilterFactory(query)
  }

  public roomQueryFilterFactory (
    query: RoomQueryFilter,
  ): RoomPayloadFilterFunction {
    return super.roomQueryFilterFactory(query)
  }

  public contactQueryFilterFactory (
    query: ContactQueryFilter,
  ): ContactPayloadFilterFunction {
    return super.contactQueryFilterFactory(query)
  }

  /**
   * FIXME: Huan(202008)
   *  this method has overwrite the super.reset() without any functionality
   *  need to change to super.reset()
   *  however, we need to solve
   *    `error TS1034: 'super' must be followed by an argument list or member access.`
   *  first.
   *
   */
  // private reset (reason: string): void {
  //   // return super.reset(reason)
  //   void reason
  // }

}

export default PuppetTest
