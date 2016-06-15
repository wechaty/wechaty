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
const co  = require('co')
const Tuling123 = require('tuling123-client')
const EventEmitter2 = require('eventemitter2')

const Wechaty = require('..')
//log.level = 'verbose'
// log.level = 'silly'

/**
 *
 * Apply Your Own Tuling123 Developer API_KEY at:
 * http://www.tuling123.com
 *
 */
const TULING123_API_KEY = '18f25157e0446df58ade098479f74b21'
const brain = new Tuling123(TULING123_API_KEY)

const bot = new Wechaty({ session: 'example-bot.wechaty.json' })

console.log(`
Welcome to Tuling Wechaty Bot.
Tuling API: http://www.tuling123.com/html/doc/api.html

Notice: This bot will only active in the room which name contains 'wechaty'.
/* if (/Wechaty/i.test(room.get('name'))) { */

Loading...
`)

bot
.on('login'  , user => log.info('Bot', `bot login: ${user}`))
.on('logout' , e => log.info('Bot', 'bot logout.'))
.on('scan', ({url, code}) => {
  console.log(`Scan QR Code in url to login: w${code}\n${url}`)
})
.on('message', m => {
  if (m.self()) return

  co(function* () {
    const msg = yield m.ready()
    const room = Wechaty.Room.load(m.get('room'))

    if (room && /Wechaty/i.test(room.get('name'))) {
      log.info('Bot', 'talk: %s'  , msg)
      talk(m)
    } else {
      log.info('Bot', 'recv: %s'  , msg)
    }
  })
  .catch(e => log.error('Bot', 'on message rejected: %s' , e))
})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail:' + e)
  bot.quit()
  process.exit(-1)
})

class Talker extends EventEmitter2 {
  constructor(thinker) {
    log.verbose('Talker()')
    super()
    this.thinker = thinker
    this.obj = {
      text: []
      , time: []
    }
    this.timer = null
  }

  save(text) {
    log.verbose('Talker', 'save(%s)', text)
    this.obj.text.push(text)
    this.obj.time.push(Date.now())
  }
  load() {
    const text = this.obj.text.join(', ')
    log.verbose('Talker', 'load(%s)', text)
    this.obj.text = []
    this.obj.time = []
    return text
  }

  updateTimer(delayTime) {
    delayTime = delayTime || this.delayTime()
    log.verbose('Talker', 'updateTimer(%s)', delayTime)

    if (this.timer) { clearTimeout(this.timer) }
    this.timer = setTimeout(this.say.bind(this), delayTime)
  }

  hear(text) {
    log.verbose('Talker', `hear(${text})`)
    this.save(text)
    this.updateTimer()
  }
  say() {
    log.verbose('Talker', 'say()')
    const text  = this.load()
    this.thinker(text)
    .then(reply => this.emit('say', reply))
    this.timer = null
  }

  delayTime() {
    const minDelayTime = 5000
    const maxDelayTime = 15000
    const delayTime = Math.floor(Math.random() * (maxDelayTime - minDelayTime)) + minDelayTime
    return delayTime
  }
}

var Talkers = []

function talk(m) {
  const fromId  = m.get('from')
  const roomId =  m.get('room')
  const content = m.get('content')

  const talkerName = fromId + roomId
  if (!Talkers[talkerName]) {
    Talkers[talkerName] = new Talker(function(text) {
      return brain.ask(text, {userid: talkerName})
      .then(r => {
        log.info('Tuling123', 'Talker reply:"%s" for "%s" ', r.text, text)
        return r.text
      })
    })
    Talkers[talkerName].on('say', reply => bot.reply(m, reply))
  }
  Talkers[talkerName].hear(content)
}
