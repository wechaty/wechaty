#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
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
import spawn from 'cross-spawn'

import { log } from 'wechaty-puppet'

import {
  OFFICIAL_PUPPET_DEPENDENCIES,
  OfficialPuppetNpmName,
}                         from '../src/puppet-config.js'

/**
 * Install all `wechaty-puppet-*` modules from `puppet-config.ts`
 */
async function main (): Promise<void> {
  log.info('PuppetInstall', 'main() installing ...')

  const skipList = [
    '@juzibot/wechaty-puppet-donut',  // windows puppet
    '@juzibot/wechaty-puppet-wxwork', // wxwork puppet
  ]

  const moduleList: string[] = []

  for (const puppetModuleName of Object.keys(OFFICIAL_PUPPET_DEPENDENCIES)) {
    const version = OFFICIAL_PUPPET_DEPENDENCIES[puppetModuleName as OfficialPuppetNpmName]

    if (version === '0.0.0' || skipList.includes(puppetModuleName)) {
      continue
    }

    moduleList.push(`${puppetModuleName}@${version}`)
  }

  const args = [
    'install',
    '--no-save',
    ...moduleList,
  ]
  log.info('PuppetInstall', `installing ... Shell: "npm install ${args.join(' ')}"\n`)

  const result = spawn('npm', args, { stdio: 'inherit' })
  await new Promise(resolve => result.once('exit', resolve))

  log.info('PuppetInstall', 'main() installing ... done')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
