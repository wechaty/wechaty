/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import {
  Message,
  Room,
} from '../../'

export async function onMessage(message: Message): Promise<void> {
  try {
    const room      = message.room()
    const sender    = message.from()
    const content   = message.content()

    console.log((room ? '[' + room.topic() + ']' : '')
                + '<' + sender.name() + '>'
                + ':' + message.toStringDigest(),
    )

    if (message.self() || room) {
      console.log('message is sent from myself, or inside a room.')
      return
    }

    /********************************************
     *
     * 从下面开始修改vvvvvvvvvvvv
     *
     */

    if (content === 'ding') {
      message.say('thanks for ding me')

      const myRoom = await Room.find({ topic: 'ding' })
      if (!myRoom) return

      if (myRoom.has(sender)) {
        sender.say('no need to ding again, because you are already in ding room')
        return
      }

      sender.say('ok, I will put you in ding room!')
      myRoom.add(sender)
      return

    } else if (content === 'dong') {
      sender.say('ok, dong me is welcome, too.')
      return
    }

    /**
     *
     * 到这里结束修改^^^^^^^^^^^^
     *
     */
    /*********************************************/
  } catch (e) {
    console.log(e)
  }
}
