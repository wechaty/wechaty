import { toJson } from 'xml2json'

import { PadchatMessagePayload } from '../padchat-schemas'

import {
  isContactId,
  isPayload,
}               from './is-type'

/**
 *
 * 1. Friendship Confirm Event
 *
 */
const FRIENDSHIP_CONFIRM_REGEX_LIST = [
  /^You have added (.+) as your WeChat contact. Start chatting!$/,
  /^你已添加了(.+)，现在可以开始聊天了。$/,
  /I've accepted your friend request. Now let's chat!$/,
  /^(.+) just added you to his\/her contacts list. Send a message to him\/her now!$/,
  /^(.+)刚刚把你添加到通讯录，现在可以开始聊天了。$/,
]

export function friendshipConfirmEventMessageParser(
  rawPayload: PadchatMessagePayload,
): null | string {

  if (!isPayload(rawPayload)) {
    return null
  }

  let   matches = null as null | string[]
  const text    = rawPayload.content

  FRIENDSHIP_CONFIRM_REGEX_LIST.some(
    regexp => {
      matches = text.match(regexp)
      return !!matches
    },
  )

  if (!matches) {
    return null
  }

  return rawPayload.from_user
}

/**
 *
 * 2. Friendship Receive Event
 *
 */

export function friendshipReceiveEventMessageParser(
  rawPayload: PadchatMessagePayload,
): null | string {

  if (!isPayload(rawPayload)) {
    return null
  }

  interface XmlSchema {
    msg: {
      fromusername: string,
      encryptusername: string,
      content: string,
      ticket: string,
    }
  }

  try {
    const jsonPayload: XmlSchema = JSON.parse(
      toJson(
        rawPayload.content,
      ),
    )

    const contactId = jsonPayload.msg.fromusername

    if (isContactId(contactId)) {
      return contactId
    }

  } catch (e) {
    // not receive event
  }
  return null
}

/**
 *
 * 3. Friendship Verify Event
 *
 */
const FRIENDSHIP_VERIFY_REGEX_LIST = [
  /^(.+) has enabled Friend Confirmation/,
  /^(.+)开启了朋友验证，你还不是他（她）朋友。请先发送朋友验证请求，对方验证通过后，才能聊天。/,
]

export function friendshipVerifyEventMessageParser(
  rawPayload: PadchatMessagePayload,
): null | string {

  if (!isPayload(rawPayload)) {
    return null
  }

  let   matches = null as null | string[]
  const text    = rawPayload.content

  FRIENDSHIP_VERIFY_REGEX_LIST.some(
    regexp => {
      matches = text.match(regexp)
      return !!matches
    },
  )

  if (!matches) {
    return null
  }

  return rawPayload.from_user
}
