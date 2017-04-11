#!/usr/bin/env node
/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */

import * as os from 'os'

import {
  Config,
}                   from '../src/config'
import { Wechaty }  from '../src/wechaty'

import { Doctor }   from '../src/doctor'

const wechaty = Wechaty.instance()
const doctor = new Doctor()

async function main() {
  let ipcTestResult: string
  let chromedriverVersion = doctor.chromedriverVersion()
  try {
    await doctor.testTcp()
    ipcTestResult = 'PASS'
  } catch (err) {
    console.log(err)
    ipcTestResult = 'FAIL. Please check your tcp network, Wechaty need to listen on localhost and connect to it.'
  }

  console.log(`
  #### Wechaty Doctor

  1. Wechaty version: ${wechaty.version()}
  2. ${os.type()} ${os.arch()} version ${os.release()} memory ${Math.floor(os.freemem() / 1024 / 1024)}/${Math.floor(os.totalmem() / 1024 / 1024)} MB
  3. Docker: ${Config.isDocker}
  4. Node version: ${process.version}
  5. Tcp IPC TEST: ${ipcTestResult}
  6. Chromedriver: ${chromedriverVersion}

  `)

}

try {
  main()
} catch (err) {
  console.error('main() exception: %s', err.message || err)
}
