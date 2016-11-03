#!/usr/bin/env node

import {
  IoClient
  , Config
  , log
} from '../'

const welcome = `
| __        __        _           _
| \\ \\      / /__  ___| |__   __ _| |_ _   _
|  \\ \\ /\\ / / _ \\/ __| '_ \\ / _\` | __| | | |
|   \\ V  V /  __/ (__| | | | (_| | |_| |_| |
|    \\_/\\_/ \\___|\\___|_| |_|\\__,_|\\__|\\__, |
|                                     |___/

=============== Powered by Wechaty ===============
       -------- https://wechaty.io --------

I'm a bot, my super power is download cloud bot from wechaty.io

__________________________________________________

`

let   token   = Config.token

if (!token) {
  log.error('Client', 'token not found: please set WECHATY_TOKEN in environment before run io-client')
  // process.exit(-1)
  token = Config.DEFAULT_TOKEN
  log.warn('Client', `set token to "${token}" for demo purpose`)
}

console.log(welcome)
log.info('Client', 'Starting for WECHATY_TOKEN: %s', token)

const client = new IoClient(token, log)

client.init()
    .catch(onError.bind(client))

client.initWeb()
    .catch(onError.bind(client))

function onError(e) {
  log.error('Client', 'initWeb() fail: %s', e)
  this.quit()
  process.exit(-1)
}
