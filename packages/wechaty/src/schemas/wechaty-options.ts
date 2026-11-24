/**
 * `WechatyOptions`: what `WechatyBuilder.build()` takes. The puppet is either
 * an instance, or an npm name with its options. Any `wechaty-puppet-*` name
 * (scoped or not) is accepted, not only the known ones in
 * `OFFICIAL_PUPPET_DEPENDENCIES`, which list what the Docker image installs.
 */
import type * as PUPPET from 'wechaty-puppet'
import type {
  MemoryCard,
}                       from 'memory-card'

import type {
  OfficialPuppetNpmName,
  PuppetNpmName,
}                             from '../puppet-config.ts'

interface OptionsPuppetInstance {
  puppet?: PUPPET.impls.PuppetInterface,
}

interface OptionsPuppetName {
  // The known names first, for editor completion.
  puppet?        : OfficialPuppetNpmName | PuppetNpmName
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
