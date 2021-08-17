import { log } from 'brolog'
import { FileBox } from 'file-box'
import { MemoryCard } from 'memory-card'
import { StateSwitch } from 'state-switch'

import { VERSION } from './version'

import * as envVars from './env-vars'

const logLevel = process.env['WECHATY_LOG']
if (logLevel) {
  log.level(logLevel.toLowerCase() as any)
  log.silly('Puppet', 'Config: WECHATY_LOG set level to %s', logLevel)
}

export {
  log,
  envVars,
  FileBox,
  MemoryCard,
  StateSwitch,
  VERSION,
}
