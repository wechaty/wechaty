////////////////////////////////////////////////////////////////////////////
// Program: monster
// Purpose: monster all-in-one demo of Wechaty hot
// Authors: Tong Sun (c) 2018, All rights reserved
//          Huan LI  (c) 2018, All rights reserved
//          xinbenlv (c) 2017, All rights reserved
////////////////////////////////////////////////////////////////////////////

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
 * Based on the Wechaty hot import bot example
 *
 * Hot import Wechaty listenser functions after change the source code without restart the program
 *
 * P.S. We are using the hot-import module:
 *   * Hot Module Replacement(HMR) for Node.js
 *   * https://www.npmjs.com/package/hot-import
 *
 */

const finis = require('finis')
const { Wechaty } = require('wechaty')

const bot = Wechaty.instance({ profile: "default"})

async function main() {

  bot
    .on('scan',     './listeners/on-scan')
    .on('login',    './listeners/on-login')
    .on('message',  './listeners/on-message')
    .on('friend',   './listeners/on-friend')
    .start()
    .catch(async function(e) {
      console.log(`Init() fail: ${e}.`)
      await bot.stop()
      process.exit(1)
    })
}

main()

finis((code, signal, error) => {
  console.log('Importand data saved at this step.')
  
  // await bot.stop()
  bot.stop()
  console.log(`Wechaty exit ${code} because of ${signal}/${error})`)
  process.exit(1)
})

