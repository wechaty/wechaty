/**
 *
 * Wechaty - Wechat for Bot
 *
 * Connecting ChatBots
 * https://github.com/wechaty/wechaty
 *
 */
import {
    Message
  , Wechaty
} from '../'
const bot = Wechaty.instance({ profile: 'example-bot.wechaty.json' })

bot
.on('scan', (url, code) => {
  console.log(`Use Wechat to Scan QR Code in url to login: ${code}\n${url}`)
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
