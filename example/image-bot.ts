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
    Message
  , Wechaty
} from '../'
const bot = Wechaty.instance({ profile: 'example-bot.wechaty.json' })

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

  if (m.type() === Message.TYPE['IMAGE']) {
    console.log('IMAGE url: ' + m.get('url'))
    const filename = m.id + '.jpg'
    console.log('IMAGE local filename: ' + filename)

    const fileStream = require('fs').createWriteStream(filename)

    m.readyStream()
    .then(stream => stream.pipe(fileStream))
    .catch(e => console.log('stream error:' + e))

  }

})
.init()
.catch(e => console.error('bot.init() error: ' + e))
