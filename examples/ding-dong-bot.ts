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
import {
  Contact,
  Message,
  Wechaty,
}           from '../src/' // from 'wechaty'

import { FileBox }  from 'file-box'
import { generate } from 'qrcode-terminal'

/**
 *
 * 1. Declare your Bot!
 *
 */
const bot = new Wechaty({
  name : 'ding-dong-bot',
})

/**
 *
 * 2. Register event handlers for Bot
 *
 */
bot
.on('logout', onLogout)
.on('login',  onLogin)
.on('scan',   onScan)
.on('error',  onError)
.on('message', onMessage)

/**
 *
 * 3. Start the bot!
 *
 */
bot.start()
.catch(async e => {
  console.error('Bot start() fail:', e)
  await bot.stop()
  process.exit(-1)
})

/**
 *
 * 4. You are all set. ;-]
 *
 */

/**
 *
 * 5. Define Event Handler Functions for:
 *  `scan`, `login`, `logout`, `error`, and `message`
 *
 */
function onScan (qrcode: string, status: number) {
  generate(qrcode, { small: true })

  // Generate a QR Code online via
  // http://goqr.me/api/doc/create-qr-code/
  const qrcodeImageUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('')

  console.log(`[${status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
}

function onLogin (user: Contact) {
  console.log(`${user.name()} login`)
  bot.say('Wechaty login').catch(console.error)
}

function onLogout (user: Contact) {
  console.log(`${user.name()} logouted`)
}

function onError (e: Error) {
  console.error('Bot error:', e)
  /*
  if (bot.logonoff()) {
    bot.say('Wechaty error: ' + e.message).catch(console.error)
  }
  */
}

/**
 *
 * 6. The most important handler is for:
 *    dealing with Messages.
 *
 */
async function onMessage (msg: Message) {
  console.log(msg.toString())

  if (msg.age() > 60) {
    console.log('Message discarded because its TOO OLD(than 1 minute)')
    return
  }

  if (   msg.type() !== bot.Message.Type.Text
      || !/^(ding|ping|bing|code)$/i.test(msg.text())
      /*&& !msg.self()*/
  ) {
    console.log('Message discarded because it does not match ding/ping/bing/code')
    return
  }

  /**
   * 1. reply 'dong'
   */
  await msg.say('dong')
  console.log('REPLY: dong')

  /**
   * 2. reply image(qrcode image)
   */
  const fileBox = FileBox.fromUrl('https://chatie.io/wechaty/images/bot-qr-code.png')

  await msg.say(fileBox)
  console.log('REPLY: %s', fileBox.toString())

  /**
   * 3. reply 'scan now!'
   */
  await msg.say([
    'Join Wechaty Developers Community\n\n',
    'Scan now, because other Wechaty developers want to talk with you too!\n\n',
    '(secret code: wechaty)',
  ].join(''))
}

/**
 *
 * 7. Output the Welcome Message
 *
 */
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

I'm a bot, my superpower is talk in Wechat.

If you send me a 'ding', I will reply you a 'dong'!
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me to more superpowers!

Please wait... I'm trying to login in...

`
console.log(welcome)
