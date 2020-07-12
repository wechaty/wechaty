/* eslint-disable sort-keys */
import {
  Wechaty,
  Message,
}               from 'wechaty'
import {
  PuppetMock,
}               from './puppet-mock'

import {
  Mocker,
}                       from './mocker/mod'
import { MockContact }  from './mocker/user/mock-contact'
import { MockRoom }     from './mocker/user/mock-room'

interface Fixture {
  wechaty: Wechaty,
  mocker: Mocker,

  message: Message,
  moList: Message[],
  mtList: Message[],

  user: MockContact,
  mary: MockContact,
  mike: MockContact,

  room: MockRoom,
}

async function * createFixture (): AsyncGenerator<Fixture> {
  const mocker = new Mocker()
  const puppet = new PuppetMock({ mocker })
  const wechaty = new Wechaty({ puppet })

  await wechaty.start()

  const [user, mike, mary] = mocker.createContacts(3)
  mocker.login(user)

  const room = mocker.createRoom({
    memberIdList: [
      user.id,
      mike.id,
      mary.id,
    ],
  })

  const messageFuture = new Promise<Message>(resolve => wechaty.once('message', resolve))
  mike.say().to(room)
  const message = await messageFuture

  // Mobile Terminated
  const mtList = [] as Message[]
  const recordMobileTerminatedMessage = (message: Message) => {
    if (!message.self()) {
      mtList.push(message)
    }
  }
  wechaty.on('message', recordMobileTerminatedMessage)

  // Mobile Originated
  const moList = [] as Message[]
  const recordMobileOriginatedMessage = (message: Message) => {
    if (message.self()) {
      moList.push(message)
    }
  }
  wechaty.on('message', recordMobileOriginatedMessage)

  yield {
    wechaty,
    mocker,
    message,
    moList,
    mtList,
    user,
    mary,
    mike,
    room,
  }

  await wechaty.stop()
}

export { createFixture }
