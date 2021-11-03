#!/usr/bin/env node
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

import os from 'os'

import { config }   from '../src/config.js'
import { Doctor }   from '../src/doctor.js'
import { WechatyBuilder }  from '../src/wechaty-builder.js'

const wechaty = WechatyBuilder.singleton()
const doctor = new Doctor()

async function main () {
  let ipcTestResult: string
  try {
    await doctor.testTcp()
    ipcTestResult = 'PASS'
  } catch (err) {
    console.info(err)
    ipcTestResult = 'FAIL. Please check your tcp network, Wechaty need to listen on localhost and connect to it.'
  }

  console.info(`
  #### Wechaty Doctor

  1. Wechaty version: ${wechaty.version()}
  2. ${os.type()} ${os.arch()} version ${os.release()} memory ${Math.floor(os.freemem() / 1024 / 1024)}/${Math.floor(os.totalmem() / 1024 / 1024)} MB
  3. Docker: ${config.docker}
  4. Node version: ${process.version}
  5. Tcp IPC TEST: ${ipcTestResult}

  `)

}

main()
  .catch(err => console.error('main() exception: %s', err))
