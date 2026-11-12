import type * as PUPPET from 'wechaty-puppet'
import type {
  MemoryCard,
}                       from 'memory-card'

import type {
  OfficialPuppetNpmName,
}                             from '../puppet-config.ts'

interface OptionsPuppetInstance {
  puppet?: PUPPET.impls.PuppetInterface,
}

interface OptionsPuppetName {
  puppet?        : OfficialPuppetNpmName
  puppetOptions? : PUPPET.PuppetOptions
}

interface WechatyOptionsBase {
  memory?               : MemoryCard,
  name?                 : string,
  ioToken?              : string,
  puppetStartTimeoutMs? : number,
  puppetStopTimeoutMs?  : number,
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
