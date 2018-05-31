#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'

import {
  FileBox,
}                 from 'file-box'
import {
  MemoryCard,
}                       from 'memory-card'
import {
  ContactPayload,
  ContactType,
  ContactGender,
  ContactPayloadFilterFactory,
}                               from '../puppet/schemas/contact'
import {
  // FriendRequestPayload,
}                               from '../puppet/schemas/friend-request'
import {
  MessagePayload,
}                               from '../puppet/schemas/message'
import {
  RoomPayload,
  RoomPayloadFilterFactory,
}                               from '../puppet/schemas/room'
import {
  Receiver,
}                               from '../puppet/schemas/puppet'

import {
  Puppet,
}                               from '../puppet/puppet'

class Fixture extends Puppet {
  public async start() : Promise<void> { return {} as any }
  public async stop()  : Promise<void> { return {} as any }

  public async ding(data?: any) : Promise<string> { return {data} as any }
  public async logout(): Promise<void> { return {} as any }

  /**
   *
   * Contact
   *
   */
  public async contactAlias(contactId: string)                       : Promise<string>
  public async contactAlias(contactId: string, alias: string | null) : Promise<void>
  public async contactAlias(contactId: string, alias?: string|null)  : Promise<string | void> { return {contactId, alias} as any }
  public async contactAvatar(contactId: string)                      : Promise<FileBox> { return {contactId} as any }
  public async contactList()                                         : Promise<string[]> { return {} as any }

  public async contactRawPayload(id: string)            : Promise<any> { return {id} as any }
  public async contactRawPayloadParser(rawPayload: any) : Promise<ContactPayload> { return {rawPayload} as any }

  /**
   *
   * FriendRequest
   *
   */
  public async friendRequestSend(contactId: string, hello?: string)   : Promise<void> { return {contactId, hello} as any }
  public async friendRequestAccept(contactId: string, ticket: string) : Promise<void> { return {contactId, ticket} as any }

  /**
   *
   * Message
   *
   */
  public async messageFile(messageId: string)                  : Promise<FileBox> { return {messageId} as any }
  public async messageForward(to: Receiver, messageId: string) : Promise<void> { return {to, messageId} as any }
  public async messageSendText(to: Receiver, text: string)     : Promise<void> { return {to, text} as any }
  public async messageSendFile(to: Receiver, file: FileBox)    : Promise<void> { return {to, file} as any }

  public async messageRawPayload(id: string)            : Promise<any> { return {id} as any }
  public async messageRawPayloadParser(rawPayload: any) : Promise<MessagePayload> { return {rawPayload} as any }

  /**
   *
   * Room
   *
   */
  public async roomAdd(roomId: string, contactId: string)          : Promise<void> { return {roomId, contactId} as any }
  public async roomCreate(contactIdList: string[], topic?: string) : Promise<string> { return {contactIdList, topic} as any }
  public async roomDel(roomId: string, contactId: string)          : Promise<void> { return {roomId, contactId} as any }
  public async roomQuit(roomId: string)                            : Promise<void> { return {roomId} as any }
  public async roomTopic(roomId: string, topic?: string)           : Promise<string | void> { return {roomId, topic} as any }

  public async roomList() : Promise<string[]> { return {} as any }

  public async roomRawPayload(id: string)            : Promise<any> { return {id} as any }
  public async roomRawPayloadParser(rawPayload: any) : Promise<RoomPayload> { return {rawPayload} as any }

}

test('contactQueryFilterFunction()', async t => {

  const TEXT_REGEX = 'query by regex'
  const TEXT_TEXT  = 'query by text'

  const PAYLOAD_LIST: ContactPayload[] = [
    {
      id     : 'id1',
      gender : ContactGender.Unknown,
      type   : ContactType.Personal,
      name   : TEXT_REGEX,
      alias  : TEXT_TEXT,
    },
    {
      id     : 'id2',
      gender : ContactGender.Unknown,
      type   : ContactType.Personal,
      name   : TEXT_TEXT,
      alias  : TEXT_REGEX,
    },
    {
      id     : 'id3',
      gender : ContactGender.Unknown,
      type   : ContactType.Personal,
      name   : TEXT_REGEX,
      alias  : TEXT_TEXT,
    },
    {
      id     : 'id4',
      gender : ContactGender.Unknown,
      type   : ContactType.Personal,
      name   : TEXT_TEXT,
      alias  : TEXT_REGEX,
    },
  ]

  const REGEX_VALUE = new RegExp(TEXT_REGEX)
  const TEXT_VALUE  = TEXT_TEXT

  const puppet = new Fixture({ memory: new MemoryCard })
  const filterFactory: ContactPayloadFilterFactory = (puppet as any).contactQueryFilterFactory

  t.test('filter name by regex', async t => {
    const QUERY   = { name: REGEX_VALUE }
    const ID_LIST = ['id1', 'id3']

    const func = filterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter the query to id list')
  })

  t.test('filter name by text', async t => {
    const QUERY = { name: TEXT_VALUE }
    const ID_LIST = ['id2', 'id4']

    const func = filterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  t.test('filter alias by regex', async t => {
    const QUERY = { alias: REGEX_VALUE }
    const ID_LIST = ['id2', 'id4']

    const func = filterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  t.test('filter alias by text', async t => {
    const QUERY = { alias: TEXT_VALUE }
    const ID_LIST = ['id1', 'id3']

    const func = filterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  t.test('throw if filter key unknown', async t => {
    t.throws(() => filterFactory({ xxxx: 'test' } as any), 'should throw')
  })

  t.test('throw if filter key are more than one', async t => {
    t.throws(() => filterFactory({
      name: 'test',
      alias: 'test',
    }), 'should throw')
  })
})

test('roomQueryFilterFunction()', async t => {

  const TEXT_REGEX = 'query by regex'
  const TEXT_TEXT  = 'query by text'

  const DUMMY = {
    memberIdList    : {} as any,
    nameMap         : {} as any,
    roomAliasMap    : {} as any,
    contactAliasMap : {} as any,
  }

  const PAYLOAD_LIST: RoomPayload[] = [
    {
      id     : 'id1',
      topic  : TEXT_TEXT,
      ...DUMMY,
    },
    {
      id     : 'id2',
      topic  : TEXT_REGEX,
      ...DUMMY,
    },
    {
      id     : 'id3',
      topic  : TEXT_TEXT,
      ...DUMMY,
    },
    {
      id     : 'id4',
      topic  : TEXT_REGEX,
      ...DUMMY,
    },
  ]

  const REGEX_VALUE = new RegExp(TEXT_REGEX)
  const TEXT_VALUE  = TEXT_TEXT

  const puppet = new Fixture({ memory: new MemoryCard() })
  const filterFactory: RoomPayloadFilterFactory = (puppet as any).roomQueryFilterFactory

  t.test('filter name by regex', async t => {
    const QUERY   = { topic: REGEX_VALUE }
    const ID_LIST = ['id1', 'id3']

    const func = filterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter the query to id list')
  })

  t.test('filter name by text', async t => {
    const QUERY = { topic: TEXT_VALUE }
    const ID_LIST = ['id2', 'id4']

    const func = filterFactory(QUERY)
    const idList = PAYLOAD_LIST.filter(func).map(payload => payload.id)
    t.deepEqual(idList, ID_LIST, 'should filter query to id list')
  })

  t.test('throw if filter key unknown', async t => {
    t.throws(() => filterFactory({ xxxx: 'test' } as any), 'should throw')
  })

  t.test('throw if filter key are more than one', async t => {
    t.throws(() => filterFactory({
      topic: 'test',
      alias: 'test',
    } as any), 'should throw')
  })
})
