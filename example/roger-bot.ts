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

import { Wechaty } from '../'
const bot = Wechaty.instance(/* no profile here because roger bot is too noisy */)

bot
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
.on('message', m => {
  if (m.self()) { return }
  m.say('roger')                            // 1. reply others' msg
  console.log(`RECV: ${m}, REPLY: "roger"`) // 2. log message
})
.init()
.catch(e => console.error(e))
