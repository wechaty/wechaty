/**
 * Smoke test for the packed tarball (run by scripts/npm-pack-testing.sh in a
 * temporary project): the public API loads from the published `dist/`, a
 * lifecycle starts, runs an operation and stops, and the generated version is
 * not the 0.0.0 source placeholder.
 */
import assert from 'node:assert/strict'

import {
  createLifecycle,
  LIFECYCLE_DIAGNOSTICS_CHANNEL,
  operation,
  VERSION,
}                             from 'scopelet'
import type { LifecycleScope } from 'scopelet'

let saved: LifecycleScope | undefined
const lifecycle = createLifecycle({ onStart (scope) { saved = scope } })
await lifecycle.start()
assert.equal(lifecycle.state.kind, 'running')
assert.equal(await operation(saved!, () => 42), 42)
await lifecycle.stop()
assert.equal(lifecycle.state.kind as string, 'stopped')
assert.equal(LIFECYCLE_DIAGNOSTICS_CHANNEL, 'scopelet.state')
assert.notEqual(VERSION, '0.0.0', 'version should not be 0.0.0 when prepared for publishing')

console.info(`scopelet v${VERSION} smoke testing passed.`)
