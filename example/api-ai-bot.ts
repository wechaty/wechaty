/**
 *
 * Wechaty bot use a ApiAi.com brain
 *
 * Apply Your Own ApiAi Developer API_KEY at:
 * http://www.api.ai
 *
 * Enjoy!
 *
 * Wechaty - https://github.com/zixia/wechaty
 *
 */
import { Brolog as log } from 'brolog'
/* tslint:disable:no-var-requires */
const co  = require('co')
/* tslint:disable:variable-name */
const ApiAi = require('apiai')
import { EventEmitter } from 'events'

import {
  // Room
  Wechaty
} from '..'

// log.level = 'verbose'
// log.level = 'silly'

/**
 *
 * `7217d7bce18c4bcfbe04ba7bdfaf9c08` for Wechaty demo
 *
 */
const APIAI_API_KEY = '7217d7bce18c4bcfbe04ba7bdfaf9c08'
const brainApiAi = ApiAi(APIAI_API_KEY)

const bot = Wechaty.instance({ profile: 'example-bot.wechaty.json' })

console.log(`
Welcome to api.AI Wechaty Bot.
Api.AI Doc: https://docs.api.ai/v16/docs/get-started

Notice: This bot will only active in the room which name contains 'wechaty'.
/* if (m.room() && /Wechaty/i.test(m.room().name())) { */

Loading... please wait for QrCode Image Url and then scan to login.
`)

bot
.on('scan', (url, code) => {
  console.log(`[${code}]Scan QR Code in url to login:\n${url}`)
})
.on('login'  , user => log.info('Bot', `bot login: ${user}`))
.on('logout' , e => log.info('Bot', 'bot logout.'))
.on('message', m => {
  if (bot.self(m)) { return }

  co(function* () {
    const msg = yield m.ready()
    const room = m.room()

    if (room && /Wechaty/i.test(room.topic())) {
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

class Talker extends EventEmitter {
  private thinker
  private obj
  private timer

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

  public save(text) {
    log.verbose('Talker', 'save(%s)', text)
    this.obj.text.push(text)
    this.obj.time.push(Date.now())
  }
  public load() {
    const text = this.obj.text.join(', ')
    log.verbose('Talker', 'load(%s)', text)
    this.obj.text = []
    this.obj.time = []
    return text
  }

  public updateTimer(delayTime?) {
    delayTime = delayTime || this.delayTime()
    log.verbose('Talker', 'updateTimer(%s)', delayTime)

    if (this.timer) { clearTimeout(this.timer) }
    this.timer = setTimeout(this.say.bind(this), delayTime)
  }

  public hear(text) {
    log.verbose('Talker', `hear(${text})`)
    this.save(text)
    this.updateTimer()
  }
  public say() {
    log.verbose('Talker', 'say()')
    const text  = this.load()
    this.thinker(text)
    .then(reply => this.emit('say', reply))
    this.timer = null
  }

  public delayTime() {
    const minDelayTime = 5000
    const maxDelayTime = 15000
    const delayTime = Math.floor(Math.random() * (maxDelayTime - minDelayTime)) + minDelayTime
    return delayTime
  }
}

/* tslint:disable:variable-name */
let Talkers = []

function talk(m) {
  const fromId  = m.get('from')
  const roomId = m.get('room')
  const content = m.get('content')

  const talkerName = fromId + roomId
  if (!Talkers[talkerName]) {
    Talkers[talkerName] = new Talker(function(text) {
      return new Promise((resolve, reject) => {
        brainApiAi.textRequest(text)
        .on('response', function(response) {
          console.log(response)
          /*
{ id: 'a09381bb-8195-4139-b49c-a2d03ad5e014',
  timestamp: '2016-05-27T17:22:46.597Z',
  result:
   { source: 'domains',
     resolvedQuery: 'hi',
     action: 'smalltalk.greetings',
     parameters: { simplified: 'hello' },w
     metadata: {},
     fulfillment: { speech: 'Hi there.' },
     score: 0 },
  status: { code: 200, errorType: 'success' } }
          */
          const reply = response.result.fulfillment.speech
          if (!reply) {
            log.info('ApiAi', `Talker do not want to talk for "${text}"`)
            return reject()
          }
          log.info('ApiAi', 'Talker reply:"%s" for "%s" ', reply, text)
          return resolve(reply)
        })
        .on('error', function(error) {
          log.error('ApiAi', error)
          reject(error)
        })
        .end()
      })
    })
    Talkers[talkerName].on('say', reply => bot.reply(m, reply))
  }
  Talkers[talkerName].hear(content)
}
