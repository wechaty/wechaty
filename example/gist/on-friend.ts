import {
    Contact
  , FriendRequest
  , Room
} from '../../'

export default async function onFriend(contact: Contact, request: FriendRequest): Promise<void> {
  try {
    /********************************************
     *
     * 从这里开始修改 vvvvvvvvvvvv
     *
     */

    if (request.hello !== '上课') {
      return
    }

    request.accept()
    request.contact.say('thanks for coming for ' + request.hello)

    const myRoom = await Room.find({
      topic: 'ding'
    })
    myRoom.add(request.contact)

    /**
     *
     * 到这里结束修改 ^^^^^^^^^^^^
     *
     ********************************************/
 } catch (e) {
    console.log(e)
  }
}
