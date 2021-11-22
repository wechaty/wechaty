/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
// import npm        from 'npm-programmatic'
// import pkgDir     from 'pkg-dir'
// import inGfw      from 'in-gfw'

import {
  log,
  Puppet,
  impls,
}                         from 'wechaty-puppet'
import type { WechatyOptions } from '../wechaty-builder.js'

import {
  PUPPET_DEPENDENCIES,
  PuppetModuleName,
}                         from './puppet-config.js'

type ResolveOptions = Pick<WechatyOptions, 'puppet' | 'puppetOptions'>

async function resolvePuppet (
  options: ResolveOptions,
): Promise<impls.PuppetInterface> {
  log.verbose('Wechaty', 'resolvePuppet({puppet: %s, puppetOptions: %s})',
    options.puppet,
    JSON.stringify(options.puppetOptions),
  )

  /**
   * Huan(202001): (DEPRECATED) When we are developing, we might experiencing we have two version of wechaty-puppet installed,
   *  if `options.puppet` is Puppet v1, but the `Puppet` in Wechaty is v2,
   *  then options.puppet will not instanceof Puppet. (looseInstanceOfPuppet)
   *  So I changed here to match not a string as a workaround.
   */
  if (Puppet.valid(options.puppet)) {
    return options.puppet
  }

  if (typeof options.puppet !== 'string') {
    /**
     * If user provide a class instance that not instance of Puppet:
     */
    throw new Error('Wechaty Framework only accept Puppet instance, but you provided is: "' + typeof options.puppet + '"')
  }

  log.verbose('Wechaty', 'resolvePuppet() resolving name "%s" ...', options.puppet)
  const MyPuppet = await resolvePuppetName(options.puppet)
  log.verbose('Wechaty', 'resolvePuppet() resolving name "%s" ... done', options.puppet)

  /**
   * We will meet the following error:
   *
   *  [ts] Cannot use 'new' with an expression whose type lacks a call or construct signature.
   *
   * When we have different puppet with different `constructor()` args.
   * For example: PuppetA allow `constructor()` but PuppetB requires `constructor(options)`
   *
   * SOLUTION: we enforce all the PuppetConstructor to have `options` and should not allow default parameter.
   *  Issue: https://github.com/wechaty/wechaty-puppet/issues/2
   */

  /**
   * Huan(20210313) Issue #2151 - https://github.com/wechaty/wechaty/issues/2151
   *  error TS2511: Cannot create an instance of an abstract class.
   *
   * Huan(20210530): workaround by "as any"
   */
  log.verbose('Wechaty', 'resolvePuppet() instanciating puppet ...')
  const puppetInstance = new (MyPuppet as any)(options.puppetOptions)
  log.verbose('Wechaty', 'resolvePuppet() instanciating puppet ... done')

  return puppetInstance
}

async function resolvePuppetName (
  puppetName: PuppetModuleName,
): Promise<impls.PuppetConstructor> {
  log.verbose('Wechaty', 'resolvePuppetName(%s)', puppetName)

  if (!(puppetName in PUPPET_DEPENDENCIES)) {
    throw new Error(
      [
        '',
        'puppet npm module not supported: "' + puppetName + '"',
        'learn more about supported Wechaty Puppet from our official website',
        '<https://wechaty.js.org/docs/puppet-providers>',
        '',
      ].join('\n'),
    )
  }

  let puppetModule = await import(puppetName)

  /**
   * Huan(202110): Issue wechaty/wechaty-getting-started#203
   *  TypeError: MyPuppet is not a constructor
   *  https://github.com/wechaty/wechaty-getting-started/issues/203
   */
  let retry = 0
  while (typeof puppetModule.default !== 'function') {
    if (!puppetModule || retry++ > 3) {
      throw new Error(`Puppet(${puppetName}) has not provided the default export`)
    }
    /**
     * CommonJS Module: puppetModule.default.default is the expoerted Puppet
     */
    puppetModule = puppetModule.default
  }

  if (retry === 0) {
    /**
     * ES Module: default is the exported Puppet
     */
    log.verbose('Wechaty', 'resolvePuppetName(%s): ESM resolved', puppetName)
  } else {
    log.verbose('Wechaty', 'resolvePuppetName(%s): CJS resolved, retry times: %s', puppetName, retry)
  }

  // console.info(puppetModule)
  const MyPuppet = puppetModule.default as impls.PuppetConstructor

  return MyPuppet
}

export {
  type ResolveOptions,
  resolvePuppet,
  resolvePuppetName,
}
