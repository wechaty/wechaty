/**
 * Resolves an existing Puppet instance or an installed ESM provider package.
 */
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan Li <huan@chatie.io>, and
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
}                     from '../config.ts'
import type {
  PuppetOptions,
}                     from '../schemas/puppet.ts'

import {
  Puppet,
}                     from './puppet-abstract.ts'
import type {
  PuppetConstructor,
}                     from './puppet-interface.ts'

// i.e. @juzibot/wechaty-puppet-donut
type PuppetNpmScope = `@${string}/` | ''
type PuppetNpmName  = `${PuppetNpmScope}wechaty-puppet-${string}`

interface ResolveOptions {
  puppet: PuppetNpmName | Puppet,
  puppetOptions?: PuppetOptions,
}

/**
 * Resolves a puppet instance or npm package name into a `Puppet` instance.
 *
 * @param options - A puppet instance or package name and optional puppet options
 * @returns The supplied instance or a newly constructed provider instance
 * @throws `Error` if the puppet is neither a valid instance nor a package name, or if the provider cannot be loaded
 */
async function resolvePuppet (
  options: ResolveOptions,
): Promise<Puppet> {
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

/**
 * Dynamically imports an ESM Wechaty Puppet Provider (WPP) package and extracts its
 * default export constructor.
 *
 * In pure ECMAScript (ESM), compliant puppet providers export their `PuppetConstructor`
 * as their primary `default` export.
 *
 * @param puppetName - The npm package name of the Wechaty Puppet Provider
 * @returns The resolved `PuppetConstructor`
 * @throws `Error` if the package cannot be imported or does not provide a constructor function as default export
 */
async function resolvePuppetName (
  puppetName: PuppetNpmName,
): Promise<PuppetConstructor> {
  log.verbose('Puppet', 'resolvePuppetName(%s)', puppetName)

  let puppetModule: { default?: unknown }

  try {
    puppetModule = await import(puppetName)
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

  const MyPuppet = puppetModule.default as PuppetConstructor

  if (typeof MyPuppet !== 'function') {
    throw new Error(`Puppet(${puppetName}) has not provided a valid default export constructor`)
  }

  log.verbose('Puppet', 'resolvePuppetName(%s): ESM resolved', puppetName)
  return MyPuppet
}

export {
  resolvePuppet,
  resolvePuppetName,
}
