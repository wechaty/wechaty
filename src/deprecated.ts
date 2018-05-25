export class MediaMessage {
  constructor(..._: any[]) {
    const msg = '`MediaMessage` is deprecated. Please use `Message` instead. See: https://github.com/Chatie/wechaty/issues/1164'
    throw new Error(msg)
  }
}
