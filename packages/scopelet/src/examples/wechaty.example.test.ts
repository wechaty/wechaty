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
 * Runs the `Wechaty` example (S5, wechaty/wechaty#2973) composing the Puppet and
 * Io examples: children start in order and stop in reverse, `ready()`
 * delegates to the puppet's condition, and the integration layer keeps today's
 * `'start'` / `'stop'` / `'error'` events, `reset()` and
 * `state.active()` / `state.inactive()` (D24). The last test nests three
 * levels across both entry points.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { AsyncLifecycle } from '../async-lifecycle.ts'
import { errorName, flush, ManualClock, observe } from '../contract/harness.ts'
import type { LifecycleScope, LifecycleState } from '../types.ts'
import { Io } from './io.example.ts'
import { Puppet } from './puppet.example.ts'
import { legacyStateView, main, Wechaty } from './wechaty.example.ts'

/** A provider that logs its hooks into a shared trace. */
class TracingPuppet extends Puppet {

  readonly trace: string[]
  failStart: unknown = undefined
  /** The wire: settles the provider's pending send. */
  wire = Promise.withResolvers<string>()

  constructor (trace: string[]) {
    super()
    this.trace = trace
  }

  protected override async onStart (): Promise<void> {
    this.trace.push('puppet:start')
    if (this.failStart !== undefined) {
      throw this.failStart
    }
    this.emit('login', 'user')
    this.emit('ready')
  }

  protected override async onStop (): Promise<void> {
    this.trace.push('puppet:stop')
  }

  protected override messageSendText (): Promise<string> {
    return this.wire.promise
  }

}

/** An Io whose sockets log into the shared trace. */
function tracingIo (trace: string[], clock = new ManualClock()) {
  const drops: (() => void)[] = []
  const io = new Io({
    url: 'wss://example',
    clock,
    openSocket: async () => {
      trace.push('io:open')
      const listeners = new Set<() => void>()
      drops.push(() => { for (const listener of [ ...listeners ]) listener() })
      return {
        on: (_event: 'close', listener: () => void) => { listeners.add(listener) },
        off: (_event: 'close', listener: () => void) => { listeners.delete(listener) },
        ping: () => {},
        terminate: () => {},
        close: async () => { trace.push('io:close') },
      }
    },
  })
  return { io, drop: () => drops.at(-1)!() }
}

test('Wechaty starts the puppet, then the Io, and stops them in reverse; its legacy events follow the state', async () => {
  const trace: string[] = []
  const bot = new Wechaty(new TracingPuppet(trace), tracingIo(trace).io)
  const events: string[] = []
  bot.on('start', () => events.push('start'))
  bot.on('stop', () => events.push('stop'))
  await bot.start()
  assert.deepEqual(trace, [ 'puppet:start', 'io:open' ])
  await bot.stop()
  assert.deepEqual(trace, [ 'puppet:start', 'io:open', 'io:close', 'puppet:stop' ])
  assert.deepEqual(events, [ 'start', 'stop' ])
})

test('main(): ready() before start() resolves on the puppet\'s ready, and the bot is stopped on exit', async () => {
  const trace: string[] = []
  const bot = new Wechaty(new TracingPuppet(trace))
  await main(bot)
  assert.equal(bot.state.kind, 'stopped', 'await using stopped it')
  assert.deepEqual(trace, [ 'puppet:start', 'puppet:stop' ])
})

test('a failed start emits \'error\' with the failure, and a ready() wait created before it rejects', async () => {
  const trace: string[] = []
  const puppet = new TracingPuppet(trace)
  const failure = new Error('puppet login failed')
  puppet.failStart = failure
  const bot = new Wechaty(puppet)
  const errors: unknown[] = []
  bot.on('error', error => errors.push(error))
  const ready = observe(bot.ready())
  await assert.rejects(bot.start())
  await flush()
  assert.equal(ready.status, 'rejected')
  assert.equal(errorName(ready.error), 'LifecycleSupersededError')
  assert.deepEqual(errors, [ failure ], "the puppet's start error, as scope.start() rejected with it (C-CHILD-06)")
})

test('stop() before the puppet is ready rejects pending ready() waits', async () => {
  const bot = new Wechaty(new TracingPuppet([]))
  const ready = observe(bot.ready())
  await bot.stop()
  await flush()
  assert.equal(errorName(ready.error), 'LifecycleSupersededError')
})

test('stop() waits for a say() in flight, which the puppet runs as an operation (D24)', async () => {
  const trace: string[] = []
  const puppet = new TracingPuppet(trace)
  const bot = new Wechaty(puppet)
  await bot.start()
  const said = observe(bot.say('room', 'bye'))
  const stopped = observe(bot.stop())
  await flush()
  assert.equal(stopped.status, 'pending')
  assert.deepEqual(trace, [ 'puppet:start' ], 'the puppet is not stopped under the send')
  puppet.wire.resolve('message-1')
  await flush()
  assert.equal(said.value, 'message-1')
  assert.equal(stopped.status, 'resolved')
  assert.deepEqual(trace, [ 'puppet:start', 'puppet:stop' ])
})

test('reset() is a restart, and legacyState follows state the way state-switch did (D24)', async () => {
  const trace: string[] = []
  const bot = new Wechaty(new TracingPuppet(trace))
  const seen: [ string, boolean | 'pending', boolean | 'pending' ][] = []
  bot.whenState(state => {
    seen.push([ state.kind, bot.legacyState.active(), bot.legacyState.inactive() ])
    return false
  }).catch(() => {})
  const events: string[] = []
  bot.on('start', () => events.push('start'))
  assert.deepEqual([ bot.legacyState.active(), bot.legacyState.inactive() ], [ false, true ])
  await bot.start()
  await bot.reset()
  assert.deepEqual(events, [ 'start', 'start' ], "'start' for every run that commits running")
  assert.deepEqual(bot.state, { kind: 'running', generation: 2 })
  assert.deepEqual([ bot.legacyState.active(), bot.legacyState.inactive() ], [ true, false ])
  const stopping = bot.stop()
  assert.deepEqual([ bot.legacyState.active(), bot.legacyState.inactive() ], [ true, false ], 'stop() only records intent')
  await stopping
  assert.deepEqual([ bot.legacyState.active(), bot.legacyState.inactive() ], [ false, true ])
  assert.deepEqual(trace, [ 'puppet:start', 'puppet:stop', 'puppet:start', 'puppet:stop' ])
})

test('the state-switch view maps every state kind (D24)', () => {
  const expected = {
    starting : [ 'pending', false ],
    running  : [ true, false ],
    stopping : [ false, 'pending' ],
    stopped  : [ false, true ],
    failed   : [ false, true ],
  } as const
  for (const [ kind, [ active, inactive ] ] of Object.entries(expected)) {
    const view = legacyStateView({ state: { kind } as LifecycleState })
    assert.deepEqual([ view.active(), view.inactive() ], [ active, inactive ], kind)
  }
})

/** A host that owns a bot: the third level, on the inheritance entry point. */
class Host extends AsyncLifecycle {

  readonly bot: Wechaty
  readonly trace: string[]

  constructor (bot: Wechaty, trace: string[]) {
    super({ name: 'Host' })
    this.bot = bot
    this.trace = trace
  }

  protected override async onStart (scope: LifecycleScope): Promise<void> {
    this.trace.push('host:start')
    scope.defer(() => { this.trace.push('host:stop') })
    await scope.start(this.bot)
  }

}

test('three levels across both entry points start in order, stop in reverse, and a child\'s self-recovery does not fail its parents', async () => {
  const trace: string[] = []
  const clock = new ManualClock()
  const { io, drop } = tracingIo(trace, clock)
  const bot = new Wechaty(new TracingPuppet(trace), io)
  const host = new Host(bot, trace)
  await host.start()
  assert.deepEqual(trace, [ 'host:start', 'puppet:start', 'io:open' ])

  drop() // the Io's socket closes: the Io recovers on its own
  await flush()
  assert.deepEqual(io.state, { kind: 'starting', generation: 2 }, 'offline, waiting 1 s to reconnect')
  assert.deepEqual(bot.state, { kind: 'running', generation: 1 }, 'the bot did not fail')
  assert.deepEqual(host.state, { kind: 'running', generation: 1 }, 'nor did the host')
  await clock.advance(1_000)
  assert.deepEqual(io.state, { kind: 'running', generation: 2 })
  assert.deepEqual(bot.state, { kind: 'running', generation: 1 })

  await host.stop()
  assert.deepEqual(trace, [ 'host:start', 'puppet:start', 'io:open', 'io:close', 'io:open', 'io:close', 'puppet:stop', 'host:stop' ])
  for (const lifecycle of [ host, bot, bot.puppet, io ]) {
    assert.equal(lifecycle.state.kind, 'stopped')
  }
})
