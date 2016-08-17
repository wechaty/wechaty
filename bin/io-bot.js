#!/usr/bin/env node

const log   = require('../src/npmlog-env')
const IoBot = require('../src/io-bot')


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

const profile = process.env.WECHATY_PROFILE || 'io-bot'
let token = process.env.WECHATY_TOKEN

if (!token) {
  log.error('Bot', 'token not found: please set WECHATY_TOKEN in environment before run io-bot')
  // process.exit(-1)
  token = 'DEMO'
  log.warn('Bot', `set token to "${token}" for demo purpose`)
} else {
  console.log(welcome)
  log.info('Bot', 'Starting for WECHATY_TOKEN: %s', token)
}

const ioBot = new IoBot({
  profile
  , token
  , log
})

ioBot.init()
    .catch(onError.bind(ioBot))

ioBot.initWeb()
    .catch(onError.bind(ioBot))

function onError(e) {
  log.error('Bot', 'initWeb() fail: %s', e)
  this.quit()
  process.exit(-1)
}

