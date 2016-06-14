const Wechaty = require('..')
const bot = new Wechaty({ session: 'example.wechaty.json' })

bot
.on('scan', ({url, code}) => {
  console.log(`Use Wechat to Scan QR Code in url to login: ${code}\n${url}`)
})
.on('message', m => {
  console.log(`RECV: ${m}`)
  if (m.type() === Wechaty.Message.Type.IMAGE) {
    console.log('IMAGE url: ' + m.get('url'))
    const filename = m.id + '.jpg'
    console.log('IMAGE local filename: ' + filename)
    var fileStream = require('fs').createWriteStream(filename)
    m.readyStream()
    .then(stream => stream.pipe(fileStream))
    .catch(e => log.error('stream error', e))
  }
})
.init()
.catch(e => console.error('bot.init() error: ' + e))
