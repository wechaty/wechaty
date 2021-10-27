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

  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,

  ScanStatus,
  YOU,
}                       from '../schemas/mod.js'

export type {
  PuppetEventName,
  ChatEventName,
  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,
}
export {
  ContactGender,
  ContactType         as Contact,
  FriendshipSceneType as FriendshipScene,
  FriendshipType      as Friendship,
  ImageType           as Image,
  MessageType         as Message,
}

export {
  ScanStatus,
  YOU,
}

export type {
  FriendshipAddOptions,
}
