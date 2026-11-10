import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { test } from 'tstest'

import { OFFICIAL_PUPPET_DEPENDENCIES } from '../src/puppet-config.js'

const installerPath = fileURLToPath(new URL('../bin/puppet-install.ts', import.meta.url))
const testInstaller = process.platform === 'win32' ? test.skip : test

for (const fail of [ false, true ]) {
  testInstaller(`puppet installer reports each provider (${fail ? 'failure' : 'success'})`, async t => {
    const directory = mkdtempSync(join(tmpdir(), 'wechaty-puppet-install-'))
    const calls = join(directory, 'calls.jsonl')
    const providers = Object.entries(OFFICIAL_PUPPET_DEPENDENCIES)
      .filter(([ name, version ]) => version !== '0.0.0' && !name.startsWith('@juzibot/') && name !== 'wechaty-puppet-xp')
      .map(([ name, version ]) => `${name}@${version}`)
    const failedProvider = providers[1]!

    try {
      writeFileSync(join(directory, 'package.json'), JSON.stringify({ type: 'commonjs' }))
      writeFileSync(join(directory, 'npm'), `#!${process.execPath}
const { appendFileSync } = require('node:fs')
appendFileSync(process.env.INSTALL_CALLS, JSON.stringify(process.argv.slice(2)) + '\\n')
if (process.argv.slice(4).includes(process.env.FAIL_PROVIDER)) process.exit(7)
`, { mode: 0o755 })

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        FAIL_PROVIDER: fail ? failedProvider : '',
        INSTALL_CALLS: calls,
        PATH: `${directory}${delimiter}${process.env['PATH'] ?? ''}`,
        WECHATY_LOG: 'info',
      }
      delete env['NODE_V8_COVERAGE']

      const result = spawnSync(process.execPath, [
        '--import=tsx/esm',
        installerPath,
      ], {
        encoding: 'utf8',
        env,
        timeout: 20_000,
      })
      const output = result.stdout + result.stderr
      const expected = fail ? providers.slice(0, 2) : providers

      t.error(result.error, 'installer process starts')
      t.equal(result.status, fail ? 1 : 0, 'installation failures propagate', { output })
      t.same(
        readFileSync(calls, 'utf8').trim().split('\n').map(line => JSON.parse(line)),
        expected.map((_, index) => [ 'install', '--no-save', ...providers.slice(0, index + 1) ]),
        'adds one provider at a time, retaining earlier providers, and stops on failure',
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

test('puppet installer rejects when npm cannot be spawned', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'wechaty-puppet-install-'))
  try {
    const env: NodeJS.ProcessEnv = { ...process.env, PATH: directory }
    delete env['NODE_V8_COVERAGE']

    const result = spawnSync(process.execPath, [
      '--import=tsx/esm',
      installerPath,
    ], {
      encoding: 'utf8',
      env,
      timeout: 20_000,
    })

    t.error(result.error, 'installer process starts')
    t.equal(result.status, 1, 'missing npm exits unsuccessfully')
    t.notMatch(result.stdout + result.stderr, /installing \.\.\. done/, 'missing npm must not report completion')
    t.match(result.stderr, /ENOENT/, 'reports the spawn error')
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
})