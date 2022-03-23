import type * as PUPPET from 'wechaty-puppet'
import { FileBox } from 'file-box'

import {
  ContactImpl,
  MessageImpl,
  DelayImpl,
  UrlLinkImpl,
  MiniProgramImpl,
  PostImpl,
  LocationImpl,
}                     from '../user-modules/mod.js'

import type { Sayable, SayOptionsObject } from './types.js'

/**
 * TODO: add unit test to ensure the interface validation code works
 */
const deliverSayableConversationPuppet = (puppet: PUPPET.impls.PuppetInterface) => (conversationId: string) => async (sayable: Sayable, options?: SayOptionsObject) => {
  let msgId: string | void
  const messageSendOptions: PUPPET.types.MessageSendOptions = {}
  if (options?.replyTo) {
    const replyTo = Array.isArray(options.replyTo) ? options.replyTo : [options.replyTo]
    messageSendOptions.mentionIdList = replyTo.map(c => c.id)
  }
  if (options?.quoteMessage) {
    messageSendOptions.quoteId = options.quoteMessage.id
  }

  if (typeof sayable === 'number') {
    sayable = String(sayable)
  }

  if (typeof sayable === 'string') {
    return puppet.messageSendText(
      conversationId,
      sayable,
      messageSendOptions,
    )
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
      messageSendOptions,
    )
  } else if (MessageImpl.validInstance(sayable)) {
    /**
     * 2. Message
     */
    msgId = await puppet.messageForward(
      conversationId,
      sayable.id,
      messageSendOptions,
    )
  } else if (ContactImpl.validInstance(sayable)) {
    /**
     * 3. Contact
     */
    msgId = await puppet.messageSendContact(
      conversationId,
      sayable.id,
      messageSendOptions,
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
      messageSendOptions,
    )
  } else if (LocationImpl.validInstance(sayable)) {
    /**
     * 6. Location
     */
    msgId = await puppet.messageSendLocation(
      conversationId,
      sayable.payload,
      messageSendOptions,
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
      messageSendOptions,
    )
  } else {
    throw new Error('unsupported arg: ' + sayable)
  }

  return msgId
}

export {
  deliverSayableConversationPuppet,
}
