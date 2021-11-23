import type * as PUPPET from 'wechaty-puppet'
import type {
  MemoryCard,
}                       from 'memory-card'

import type {
  PuppetModuleName,
}                             from '../puppet-config.js'
interface WechatyOptions {
  memory?        : MemoryCard,
  name?          : string,                                          // Wechaty Name

  puppet?        : PuppetModuleName | PUPPET.impls.PuppetInterface,  // Puppet name or instance
  puppetOptions? : PUPPET.PuppetOptions,                            // Puppet TOKEN
  ioToken?       : string,                                          // Io TOKEN
}

export type {
  WechatyOptions,
}
