import { log } from 'brolog'
import { FileBox } from 'file-box'
import { MemoryCard } from 'memory-card'
import { StateSwitch } from 'state-switch'

import { packageJson } from './package-json.js'

import * as envVars from './env-vars.js'

const logLevel = process.env['WECHATY_LOG']
if (logLevel) {
  log.level(logLevel.toLowerCase() as any)
  log.silly('Puppet', 'Config: WECHATY_LOG set level to %s', logLevel)
}

const VERSION = packageJson.version || '0.0.0'
const NAME = packageJson.name || 'Unnamed'

export {
  envVars,
  FileBox,
  log,
  MemoryCard,
  NAME,
  StateSwitch,
  VERSION,
}
