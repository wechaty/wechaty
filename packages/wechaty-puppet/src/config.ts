/**
 * Package-wide settings: the logger, the package `NAME` and `VERSION` (from
 * the embedded `package-json.ts`), and re-exports of the runtime classes the
 * puppet API exposes (`FileBox`, `MemoryCard`, `StateSwitch`) plus `envVars`.
 */
import { FileBox }      from 'file-box'
import { Brolog }       from 'brolog'
import { MemoryCard }   from 'memory-card'
import { StateSwitch }  from 'state-switch'

import { packageJson } from './package-json.ts'

import * as envVars from './env-vars.ts'

const log = new Brolog()
const logLevel = (globalThis as any).process?.env?.['WECHATY_LOG']
if (logLevel) {
  log.level(logLevel.toLowerCase() as any)
  log.silly('Puppet', 'Config: WECHATY_LOG set level to %s', logLevel)
}

const VERSION = packageJson.version || '0.0.0'
const NAME    = packageJson.name    || 'NONAME'

export {
  envVars,
  FileBox,
  log,
  MemoryCard,
  NAME,
  StateSwitch,
  VERSION,
}
