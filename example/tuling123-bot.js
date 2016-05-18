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

const bot = new Wechaty({head: true})

console.log(`
Welcome to Tuling Wechaty Bot.
Tuling API: http://www.tuling123.com/html/doc/api.html
Loading...
`)

bot.init()
.then(bot.getLoginQrImgUrl.bind(bot))
.then(url => console.log(`Scan to login:\n${url}`))
.catch(e => {
  log.error('Bot', 'init() fail:' + e)
  bot.quit()
  process.exit(-1)
})

bot.on('message', m => {
  co(function* () {
    const msg = yield m.ready()
    log.info('Bot', 'recv: %s'  , msg)

    if (!m.inGroup()) {
      const r = new Wechaty.Message()
      .set('to', m.get('from'))

      const answer = brain.ask(m.get('content'))
      r.set('content', answer)

      yield bot.send(r)
      log.info('Bot', `REPLY: ${answer}`)
    }
  })
  .catch(e => log.error('Bot', 'on message rejected: %s' , e))
})

bot.on('login'  , e => log.info('Bot', 'bot login.'))
bot.on('logout' , e => log.info('Bot', 'bot logout.'))
