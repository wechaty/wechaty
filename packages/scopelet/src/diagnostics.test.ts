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

/**
 * Unit tests of the diagnostics channel (`diagnostics.ts`, C-OBS-04) for what
 * the contract suite cannot check in-process: a throwing subscriber.
 *
 * AGENTS.md asks to validate `node:diagnostics_channel` behavior under both
 * Node.js and Deno before relying on it. A throwing subscriber is reported by
 * the runtime as `uncaughtException` on a later tick, which a test runner
 * would attribute to the test itself, so the check runs in a child process of
 * the same runtime and reads what it prints.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

import { CHANNEL_NAME } from './diagnostics.ts'

/** Run `source` as a module in a child process of this runtime; returns its stdout. */
function runChild (source: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'scopelet-diagnostics-'))
  try {
    const script = join(dir, 'probe.ts')
    writeFileSync(script, source)
    const deno = typeof (globalThis as { Deno?: unknown }).Deno !== 'undefined'
    // The probe is not part of a coverage run: it must not write into the
    // parent's coverage profile, which would then name a deleted file.
    const env = { ...process.env }
    delete env['DENO_COVERAGE_DIR']
    delete env['NODE_V8_COVERAGE']
    // Under Deno this needs `--allow-run=deno`, which the project's Deno test
    // and coverage scripts grant.
    return execFileSync(process.execPath, deno ? [ 'run', '-A', '--no-check', script ] : [ script ], { encoding: 'utf8', env })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('the channel is scopelet.state (D44)', () => {
  assert.equal(CHANNEL_NAME, 'scopelet.state')
})

test('a throwing subscriber never changes an outcome; the runtime reports it later as uncaughtException, under Node.js and Deno (C-OBS-04)', () => {
  const mod = pathToFileURL(join(import.meta.dirname!, 'mod.ts')).href
  const output = runChild(`
import diagnosticsChannel from 'node:diagnostics_channel'
import process from 'node:process'
import { createLifecycle, LIFECYCLE_DIAGNOSTICS_CHANNEL } from '${mod}'
const seen = []
process.on('uncaughtException', error => seen.push('uncaught: ' + error.message))
diagnosticsChannel.subscribe(LIFECYCLE_DIAGNOSTICS_CHANNEL, () => { throw new Error('subscriber failed') })
const lifecycle = createLifecycle({ onStart () {} })
await lifecycle.start()
seen.push('started: ' + lifecycle.state.kind)
await lifecycle.stop()
seen.push('stopped: ' + lifecycle.state.kind)
await new Promise(resolve => setTimeout(resolve, 20))
console.log(JSON.stringify(seen))
`)
  const seen = JSON.parse(output.trim().split('\n').at(-1)!) as string[]
  // When the reports arrive relative to the commits is the runtime's choice.
  const uncaught = seen.filter(entry => entry.startsWith('uncaught: '))
  assert.deepEqual(seen.filter(entry => !uncaught.includes(entry)), [ 'started: running', 'stopped: stopped' ], 'the outcomes are unaffected')
  // One record per commit: starting, running, stopping, stopped.
  assert.deepEqual(uncaught, Array(4).fill('uncaught: subscriber failed'))
})

test('without getBuiltinModule, as in a browser, the module loads and works and publishes nothing (D43)', () => {
  const mod = pathToFileURL(join(import.meta.dirname!, 'mod.ts')).href
  const output = runChild(`
import diagnosticsChannel from 'node:diagnostics_channel'
import process from 'node:process'
const records = []
diagnosticsChannel.subscribe('scopelet.state', record => records.push(record))
// The runtime looks like a browser to the module: no getBuiltinModule.
process.getBuiltinModule = undefined
const { createLifecycle } = await import('${mod}')
const lifecycle = createLifecycle({ onStart () {} })
await lifecycle.start()
await lifecycle.stop()
console.log(JSON.stringify({ state: lifecycle.state.kind, records: records.length }))
`)
  assert.deepEqual(JSON.parse(output.trim().split('\n').at(-1)!), { state: 'stopped', records: 0 })
})
