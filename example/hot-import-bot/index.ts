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
const finis = require('finis')

/**
 * Change `import { ... } from '../'`
 * to     `import { ... } from 'wechaty'`
 * when you are running with Docker or NPM instead of Git Source.
 */
import {
  config,
  Wechaty,
  log,
}  from '../';

const bot = Wechaty.instance({profile: config.default.DEFAULT_PROFILE})

bot
  .on('login', 'listener/login')
  .on('friend', 'listener/friend')
  .on('scan', 'listener/scan')
  .on('message', 'listener/message')

bot.start()
  .catch(e => {
    log.error('Bot', 'init() fail: %s', e)
    bot.quit()
    process.exit(-1)
  })

finis((code, signal) => {
  const exitMsg = `Wechaty exit ${code} because of ${signal} `
  console.log(exitMsg)
  bot.say(exitMsg)
})
