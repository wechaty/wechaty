/**
 * Wechaty Puppet Unified Schema for Message
 */
export enum MessageType {
  Unknown = 0,

  Attachment  = 1,    // Attach(6),
  Audio       = 2,    // Audio(1), Voice(34)
  Contact     = 3,    // ShareCard(42)
  ChatHistory = 4,    // ChatHistory(19)
  Emoticon    = 5,    // Sticker: Emoticon(15), Emoticon(47)
  Image       = 6,    // Img(2), Image(3)
  Text        = 7,    // Text(1)
  Location    = 8,    // Location(48)
  MiniProgram = 9,    // MiniProgram(33)
  GroupNote   = 10,   // GroupNote(53)
  Transfer    = 11,   // Transfers(2000)
  RedEnvelope = 12,   // RedEnvelopes(2001)
  Recalled    = 13,   // Recalled(10002)
  Url         = 14,   // Url(5)
  Video       = 15,   // Video(4), Video(43)
  Post        = 16,   // Moment, Channel, Tweet, etc
}

/**
 * Huan(202001): Wechat Server Message Type Value (to be confirmed.)
 */
export enum WechatAppMessageType {
  Text                  = 1,
  Img                   = 2,
  Audio                 = 3,
  Video                 = 4,
  Url                   = 5,
  Attach                = 6,
  Open                  = 7,
  Emoji                 = 8,
  VoiceRemind           = 9,
  ScanGood              = 10,
  Good                  = 13,
  Emotion               = 15,
  CardTicket            = 16,
  RealtimeShareLocation = 17,
  ChatHistory           = 19,
  MiniProgram           = 33,
  Transfers             = 2000,
  RedEnvelopes          = 2001,
  ReaderType            = 100001,
}

/**
 * Wechat Server Message Type Value (to be confirmed)
 *  Huan(202001): The Windows(PC) DLL match the following numbers.
 *
 * Huan(202111): 17(RealTimeLocation) & 6 (File) ?
 *  @see https://zhuanlan.zhihu.com/p/22474033
 */
export enum WechatMessageType {
  Text              = 1,
  Image             = 3,
  Voice             = 34,
  VerifyMsg         = 37,
  PossibleFriendMsg = 40,
  ShareCard         = 42,
  Video             = 43,
  Emoticon          = 47,
  Location          = 48,
  App               = 49,
  VoipMsg           = 50,
  StatusNotify      = 51,
  VoipNotify        = 52,
  VoipInvite        = 53,
  MicroVideo        = 62,
  Transfer          = 2000, // 转账
  RedEnvelope       = 2001, // 红包
  MiniProgram       = 2002, // 小程序
  GroupInvite       = 2003, // 群邀请
  File              = 2004, // 文件消息
  SysNotice         = 9999,
  Sys               = 10000,
  Recalled          = 10002,  // NOTIFY 服务通知
}

/** @hidden */
export interface MessagePayloadBase {
  id            : string,

  /**
   * Huan(202203): replace `fromId` by `talkerId`, `toId` by `listenerId` #187
   *  @link https://github.com/wechaty/puppet/issues/187
   */
  talkerId: string,

  filename?     : string,
  text?         : string,
  timestamp     : number,       // Huan(202001): we support both seconds & milliseconds in Wechaty now.
  type          : MessageType,
}

/** @hidden */
export interface MessagePayloadRoom {
  /**
   * Huan(202203): `toId` will be removed with v2.0
   *  replace `toId` by `listenerId`
   *  @link https://github.com/wechaty/puppet/issues/187
   *
   * @deprecated use `listenerId` instead
   */
   toId?: string,
   listenerId?: string

   /**
   * Huan(202203): `fromId` will be removed with v2.0
   *  replace `fromId` by `talkerId`
   *  @link https://github.com/wechaty/puppet/issues/187
   *
   * @deprecated use `talkerId` instead
   */
  fromId?       : string,

  mentionIdList?: string[],   // Mentioned Contacts' Ids
  roomId        : string,
}

/** @hidden */
export interface MessagePayloadTo {
  /**
   * Huan(202203): `fromId` will be removed with v2.0
   *  replace `fromId` by `talkerId`
   *  @link https://github.com/wechaty/puppet/issues/187
   *
   * @deprecated use `talkerId` instead
   */
  fromId?: string

  roomId?: string
  /**
   * Huan(202203): `toId` will be removed with v2.0
   *  replace `toId` by `listenerId`
   *  @link https://github.com/wechaty/puppet/issues/187
   *
   * @deprecated use `listenerId` instead
   */
  toId?: string
  listenerId: string  // if to is not set, then room must be set
}

export type MessagePayload = MessagePayloadBase
                            & (
                                MessagePayloadRoom
                              | MessagePayloadTo
                            )

export interface MessageQueryFilter {
  fromId? : string,
  id?     : string,
  roomId? : string
  text?   : string | RegExp,
  toId?   : string,
  type?   : MessageType,
}

/** @hidden */
export type MessagePayloadFilterFunction = (payload: MessagePayload)    => boolean

/** @hidden */
export type MessagePayloadFilterFactory  = (query: MessageQueryFilter)  => MessagePayloadFilterFunction
