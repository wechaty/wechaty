/**
#!/usr/bin/env node
 *
 * Wechaty - Wechat for Bot
 *
 * Connecting ChatBots
 * https://github.com/wechaty/wechaty
 *
 * Known ISSUES:
 *  - BUG1: can't find member by this NickName:
 *    ' leaver: 艾静<img class="emoji emojiae" text="_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />JOY
 *  - BUG2: leave event not right: sometimes can not found member (any more, because they left)
 */
import {
    Config
  , Contact
  , Room
  , Wechaty
  , log
} from '../'

/**
 *
 * create a room need at least three people
 * when we create a room, this is the 3rd people.
 *
 * put name of one of your friend here, or create room will not work.
 *
 * ::: ___CHANGE ME___ :::
 *     vvvvvvvvvvvvvvv
 */
const HELPER_CONTACT_NAME = 'Bruce LEE'

const welcome = `
=============== Powered by Wechaty ===============
-------- https://github.com/wechaty/wechaty --------

Hello,

I'm a Wechaty Botie with the following super powers:

1. Find a room
2. Add people to room
3. Del people from room
4. Change room topic
5. Monitor room events
6. etc...

If you send a message of magic word 'ding',
you will get a invitation to join my own room!
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me for more super powers!

Please wait... I'm trying to login in...

`
console.log(welcome)
const bot = Wechaty.instance({ profile: Config.DEFAULT_PROFILE })

bot
.on('scan', ({url, code}) => {
  console.log(`Use Wechat to Scan QR Code in url to login: ${code}\n${url}`)
})
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('error'   , e => log.info('Bot', 'error: %s', e))

/**
 * Global Event: login
 *
 * do initialization inside this event.
 * (better to set a timeout, for browser need time to download other data)
 */
.on('login'	  , user => {
  log.info('Bot', `${user.name()} logined`)

  log.info('Bot', `setting to manageDingRoom() after 3 seconds ... `)
  setTimeout(manageDingRoom.bind(this), 3000)
})

/**
 * Global Event: room-join
 */
.on('room-join', (room, invitee, inviter) => {
  log.info('Bot', 'room-join event: Room %s got new member %s, invited by %s'
                , room.topic()
                , invitee.map
                  ? invitee.map(c => c.name()).join(',')
                  : invitee
                , inviter.name()
          )
})

/**
 * Global Event: room-leave
 */
.on('room-leave', (room, leaver) => {
  log.info('Bot', 'room-leave event: Room %s lost member %s'
                , room.topic()
                , leaver.name()
              )
})

/**
 * Global Event: room-topic
 */
.on('room-topic', (room, topic, oldTopic, changer) => {
  try {
    log.info('Bot', 'room-topic event: Room %s change topic to %s by member %s'
                  , oldTopic
                  , topic
                  , changer.name()
                )
  } catch (e) {
    log.error('Bot', 'room-topic event exception: %s', e.stack)
  }
})

/**
 * Global Event: message
 */
.on('message', message => {
  const room    = message.room()
  const sender  = message.from()
  const content = message.content()

  console.log((room ? '['+room.topic()+']' : '')
              + '<'+sender.name()+'>'
              + ':' + message.toStringDigest()
  )

  if (bot.self(message)) {
    return
  }
  /**
   * `ding` will be the magic(toggle) word:
   *  1. say ding first time, will got a room invitation
   *  2. say ding in room, will be removed out
   */
  if (/^ding$/i.test(content)) {

    /**
     *  in-room message
     */
    if (room) {
      if (/^ding/i.test(room.topic())) {
        /**
         * move contact out of room
         */
        getOutRoom(sender, room)
      }

    /**
     * peer to peer message
     */
    } else {

      /**
       * find room name start with "ding"
       */
      Room.find({ topic: /^ding/i })
          .then(dingRoom => {

            /**
             * room found
             */
            if (dingRoom) {
              log.info('Bot', 'onMessage: got dingRoom')

              /**
               * speaker is already in room
               */
              if (dingRoom.has(sender)) {
                log.info('Bot', 'onMessage: sender has already in dingRoom')
                sender.say('no need to ding again, because you are already in ding room')
                // sendMessage({
                //   content: 'no need to ding again, because you are already in ding room'
                //   , to: sender
                // })

              /**
               * put speaker into room
               */
              } else {
                log.info('Bot', 'onMessage: add sender to dingRoom')
                putInRoom(sender, dingRoom)
              }

            /**
             * room not found
             */
            } else {
              log.info('Bot', 'onMessage: dingRoom not found, try to create one')
              /**
               * create the ding room
               */
              createDingRoom(sender)
              .then(room => {
                /**
                 * listen events from ding room
                 */
                manageDingRoom()
              })
            }
          })
          .catch(e => {
            log.error(e)
          })
    }
  }
})
.init()
.catch(e => console.error(e))

function manageDingRoom() {
  log.info('Bot', 'manageDingRoom()')

  /**
   * Find Room
   */
  Room.find({ topic: /^ding/i })
  .then(room => {
    if (!room) {
      log.warn('Bot', 'there is no room topic ding(yet)')
      return
    }
    log.info('Bot', 'start monitor "ding" room join/leave event')

    /**
     * Event: Join
     */
    room.on('join', (invitee: Contact|Contact[], inviter: Contact) =>
      checkRoomJoin.call(this, room, invitee, inviter)
    )

    /**
     * Event: Leave
     */
    room.on('leave', (leaver) => {
      log.info('Bot', 'room event: %s leave, byebye', leaver.name())
    })

    /**
     * Event: Topic Change
     */
    room.on('topic', (topic, oldTopic, changer) => {
      log.info('Bot', 'room event: topic changed from %s to %s by member %s'
          , oldTopic
          , topic
          , changer.name()
        )
    })
  })
  .catch(e => {
    log.warn('Bot', 'Room.find rejected: %s', e.stack)
  })
}

function checkRoomJoin(room: Room, invitee: Contact           , inviter: Contact)
function checkRoomJoin(room: Room, invitee: Contact[]         , inviter: Contact)
function checkRoomJoin(room: Room, invitee: Contact|Contact[] , inviter: Contact) {

  log.info('Bot', 'checkRoomJoin(%s, %s, %s)'
                , room.topic()
                , Array.isArray(invitee)
                  ? invitee.map(c => c.name()).join(', ')
                  : invitee.name()
                , inviter.name()
          )

  try {
    // let to, content
    if (inviter.id !== bot.user().id) {

      room.say('RULE1: Invitation is limited to me, the owner only. Please do not invit people without notify me.'
          , inviter
      )
      room.say('Please contact me: by send "ding" to me, I will re-send you a invitation. Now I will remove you out, sorry.'
          , invitee
      )

      // const atList = invitee.map
      //                 ? invitee.map(c => '@' + c.name()).join(' ')
      //                 : '@' + invitee.name()

      // sendMessage(bot, {
      //   room
      //   , content:  `${atList} Please contact me: by send "ding" to me, I will re-send you a invitation. Now I will remove you out, sorry.`
      //   , to:       invitee.map ? invitee[0].id : invitee.id
      // })

      room.topic('ding - warn ' + inviter.name())
      setTimeout(_ => {
        Array.isArray(invitee)
        ? invitee.forEach(c => room.del(c))
        : room.del(invitee)
      }, 10000)

    } else {

      room.say('Welcome to my room! :)')

      // sendMessage(bot, {
      //   room
      //   , content:  `@${invitee.name()} Welcome to my room! :)`
      //   , to:       invitee.id
      // })
      let welcomeTopic
      if (Array.isArray(invitee)) {
        welcomeTopic = invitee.map(c => c.name()).join(', ')
      } else {
        welcomeTopic = invitee.name()
      }
      room.topic('ding - welcome ' + welcomeTopic)
    }

  } catch (e) {
    log.error('room join event exception: %s', e.stack)
  }

}

// function sendMessage(bot, {
//   content
//   , to
//   , room = null
// }) {
//   log.info('Bot', 'sendMessage(%s, {content: %s, to: %s, room: %s})', bot, content, to, room)

//   const msg = new Message()
//   msg.content(content)
//   msg.room(room)
//   msg.to(to)
//   bot.send(msg)
// }

function putInRoom(contact, room) {
  log.info('Bot', 'putInRoom(%s, %s)', contact.name(), room.topic())

  try {
    room.add(contact)
        .catch(e => {
          log.error('Bot', 'room.add() exception: %s', e.stack)
        })
    setTimeout(_ => room.say('Welcome ', contact), 1000)
    // setTimeout(_ => sendMessage(bot, {
    //   content: 'Welcome ' + contact.name()
    //   , room
    //   , to: contact
    // }), 1000)
  } catch (e) {
    log.error('Bot', 'putInRoom() exception: ' + e.stack)
  }
}

function getOutRoom(contact: Contact, room: Room) {
  log.info('Bot', 'getOutRoom(%s, %s)', contact, room)

  try {
    // sendMessage(bot, {
    //   content:  `@${contact.name()} You said "ding" in my room, I will remove you out.`
    //   , room:   room.id
    //   , to:     contact.id
    // })
    room.say('You said "ding" in my room, I will remove you out.')
    room.del(contact)
  } catch (e) {
    log.error('Bot', 'getOutRoom() exception: ' + e.stack)
  }
}

function getHelperContact() {
  log.info('Bot', 'getHelperContact()')

  // create a new room at least need 3 contacts
  return Contact.find({ name: HELPER_CONTACT_NAME })
}

function createDingRoom(contact) {
  log.info('Bot', 'createDingRoom(%s)', contact)

  return getHelperContact()
  .then(helperContact => {
    if (!helperContact) {
      log.warn('Bot', 'getHelperContact() found nobody')
      return
    }
    helperContact.ready().then(_ =>
      log.info('Bot', 'getHelperContact() ok. got: %s', helperContact.name())
    )

    const contactList = [contact, helperContact]
    log.verbose('Bot', 'contactList: %s', contactList.join(','))

    return Room.create(contactList, 'ding')
        .then(room => {
          log.info('Bot', 'createDingRoom() new ding room created: %s', room)

          room.topic('ding - created')

          room.say('ding - created')
          // sendMessage(bot, {
          //   content: ''
          //   , to:   room
          //   , room
          // })

          return room
        })
        .catch(e => {
          log.error('Bot', 'createDingRoom() new ding room create fail: %s', e.stack)
        })
  })
  .catch(e => {
    log.error('Bot', 'getHelperContact() exception:', e.stack)
  })
}
