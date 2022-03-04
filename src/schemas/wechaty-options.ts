import type * as PUPPET from 'wechaty-puppet'
import type {
  MemoryCard,
}                       from 'memory-card'

import type {
  OfficialPuppetNpmName,
}                             from '../puppet-config.js'

interface OptionsPuppetInstance {
  puppet?: PUPPET.impls.PuppetInterface,
}

interface OptionsPuppetName {
  puppet?        : OfficialPuppetNpmName
  puppetOptions? : PUPPET.PuppetOptions
}

interface WechatyOptionsBase {
  memory?        : MemoryCard,
  name?          : string,
  ioToken?       : string,
}

type WechatyOptionsPuppetInstance =
  & WechatyOptionsBase
  & OptionsPuppetInstance

type WechatyOptionsPuppetName =
  & WechatyOptionsBase
  & OptionsPuppetName

type WechatyOptions =
  | WechatyOptionsPuppetInstance
  | WechatyOptionsPuppetName

export {
  type WechatyOptions,
  type WechatyOptionsPuppetName,
}
