/**
 *
 * Wechaty - Wechat for Bot
 *
 * Connecting ChatBots
 * https://github.com/wechaty/wechaty
 *
 */
import { Wechaty } from '../'
const bot = Wechaty.instance(/* no profile here because roger bot is too noisy */)

bot
.on('scan', (url, code) => {
  console.log(`Use Wechat to Scan QR Code in url to login: ${code}\n${url}`)
})
.on('message', m => {
  if (bot.self(m)) { return }
  m.say('roger')                            // 1. reply others' msg
  console.log(`RECV: ${m}, REPLY: "roger"`) // 2. log message
})
.init()
.catch(e => console.error(e))
