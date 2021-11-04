#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
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

import 'dotenv/config.js'

import {
  log,
}             from 'wechaty-puppet'
import {
  config,
}             from '../src/config.js'

import {
  IoClient,
  IoClientOptions,
}                   from '../src/io-client.js'
import { WechatyBuilder }  from '../src/wechaty-builder.js'

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
  const token = config.token

  if (!token) {
    throw new Error('token not found: please set WECHATY_TOKEN in environment before run io-client')
  }

  console.info(welcome)
  log.info('Client', 'Starting for WECHATY_TOKEN: %s', token)

  const wechaty = WechatyBuilder.build({ name: token })

  let port
  if (process.env['WECHATY_PUPPET_SERVER_PORT']) {
    port = parseInt(process.env['WECHATY_PUPPET_SERVER_PORT'])
  }

  const options: IoClientOptions = {
    token,
    wechaty,
  }
  if (port) {
    options.port = port
  }

  const client = new IoClient(options)

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
