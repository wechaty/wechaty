import {
  log,
}               from './config'

export class MediaMessage {
  constructor() {
    const msg = '`MediaMessage` is deprecated. Please use `Message` instead. See: https://github.com/Chatie/wechaty/issues/1164'
    log.warn('MediaMessage', msg)
    throw new Error(msg)
  }
}
