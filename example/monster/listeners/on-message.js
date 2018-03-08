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

const fs = require('fs')

const { MediaMessage } = require('wechaty')
const { Misc } = require('wechaty/misc')

export default async function onMessage (message) {
  console.log(`Received type: ${message.type()}:${message.typeSub()}`)
  if (message instanceof MediaMessage) {
    saveMediaFile(message)
    return
  }
  console.log(`Received message: ${Misc.digestEmoji(message)}`)
}

async function saveMediaFile(message) {
  const filename = message.filename()
  console.log('IMAGE local filename: ' + filename)

  const fileStream = fs.createWriteStream(filename)

  console.log('start to readyStream()')
  try {
    const netStream = await message.readyStream()
    netStream
      .pipe(fileStream)
      .on('close', _ => {
        const stat = fs.statSync(filename)
        console.log('finish readyStream() for ', filename, ' size: ', stat.size)
      })
  } catch (e) {
    console.error('stream error:', e)
  }
}
