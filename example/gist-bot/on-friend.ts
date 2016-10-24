import {
    Contact
  , FriendRequest
  , Room
} from '../../'

export default async function onFriend(contact: Contact, request?: FriendRequest): Promise<void> {
  try {
    if (!request) {
      console.log('New friend ' + contact.name() + ' relationship confirmed!')
      return
    }
    /********************************************
     *
     * 从这里开始修改 vvvvvvvvvvvv
     *
     */
    await request.accept()

    setTimeout(function() {
      contact.say('thank you for adding me')
    }, 3000)

    if (request.hello === 'ding') {
      const myRoom = await Room.find({ topic: 'ding' })
      setTimeout(function() {
        myRoom.add(contact)
        myRoom.say('welcome ' + contact.name())
      }, 3000)
    }

    /**
     *
     * 到这里结束修改 ^^^^^^^^^^^^
     *
     ********************************************/
 } catch (e) {
    console.log(e)
  }
}
