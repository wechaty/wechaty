/**
 * Fake payload generators for the mocker: contacts, rooms, messages, images
 * and sentences, built with `@faker-js/faker` and `crypto.randomUUID()` IDs.
 */
import { faker } from '@faker-js/faker'

import * as PUPPET from 'wechaty-puppet'
import {
  FileBox,
}               from 'file-box'
import { WECHATY_ICON_PNG_BASE64 } from './default-avatar.ts'

const generateContactPayload = (): PUPPET.payloads.Contact => ({
  address   : faker.location.streetAddress(),
  alias     : undefined,
  avatar    : faker.image.avatar(),
  city      : faker.location.city(),
  friend    : true,
  gender    : PUPPET.types.ContactGender.Male,
  id        : crypto.randomUUID(),
  name      : faker.person.fullName(),
  phone     : [
    faker.phone.number(),
  ],
  province  : faker.location.state(),
  signature : faker.lorem.sentence(),
  star      : false,
  type      : PUPPET.types.Contact.Individual,
  weixin    : undefined,
})

const generateImageFileBox = (): FileBox => FileBox.fromBase64(WECHATY_ICON_PNG_BASE64, 'avatar.png')

const generateRoomPayload = (...contactIdList: string[]): PUPPET.payloads.Room => {
  const maxNum = Math.max(500, contactIdList.length)
  const roomNum = Math.floor(maxNum * Math.random())

  const shuffledList = contactIdList.sort(() => Math.random() - 0.5)
  const memberIdList = shuffledList.slice(0, roomNum)

  const payload: PUPPET.payloads.Room = {
    adminIdList  : [],
    avatar       : faker.image.avatar(),
    id           : crypto.randomUUID() + '@chatroom',
    memberIdList,
    ownerId      : undefined,
    topic        : faker.lorem.word(),
  }
  return payload
}

const generateMessagePayloadTo = (): PUPPET.payloads.MessageBase & PUPPET.payloads.MessageTo => ({
  id         : crypto.randomUUID(),
  listenerId : crypto.randomUUID(),
  talkerId   : crypto.randomUUID(),
  text       : faker.lorem.sentence(),
  timestamp  : Date.now(),
  type       : PUPPET.types.Message.Text,
})

const generateMessagePayloadRoom = (): PUPPET.payloads.MessageBase & PUPPET.payloads.MessageRoom => ({
  id            : crypto.randomUUID(),
  mentionIdList : [],
  roomId        : crypto.randomUUID() + '@chatroom',
  talkerId      : crypto.randomUUID(),
  text          : faker.lorem.sentence(),
  timestamp     : Date.now(),
  type          : PUPPET.types.Message.Text,
})

const generateSentence = (): string => faker.lorem.sentence()

export {
  generateContactPayload,
  generateImageFileBox,
  generateMessagePayloadRoom,
  generateMessagePayloadTo,
  generateRoomPayload,
  generateSentence,
}
