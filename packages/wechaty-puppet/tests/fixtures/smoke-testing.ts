#!/usr/bin/env ts-node

// tslint:disable:arrow-parens
// tslint:disable:max-line-length
// tslint:disable:member-ordering
// tslint:disable:no-shadowed-variable
// tslint:disable:unified-signatures
// tslint:disable:no-console

import {
  // ContactGender,
  ContactPayload,
  ContactQueryFilter,
  // ContactType,

  FileBox,

  FriendshipPayload,
  MessagePayload,
  ImageType,

  Puppet,

  RoomInvitationPayload,

  RoomMemberPayload,
  RoomPayload,
  RoomQueryFilter,

  UrlLinkPayload,
  MiniProgramPayload,

  VERSION,
}                             from 'wechaty-puppet'

class PuppetTest extends Puppet {

  override async start () : Promise<void> { return {} as any }
  override async stop ()  : Promise<void> { return {} as any }

  override async ding (data?: string)   : Promise<void> { return data as any as void }
  override async logout () : Promise<void> { return {} as any }

  /**
   *
   * ContactSelf
   *
   */
  override async contactSelfQRCode ()                     : Promise<string> { return '' }
  override async contactSelfName (name: string)           : Promise<void> { void name }
  override async contactSelfSignature (signature: string) : Promise<void> { void signature }

  /**
   *
   * Tag
   *
   */
  override async tagContactAdd (id: string, contactId: string) : Promise<void> { return void { contactId, id } }
  override async tagContactRemove (id: string, contactId: string) : Promise<void> { return void { contactId, id } }
  override async tagContactDelete (id: string) : Promise<void> { return void { id } }
  override async tagContactList (contactId?: string) : Promise<string[]> { return [contactId || ''] }

  /**
   *
   * Contact
   *
   */
  override async contactAlias (contactId: string)                        : Promise<string>
  override async contactAlias (contactId: string, alias: string | null)  : Promise<void>
  override async contactAlias (contactId: string, alias?: string | null) : Promise<string | void> { return { alias, contactId } as any }

  override async contactAvatar (contactId: string)                 : Promise<FileBox>
  override async contactAvatar (contactId: string, file: FileBox)  : Promise<void>
  override async contactAvatar (contactId: string, file?: FileBox) : Promise<void | FileBox> { return { contactId, file } as any }

  override async contactPhone (contactId: string, phoneList: string[]): Promise<void> { return { contactId, phoneList } as any }

  override async contactList () : Promise<string[]> { return {} as any }

  override async contactCorporationRemark (contactId: string, corporationRemark: string | null) : Promise<void> { return { contactId, corporationRemark } as any }

  override async contactDescription (contactId: string, description: string | null): Promise<void> { return { contactId, description } as any }

  override async contactRawPayload (id: string)            : Promise<any> { return { id } as any }
  override async contactRawPayloadParser (rawPayload: any) : Promise<ContactPayload> { return { rawPayload } as any }

  /**
   *
   * Friendship
   *
   */
  override async friendshipRawPayload (id: string)            : Promise<any> { return { id } as any }
  override async friendshipRawPayloadParser (rawPayload: any) : Promise<FriendshipPayload> { return rawPayload }

  override async friendshipSearchPhone (phone: string) : Promise<string | null> { return phone }
  override async friendshipSearchWeixin (weixin: string) : Promise<string | null> { return weixin }
  override async friendshipAdd (contactId: string, hello?: string) : Promise<void> { return { contactId, hello } as any }
  override async friendshipAccept (friendshipId: string)           : Promise<void> { return { friendshipId } as any }

  /**
   *
   * Message
   *
   */
  override async messageFile (messageId: string) : Promise<FileBox> { return { messageId } as any }
  override async messageUrl (messageId: string)  : Promise<UrlLinkPayload> { return { messageId } as any }
  override async messageImage (messageId: string, imageType: ImageType) : Promise<FileBox> { return { imageType, messageId } as any }
  override async messageContact (messageId: string)  : Promise<string> { return { messageId } as any }
  override async messageMiniProgram (messageId: string)  : Promise<MiniProgramPayload> { return { messageId } as any }

  override async messageForward (to: string, messageId: string)              : Promise<void | string> { return { messageId, to } as any }
  override async messageSendContact (receiver: string, contactId: string)    : Promise<void | string> { return { contactId, receiver } as any }
  override async messageSendFile (to: string, file: FileBox)                 : Promise<void | string> { return { file, to } as any }
  override async messageSendText (to: string, text: string)                  : Promise<void | string> { return { text, to } as any }
  override async messageSendUrl (to: string, urlLinkPayload: UrlLinkPayload) : Promise<void | string> { return { to, urlLinkPayload } as any }
  override async messageSendMiniProgram (to: string, miniProgramPayload: MiniProgramPayload) : Promise<void> { return { miniProgramPayload, to } as any }

  override async messageRecall (messageId: string) : Promise<boolean> { void messageId; return true }

  override async messageRawPayload (id: string)            : Promise<any> { return { id } as any }
  override async messageRawPayloadParser (rawPayload: any) : Promise<MessagePayload> { return { rawPayload } as any }

  /**
   *
   * Conversation
   *
   */
  override async conversationReadMark (conversationId: string, hasRead?: boolean) : Promise<void | boolean> { void conversationId, void hasRead }

  /**
   *
   * Room Invitation
   *
   */
  override async roomInvitationAccept (roomInvitationId: string): Promise<void> { void roomInvitationId }

  override async roomInvitationRawPayload (roomInvitationId: string) : Promise<any> { return { roomInvitationId } as any }
  override async roomInvitationRawPayloadParser (rawPayload: any)    : Promise<RoomInvitationPayload> { return rawPayload }

  /**
   *
   * Room
   *
   */
  override async roomAnnounce (roomId: string)                : Promise<string>
  override async roomAnnounce (roomId: string, text: string)  : Promise<void>
  override async roomAnnounce (roomId: string, text?: string) : Promise<void | string> { return { roomId, text } as any }

  override async roomAdd (roomId: string, contactId: string)          : Promise<void> { return { contactId, roomId } as any }
  override async roomAvatar (roomId: string)                          : Promise<FileBox> { return { roomId } as any }
  override async roomCreate (contactIdList: string[], topic?: string) : Promise<string> { return { contactIdList, topic } as any }
  override async roomDel (roomId: string, contactId: string)          : Promise<void> { return { contactId, roomId } as any }
  override async roomQuit (roomId: string)                            : Promise<void> { return { roomId } as any }
  override async roomQRCode (roomId: string)                          : Promise<string> { return { roomId } as any }

  override async roomTopic (roomId: string)                 : Promise<string>
  override async roomTopic (roomId: string, topic: string)  : Promise<void>
  override async roomTopic (roomId: string, topic?: string) : Promise<string | void> { return { roomId, topic } as any }

  override async roomList ()                     : Promise<string[]> { return {} as any }
  override async roomMemberList (roomId: string) : Promise<string[]> { return { roomId } as any }

  override async roomRawPayload (id: string)            : Promise<any> { return { id } as any }
  override async roomRawPayloadParser (rawPayload: any) : Promise<RoomPayload> { return { rawPayload } as any }

  override async roomMemberRawPayload (roomId: string, contactId: string) : Promise<any> { return { contactId, roomId } as any }
  override async roomMemberRawPayloadParser (rawPayload: any)             : Promise<RoomMemberPayload> { return rawPayload }

  /**
   * expose to public for internal methods:
   */
  public override roomQueryFilterFactory (
    query: RoomQueryFilter,
  ): any {
    return super.roomQueryFilterFactory(query)
  }

  public override contactQueryFilterFactory (
    query: ContactQueryFilter,
  ): any {
    return super.contactQueryFilterFactory(query)
  }

}

async function main () {
  if (VERSION === '0.0.0') {
    throw new Error('version should not be 0.0.0 when publishing')
  }

  const puppet = new PuppetTest()
  console.info(`Puppet v${puppet.version()} smoking test passed.`)
  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
