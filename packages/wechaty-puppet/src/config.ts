import { log } from 'brolog'
import { FileBox } from 'file-box'
import { MemoryCard } from 'memory-card'
import { StateSwitch } from 'state-switch'

import { VERSION } from './version'

const logLevel = process.env['WECHATY_LOG']
if (logLevel) {
  log.level(logLevel.toLowerCase() as any)
  log.silly('Puppet', 'Config: WECHATY_LOG set level to %s', logLevel)
}

const WECHATY_PUPPET_LRU_CACHE_SIZE_CONTACT = process.env['WECHATY_PUPPET_LRU_CACHE_SIZE_CONTACT'] || '3000'
const WECHATY_PUPPET_LRU_CACHE_SIZE_FRIENDSHIP = process.env['WECHATY_PUPPET_LRU_CACHE_SIZE_FRIENDSHIP'] || '100'
const WECHATY_PUPPET_LRU_CACHE_SIZE_MESSAGE = process.env['WECHATY_PUPPET_LRU_CACHE_SIZE_MESSAGE'] || '500'
const WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM = process.env['WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM'] || '500'
const WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_INVITATION = process.env['WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_INVITATION'] || '100'
const WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_MEMBER = process.env['WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_MEMBER'] || '30000'

export {
  log,
  FileBox,
  MemoryCard,
  StateSwitch,
  VERSION,
  WECHATY_PUPPET_LRU_CACHE_SIZE_CONTACT,
  WECHATY_PUPPET_LRU_CACHE_SIZE_FRIENDSHIP,
  WECHATY_PUPPET_LRU_CACHE_SIZE_MESSAGE,
  WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM,
  WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_INVITATION,
  WECHATY_PUPPET_LRU_CACHE_SIZE_ROOM_MEMBER,
}
