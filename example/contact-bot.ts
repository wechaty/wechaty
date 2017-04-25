/**
 *
 * Wechaty - Wechat for Bot
 *
 * Connecting ChatBots
 * https://github.com/wechaty/wechaty
 *
 */

import { createWriteStream } from 'fs'

/* tslint:disable:variable-name */
const QrcodeTerminal = require('qrcode-terminal')

import {
  Config,
  Contact,
  Wechaty,
  log,
} from '../'

const welcome = `
=============== Powered by Wechaty ===============
-------- https://github.com/wechaty/wechaty --------

Hello,

I'm a Wechaty Botie with the following super powers:

1. List all your contacts with weixn id & name

__________________________________________________

Hope you like it, and you are very welcome to
upgrade me for more super powers!

Please wait... I'm trying to login in...

`

console.log(welcome)
const bot = Wechaty.instance({ profile: Config.DEFAULT_PROFILE })

bot
.on('login'	  , function(this, user) {
  log.info('Bot', `${user.name()} logined`)
  this.say('wechaty contact-bot just logined')

  /**
   * Main Contact Bot start from here
   */
  main()

})
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('error'   , e => log.info('Bot', 'error: %s', e))
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail: %s', e)
  bot.quit()
  process.exit(-1)
})

/**
 * Main Contact Bot
 */
async function main() {
  const contactList = await Contact.findAll()

  log.info('Bot', '#######################')
  log.info('Bot', 'Contact number: %d\n', contactList.length)

  /**
   * official contacts list
   */
  for (let i = 0; i < contactList.length; i++) {
    const contact = contactList[i]
    if (contact.official()) {
      log.info('Bot', `official ${i}: ${contact}`)
    }
  }

  /**
   *  Special contact list
   */

  for (let i = 0; i < contactList.length; i++) {
    const contact = contactList[i]
    if (contact.special()) {
      log.info('Bot', `special ${i}: ${contact.name()}`)
    }
  }

  /**
   *  personal contact list
   */

  for (let i = 0; i < contactList.length; i++) {
    const contact = contactList[i]
    if (contact.personal()) {
      log.info('Bot', `personal ${i}: ${contact.get('name')} : ${contact.id}`)
    }
  }

  const MAX = 17
  for (let i = 0; i < contactList.length; i++ ) {
    const contact = contactList[i]

    if (!contact.weixin()) {
      await contact.refresh()
    }

    /**
     * Save avatar to file like: "1-name.jpg"
     */
    const avatarFileName = `${i}-${contact.name()}.jpg`
    const avatarReadStream = await contact.avatar()
    const avatarWriteStream = createWriteStream(avatarFileName)
    avatarReadStream.pipe(avatarWriteStream)

    log.info('Bot', 'Contact: %s: %s with avatar file: %s', contact.weixin(), contact.name(), avatarFileName)

    if (i > MAX) {
      log.info('Bot', 'Contacts too many, I only show you the first %d ... ', MAX)
      break
    }
  }

  const SLEEP = 7
  log.info('Bot', 'I will re-dump contact weixin id & names after %d second... ', SLEEP)
  setTimeout(main, SLEEP * 1000)
}
