import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OFFICIAL_PUPPET_DEPENDENCIES } from '../src/puppet-config.js'

const testInstaller = process.platform === 'win32' ? test.skip : test
const nodeExecutable = process.env['NODE_BINARY'] ?? process.execPath

for (const fail of [ false, true ]) {
  testInstaller(`puppet installer reports each provider (${fail ? 'failure' : 'success'})`, { timeout: 60_000 }, async _t => {
    const directory = mkdtempSync(join(tmpdir(), 'wechaty-puppet-install-'))
    const calls = join(directory, 'calls.jsonl')
    const providers = Object.entries(OFFICIAL_PUPPET_DEPENDENCIES)
      .filter(([ name, version ]) => version !== '0.0.0' && !name.startsWith('@juzibot/') && name !== 'wechaty-puppet-xp')
      .map(([ name, version ]) => `${name}@${version}`)
    const failedProvider = providers[1]!

    try {
      writeFileSync(join(directory, 'package.json'), JSON.stringify({ type: 'commonjs' }))
      writeFileSync(join(directory, 'npm'), `#!${nodeExecutable}
const { appendFileSync } = require('node:fs')
appendFileSync(process.env.INSTALL_CALLS, JSON.stringify(process.argv.slice(2)) + '\\n')
if (process.argv.slice(4).includes(process.env.FAIL_PROVIDER)) process.exit(7)
`, { mode: 0o755 })

      const result = spawnSync(nodeExecutable, [
        fileURLToPath(new URL('../bin/puppet-install.js', import.meta.url)),
      ], {
        encoding: 'utf8',
        env: {
          FAIL_PROVIDER: fail ? failedProvider : '',
          INSTALL_CALLS: calls,
          PATH: `${directory}${delimiter}${process.env['PATH'] ?? ''}`,
          WECHATY_LOG: 'info',
        },
        timeout: 60_000,
      })
      const output = result.stdout + result.stderr
      const expected = fail ? providers.slice(0, 2) : providers
      assert.ifError(result.error)
      assert.equal(result.status, fail ? 1 : 0, 'installation failures propagate', { output })
      assert.deepStrictEqual(
        readFileSync(calls, 'utf8').trim().split('\n').map(line => JSON.parse(line)),
        expected.map((_, index) => [ 'install', '--no-save', ...providers.slice(0, index + 1) ]),
        'adds one provider at a time, retaining earlier providers, and stops on failure',
      )
      for (const provider of expected) {
        assert.ok(output.includes(`installing ${provider}`), `logs ${provider}`)
      }
      if (fail) {
        assert.ok(result.stderr.includes(`npm install ${failedProvider} failed (exit code 7, signal null)`), 'identifies the failed provider')
        assert.ok(!output.includes('main() installing ... done'), 'does not report success')
      } else {
        assert.ok(output.includes('main() installing ... done'), 'reports success after all installations')
      }
    } finally {
      rmSync(directory, { force: true, recursive: true })
    }
  })
}
