import { readFileSync } from 'node:fs'

import { test } from 'tstest'

import { OFFICIAL_PUPPET_DEPENDENCIES } from './puppet-config.js'

const packageJson: {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
} = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

test('configured puppet dependency ranges match package.json', async t => {
  const packagePuppets = [
    ...Object.entries(packageJson.dependencies ?? {}),
    ...Object.entries(packageJson.devDependencies ?? {}),
  ].filter(([ name ]) => name.startsWith('wechaty-puppet-'))

  for (const [ name, version ] of packagePuppets) {
    const configuredVersion = Object.entries(OFFICIAL_PUPPET_DEPENDENCIES)
      .find(([ configuredName ]) => configuredName === name)?.[1]

    t.equal(configuredVersion, version, `${name} range matches package.json`)
  }
})
