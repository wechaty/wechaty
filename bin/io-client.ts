#!/usr/bin/env node
/**
 *   Wechaty - https://github.com/wechaty/wechaty
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
  config,
  log,
}               from '../src/config'

import { IoClient } from '../src/io-client'
import { Wechaty }  from '../src/wechaty'

const welcome = `
| __        __        _           _
| \\ \\      / /__  ___| |__   __ _| |_ _   _
|  \\ \\ /\\ / / _ \\/ __| '_ \\ / _\` | __| | | |
|   \\ V  V /  __/ (__| | | | (_| | |_| |_| |
|    \\_/\\_/ \\___|\\___|_| |_|\\__,_|\\__|\\__, |
|                                     |___/

=============== Powered by Wechaty ===============
       -------- https://www.chatie.io --------

My super power: download cloud bot from www.chatie.io

__________________________________________________

`

async function main () {
  let token = config.token

  if (!token) {
    throw new Error('token not found: please set WECHATY_TOKEN in environment before run io-client')
  }

  console.info(welcome)
  log.info('Client', 'Starting for WECHATY_TOKEN: %s', token)

  const wechaty = new Wechaty({ name: token })

  const client = new IoClient({
    token,
    wechaty,
  })

  client.start()
    .catch(onError.bind(client))
}

async function onError (
  this : IoClient,
  e    : Error,
) {
  log.error('Client', 'start() fail: %s', e)
  await this.quit()
  process.exit(-1)
}

main()
  .catch(console.error)
