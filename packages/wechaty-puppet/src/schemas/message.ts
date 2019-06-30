export enum MessageType {
  Unknown = 0,

  Attachment,     // Attach(6),
  Audio,          // Audio(1), Voice(34)
  Contact,        // ShareCard(42)
  ChatHistory,    // ChatHistory(19)
  Emoticon,       // Sticker: Emoticon(15), Emoticon(47)
  Image,          // Img(2), Image(3)
  Text,           // Text(1)
  Location,       // Location(48)
  MiniProgram,    // MiniProgram(33)
  Money,          // Transfers(2000), RedEnvelopes(2001),
  Recalled,       // Recalled(10002)
  Url,            // Url(5)
  Video,          // Video(4), Video(43)
}

/**
 * @private
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
 * @private
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
  SysNotice         = 9999,
  Sys               = 10000,
  Recalled          = 10002,
}

/** @hidden */
export interface MessagePayloadBase {
  id            : string,

  // use message id to get rawPayload to get those informations when needed
  // contactId?    : string,        // Contact ShareCard
  mentionIdList?: string[],   // Mentioned Contacts' Ids

  filename?     : string,
  text?         : string,
  timestamp     : number,        // Unix Timestamp(in seconds)
  type          : MessageType,
}

/** @hidden */
export interface MessagePayloadRoom {
  fromId?       : string,
  roomId        : string,
  toId?         : string,   // if to is not set, then room must be set
}
/** @hidden */
export interface MessagePayloadTo {
  fromId        : string,
  roomId?       : string,
  toId          : string,   // if to is not set, then room must be set
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
