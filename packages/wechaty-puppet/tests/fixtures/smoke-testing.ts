#!/usr/bin/env ts-node

// tslint:disable:arrow-parens
// tslint:disable:max-line-length
// tslint:disable:member-ordering
// tslint:disable:no-shadowed-variable
// tslint:disable:unified-signatures
// tslint:disable:no-console

import {
  ContactGender,
  ContactPayload,
  ContactQueryFilter,
  ContactType,

  FriendshipPayload,
  MessagePayload,

  Puppet,

  Receiver,

  RoomInvitationPayload,

  RoomMemberPayload,
  RoomPayload,
  RoomQueryFilter,

  UrlLinkPayload,
  MiniProgramPayload,

  VERSION,
}                             from 'wechaty-puppet'

import {
  FileBox,
}                 from 'file-box'
import {
  MemoryCard,
}                       from 'memory-card'

class PuppetTest extends Puppet {
  public async start () : Promise<void> { return {} as any }
  public async stop ()  : Promise<void> { return {} as any }

  public async ding (data?: string)   : Promise<void> { return data as any as void }
  public async logout () : Promise<void> { return {} as any }

  /**
   *
   * ContactSelf
   *
   */
  public async contactSelfQrcode ()                         : Promise<string> { return '' }
  public async contactSelfName (name: string)           : Promise<void> { return }
  public async contactSelfSignature (signature: string) : Promise<void> { return }

  /**
   *
   * Contact
   *
   */
  public async contactAlias (contactId: string)                        : Promise<string>
  public async contactAlias (contactId: string, alias: string | null)  : Promise<void>
  public async contactAlias (contactId: string, alias?: string | null) : Promise<string | void> { return { contactId, alias } as any }

  public async contactAvatar (contactId: string)                 : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox)  : Promise<void>
  public async contactAvatar (contactId: string, file?: FileBox) : Promise<void | FileBox> { return { contactId, file } as any }

  public async contactList () : Promise<string[]> { return {} as any }

  public async contactRawPayload (id: string)            : Promise<any> { return { id } as any }
  public async contactRawPayloadParser (rawPayload: any) : Promise<ContactPayload> { return { rawPayload } as any }

  /**
   *
   * Friendship
   *
   */
  public async friendshipRawPayload (id: string)            : Promise<any> { return { id } as any }
  public async friendshipRawPayloadParser (rawPayload: any) : Promise<FriendshipPayload> { return rawPayload }

  public async friendshipAdd (contactId: string, hello?: string) : Promise<void> { return { contactId, hello } as any }
  public async friendshipAccept (friendshipId: string)           : Promise<void> { return { friendshipId } as any }

  /**
   *
   * Message
   *
   */
  public async messageFile (messageId: string) : Promise<FileBox> { return { messageId } as any }
  public async messageUrl (messageId: string)  : Promise<UrlLinkPayload> { return { messageId } as any }
  public async messageMiniProgram (messageId: string)  : Promise<MiniProgramPayload> { return { messageId } as any }

  public async messageForward (to: Receiver, messageId: string)              : Promise<void> { return { to, messageId } as any }
  public async messageSendContact (receiver: Receiver, contactId: string)    : Promise<void> { return { receiver, contactId } as any }
  public async messageSendFile (to: Receiver, file: FileBox)                 : Promise<void> { return { to, file } as any }
  public async messageSendText (to: Receiver, text: string)                  : Promise<void> { return { to, text } as any }
  public async messageSendUrl (to: Receiver, urlLinkPayload: UrlLinkPayload) : Promise<void> { return { to, urlLinkPayload } as any }
  public async messageSendMiniProgram (to: Receiver, miniProgramPayload: MiniProgramPayload) : Promise<void> { return { miniProgramPayload, to } as any }

  public async messageRawPayload (id: string)            : Promise<any> { return { id } as any }
  public async messageRawPayloadParser (rawPayload: any) : Promise<MessagePayload> { return { rawPayload } as any }

  /**
   *
   * Room Invitation
   *
   */
  public async roomInvitationAccept (roomInvitationId: string): Promise<void> { return }

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

  public async roomAdd (roomId: string, contactId: string)          : Promise<void> { return { roomId, contactId } as any }
  public async roomAvatar (roomId: string)                          : Promise<FileBox> { return { roomId } as any }
  public async roomCreate (contactIdList: string[], topic?: string) : Promise<string> { return { contactIdList, topic } as any }
  public async roomDel (roomId: string, contactId: string)          : Promise<void> { return { roomId, contactId } as any }
  public async roomQuit (roomId: string)                            : Promise<void> { return { roomId } as any }
  public async roomQrcode (roomId: string)                          : Promise<string> { return { roomId } as any }

  public async roomTopic (roomId: string)                 : Promise<string>
  public async roomTopic (roomId: string, topic: string)  : Promise<void>
  public async roomTopic (roomId: string, topic?: string) : Promise<string | void> { return { roomId, topic } as any }

  public async roomList ()                     : Promise<string[]> { return {} as any }
  public async roomMemberList (roomId: string) : Promise<string[]> { return { roomId } as any }

  public async roomRawPayload (id: string)            : Promise<any> { return { id } as any }
  public async roomRawPayloadParser (rawPayload: any) : Promise<RoomPayload> { return { rawPayload } as any }

  public async roomMemberRawPayload (roomId: string, contactId: string) : Promise<any> { return { roomId, contactId } as any }
  public async roomMemberRawPayloadParser (rawPayload: any)             : Promise<RoomMemberPayload> { return rawPayload }

  /**
   * expose to public for internal methods:
   */
  public roomQueryFilterFactory (
    query: RoomQueryFilter,
  ): any {
    return super.roomQueryFilterFactory(query)
  }

  public contactQueryFilterFactory (
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
  console.log(`Puppet v${puppet.version()} smoking test passed.`)
  return 0
}

main()
.then(process.exit)
.catch(e => {
  console.error(e)
  process.exit(1)
})
