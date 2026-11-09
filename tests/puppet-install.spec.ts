import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { test } from 'tstest'

import { OFFICIAL_PUPPET_DEPENDENCIES } from '../src/puppet-config.js'

const testInstaller = process.platform === 'win32' ? test.skip : test

for (const fail of [ false, true ]) {
  testInstaller(`puppet installer reports each provider (${fail ? 'failure' : 'success'})`, async t => {
    const directory = mkdtempSync(join(tmpdir(), 'wechaty-puppet-install-'))
    const calls = join(directory, 'calls.jsonl')
    const providers = Object.entries(OFFICIAL_PUPPET_DEPENDENCIES)
      .filter(([ name, version ]) => version !== '0.0.0' && !name.startsWith('@juzibot/'))
      .map(([ name, version ]) => `${name}@${version}`)
    const failedProvider = providers[1]!

    try {
      writeFileSync(join(directory, 'npm'), `#!${process.execPath}
const { appendFileSync } = require('node:fs')
appendFileSync(process.env.INSTALL_CALLS, JSON.stringify(process.argv.slice(2)) + '\\n')
if (process.argv[4] === process.env.FAIL_PROVIDER) process.exit(7)
`, { mode: 0o755 })

      const result = spawnSync(process.execPath, [
        '--import=tsx/esm',
        fileURLToPath(new URL('../bin/puppet-install.ts', import.meta.url)),
      ], {
        encoding: 'utf8',
        env: {
          ...process.env,
          FAIL_PROVIDER: fail ? failedProvider : '',
          INSTALL_CALLS: calls,
          PATH: `${directory}${delimiter}${process.env['PATH'] ?? ''}`,
          WECHATY_LOG: 'info',
        },
      })
      const output = result.stdout + result.stderr
      const expected = fail ? providers.slice(0, 2) : providers
      t.error(result.error, 'installer process starts')
      t.equal(result.status, fail ? 1 : 0, 'installation failures propagate')
      t.same(
        readFileSync(calls, 'utf8').trim().split('\n').map(line => JSON.parse(line)),
        expected.map(provider => [ 'install', '--no-save', provider ]),
        'installs one provider at a time and stops on failure',
      )
      for (const provider of expected) {
        t.ok(output.includes(`installing ${provider}`), `logs ${provider}`)
      }
      if (fail) {
        t.ok(result.stderr.includes(`npm install ${failedProvider} failed (exit code 7, signal null)`), 'identifies the failed provider')
        t.notMatch(output, 'main() installing ... done', 'does not report success')
      } else {
        t.match(output, 'main() installing ... done', 'reports success after all installations')
      }
    } finally {
      rmSync(directory, { force: true, recursive: true })
    }
  })
}
