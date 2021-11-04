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
  SayablePayload,
}                       from '../user-modules/post-sayable-payload-list.js'

import type {
  Sayable,
}                   from './types.js'

function sayableToPayload (sayable: Sayable): undefined | SayablePayload | SayablePayload[] {
  log.verbose('Wechaty', 'sayableToPayload(%s)', sayable)

  if (typeof sayable === 'string') {
    return {
      payload: sayable,
      type: PUPPET.type.Message.Text,
    }
  } else if (typeof sayable === 'number') {
    return {
      payload: String(sayable),
      type: PUPPET.type.Message.Text,
    }
  } else if (ContactImpl.valid(sayable)) {
    return {
      payload: sayable.id,
      type: PUPPET.type.Message.Contact,
    }
  } else if (DelayImpl.validInstance(sayable)) {
    // Delay is a local-only sayable
    return undefined
  } else if (FileBox.valid(sayable)) {
    return {
      payload: sayable,
      type: PUPPET.type.Message.Attachment,
    }
  } else if (LocationImpl.validInstance(sayable)) {
    return {
      payload: sayable.payload,
      type: PUPPET.type.Message.Location,
    }
  } else if (MessageImpl.valid(sayable)) {
    // const unwrappedSayable = await sayable.toSayable()
    // if (!unwrappedSayable) {
    //   return undefined
    // }
    // return sayableToSayablePayload(unwrappedSayable)
    log.error('Wechaty', 'sayableToPayload() Huan(202111): Post:sayableToPayload() not support Message yet because it requires `await`')
    return undefined
  } else if (MiniProgramImpl.validInstance(sayable)) {
    return {
      payload: sayable.payload,
      type: PUPPET.type.Message.MiniProgram,
    }
  } else if (PostImpl.validInstance(sayable)) {
    // const unwrappedSayableList = [...sayable]
    // if (!unwrappedSayableList) {
    //   return undefined
    // }
    // return unwrappedSayableList.map(sayableToSayablePayload)
    log.error('Wechaty', 'sayableToPayload() Huan(202111): not support add Post to Post yet because it is complicated for now')
    return undefined
  } else if (UrlLinkImpl.validInstance(sayable)) {
    return {
      payload: sayable.payload,
      type: PUPPET.type.Message.Url,
    }
  } else {
    log.error('Wechaty', 'sayableToPayload() unsupported sayable: %s', sayable)
    return undefined
  }
}

export {
  sayableToPayload,
}
