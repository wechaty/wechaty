import type {
  FriendshipAddOptions,
  PuppetEventName,
  ChatEventName,
}                           from '../schemas/mod.js'
import {
  ContactGender,
  ContactType,
  FriendshipSceneType,
  FriendshipType,
  ImageType,
  MessageType,
  PayloadType,

  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,

  ScanStatus,
  YOU,
}                       from '../schemas/mod.js'

export type {
  PuppetEventName,
  ChatEventName,
}
export {
  ContactGender,
  ContactType         as Contact,
  FriendshipSceneType as FriendshipScene,
  FriendshipType      as Friendship,
  ImageType           as Image,
  MessageType         as Message,
  PayloadType         as Payload,
}

export {
  ScanStatus,
  YOU,
  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,
}

export type {
  FriendshipAddOptions,
}
