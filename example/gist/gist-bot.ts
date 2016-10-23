/**
 *
 * Wechaty - Wechat for Bot
 *
 * Connecting ChatBots
 * https://github.com/wechaty/wechaty
 *
 * demo for modulize code for logic
 */
import {
    Config
  , Wechaty
  , log
} from '../../'

import onMessage  from './on-message'
import onFriend   from './on-friend'
import onRoomJoin from './on-room-join'

const welcome = `
=============== Powered by Wechaty ===============
-------- https://github.com/wechaty/wechaty --------

Please wait... I'm trying to login in...

`
console.log(welcome)

Wechaty.instance({ profile: Config.DEFAULT_PROFILE })

.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    require('qrcode-terminal').generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})

.on('login'	  , function (this, user) {
  log.info('Bot', `${user.name()} logined`)
  this.say(`wechaty logined`)
})

.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('error'   , error => log.info('Bot', 'error: %s', error))

.on('message',    onMessage)
.on('friend',     onFriend)
.on('room-join',  onRoomJoin)

.init()
.catch(e => console.error(e))
