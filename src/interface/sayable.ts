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
import { FileBox, FileBoxInterface } from 'file-box'
import type { PuppetInterface } from 'wechaty-puppet'

import type {
  Contact,
  Location,
  Message,
  MiniProgram,
  Sleeper,
  UrlLink,
}                           from '../user/mod.js'

import type {
  Wechaty,
}                           from './wechaty-interface.js'

import {
  ContactImpl,
  MessageImpl,
  SleeperImpl,
  UrlLinkImpl,
  MiniProgramImpl,
  LocationImpl,
}                     from '../user/mod.js'

type SayableMessage = never
  | Contact
  | FileBoxInterface
  | Location
  | Message
  | MiniProgram
  | number
  | string
  | Sleeper
  | UrlLink

interface Sayable {
  id      : string,
  wechaty : Wechaty,
  say (
    text     : SayableMessage,
    replyTo? : Contact | Contact[]
  ): Promise<void | Message>
}

const deliverSayableConversationPuppet = (puppet: PuppetInterface) => (conversationId: string) => async (sayableMessage: SayableMessage) => {
  let msgId: string | void

  if (typeof sayableMessage === 'number') {
    sayableMessage = String(sayableMessage)
  }

  if (MessageImpl.valid(sayableMessage)) {
    /**
     * 0. Message
     */
    msgId = await puppet.messageForward(
      conversationId,
      sayableMessage.id,
    )
  } else if (typeof sayableMessage === 'string') {
    /**
     * 1. Text
     */
    msgId = await puppet.messageSendText(
      conversationId,
      sayableMessage,
    )
  } else if (ContactImpl.valid(sayableMessage)) {
    /**
     * 2. Contact
     */
    msgId = await puppet.messageSendContact(
      conversationId,
      sayableMessage.id,
    )
  } else if (FileBox.valid(sayableMessage)) {
    /**
     * 3. File
     */
    msgId = await puppet.messageSendFile(
      conversationId,
      sayableMessage,
    )
  } else if (UrlLinkImpl.valid(sayableMessage)) {
    /**
     * 4. Link Message
     */
    msgId = await puppet.messageSendUrl(
      conversationId,
      sayableMessage.payload,
    )
  } else if (MiniProgramImpl.valid(sayableMessage)) {
    /**
     * 5. Mini Program
     */
    msgId = await puppet.messageSendMiniProgram(
      conversationId,
      sayableMessage.payload,
    )
  } else if (LocationImpl.valid(sayableMessage)) {
    /**
     * 6. Location
     */
    msgId = await puppet.messageSendLocation(
      conversationId,
      sayableMessage.payload,
    )
  } else if (SleeperImpl.valid(sayableMessage)) {
    /**
     * 7. Sleep for a while
     */
    await sayableMessage.sleep()
  } else {

    throw new Error('unsupported arg: ' + sayableMessage)

  }

  return msgId
}

export {
  deliverSayableConversationPuppet,
}
export type {
  Sayable,
  SayableMessage,
}
