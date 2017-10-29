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

/**
 * Change `import { ... } from '../../'`
 * to     `import { ... } from 'wechaty'`
 * when you are runing with Docker or NPM instead of Git Source.
 */
import {
  config,
  Wechaty,
  log,
}           from '../../'

import { onMessage }  from './on-message'
import { onFriend }   from './on-friend'
import { onRoomJoin } from './on-room-join'

const welcome = `
=============== Powered by Wechaty ===============
-------- https://github.com/wechaty/wechaty --------

Please wait... I'm trying to login in...

`
console.log(welcome)

Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })

.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    const loginUrl = url.replace(/\/qrcode\//, '/l/')
    require('qrcode-terminal').generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})

.on('login'	  , function (this, user) {
  log.info('Bot', `${user.name()} logined`)
  this.say(`wechaty logined`)
})

.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('error'   , error => log.info('Bot', 'error: %s', error))

.on('message',    onMessage)
.on('friend',     onFriend)
.on('room-join',  onRoomJoin)

.init()
.catch(e => console.error(e))
