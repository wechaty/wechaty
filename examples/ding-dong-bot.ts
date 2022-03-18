/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
  WechatyBuilder,
  ScanStatus,
  Message,
  Contact,
}                     from '../src/mods/mod.js' // from 'wechaty'

import qrTerm from 'qrcode-terminal'
import { FileBox } from 'file-box'

/**
 *
 * 1. Declare your Bot!
 *
 */
const options = {
  name : 'ding-dong-bot',

  /**
   * You can specify different puppet for different IM protocols.
   * Learn more from https://wechaty.js.org/docs/puppet-providers/
   */
  // puppet: 'wechaty-puppet-whatsapp'

  /**
   * You can use wechaty puppet provider 'wechaty-puppet-service'
   *   which can connect to Wechaty Puppet Services
   *   for using more powerful protocol.
   * Learn more about services (and TOKEN)from https://wechaty.js.org/docs/puppet-services/
   */
  // puppet: 'wechaty-puppet-service'
  // puppetOptions: {
  //   token: 'xxx',
  // }
}

const bot = WechatyBuilder.build(options)

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
  .start()
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
function onScan (qrcode: string, status: ScanStatus) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    qrTerm.generate(qrcode)

    const qrcodeImageUrl = [
      'https://wechaty.js.org/qrcode/',
      encodeURIComponent(qrcode),
    ].join('')

    console.info('onScan: %s(%s) - %s', ScanStatus[status], status, qrcodeImageUrl)
  } else {
    console.info('onScan: %s(%s)', ScanStatus[status], status)
  }

  // console.info(`[${ScanStatus[status]}(${status})] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
}

function onLogin (user: Contact) {
  console.info(`${user.name()} login`)
}

function onLogout (user: Contact) {
  console.info(`${user.name()} logged out`)
}

function onError (e: Error) {
  console.error('Bot error:', e)
  /*
  if (bot.isLoggedIn) {
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
  console.info(msg.toString())

  if (msg.self()) {
    console.info('Message discarded because its outgoing')
    return
  }

  if (msg.age() > 2 * 60) {
    console.info('Message discarded because its TOO OLD(than 2 minutes)')
    return
  }

  if (msg.type() !== bot.Message.Type.Text
    || !/^(ding|ping|bing|code)$/i.test(msg.text())
  ) {
    console.info('Message discarded because it does not match ding/ping/bing/code')
    return
  }

  /**
   * 1. reply 'dong'
   */
  await msg.say('dong')
  console.info('REPLY: dong')

  /**
   * 2. reply image(qrcode image)
   */
  const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')

  await msg.say(fileBox)
  console.info('REPLY: %s', fileBox.toString())

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
-------- https://github.com/wechaty/wechaty --------
          Version: ${bot.version()}

I'm a bot, my superpower is talk in Wechat.

If you send me a 'ding', I will reply you a 'dong'!
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me to more superpowers!

Please wait... I'm trying to login in...

`
console.info(welcome)
