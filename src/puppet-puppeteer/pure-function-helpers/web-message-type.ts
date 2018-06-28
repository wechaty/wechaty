import {
  WebMessageType,
}                         from '../web-schemas'

import {
  MessageType,
}                 from 'wechaty-puppet'

export function webMessageType(webMsgType: WebMessageType): MessageType {
  switch (webMsgType) {
    case WebMessageType.TEXT:
      return MessageType.Text

    case WebMessageType.EMOTICON:
    case WebMessageType.IMAGE:
      return MessageType.Image

    case WebMessageType.VOICE:
      return MessageType.Audio

    case WebMessageType.MICROVIDEO:
    case WebMessageType.VIDEO:
      return MessageType.Video

    case WebMessageType.TEXT:
      return MessageType.Text

    /**
     * Treat those Types as TEXT
     *
     * Friendship is a SYS message
     * FIXME: should we use better message type at here???
     */
    case WebMessageType.SYS:
    case WebMessageType.APP:
      return MessageType.Text

    // VERIFYMSG           = 37,
    // POSSIBLEFRIEND_MSG  = 40,
    // SHARECARD           = 42,
    // LOCATION            = 48,
    // VOIPMSG             = 50,
    // STATUSNOTIFY        = 51,
    // VOIPNOTIFY          = 52,
    // VOIPINVITE          = 53,
    // SYSNOTICE           = 9999,
    // RECALLED            = 10002,
    default:
      return MessageType.Text
  }
}
