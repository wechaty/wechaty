const {
  Wechaty
  , Config
  , Room
  , Contact
  , Message
  , log
} = require('..')

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
const bot = new Wechaty({ profile: Config.DEFAULT_PROFILE })

bot
.on('scan', ({url, code}) => {
  console.log(`Use Wechat to Scan QR Code in url to login: ${code}\n${url}`)
})
.on('login'	  , user => {
  log.info('Bot', `${user.name()} logined`)
  setTimeout(_ => {
    Room.find({ name: /^ding/i })
        .then(room => {
          log.info('Bot', 'start monitor "ding" room join/leave event')
          room.on('join', (invitee, inviter) => {
            try {
              log.info('Bot', 'room event: %s join, invited by %s', invitee.name(), inviter.name())
              const m = new Message()
              m.set('room', room.id)
              if (inviter.id !== bot.user().id) {
                m.set('to', inviter.id)
                m.set('content', `@${inviter.name()} RULE1: Invitation is limited to me, the owner only. Please do not invit people without notify me.`)
                bot.send(m)

                m.set('to', invitee.id)
                m.set('content', `@${invitee.name()} Please contact me: by send "ding" to me, I will re-sed you a invitation. Now I will remove you out, sorry.`)
                bot.send(m)

                room.topic('ding - warn ' + inviter.name())
                room.del(invitee)
              } else {
                m.set('to', invitee.id)
                m.set('content', `@${invitee.name()} Welcome to my room! :)`)
                bot.send(m)
                room.topic('ding - welcome ' + invitee.name())
              }
            } catch (e) {
              log.error('room join event exception: %s', e.stack)
            }
          })
          room.on('leave', (leaver) => {
            log.info('Bot', 'room event: %s leave, byebye', leaver.name())
          })
        })
        .catch(e => {
          log.warn('Bot', 'there is no room named ding(yet)')
        })
  }, 3000)
})
.on('room-join', (room, invitee, inviter) => {
  log.info('Bot', 'room-join event: Room %s got new member %s, invited by %s'
                , room.toic()
                , invitee.name()
                , inviter.name()
          )
})
.on('room-leave', (room, leaver) => {
  log.info('Bot', 'room-leave event: Room %s lost member %s'
                , room.topic()
                , leaver.name()
              )
})
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('error'   , e => log.info('Bot', 'error: %s', e))
.on('message', m => {
  const room = m.room()
  const from = m.from()

  console.log((room ? '['+room.topic()+']' : '')
              + '<'+from.name()+'>'
              + ':' + m.toStringDigest()
  )

  if (bot.self(m)) {
    return
  }

  const noticeMessage = new Message()
  noticeMessage.set('to', from)
  /**
   * `ding` will be the magic(toggle) word:
   *  1. say ding first time, will got a room invitation
   *  2. say ding in room, will be removed out
   */
  if ('ding' === m.get('content')) {
    if (m.room()) {
      if (/^ding/i.test(room.topic())) {
        noticeMessage.set('content', 'You said "ding" in my room, I will remove you out.')
        bot.send(noticeMessage)
        room.del(m.from())
      }
    } else {
      var contact = m.from()
      Room.find({ name: /^ding/i })
          .then(room => {
            if (room) {
              room.add(contact)
                  .catch(e => {
                    log.error('Bot', 'room.add() exception: %s', e.stack)
                  })
            } else {
              Contact.find({ name: 'Bruce LEE' })
                      .then(c => {
                        Room.create([contact, c], 'ding')
                            .then(_ => {
                              log.info('Bot', 'ding room not found, created one')
                            })
                            .catch(e => {
                              log.error('Bot', 'ding room create fail: %s', e.stack)
                            })

                      })
                      .catch(e => {
                        log.error('Bot', 'Contact.find not found')
                      })
            }
          })
    }
  }
})
.init()
.catch(e => console.error(e))
