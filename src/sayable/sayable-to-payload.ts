import * as PUPPET from 'wechaty-puppet'
import { log }  from 'wechaty-puppet'
import { FileBox } from 'file-box'

import {
  DelayImpl,
  LocationImpl,
  MessageImpl,
  MiniProgramImpl,
  UrlLinkImpl,
  ContactImpl,
  PostImpl,
}                       from '../user-modules/mod.js'

import type {
  Sayable,
}                   from './types.js'

async function sayableToPayload (sayable: Sayable): Promise<undefined | PUPPET.payloads.Sayable> {
  log.verbose('Wechaty', 'sayableToPayload(%s)', sayable)

  if (typeof sayable === 'string') {
    return PUPPET.payloads.sayable.text(sayable)
  } else if (typeof sayable === 'number') {
    return PUPPET.payloads.sayable.text(String(sayable))
  } else if (ContactImpl.valid(sayable)) {
    return PUPPET.payloads.sayable.contact(sayable.id)
  } else if (DelayImpl.validInstance(sayable)) {
    return undefined
  } else if (FileBox.valid(sayable)) {
    return PUPPET.payloads.sayable.attatchment(sayable)
  } else if (LocationImpl.validInstance(sayable)) {
    return PUPPET.payloads.sayable.location(sayable.payload)
  } else if (MessageImpl.valid(sayable)) {
    const messageSayable = await sayable.toSayable()
    if (!messageSayable) {
      return undefined
    }
    return sayableToPayload(messageSayable)
  } else if (MiniProgramImpl.validInstance(sayable)) {
    return PUPPET.payloads.sayable.miniProgram(sayable.payload)
  } else if (PostImpl.validInstance(sayable)) {
    return PUPPET.payloads.sayable.post(sayable.payload)
  } else if (UrlLinkImpl.validInstance(sayable)) {
    return PUPPET.payloads.sayable.url(sayable.payload)
  } else {
    log.error('Wechaty', 'sayableToPayload() unsupported sayable: %s', sayable)
    return undefined
  }
}

export {
  sayableToPayload,
}
