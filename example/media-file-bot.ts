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

// import { inspect }            from 'util'
import { createWriteStream, writeFileSync }  from 'fs'

import {
  Config,
  Message,
  MsgType,
  Wechaty,
} from '../'
const bot = Wechaty.instance({ profile: Config.DEFAULT_PROFILE })

bot
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    const loginUrl = url.replace(/\/qrcode\//, '/l/')
    QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
.on('login'	  , user => console.log(`${user} logined`))
.on('message', m => {
  console.log(`RECV: ${m}`)

  // console.log(inspect(m))
  saveRawObj(m.rawObj)

  if ( m.type() === MsgType.IMAGE
    || m.type() === MsgType.EMOTICON
    || m.type() === MsgType.VIDEO
    || m.type() === MsgType.VOICE
    || m.type() === MsgType.MICROVIDEO
    || m.type() === MsgType.APP
    || (m.type() === MsgType.TEXT && m.typeSub() === MsgType.LOCATION)  // LOCATION
  ) {
    saveMediaFile(m)
  }
})
.init()
.catch(e => console.error('bot.init() error: ' + e))

function saveMediaFile(message: Message) {
  const filename = message.filename()
  console.log('IMAGE local filename: ' + filename)

  const fileStream = createWriteStream(filename)

  console.log('start to readyStream()')
  message.readyStream()
          .then(stream => {
            stream.pipe(fileStream)
                  .on('close', () => {
                    console.log('finish readyStream()')
                  })
          })
          .catch(e => console.log('stream error:' + e))
}

function saveRawObj(o) {
  writeFileSync('rawObj.log', JSON.stringify(o, null, '  ') + '\n\n\n', { flag: 'a' })
}
