#!/usr/bin/env ts-node

/* eslint @typescript-eslint/no-unused-vars: off */

import test  from 'blue-tape'
import sinon from 'sinon'

import {
  FileBox,
}                 from 'file-box'
import {
  MemoryCard,
}                 from 'memory-card'

import {
  ContactGender,
  ContactPayload,
  ContactPayloadFilterFunction,
  ContactQueryFilter,
  ContactType,
}                                 from './schemas/contact'
import {
  FriendshipPayload,
}                                 from './schemas/friendship'
import {
  ImageType,
}                                 from './schemas/image'
import {
  MessagePayload,
  MessagePayloadFilterFunction,
  MessageQueryFilter,
  MessageType,
}                                 from './schemas/message'
import {
  RoomMemberPayload,
  RoomPayload,
  RoomPayloadFilterFunction,
  RoomQueryFilter,
}                                 from './schemas/room'
import {
  RoomInvitationPayload,
}                                 from './schemas/room-invitation'
import {
  UrlLinkPayload,
}                                 from './schemas/url-link'
import {
  MiniProgramPayload,
}                                 from './schemas/mini-program'

import {
  Puppet,
}                                 from './puppet'

class PuppetTest extends Puppet {

  public async start () : Promise<void> { return {} as any }
  public async stop ()  : Promise<void> { return {} as any }

  public async ding (data?: string)   : Promise<void> { return data as void }
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
  public async tagContactAdd (id: string, contactId: string) : Promise<void> { return void { contactId, id } }
  public async tagContactRemove (id: string, contactId: string) : Promise<void> { return void { contactId, id } }
  public async tagContactDelete (id: string) : Promise<void> { return void { id } }
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

  public async contactList ()                    : Promise<string[]> { return {} as any }

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
  public async friendshipAdd (contactId: string, hello?: string) : Promise<void> { return { contactId, hello } as any }
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

  public messageQueryFilterFactory (
    query: MessageQueryFilter,
  ): MessagePayloadFilterFunction {
    return super.messageQueryFilterFactory(query)
  }

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

  public reset (reason: string): void {
    return super.reset(reason)
  }

}

test('contactQueryFilterFunction()', async t => {

  const TEXT_REGEX = 'query by regex'
  const TEXT_TEXT  = 'query by text'

  const PAYLOAD_LIST: ContactPayload[] = [
    {
      alias  : TEXT_TEXT,
      avatar : 'mock',
      gender : ContactGender.Unknown,
      id     : 'id1',
      name   : TEXT_REGEX,
      type   : ContactType.Personal,
    },
    {
      alias  : TEXT_REGEX,
      avatar : 'mock',
      gender : ContactGender.Unknown,
      id     : 'id2',
      name   : TEXT_TEXT,
      type   : ContactType.Personal,
    },
    {
      alias  : TEXT_TEXT,
      avatar : 'mock',
      gender : ContactGender.Unknown,
      id     : 'id3',
      name   : TEXT_REGEX,
      type   : ContactType.Personal,
    },
    {
      alias  : TEXT_REGEX,
      avatar : 'mock',
      gender : ContactGender.Unknown,
      id     : 'id4',
      name   : TEXT_TEXT,
      type   : ContactType.Personal,
    },
  ]

  const REGEX_VALUE = new RegExp(TEXT_REGEX)
  const TEXT_VALUE  = TEXT_TEXT

  const puppet = new PuppetTest()

  t.test('filter name by regex', async t => {
    const QUERY   = { name: REGEX_VALUE }
    const ID_LIST = ['id1', 'id3']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter the query to id list')
  })

  t.test('filter name by text', async t => {
    const QUERY = { name: TEXT_VALUE }
    const ID_LIST = ['id2', 'id4']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  t.test('filter alias by regex', async t => {
    const QUERY = { alias: REGEX_VALUE }
    const ID_LIST = ['id2', 'id4']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  t.test('filter alias by text', async t => {
    const QUERY = { alias: TEXT_VALUE }
    const ID_LIST = ['id1', 'id3']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  t.test('filter contact existing id', async t => {
    const QUERY = { id: 'id1' }
    const ID_LIST = ['id1']

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list by id')
  })

  t.test('filter contact non-existing id', async t => {
    const QUERY = { id: 'fasdfsdfasfas' }
    const ID_LIST = [] as string[]

    const func = puppet.contactQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list by id')
  })

  t.test('throw if filter key unknown', async t => {
    t.throws(() => puppet.contactQueryFilterFactory({ xxxx: 'test' } as any), 'should throw')
  })

  t.test('throw if filter key are more than one', async t => {
    t.throws(() => puppet.contactQueryFilterFactory({
      alias : 'test',
      name  : 'test',
    }), 'should throw')
  })
})

test('roomQueryFilterFunction()', async t => {

  const TEXT_REGEX = 'query by regex'
  const TEXT_TEXT  = 'query by text'

  const PAYLOAD_LIST: RoomPayload[] = [
    {
      adminIdList : [],
      id           : 'id1',
      memberIdList : [],
      topic        : TEXT_TEXT,
    },
    {
      adminIdList : [],
      id           : 'id2',
      memberIdList : [],
      topic        : TEXT_REGEX,
    },
    {
      adminIdList : [],
      id           : 'id3',
      memberIdList : [],
      topic        : TEXT_TEXT,
    },
    {
      adminIdList : [],
      id           : 'id4',
      memberIdList : [],
      topic        : TEXT_REGEX,
    },
  ]

  const REGEX_VALUE = new RegExp(TEXT_REGEX)
  const TEXT_VALUE  = TEXT_TEXT

  const puppet = new PuppetTest()

  t.test('filter name by regex', async t => {
    const QUERY   = { topic: REGEX_VALUE }
    const ID_LIST = ['id2', 'id4']

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter the query to id list')
  })

  t.test('filter name by text', async t => {
    const QUERY = { topic: TEXT_VALUE }
    const ID_LIST = ['id1', 'id3']

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list by text')
  })

  t.test('filter name by existing id', async t => {
    const QUERY = { id: 'id4' }
    const ID_LIST = ['id4']

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list by id')
  })

  t.test('filter name by non-existing id', async t => {
    const QUERY = { id: 'fsdfasfasfsdfsaf' }
    const ID_LIST = [] as string[]

    const func = puppet.roomQueryFilterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list by id')
  })

  t.test('throw if filter key unknown', async t => {
    t.throws(() => puppet.roomQueryFilterFactory({ xxx: 'test' } as any), 'should throw')
  })

  t.test('throw if filter key are more than one', async t => {
    t.throws(() => puppet.roomQueryFilterFactory({
      alias: 'test',
      topic: 'test',
    } as any), 'should throw')
  })
})

test('contactRoomList()', async t => {
  const puppet = new PuppetTest()

  const sandbox = sinon.createSandbox()

  const CONTACT_ID_1 = 'contact-id-1'
  const CONTACT_ID_2 = 'contact-id-2'
  const CONTACT_ID_3 = 'contact-id-3'

  const ROOM_ID_1 = 'room-id-1'
  const ROOM_ID_2 = 'room-id-2'

  const ROOM_PAYLOAD_LIST: RoomPayload[] = [
    {
      adminIdList : [],
      id: ROOM_ID_1,
      memberIdList: [
        CONTACT_ID_1,
        CONTACT_ID_2,
      ],
      topic: 'room-topic-1',
    },
    {
      adminIdList : [],
      id: ROOM_ID_2,
      memberIdList: [
        CONTACT_ID_2,
        CONTACT_ID_3,
      ],
      topic: 'room-topic-2',
    },
  ]
  sandbox.stub(puppet, 'roomList').resolves(ROOM_PAYLOAD_LIST.map(payload => payload.id))
  sandbox.stub(puppet, 'roomPayload').callsFake(async roomId => {
    for (const payload of ROOM_PAYLOAD_LIST) {
      if (payload.id === roomId) {
        return payload
      }
    }
    throw new Error('no payload for room id ' + roomId)
  })

  const roomIdList1 = await puppet.contactRoomList(CONTACT_ID_1)
  const roomIdList2 = await puppet.contactRoomList(CONTACT_ID_2)
  const roomIdList3 = await puppet.contactRoomList(CONTACT_ID_3)

  t.deepEqual(roomIdList1, [ROOM_ID_1], 'should get room 1 for contact 1')
  t.deepEqual(roomIdList2, [ROOM_ID_1, ROOM_ID_2], 'should get room 1&2 for contact 2')
  t.deepEqual(roomIdList3, [ROOM_ID_2], 'should get room 2 for contact 3')
})

test('reset event throttle for reset()', async t => {
  const puppet = new PuppetTest({})

  const sandbox = sinon.createSandbox()

  const timer = sandbox.useFakeTimers()
  const reset = sandbox.stub(puppet, 'reset')

  puppet.emit('reset', 'testing')
  t.equal(reset.callCount, 1, 'should call reset() immediately')

  timer.tick(1000 - 1)
  puppet.emit('reset', 'testing 2')
  t.equal(reset.callCount, 1, 'should not call reset() again in the following 1 second')

  timer.tick(1000 + 1)
  puppet.emit('reset', 'testing 2')
  t.equal(reset.callCount, 2, 'should call reset() again after 1 second')

  sandbox.restore()
})

test('setMemory() memory without name', async t => {
  const puppet = new PuppetTest()
  const memory = new MemoryCard()

  t.doesNotThrow(() => puppet.setMemory(memory), 'should not throw when set a no-name memory first time ')
  t.doesNotThrow(() => puppet.setMemory(memory), 'should not throw when set a no-name memory second time')
})

test('setMemory() memory with a name', async t => {
  const puppet = new PuppetTest()
  const memory = new MemoryCard({ name: 'name' })

  t.doesNotThrow(() => puppet.setMemory(memory), 'should not throw when set a named memory first time ')
  t.throws(() => puppet.setMemory(memory), 'should throw when set a named memory second time')
})

test('messageQueryFilterFactory() one condition', async t => {
  const EXPECTED_TEXT1 = 'text'
  const EXPECTED_TEXT2 = 'regexp'
  const EXPECTED_TEXT3 = 'fdsafasdfsdakljhj;lds'
  const EXPECTED_ID1   = 'id1'

  const TEXT_QUERY_TEXT = EXPECTED_TEXT1
  const TEXT_QUERY_ID   = EXPECTED_ID1
  const TEXT_QUERY_RE = new RegExp(EXPECTED_TEXT2)

  const QUERY_TEXT: MessageQueryFilter = {
    text: TEXT_QUERY_TEXT,
  }

  const QUERY_RE: MessageQueryFilter = {
    text: TEXT_QUERY_RE,
  }

  const QUERY_ID: MessageQueryFilter = {
    id: TEXT_QUERY_ID,
  }

  const PAYLOAD_LIST = [
    {
      id: EXPECTED_ID1,
      text: EXPECTED_TEXT1,
    },
    {
      text: EXPECTED_TEXT2,
    },
    {
      text: EXPECTED_TEXT3,
    },
  ] as MessagePayload[]

  const puppet = new PuppetTest()

  let filterFuncText
  let resultPayload

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TEXT)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 1, 'should get one result')
  t.equal(resultPayload[0].text, EXPECTED_TEXT1, 'should get text1')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_RE)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 1, 'should get one result')
  t.equal(resultPayload[0].text, EXPECTED_TEXT2, 'should get text2')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_ID)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 1, 'should get one result')
  t.equal(resultPayload[0].id, EXPECTED_ID1, 'should get id1')
})

test('messageQueryFilterFactory() two condition', async t => {
  const EXPECTED_TEXT_DATA = 'data'
  const EXPECTED_TEXT_LINK = 'https://google.com'

  const EXPECTED_TYPE_URL = MessageType.Url
  const EXPECTED_TYPE_TEXT = MessageType.Text

  const QUERY_TEXT: MessageQueryFilter = {
    text: EXPECTED_TEXT_DATA,
  }

  const QUERY_TYPE: MessageQueryFilter = {
    type: EXPECTED_TYPE_URL,
  }

  const QUERY_TYPE_TEXT: MessageQueryFilter = {
    text: EXPECTED_TEXT_DATA,
    type: EXPECTED_TYPE_URL,
  }

  const PAYLOAD_LIST = [
    {
      text: EXPECTED_TEXT_DATA,
      type: MessageType.Text,
    },
    {
      text: EXPECTED_TEXT_DATA,
      type: MessageType.Url,
    },
    {
      text: EXPECTED_TEXT_LINK,
      type: MessageType.Text,
    },
    {
      text: EXPECTED_TEXT_LINK,
      type: MessageType.Url,
    },
  ] as MessagePayload[]

  const puppet = new PuppetTest()

  let filterFuncText
  let resultPayload

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TEXT)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 2, 'should get two result')
  t.equal(resultPayload[0].text, EXPECTED_TEXT_DATA, 'should get text data')
  t.equal(resultPayload[0].type, EXPECTED_TYPE_TEXT, 'should get type text')
  t.equal(resultPayload[1].text, EXPECTED_TEXT_DATA, 'should get text data')
  t.equal(resultPayload[1].type, EXPECTED_TYPE_URL, 'should get type url')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TYPE)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 2, 'should get two result')
  t.equal(resultPayload[0].text, EXPECTED_TEXT_DATA, 'should get text data')
  t.equal(resultPayload[0].type, EXPECTED_TYPE_URL, 'should get type url')
  t.equal(resultPayload[1].text, EXPECTED_TEXT_LINK, 'should get text link')
  t.equal(resultPayload[1].type, EXPECTED_TYPE_URL, 'should get type url ')

  filterFuncText = puppet.messageQueryFilterFactory(QUERY_TYPE_TEXT)
  resultPayload = PAYLOAD_LIST.filter(filterFuncText)
  t.equal(resultPayload.length, 1, 'should get one result')
  t.equal(resultPayload[0].text, EXPECTED_TEXT_DATA, 'should get text data')
  t.equal(resultPayload[0].type, EXPECTED_TYPE_URL, 'should get type url')
})
