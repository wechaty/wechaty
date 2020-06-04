import faker from 'faker'
import cuid from 'cuid'

import {
  ContactPayload,
  ContactGender,
  ContactType,
  FileBox,
  MessageType,
  RoomPayload,
}                   from 'wechaty-puppet'

import {
  MessagePayloadRoom,
  MessagePayloadTo,
  MessagePayloadBase,
}                       from 'wechaty-puppet/dist/src/schemas/message'

const generateContactPayload = (): ContactPayload => ({
  address   : faker.address.streetAddress(),
  alias     : undefined,
  avatar    : faker.image.avatar(),
  city      : faker.address.city(),
  friend    : true,
  gender    : ContactGender.Male,
  id        : cuid(),
  name      : faker.name.findName(),
  province  : faker.address.state(),
  signature : faker.lorem.sentence(),
  star      : false,
  type      : ContactType.Personal,
  weixin    : undefined,
})

const generateImageFileBox = (): FileBox => FileBox.fromUrl(faker.image.avatar())

const generateRoomPayload = (...contactIdList: string[]): RoomPayload => {
  const maxNum = Math.max(500, contactIdList.length)
  const roomNum = Math.floor(maxNum * Math.random())

  const shuffledList = contactIdList.sort(() => Math.random() - 0.5)
  const memberIdList = shuffledList.slice(0, roomNum)

  const payload: RoomPayload = {
    adminIdList  : [],
    avatar       : faker.image.avatar(),
    id           : cuid() + '@chatroom',
    memberIdList,
    ownerId      : undefined,
    topic        : faker.lorem.word(),
  }
  return payload
}

const generateMessagePayloadTo = (): MessagePayloadBase & MessagePayloadTo => ({
  fromId        : cuid(),
  id            : cuid(),
  text          : faker.lorem.sentence(),
  timestamp     : Date.now(),
  toId          : cuid(),
  type          : MessageType.Text,
})

const generateMessagePayloadRoom = (): MessagePayloadBase & MessagePayloadRoom => ({
  fromId        : cuid(),
  id            : cuid(),
  mentionIdList : [],
  roomId        : cuid() + '@chatroom',
  text          : faker.lorem.sentence(),
  timestamp     : Date.now(),
  type          : MessageType.Text,
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
