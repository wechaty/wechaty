import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { test } from 'tstest'

for (const npmExitCode of [ 42, 0 ]) {
  test(`puppet installer handles npm exit ${npmExitCode}`, async t => {
    const directory = mkdtempSync(join(tmpdir(), 'wechaty-puppet-install-'))
    try {
      const npm = join(directory, process.platform === 'win32' ? 'npm.cmd' : 'npm')
      writeFileSync(npm, process.platform === 'win32'
        ? `@echo off\r\nexit /b ${npmExitCode}\r\n`
        : `#!/usr/bin/env node\nprocess.exit(${npmExitCode})\n`)
      if (process.platform !== 'win32') {
        chmodSync(npm, 0o755)
      }

      const env: NodeJS.ProcessEnv = { ...process.env, PATH: `${directory}${delimiter}${process.env['PATH'] ?? ''}` }
      delete env['NODE_V8_COVERAGE']
      const result = spawnSync(process.execPath, [ '--import=tsx/esm', 'bin/puppet-install.ts' ], {
        encoding: 'utf8',
        env,
        timeout: 20_000,
      })
      t.equal(result.status, npmExitCode === 0 ? 0 : 1, 'installer exit status reflects npm success or failure')
      if (npmExitCode === 0) {
        t.match(result.stdout, /installing \.\.\. done/, 'successful install reports completion')
      } else {
        t.notMatch(result.stdout, /installing \.\.\. done/, 'failed install must not report success')
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
    const result = spawnSync(process.execPath, [ '--import=tsx/esm', 'bin/puppet-install.ts' ], {
      encoding: 'utf8',
      env,
      timeout: 20_000,
    })
    t.equal(result.status, 1, 'missing npm exits unsuccessfully')
    t.notMatch(result.stdout, /installing \.\.\. done/, 'missing npm must not report completion')
    t.match(result.stderr, /ENOENT/, 'reports the spawn error')
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
})
