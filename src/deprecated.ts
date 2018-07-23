export class MediaMessage {
  constructor (..._: any[]) {
    let msg = '`MediaMessage` is deprecated. Please use `FileBox` instead. '
    msg += 'See example at: https://github.com/Chatie/wechaty/blob/55a48919d472ff5c4df8987abe4de87a5a546104/examples/ding-dong-bot.ts#L138'
    throw new Error(msg)
  }
}
