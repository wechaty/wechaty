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
}                       from '../user-modules/post-payload-list.js'

import type {
  Sayable,
}                   from './types.js'

function sayablePayload (sayable: Sayable): undefined | SayablePayload | SayablePayload[] {
  log.verbose('Wechaty', 'sayablePayload(%s)', sayable)

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
  } else if (ContactImpl.validInstance(sayable)) {
    return {
      payload: sayable.id,
      type: PUPPET.type.Message.Contact,
    }
  } else if (DelayImpl.validInstance(sayable)) {
    // Delay is a local sayable
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
  } else if (MessageImpl.validInstance(sayable)) {
    // const unwrappedSayable = await sayable.toSayable()
    // if (!unwrappedSayable) {
    //   return undefined
    // }
    // return sayableToSayablePayload(unwrappedSayable)
    console.error('Post:sayableToSayablePayload() not support Message yet')
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
    console.error('not support add Post to Post yet.')
    return undefined
  } else if (UrlLinkImpl.validInstance(sayable)) {
    return {
      payload: sayable.payload,
      type: PUPPET.type.Message.Url,
    }
  } else {
    console.error(`sayableToSayablePayload(): unsupported sayable: ${sayable}`)
    return undefined
  }
}

export {
  sayablePayload,
}
