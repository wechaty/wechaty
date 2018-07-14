#!/usr/bin/env node
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

/**
 * Change `import { ... } from '../'`
 * to     `import { ... } from 'wechaty'`
 * when you are runing with Docker or NPM instead of Git Source.
 */
import {
  config,
  Wechaty,
  log,
}             from '../src/'

async function main () {
  const bot = Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })

  bot
  .on('scan', (qrcode, status) => {
    generate(qrcode, { small: true })
    // Generate a QR Code online via
    // http://goqr.me/api/doc/create-qr-code/
    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('')
    console.log(`[${status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
  })
  .on('logout'  , user => log.info('Bot', `"${user.name()}" logouted`))
  .on('error'   , e => log.info('Bot', 'error: %s', e))

  /**
   * Global Event: login
   *
   * do initialization inside this event.
   * (better to set a timeout, for browser need time to download other data)
   */
  .on('login', user => {
    console.log(`${user} logined`)
  })

  /**
   * Global Event: message
   */
  .on('message', async function(msg) {
    console.log(msg.toString())
  })

  await bot.start()

  const searchTopic = process.argv[1]
  if (!searchTopic) {
    throw new Error('no arg 1 defined as search topic!')
  }

  const sayText = process.argv[2]
  if (!sayText) {
    throw new Error('no arg 2 defined as say text!')
  }

  const room = await bot.Room.find(searchTopic)

  if (!room) {
    console.log('not found')
    return
  }

  console.log(await room.topic(), 'found')
  await room.say(sayText)

}

main()
.catch((e: Error) => {
  console.error(e)
  process.exit(1)
})
