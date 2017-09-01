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

// import { inspect }            from 'util'
import {
  createWriteStream,
  // writeFileSync,
}                           from 'fs'

/* tslint:disable:variable-name */
import * as qrcodeTerminal  from 'qrcode-terminal'

/**
 * Change `import { ... } from '../'`
 * to     `import { ... } from 'wechaty'`
 * when you are runing with Docker or NPM instead of Git Source.
 */
import {
  config,
  Message,
  MsgType,
  Wechaty,
}           from '../'
const bot = Wechaty.instance({ profile: config.DEFAULT_PROFILE })

bot
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    const loginUrl = url.replace(/\/qrcode\//, '/l/')
    qrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
.on('login'	  , user => console.log(`${user} logined`))
.on('message', m => {
  console.log(`RECV: ${m}`)

  // console.log(inspect(m))
  // saveRawObj(m.rawObj)

  if ( m.type() === MsgType.IMAGE
    || m.type() === MsgType.EMOTICON
    || m.type() === MsgType.VIDEO
    || m.type() === MsgType.VOICE
    || m.type() === MsgType.MICROVIDEO
    || m.type() === MsgType.APP
    || (m.type() === MsgType.TEXT && m.typeSub() === MsgType.LOCATION)  // LOCATION
  ) {
    saveMediaFile(m)
  }
})
.init()
.catch(e => console.error('bot.init() error: ' + e))

async function saveMediaFile(message: Message) {
  const filename = message.filename()
  console.log('IMAGE local filename: ' + filename)

  const fileStream = createWriteStream(filename)

  console.log('start to readyStream()')
  try {
    const netStream = await message.readyStream()
    netStream
      .pipe(fileStream)
      .on('close', _ => console.log('finish readyStream()'))
  } catch (e) {
    console.error('stream error:', e)
  }
}

// function saveRawObj(o) {
//   writeFileSync('rawObj.log', JSON.stringify(o, null, '  ') + '\n\n\n', { flag: 'a' })
// }
