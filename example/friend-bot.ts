/**
 *
 * Wechaty - Wechat for Bot
 *
 * Connecting ChatBots
 * https://github.com/wechaty/wechaty
 *
 */

/* tslint:disable:variable-name */
const QrcodeTerminal = require('qrcode-terminal')

import {
  Wechaty,
  Contact,
  Config,
  log,
} from '../'

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
const bot = Wechaty.instance({ profile: Config.DEFAULT_PROFILE })

bot
.on('login'	  , user => log.info('Bot', `${user.name()} logined`))
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('error'   , e => log.info('Bot', 'error: %s', e))
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
/**
 *
 * Wechaty Event: `friend`
 *
 */
.on('friend', async (contact, request) => {
  let logMsg
  const fileTransfer = Contact.load('filehelper')

  try {
    logMsg = 'received `friend` event from ' + contact.get('name')
    if (fileTransfer) {
      fileTransfer.say(logMsg)
    }
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
  if (fileTransfer) {
    fileTransfer.say(logMsg)
  }

})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail: %s', e)
  bot.quit()
  process.exit(-1)
})
