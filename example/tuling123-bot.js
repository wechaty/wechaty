/**
 *
 * Wechaty bot use a Tuling123.com brain
 *
 * Apply your own tuling123.com API_KEY
 * at: http://www.tuling123.com/html/doc/api.html
 *
 * Enjoy!
 *
 * Wechaty - https://github.com/zixia/wechaty
 *
 */
const log = require('npmlog')
const co = require('co')
const Tuling123 = require('tuling123-client')

const Wechaty = require('../src/wechaty')
//log.level = 'verbose'
log.level = 'silly'

const TULING123_API_KEY = '18f25157e0446df58ade098479f74b21'
const brain = new Tuling123(TULING123_API_KEY)

const bot = new Wechaty({head: false})

console.log(`
Welcome to Tuling Wechaty Bot.
Tuling API: http://www.tuling123.com/html/doc/api.html
Loading...
`)

bot
.on('login'  , e => log.info('Bot', 'bot login.'))
.on('logout' , e => log.info('Bot', 'bot logout.'))
.on('scan', ({url, code}) => {
  console.log(`Scan qrcode in url to login: \n${url}`)
  console.log(code)
})
.on('message', m => {
  co(function* () {
    const msg = yield m.ready()
    log.info('Bot', 'recv: %s'  , msg)

    if (m.group()) {
      return
    }

    const reply = new Wechaty.Message()
    .set('to', m.get('from'))

    const content = m.get('content')
    const {code, text} = yield brain.ask(content, {userid: msg.get('from')})
    reply.set('content', text)

    yield bot.send(reply)
    log.info('Bot', `REPLY: {code:${code}, text:${text}}`)
  })
  .catch(e => log.error('Bot', 'on message rejected: %s' , e))
})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail:' + e)
  bot.quit()
  process.exit(-1)
})

