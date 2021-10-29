import faker from 'faker'
import cuid  from 'cuid'

import * as PUPPET from 'wechaty-puppet'
import {
  FileBox,
}               from 'file-box'

const generateContactPayload = (): PUPPET.payload.Contact => ({
  address   : faker.address.streetAddress(),
  alias     : undefined,
  avatar    : faker.image.avatar(),
  city      : faker.address.city(),
  friend    : true,
  gender    : PUPPET.type.ContactGender.Male,
  id        : cuid(),
  name      : faker.name.findName(),
  phone     : [
    faker.phone.phoneNumber(),
  ],
  province  : faker.address.state(),
  signature : faker.lorem.sentence(),
  star      : false,
  type      : PUPPET.type.Contact.Individual,
  weixin    : undefined,
})

const generateImageFileBox = (): FileBox => FileBox.fromUrl(faker.image.avatar())

const generateRoomPayload = (...contactIdList: string[]): PUPPET.payload.Room => {
  const maxNum = Math.max(500, contactIdList.length)
  const roomNum = Math.floor(maxNum * Math.random())

  const shuffledList = contactIdList.sort(() => Math.random() - 0.5)
  const memberIdList = shuffledList.slice(0, roomNum)

  const payload: PUPPET.payload.Room = {
    adminIdList  : [],
    avatar       : faker.image.avatar(),
    id           : cuid() + '@chatroom',
    memberIdList,
    ownerId      : undefined,
    topic        : faker.lorem.word(),
  }
  return payload
}

const generateMessagePayloadTo = (): PUPPET.payload.MessageBase & PUPPET.payload.MessageTo => ({
  fromId        : cuid(),
  id            : cuid(),
  text          : faker.lorem.sentence(),
  timestamp     : Date.now(),
  toId          : cuid(),
  type          : PUPPET.type.Message.Text,
})

const generateMessagePayloadRoom = (): PUPPET.payload.MessageBase & PUPPET.payload.MessageRoom => ({
  fromId        : cuid(),
  id            : cuid(),
  mentionIdList : [],
  roomId        : cuid() + '@chatroom',
  text          : faker.lorem.sentence(),
  timestamp     : Date.now(),
  type          : PUPPET.type.Message.Text,
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
