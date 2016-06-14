const log = require('npmlog')

const Wechaty = require('../src/wechaty')

const welcome = `
| __        __        _           _
| \\ \\      / /__  ___| |__   __ _| |_ _   _
|  \\ \\ /\\ / / _ \\/ __| '_ \\ / _\` | __| | | |
|   \\ V  V /  __/ (__| | | | (_| | |_| |_| |
|    \\_/\\_/ \\___|\\___|_| |_|\\__,_|\\__|\\__, |
|                                     |___/

=============== Powered by Wechaty ===============
-------- https://github.com/zixia/wechaty --------

I'm a bot, my super power is talk in Wechat.

If you send me a 'ding', I will reply you a 'dong'!
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me for more super powers!

Please wait... I'm trying to login in...

`

console.log(welcome)
const bot = new Wechaty({ session: 'example.wechaty.json' })

bot
.on('login'	  , user => log.info('Bot', `${user.name()} logined`))
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('scan', ({url, code}) => {
  console.log(`Scan QR Code in url to login: ${code}\n${url}`)
  if (!/201|200/.test(code)) {
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    require('qrcode-terminal').generate(loginUrl)
  }
})
.on('message', m => {
  m.ready()
  .then(msg => {
    log.info('Bot', 'recv: %s', msg.toStringEx())
    // logToFile(JSON.stringify(msg.rawObj))

    if (/^(ding|ping|bing)$/i.test(m.get('content')) && !m.self()) {
      bot.reply(m, 'dong')
      .then(() => { log.warn('Bot', 'REPLY: dong') })
    }
  })
  .catch(e => log.error('Bot', 'ready: %s' , e))
})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail: %s', e)
  bot.quit()
  process.exit(-1)
})

function logToFile(data) {
require('fs').appendFile('message.log', data + '\n\n#############################\n\n', err => {
  if (err) { log.error('LogToFile: %s', err) }
})
}
