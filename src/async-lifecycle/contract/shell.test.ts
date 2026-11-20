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
 * Contract tests for the entry points themselves (README §13, C-SHELL-*).
 * They use each implementation's own `AsyncLifecycle` class directly.
 */

import assert from 'node:assert/strict'

import { errorName } from './harness.ts'
import { contract } from './suite.ts'

contract('C-SHELL-02.a', 'a caller-API method overridden by a subclass, or by an intermediate class, fails construction with LifecycleOverrideError', {}, async ({ impl, shell }) => {
  if (shell !== 'AsyncLifecycle') {
    return // only the inheritance entry point has subclasses
  }
  const Base = impl.base
  class Shadow extends Base {
    protected onStart (): void {}
    override start (): Promise<void> { return Promise.resolve() }
  }
  class Concrete extends Shadow {
    constructor () { super() }
  }
  assert.throws(() => new Concrete(), (error: unknown) => errorName(error) === 'LifecycleOverrideError')
})

contract('C-SHELL-02.b', 'a caller-API member overridden by a class field fails construction with TypeError', {}, async ({ impl, shell }) => {
  if (shell !== 'AsyncLifecycle') {
    return
  }
  const Base = impl.base
  class Field extends Base {
    override stop = () => Promise.resolve()
    constructor () { super() }
    protected onStart (): void {}
  }
  assert.throws(() => new Field(), TypeError)
})

contract('C-SHELL-02.c', 'the caller-API members of an AsyncLifecycle instance are own, non-writable, non-configurable properties that still work', {}, async ({ impl, shell }) => {
  // How C-SHELL-02 rejects class-field overrides; ported from the Claude suite.
  if (shell !== 'AsyncLifecycle') {
    return
  }
  const Base = impl.base
  class Plain extends Base {
    constructor () { super() }
    protected onStart (): void {}
  }
  const plain = new Plain()
  for (const member of [ 'start', 'stop', 'restart', 'whenState' ] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(plain, member)
    assert.ok(descriptor, `${member} is an own property`)
    assert.equal(descriptor.configurable, false, `${member} is not configurable`)
    assert.equal(descriptor.writable, false, `${member} cannot be replaced by assignment`)
  }
  await plain.start()
  assert.equal(plain.state.kind, 'running')
  await plain.stop()
  assert.equal(plain.state.kind, 'stopped')
})

// ---------------------------------------------------------------------------
// Ported from the Copilot suite (src/async-lifecycle-copilot/async-lifecycle.test.ts)
// ---------------------------------------------------------------------------

contract('C-SHELL-02.d', 'overriding any caller-API member with a method or accessor fails construction with LifecycleOverrideError', {}, async ({ impl, shell }) => {
  if (shell !== 'AsyncLifecycle') {
    return
  }
  const Base = impl.base
  const overrides: Record<string, new () => unknown> = {
    stop: class extends Base { constructor () { super() } protected onStart (): void {} override stop (): Promise<void> { return Promise.resolve() } },
    restart: class extends Base { constructor () { super() } protected onStart (): void {} override restart (): Promise<void> { return Promise.resolve() } },
    whenState: class extends Base { constructor () { super() } protected onStart (): void {} override whenState (): never { throw new Error('unused') } },
    state: class extends Base { constructor () { super() } protected onStart (): void {} override get state (): never { throw new Error('unused') } },
    [String(Symbol.asyncDispose)]: class extends Base { constructor () { super() } protected onStart (): void {} override [Symbol.asyncDispose] (): Promise<void> { return Promise.resolve() } },
  }
  for (const [ member, Override ] of Object.entries(overrides)) {
    assert.throws(() => new Override(), (error: unknown) => errorName(error) === 'LifecycleOverrideError', member)
  }
})
