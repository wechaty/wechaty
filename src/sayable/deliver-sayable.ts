import type * as PUPPET from 'wechaty-puppet'
import { FileBox } from 'file-box'

import {
  ContactImpl,
  MessageImpl,
  DelayImpl,
  UrlLinkImpl,
  MiniProgramImpl,
  LocationImpl,
}                     from '../user-modules/mod.js'

import type { Sayable } from './types.js'

/**
 * TODO: add unit test to ensure the interface validation code works
 */
const deliverSayableConversationPuppet = (puppet: PUPPET.impls.PuppetInterface) => (conversationId: string) => async (sayable: Sayable) => {
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
  } else {
    throw new Error('unsupported arg: ' + sayable)
  }

  return msgId
}

export {
  deliverSayableConversationPuppet,
}
