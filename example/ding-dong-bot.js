const Wechaty = require('../src/wechaty')
const log = require('npmlog')
//log.level = 'verbose'
log.level = 'silly'

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
const bot = new Wechaty({head: true})

bot.init()
.then(login)
.catch(e => {
  log.error('Bot', 'init() fail:' + e)
  bot.quit()
  process.exit(-1)
})

bot.on('message', m => {
  m.ready()
  .then(msg  => {
    log.info('Bot', 'recv: %s'  , msg)
  })
  .catch(e    => log.error('Bot', 'ready: %s' , e))

  if (/^(ding|ping|bing)$/i.test(m.get('content'))) {
    const r = new Wechaty.Message()
    r.set('to', m.inGroup() ? m.get('group') : m.get('from'))
    r.set('content', 'dong')
    bot.send(r)
    .then(() => { log.warn('Bot', 'REPLY: dong') })
  }
})

function login() {
  log.info('Bot', 'Welcome to Wechaty')

  bot.puppet
  .getLoginQrImgUrl()
  .then(url =>
        console.log(`\n\nAction needed. Scan the belowing QRCode to login:\n\n${url}\n\nTip: You can copy/paste it to a web browser.\n`)
       ).catch(e => log.error('Bot', 'promise rejected'))
}

bot.on('login'  , e => log.info('Bot', 'logined:'   + JSON.stringify(e)))
bot.on('logout' , e => log.info('Bot', 'logouted:'  + e))
