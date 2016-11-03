#!/usr/bin/env node

import * as os from 'os'

import {
    Config
  , Wechaty
} from '../'

const wechaty = Wechaty.instance()

console.log(`
#### Wechaty Doctor

1. Wechaty version: ${wechaty.version()}
2. ${os.type()} ${os.arch()} version ${os.release()} memory ${Math.floor(os.freemem() / 1024 / 1024)}/${Math.floor(os.totalmem() / 1024 / 1024)} MB
3. Docker: ${Config.isDocker}
`)
