import PuppetPadchat        from './puppet-padchat'
import Firer                from './firer'
import {
  PadchatMessageRawPayload,
  PadchatMessageType,
}                           from './padchat-schemas'
import {
  log,
}                           from '../config'

/* tslint:disable:variable-name */
export const Event = {
  onMessage,
}

async function onMessage(
  this       : PuppetPadchat,
  rawPayload : PadchatMessageRawPayload,
): Promise<void> {
  let msg = this.Message.createMT(rawPayload.msg_id)

  try {
    await msg.ready()

    /**
     * Fire Events if match message type & content
     */
    switch (rawPayload.sub_type) {

      // case PadchatMessageType.VERIFYMSG:
      //   Firer.checkFriendRequest.call(this, msg)
      //   break

      case PadchatMessageType.SYS:
        if (msg.room()) {
          const joinResult  = await Firer.checkRoomJoin.call(this  , msg)
          const leaveResult = await Firer.checkRoomLeave.call(this , msg)
          const topicRestul = await Firer.checkRoomTopic.call(this , msg)

          if (!joinResult && !leaveResult && !topicRestul) {
            log.warn('PuppetPadchatEvent', `checkRoomSystem message: <${msg.text()}> not found`)
          }
        }
        // else {
        //   Firer.checkFriendConfirm.call(this, msg)
        // }
        break
    }

    /**
     * Check Type for special Message
     * reload if needed
     */

    switch (rawPayload.sub_type) {
      case PadchatMessageType.EMOTICON:
      case PadchatMessageType.IMAGE:
      case PadchatMessageType.VIDEO:
      case PadchatMessageType.VOICE:
      case PadchatMessageType.MICROVIDEO:
      case PadchatMessageType.APP:
        log.verbose('PuppetPadchatEvent', 'onMessage() EMOTICON/IMAGE/VIDEO/VOICE/MICROVIDEO message')
        msg = this.Message.createMT(rawPayload.msg_id)
        break

      case PadchatMessageType.TEXT:
        log.verbose('PuppetPadchatEvent', 'onMessage() (TEXT&LOCATION) message')
        msg = this.Message.createMT(rawPayload.msg_id)
    }

    await msg.ready()
    this.emit('message', msg)

  } catch (e) {
    log.error('PuppetPadchatEvent', 'onMessage() exception: %s', e.stack)
    throw e
  }
}

export default Event
