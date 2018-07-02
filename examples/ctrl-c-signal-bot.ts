/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
/* tslint:disable:variable-name */
import { generate } from 'qrcode-terminal'
import { finis }    from 'finis'

import {
  Wechaty,
  log,
  qrcodeValueToImageUrl,
}                         from '../src/'  // from 'wechaty'

const bot = Wechaty.instance()

const welcome = `
| __        __        _           _
| \\ \\      / /__  ___| |__   __ _| |_ _   _
|  \\ \\ /\\ / / _ \\/ __| '_ \\ / _\` | __| | | |
|   \\ V  V /  __/ (__| | | | (_| | |_| |_| |
|    \\_/\\_/ \\___|\\___|_| |_|\\__,_|\\__|\\__, |
|                                     |___/

=============== Powered by Wechaty ===============
-------- https://github.com/chatie/wechaty --------
          Version: ${bot.version(true)}

I'm a bot, my superpower is:

  Send message to myself before I die.
  (When you press Ctrl+C, or kill me with a signal)
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me to more superpowers!

Please wait... I'm trying to login in...

`

console.log(welcome)

bot
.on('login'	  , user => {
  log.info('Bot', `${user.name()} login`)
  bot.say('Wechaty login').catch(console.error)
})
.on('scan', (qrcode, status, data) => {
  generate(qrcode, { small: true })
  if (data) {
    console.log(data)
  }
  console.log(qrcodeValueToImageUrl(qrcode))
  console.log('^^^ Online QR Code Image URL ^^^ ')
  console.log(`[${status}] ${qrcode} Scan QR Code above url to log in: `)
})
.on('message', async msg => {
  console.log(msg.toString())
  console.log('Please press Ctrl+C to kill me!')
  console.log(`Then I'll send my last word to myself, check it out on your Wechat!`)
})

bot.on('error', async e => {
  log.error('Bot', 'error: %s', e)
  if (bot.logonoff()) {
    await bot.say('Wechaty error: ' + e.message).catch(console.error)
  }
})

let killChrome: NodeJS.SignalsListener

bot.start()
.then(() => {
  const listenerList = process.listeners('SIGINT')
  for (const listener of listenerList) {
    if (listener.name === 'killChrome') {
      process.removeListener('SIGINT', listener)
      killChrome = listener
    }
  }
})
.catch(async e => {
  log.error('Bot', 'start() fail: %s', e)
  await bot.stop()
  process.exit(-1)
})

let quiting = false
finis(async (code, signal) => {
  log.info('Bot', 'finis(%s, %s)', code, signal)

  if (!bot.logonoff()) {
    log.info('Bot', 'finis() bot had been already stopped')
    doExit(code)
  }

  if (quiting) {
    log.warn('Bot', 'finis() already quiting... return and wait...')
    return
  }

  quiting = true
  let done = false
  // let checkNum = 0

  const exitMsg = `Wechaty will exit ${code} because of ${signal} `

  log.info('Bot', 'finis() broadcast quiting message for bot')
  await bot.say(exitMsg)
      // .then(() => bot.stop())
      .catch(e => log.error('Bot', 'finis() catch rejection: %s', e))
      .then(() => done = true)

  setImmediate(checkForExit)

  function checkForExit() {
    // if (checkNum++ % 100 === 0) {
    log.info('Bot', 'finis() checkForExit() checking done: %s', done)
    // }
    if (done) {
      log.info('Bot', 'finis() checkForExit() done!')
      setTimeout(() => doExit(code), 1000)  // delay 1 second
      return
    }
    // death loop to wait for `done`
    // process.nextTick(checkForExit)
    // setImmediate(checkForExit)
    setTimeout(checkForExit, 100)
  }
})

function doExit(code: number): void {
  log.info('Bot', 'doExit(%d)', code)
  if (killChrome) {
    killChrome('SIGINT')
  }
  process.exit(code)
}

// process.on('SIGINT', function() {
//   console.log('Nice SIGINT-handler')
//   const listeners = process.listeners('SIGINT')
//   for (let i = 0; i < listeners.length; i++) {
//       console.log(listeners[i].toString())
//   }
// })
