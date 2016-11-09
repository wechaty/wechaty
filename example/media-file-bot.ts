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

import * as util from 'util'

import {
    Config
  // , Message
  , MessageType
  , Wechaty
} from '../'
const bot = Wechaty.instance({ profile: Config.DEFAULT_PROFILE })

bot
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
.on('message', m => {
  console.log(`RECV: ${m}`)

  console.log(util.inspect(m))

  if ( m.type() === MessageType.IMAGE
    || m.type() === MessageType.EMOTICON
    || m.type() === MessageType.VIDEO
    || m.type() === MessageType.VOICE
    || m.type() === MessageType.MICROVIDEO
  ) {
    const filename = m.id + m.ext()
    console.log('IMAGE local filename: ' + filename)

    const fileStream = require('fs').createWriteStream(filename)

    m.readyStream()
    .then(stream => stream.pipe(fileStream))
    .catch(e => console.log('stream error:' + e))

  }

})
.init()
.catch(e => console.error('bot.init() error: ' + e))
