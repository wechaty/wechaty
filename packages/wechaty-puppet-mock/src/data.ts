import faker from 'faker'
import cuid from 'cuid'

import {
  ContactPayload,
  ContactGender,
  ContactType,
  FileBox,
  MessageType,
}                   from 'wechaty-puppet'
import { MessagePayloadRoom, MessagePayloadTo, MessagePayloadBase } from 'wechaty-puppet/dist/src/schemas/message'

export const getFakeContactPayload = (): ContactPayload => ({
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

export const getFakeImageFileBox = (): FileBox => FileBox.fromUrl(faker.image.avatar())

export const getFakeMessagePayloadTo = (): MessagePayloadBase & MessagePayloadTo => ({
  fromId        : cuid(),
  id            : cuid(),
  mentionIdList : [],
  text          : faker.lorem.sentence(),
  timestamp     : Date.now(),
  toId          : cuid(),
  type          : MessageType.Text,
})

export const getFakeMessagePayloadRoom = (): MessagePayloadBase & MessagePayloadRoom => ({
  fromId        : cuid(),
  id            : cuid(),
  mentionIdList : [],
  roomId        : cuid() + '@chatroom',
  text          : faker.lorem.sentence(),
  timestamp     : Date.now(),
  type          : MessageType.Text,
})

export interface MockMessagePayloadOptions {
  fromId: string,
  toId: string,
}

export function getMessagePayload (options: MockMessagePayloadOptions): MessagePayloadBase & MessagePayloadTo
export function getMessagePayload (): {
  messagePayload: MessagePayloadBase & MessagePayloadTo,
  fromContactPayload: ContactPayload,
  toContactPayload: ContactPayload,
}

export function getMessagePayload (options?: MockMessagePayloadOptions) {
  const messagePayload = getFakeMessagePayloadTo()

  if (options) {
    messagePayload.fromId = options.fromId
    messagePayload.toId = options.toId

    return messagePayload
  }

  const fromContactPayload = getFakeContactPayload()
  const toContactPayload = getFakeContactPayload()
  messagePayload.fromId = fromContactPayload.id
  messagePayload.toId = toContactPayload.id

  return {
    fromContactPayload,
    messagePayload,
    toContactPayload,
  }
}
