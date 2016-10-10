#!/usr/bin/env node
/**
 *
 * Wechaty - Wechat for Bot
 *
 * Connecting ChatBots
 * https://github.com/wechaty/wechaty
 *
 */
const {
  Wechaty
  , Message
  , Config
  , log
} = require('../')

const welcome = `
=============== Powered by Wechaty ===============
-------- https://github.com/wechaty/wechaty --------

Hello,

I'm a Wechaty Botie with the following super powers:

1. Send Friend Request
2. Accept Friend Request
3. Recongenize Verify Message

If you send friend request to me,
with a verify message 'ding',
I will accept your request automaticaly!
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me for more super powers!

Please wait... I'm trying to login in...

`

console.log(welcome)
const bot = new Wechaty({ profile: Config.DEFAULT_PROFILE })

bot
.on('login'	  , user => log.info('Bot', `${user.name()} logined`))
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('error'   , e => log.info('Bot', 'error: %s', e))
.on('scan', ({url, code}) => {
  if (!/201|200/.test(code)) {
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    require('qrcode-terminal').generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
/**
 *
 * Wechaty Event: `friend`
 *
 */
.on('friend', (contact, request) => {
  let logMsg
  const m = new Message()
  m.set('to', 'filehelper')

  contact.ready().then(_ => {
    try {
      logMsg = 'received `friend` event from ' + contact.get('name')
      m.set('content', logMsg)
      bot.send(m)
      console.log(logMsg)

      /**
       *
       * 1. New Friend Request
       *
       * when request is set, we can get verify message from `request.hello`,
       * and accept this request by `request.accept()`
       */
      if (request) {
        if (request.hello === 'ding') {
          logMsg = 'accepted because verify messsage is "ding"'
          request.accept()

        } else {
          logMsg = 'not auto accepted, because verify message is: ' + request.hello
        }
      /**
       *
       * 2. Friend Ship Confirmed
       *
       */
      } else {
        logMsg = 'friend ship confirmed with ' + contact.get('name')
      }

    } catch (e) {
      logMsg = e.message
    }

    console.log(logMsg)
    m.set('content', logMsg)
    bot.send(m)

  })
})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail: %s', e)
  bot.quit()
  process.exit(-1)
})
