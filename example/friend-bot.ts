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

/* tslint:disable:variable-name */
const QrcodeTerminal = require('qrcode-terminal')

/**
 * Change `import { ... } from '../'`
 * to     `import { ... } from 'wechaty'`
 * when you are runing with Docker or NPM instead of Git Source.
 */
import {
  config,
  Contact,
  log,
  Wechaty,
}           from '../'

const welcome = `
=============== Powered by Wechaty ===============
-------- https://github.com/wechaty/wechaty --------

Hello,

I'm a Wechaty Botie with the following super powers:

1. Send Friend Request
2. Accept Friend Request
3. Recongenize Verify Message

If you send friend request to me,
with a verify message 'ding',
I will accept your request automaticaly!
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me for more super powers!

Please wait... I'm trying to login in...

`

console.log(welcome)
const bot = Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })

bot
.on('login'	  , user => log.info('Bot', `${user.name()} logined`))
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('error'   , e => log.info('Bot', 'error: %s', e))
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    const loginUrl = url.replace(/\/qrcode\//, '/l/')
    QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
/**
 *
 * Wechaty Event: `friend`
 *
 */
.on('friend', async (contact, request) => {
  let logMsg
  const fileHelper = Contact.load('filehelper')

  try {
    logMsg = 'received `friend` event from ' + contact.get('name')
    fileHelper.say(logMsg)
    console.log(logMsg)

    if (request) {
      /**
       *
       * 1. New Friend Request
       *
       * when request is set, we can get verify message from `request.hello`,
       * and accept this request by `request.accept()`
       */
      if (request.hello === 'ding') {
        logMsg = 'accepted because verify messsage is "ding"'
        request.accept()

      } else {
        logMsg = 'not auto accepted, because verify message is: ' + request.hello
      }
    } else {
      /**
       *
       * 2. Friend Ship Confirmed
       *
       */
      logMsg = 'friend ship confirmed with ' + contact.get('name')
    }
  } catch (e) {
    logMsg = e.message
  }

  console.log(logMsg)
  fileHelper.say(logMsg)

})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail: %s', e)
  bot.quit()
  process.exit(-1)
})
