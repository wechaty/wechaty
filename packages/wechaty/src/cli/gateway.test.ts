/**
 * Tests that `wechaty gateway` fails with exit status 1 when it has no
 * usable puppet. It runs the real CLI (`bin/cli.ts`) in a child process,
 * because the exit status is what scripts and container supervisors see.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const CLI = fileURLToPath(new URL('../../bin/cli.ts', import.meta.url))
const nodeExecutable = process.env['NODE_BINARY'] ?? process.execPath

/** Runs `wechaty gateway` with `args` and no WECHATY_PUPPET. */
function gateway (args: string[]) {
  // An empty working directory, so bin/cli.ts loads no .env file.
  const cwd = mkdtempSync(join(tmpdir(), 'wechaty-gateway-'))
  try {
    return spawnSync(nodeExecutable, [ CLI, 'gateway', '--port', '8788', ...args ], {
      cwd,
      encoding: 'utf8',
      env: {
        PATH: process.env['PATH'] ?? '',
        WECHATY_LOG: 'silent',
        ...(process.env['NODE_OPTIONS'] ? { NODE_OPTIONS: process.env['NODE_OPTIONS'] } : {}),
      },
      timeout: 60_000,
    })
  } finally {
    rmSync(cwd, { force: true, recursive: true })
  }
}

test('gateway exits 1 without a puppet', { timeout: 60_000 }, () => {
  const result = gateway([])
  assert.ifError(result.error)
  assert.equal(result.status, 1, `should fail: ${result.stdout}${result.stderr}`)
  assert.match(result.stderr, /No puppet is set/, 'should explain how to set a puppet')
})

test('gateway exits 1 for an unknown puppet name', { timeout: 60_000 }, () => {
  const result = gateway([ '--puppet', 'wechaty-puppet-unknown' ])
  assert.ifError(result.error)
  assert.equal(result.status, 1, `should fail: ${result.stdout}${result.stderr}`)
  assert.match(result.stderr, /is not a valid puppet name/, 'should name the problem')
})
