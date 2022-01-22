import {
  type FriendshipAddOptions,
  type PuppetEventName,
  type ChatEventName,
  ContactGender,
  ContactType,
  DirtyType,
  FriendshipSceneType,
  FriendshipType,
  ImageType,
  MessageType,
  PostType,
  TapType,
  sayableTypes,

  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,

  ScanStatus,
  YOU,
}                       from '../schemas/mod.js'

export {
  type PuppetEventName,
  type ChatEventName,
  ContactGender,
  ContactType         as Contact,
  FriendshipSceneType as FriendshipScene,
  FriendshipType      as Friendship,
  ImageType           as Image,
  MessageType         as Message,
  PostType            as Post,
  TapType             as Tap,
  sayableTypes        as Sayable,
  /**
   * Huan(202201): `DirtyType as Payload` will be removed after Dec 31, 2023
   * @deprecated: use Dirty instead of Payload
   */
  DirtyType           as Payload,
  DirtyType           as Dirty,
}

export {
  ScanStatus,
  type FriendshipAddOptions,
  YOU,
  CHAT_EVENT_DICT,
  PUPPET_EVENT_DICT,
}
