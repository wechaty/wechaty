/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import * as path      from 'path'

/* tslint:disable:variable-name */
const QrcodeTerminal  = require('qrcode-terminal')
const finis           = require('finis')

/**
 * Change `import { ... } from '../'`
 * to     `import { ... } from 'wechaty'`
 * when you are runing with Docker or NPM instead of Git Source.
 */
import {
  config,
  Wechaty,
  log,
  Message,
  MediaMessage,
}               from '../index'

const BOT_QR_CODE_IMAGE_FILE = path.join(
  __dirname,
  '../docs/images/apple.png',
)
var count = 0

const welcome = `
| __        __        _           _
| \\ \\      / /__  ___| |__   __ _| |_ _   _
|  \\ \\ /\\ / / _ \\/ __| '_ \\ / _\` | __| | | |
|   \\ V  V /  __/ (__| | | | (_| | |_| |_| |
|    \\_/\\_/ \\___|\\___|_| |_|\\__,_|\\__|\\__, |
|                                     |___/

=============== Powered by Wechaty ===============
-------- https://github.com/chatie/wechaty --------

I'm a bot, my superpower is talk in Wechat.

If you send me a 'ding', I will reply you a 'dong'!
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me to more superpowers!

Please wait... I'm trying to login in...

`

console.log(welcome)
const bot = Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })
const num = 0

bot
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('login'	  , user => {
  log.info('Bot', `${user.name()} login`)
  bot.say('Wechaty login').catch(console.error)
})
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    const loginUrl = url.replace(/\/qrcode\//, '/l/')
    QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code above url to log in: `)
})
.on('message', async m => {
  try {
    const room = m.room()
    console.log(
      (room ? `${room}` : '')
      + `${m.from()}:${m}`,
    )

    if (/^(play)$/i.test(m.content()) && !m.self()) {
      await m.say('Starting Game!')
      log.info('Bot', 'REPLY: Starting Game!')
     
      const playGame =  `Let's Review Today!\n\n` +
                            `What is the following picture?`

      await m.say(playGame)
      await m.say(new MediaMessage(BOT_QR_CODE_IMAGE_FILE))
      //await m.say('PSSSST: WHAT IS THIS?')
      log.info('Bot', 'REPLY: Image')
      // Don't forget to add && !m.self()
      if(num>0) return
      num++
      bot.on('message',async play(n:Message)=>{
        if(/^(play)$/.test(n.content()) || n.self()) return
        if (/^(apple|Apple)$/i.test(m.content())) {
         await m.say('Incorrect! Please try again.')
          log.info('Bot', 'REPLY: Starting Game!')
          log.info(m.content())
        } else {
          await m.say('Correct. Say "play" to play again.')
        }
        bot.removeListener('message',play)
        num--
      })


      log.info('Bot', 'REPLY: Starting Game!')

    }
  } catch (e) {
    log.error('Bot', 'on(message) exception: %s' , e)
  }
})

bot.start()
.catch(e => {
  log.error('Bot', 'start() fail: %s', e)
  bot.stop()
  process.exit(-1)
})

bot.on('error', async e => {
  log.error('Bot', 'error: %s', e)
  if (bot.logonoff()) {
    await bot.say('Wechaty error: ' + e.message).catch(console.error)
  }
  // await bot.stop()
})

let quiting = false
finis(async (code, signal) => {
  if (quiting) {
    log.warn('Bot', 'finis(%s, %s) called when quiting... just wait...', code, signal)
    return
  }
  quiting = true
  log.info('Bot', 'finis(%s, %s)', code, signal)
  const exitMsg = `Wechaty will exit ${code} because of ${signal} `
  if (bot.logonoff()) {
    log.info('Bot', 'finis() stoping bot')
    await bot.say(exitMsg).catch(console.error)
  } else {
    log.info('Bot', 'finis() bot had been already stopped')
  }
  setTimeout(async () => {
    log.info('Bot', 'finis() setTimeout() going to exit with %d', code)
    try {
      if (bot.logonoff()) {
        await bot.stop()
      }
    } catch (e) {
      log.error('Bot', 'finis() setTimeout() exception: %s', e)
    } finally {
      process.exit(code)
    }
  }, 3 * 1000)
})
