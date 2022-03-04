import type * as PUPPET from 'wechaty-puppet'
import type {
  MemoryCard,
}                       from 'memory-card'

import type {
  PuppetModuleName,
}                             from '../puppet-config.js'

interface WechatyPuppetOptionsName {
  puppet?        : PuppetModuleName
  puppetOptions? : PUPPET.PuppetOptions
}

interface WechatyPuppetOptionsInstance {
  puppet?: PUPPET.impls.PuppetInterface,
}

type WechatyPuppetOptions =
  | WechatyPuppetOptionsName
  | WechatyPuppetOptionsInstance

interface WechatyOptionsBase {
  memory?        : MemoryCard,
  name?          : string,                                          // Wechaty Name

  ioToken?       : string,                                          // Io TOKEN
}

type WechatyOptions =
  & WechatyOptionsBase
  & WechatyPuppetOptions

export {
  type WechatyOptions,
}
