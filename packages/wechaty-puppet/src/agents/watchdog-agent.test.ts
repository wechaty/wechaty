/**
 * Unit tests for `watchdog-agent.ts`.
 *
 * Verifies that the WatchdogAgent registers heartbeat and reset listeners on start,
 * cleans them up on stop, and dispatches normalized error events upon watchdog reset.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PuppetSkeleton } from '../puppet/puppet-skeleton.ts'
import { WatchdogAgent, type PuppetServiceController } from './watchdog-agent.ts'

class TestPuppet extends PuppetSkeleton implements PuppetServiceController {

  async reset (): Promise<void> {}
  async onStart (): Promise<void> {}
  async onStop (): Promise<void> {}

}

test('WatchdogAgent start and stop listener registration and error dispatch on reset', async _t => {
  const puppet = new TestPuppet()
  const agent = new WatchdogAgent(puppet)

  let errorPayload: any
  puppet.on('error', (payload: any) => {
    errorPayload = payload
  })

  agent.start()

  // Heartbeat feeds watchdog
  puppet.emit('heartbeat', { data: 'test-heartbeat' })

  // Trigger reset on the agent's internal watchdog
  const watchdog = (agent as any).watchdog
  watchdog.emit('reset', { data: 'timeout-food' })

  assert.ok(errorPayload, 'error should be dispatched on watchdog reset')
  assert.ok(errorPayload.gerror, 'error should contain serialized gerror')
  assert.match(errorPayload.gerror, /WatchdogAgent reset/, 'should include watchdog reset reason')

  // Stop should clean up listeners
  agent.stop()
  assert.equal((agent as any).cleanCallbackList.length, 0, 'cleanCallbackList should be emptied')
})
