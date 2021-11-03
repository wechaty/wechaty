/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import {
  FileBox,
  FileBoxInterface,
}                       from 'file-box'
import * as PUPPET from 'wechaty-puppet'
import { log } from 'wechaty-puppet'

import type {
  Contact,
  Delay,
  Location,
  Message,
  MiniProgram,
  Post,
  UrlLink,
}                           from '../user-modules/mod.js'

import type {
  Wechaty,
}                           from './wechaty-interface.js'

import {
  ContactImpl,
  MessageImpl,
  DelayImpl,
  UrlLinkImpl,
  MiniProgramImpl,
  PostImpl,
  LocationImpl,
}                     from '../user-modules/mod.js'

type Sayable =
  | Contact
  | Delay
  | FileBoxInterface
  | Location
  | Message
  | MiniProgram
  | number
  | Post
  | string
  | UrlLink

interface SayableSayer {
  id      : string,
  wechaty : Wechaty,
  say (
    sayable  : Sayable,
    replyTo? : Contact | Contact[]
  ): Promise<void | Message>
}

/**
 * TODO: add unit test to ensure the interface validation code works
 */
const deliverSayableConversationPuppet = (puppet: PUPPET.impl.Puppet) => (conversationId: string) => async (sayable: Sayable) => {
  let msgId: string | void

  if (!(sayable instanceof Object)) {
    if (typeof sayable === 'number') {
      sayable = String(sayable)
    }

    msgId = await puppet.messageSendText(
      conversationId,
      sayable,
    )
    return msgId
  }

  /**
   * Huan(202110): Checking `looseInstanceOf` is enough for the following types:
   *  so we do not check `interfaceOfClass` anymore because it will consume more resources.
   */
  if (FileBox.valid(sayable)) {
    /**
     * 1. File
     */
    msgId = await puppet.messageSendFile(
      conversationId,
      sayable,
    )
  } else if (MessageImpl.validInstance(sayable)) {
    /**
     * 2. Message
     */
    msgId = await puppet.messageForward(
      conversationId,
      sayable.id,
    )
  } else if (ContactImpl.validInstance(sayable)) {
    /**
     * 3. Contact
     */
    msgId = await puppet.messageSendContact(
      conversationId,
      sayable.id,
    )
  } else if (UrlLinkImpl.validInstance(sayable)) {
    /**
     * 4. Link Message
     */
    msgId = await puppet.messageSendUrl(
      conversationId,
      sayable.payload,
    )
  } else if (MiniProgramImpl.validInstance(sayable)) {
    /**
     * 5. Mini Program
     */
    msgId = await puppet.messageSendMiniProgram(
      conversationId,
      sayable.payload,
    )
  } else if (LocationImpl.validInstance(sayable)) {
    /**
     * 6. Location
     */
    msgId = await puppet.messageSendLocation(
      conversationId,
      sayable.payload,
    )
  } else if (DelayImpl.validInstance(sayable)) {
    /**
     * 7. Delay for a while
     */
    await sayable.wait()
  } else if (PostImpl.validInstance(sayable)) {
    /**
     * 8. Post
     */
    msgId = await puppet.messageSendPost(
      conversationId,
      sayable.payload,
    )
  } else {
    throw new Error('unsupported arg: ' + sayable)
  }

  return msgId
}

async function toSayable (
  message: Message,
): Promise<undefined | Sayable> {
  log.verbose('Wechaty', 'toSayable()')
  const type = message.type()
  switch (type) {
    case PUPPET.type.Message.Text:
      return message.text()

    case PUPPET.type.Message.Image:
    case PUPPET.type.Message.Attachment:
    case PUPPET.type.Message.Audio:
    case PUPPET.type.Message.Video:
    case PUPPET.type.Message.Emoticon:
      return message.toFileBox()

    case PUPPET.type.Message.Contact:
      return message.toContact()

    case PUPPET.type.Message.Url:
      return message.toUrlLink()

    case PUPPET.type.Message.MiniProgram:
      return message.toMiniProgram()

    case PUPPET.type.Message.Location:
      return message.toLocation()

    default:
      log.warn('Wechaty',
        'toSayable() can not convert not re-sayable type: %s(%s) for %s\n%s',
        PUPPET.type.Message[type],
        type,
        message,
        new Error().stack,
      )
      return undefined
  }
}

export {
  deliverSayableConversationPuppet,
  toSayable,
}
export type {
  SayableSayer,
  Sayable,
}
