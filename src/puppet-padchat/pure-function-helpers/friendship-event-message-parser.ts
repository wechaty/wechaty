// import {
//   YOU,
// }         from '../../puppet/'

import { PadchatMessagePayload } from '../padchat-schemas'

export function friendshipConfirmEventMessageParser(rawPayload: PadchatMessagePayload): null | string {
  const FRIENDSHIP_CONFIRM_REGEX_LIST = [
    /^You have added (.+) as your WeChat contact. Start chatting!$/,
    /^你已添加了(.+)，现在可以开始聊天了。$/,
    /^(.+) just added you to his\/her contacts list. Send a message to him\/her now!$/,
    /^(.+)刚刚把你添加到通讯录，现在可以开始聊天了。$/,
  ]

  let matches: null | RegExpMatchArray = null as any
  const text = rawPayload.content

  FRIENDSHIP_CONFIRM_REGEX_LIST.some(
    regexp => {
      matches = text.match(regexp)
      return !!matches
    },
  )

  if (!matches) {
    return null
  }

  return matches[0]
}

export function friendshipReceiveEventMessageParser(
  rawPayload: PadchatMessagePayload,
): null | string {
  return null
}

export function friendshipVerifyEventMessageParser(
  rawPayload: PadchatMessagePayload,
): null | string {
  return null
}
