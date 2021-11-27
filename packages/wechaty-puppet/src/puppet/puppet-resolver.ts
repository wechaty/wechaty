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
import {
  log,
}                     from '../config.js'
import type {
  PuppetOptions,
}                     from '../schemas/puppet.js'

import {
  Puppet,
}                     from './puppet-abstract.js'
import type {
  PuppetInterface,
  PuppetConstructor,
}                     from './puppet-interface.js'

// i.e. @juzibot/wechaty-puppet-donut
type PuppetNpmScope = `@${string}/` | ''
type PuppetNpmName  = `${PuppetNpmScope}wechaty-puppet-${string}`

interface ResolveOptions {
  puppet: PuppetNpmName | PuppetInterface,
  puppetOptions?: PuppetOptions,
}

async function resolvePuppet (
  options: ResolveOptions,
): Promise<PuppetInterface> {
  log.verbose('Puppet', 'resolvePuppet({puppet: %s, puppetOptions: %s})',
    options.puppet,
    JSON.stringify(options.puppetOptions || {}),
  )

  if (Puppet.valid(options.puppet)) {
    return options.puppet
  }

  if (typeof options.puppet !== 'string') {
    /**
     * If user provide a class instance that not instance of Puppet:
     */
    throw new Error('puppetResolver accepts string(the puppet npm name) or Puppet instance, but you provided is: "' + typeof options.puppet + '"')
  }

  log.verbose('Puppet', 'resolvePuppet() resolving name "%s" ...', options.puppet)
  const MyPuppet = await resolvePuppetName(options.puppet)
  log.verbose('Puppet', 'resolvePuppet() resolving name "%s" ... done', options.puppet)

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
  log.verbose('Puppet', 'resolvePuppet() instanciating puppet ...')
  const puppetInstance = new (MyPuppet as any)(options.puppetOptions)
  log.verbose('Puppet', 'resolvePuppet() instanciating puppet ... done')

  return puppetInstance
}

async function resolvePuppetName (
  puppetName: PuppetNpmName,
): Promise<PuppetConstructor> {
  log.verbose('Puppet', 'resolvePuppetName(%s)', puppetName)

  let puppetModule

  try {
    puppetModule = await import(puppetName)
    // console.info('puppetModule', puppetModule)
  } catch (e) {
    log.error('Puppet', 'resolvePuppetName %s', [
      '',
      'Failed to import Wechaty Puppet Provider (WPP) NPM module: "' + puppetName + '"',
      'Please make sure:',
      ' 1. it has been installed correctly. (run `npm install ' + puppetName + "` if it doesn't)",
      ' 2. "' + puppetName + '" is a valid Wechaty Puppet Provider (WPP).',
      '',
      'learn more about Wechaty Puppet Providers (WPP) from the official website:',
      '<https://wechaty.js.org/docs/puppet-providers>',
      '',
    ].join('\n'))
    throw e
  }

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
    log.verbose('Puppet', 'resolvePuppetName(%s): ESM resolved', puppetName)
  } else {
    log.verbose('Puppet', 'resolvePuppetName(%s): CJS resolved, retry times: %s', puppetName, retry)
  }

  // console.info(puppetModule)
  const MyPuppet = puppetModule.default as PuppetConstructor

  return MyPuppet
}

export {
  resolvePuppet,
  resolvePuppetName,
}
