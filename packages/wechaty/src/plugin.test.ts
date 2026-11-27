#!/usr/bin/env node
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
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { PuppetMock } from 'wechaty-puppet-mock'

import type { Wechaty } from './mods/mod.ts'
import { WechatyBuilder } from './wechaty-builder.ts'

import {
  type WechatyPlugin,
  isWechatyPluginUninstaller,
}                               from './plugin.ts'

/**
 *
 * Huan(202111): we are not remove plugins in the `stop()` method.
 *  @see https://github.com/wechaty/wechaty/issues/2282#issuecomment-966008175
 *
 * TODO: make sure to not remove or remote, then remove this comment
 *
 */
test('Wechaty Plugin uninstaller should be called after wechaty.stop()', async t => {
  const spyPluginInstall    = t.mock.fn()
  const spyPluginUninstall  = t.mock.fn()

  const bot = WechatyBuilder.build({ puppet: new PuppetMock() })
  let started = false
  t.after(async () => {
    if (started) {
      await bot.stop()
    }
  })

  const plugin: WechatyPlugin = (_bot: Wechaty) => {
    spyPluginInstall()
    return () => {
      spyPluginUninstall()
    }
  }

  assert.equal(spyPluginInstall.mock.callCount(), 0, 'should be clean for install spy')
  assert.equal(spyPluginUninstall.mock.callCount(), 0, 'should be clean for uninstall spy')

  const uninstaller = bot.use(plugin)
  assert.equal(spyPluginInstall.mock.callCount(), 1, 'should called install spy right after use() before start()')
  assert.equal(spyPluginUninstall.mock.callCount(), 0, 'should not call uninstall spy after use()')

  started = true
  await bot.start()
  assert.equal(spyPluginInstall.mock.callCount(), 1, 'should called install spy after start()')
  assert.equal(spyPluginUninstall.mock.callCount(), 0, 'should not call uninstall spy after start()')

  spyPluginInstall.mock.resetCalls()
  await bot.stop()
  started = false
  assert.equal(spyPluginInstall.mock.callCount(), 0, 'should not called with stop()')
  await new Promise(setImmediate) // clean the event loop
  assert.equal(spyPluginUninstall.mock.callCount(), 0, 'should not call uninstall spy after stop()')

  uninstaller()
  assert.equal(spyPluginUninstall.mock.callCount(), 1, 'should called uninstall spy after call uninstaller()')
})

test('isWechatyPluginUninstaller()', async _t => {
  const FIXTURES = [
    [ undefined, false ],
    [ () => {}, true ],
  ] as const

  for (const [ uninstaller, expected ] of FIXTURES) {
    assert.equal(isWechatyPluginUninstaller(uninstaller), expected, `isWechatyPluginUninstaller(${uninstaller}) === ${expected}`)
  }
})

test('Wechaty.useScoped() installs on start, uninstalls LIFO on stop, and reinstalls on restart', async () => {
  const order: string[] = []
  const bot = WechatyBuilder.build({ puppet: new PuppetMock() })

  try {
    const uninstaller1 = bot.useScoped((_bot, scope) => {
      order.push(`install-1:g${scope.generation}`)
      scope.defer(() => order.push(`defer-1:g${scope.generation}`))
      return () => order.push(`uninstall-1:g${scope.generation}`)
    })
    bot.useScoped((_bot, scope) => {
      order.push(`install-2:g${scope.generation}`)
      return () => order.push(`uninstall-2:g${scope.generation}`)
    })

    // Not installed before start()
    assert.equal(order.length, 0)

    await bot.start()
    assert.deepEqual(order, ['install-1:g1', 'install-2:g1'])

    await bot.stop()
    // LIFO order across plugin 2 then plugin 1
    assert.deepEqual(order, [
      'install-1:g1',
      'install-2:g1',
      'uninstall-2:g1',
      'uninstall-1:g1',
      'defer-1:g1',
    ])

    // Uninstalling plugin 1 before restart prevents it from installing on g2
    uninstaller1()
    order.splice(0, order.length)

    await bot.start()
    assert.deepEqual(order, ['install-2:g2'])

    // Calling useScoped while running installs immediately on active scope
    bot.useScoped((_bot, scope) => {
      order.push(`install-3:g${scope.generation}`)
      return () => order.push(`uninstall-3:g${scope.generation}`)
    })
    assert.deepEqual(order, ['install-2:g2', 'install-3:g2'])

    await bot.stop()
    assert.deepEqual(order, [
      'install-2:g2',
      'install-3:g2',
      'uninstall-3:g2',
      'uninstall-2:g2',
    ])
  } finally {
    await bot.stop().catch(() => {})
  }
})

test('Wechaty.useScoped() snapshots installs, rolls back partial failures, and awaits/retries uninstallers', async () => {
  const bot = WechatyBuilder.build({ puppet: new PuppetMock() })
  const events: string[] = []

  try {
    // 1. Nested useScoped inside installScoped must not double-install
    bot.useScoped((b, _scope) => {
      events.push('parent-install')
      b.useScoped(() => {
        events.push('child-install')
        return () => { events.push('child-uninstall') }
      })
      return async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        events.push('parent-async-uninstall')
      }
    })

    await bot.start()
    assert.deepEqual(events, ['parent-install', 'child-install'])

    // 2. Partial failure in useScoped rolls back earlier entries in the same call
    assert.throws(() => {
      bot.useScoped(
        () => {
          events.push('batch-1-install')
          return () => { events.push('batch-1-uninstall') }
        },
        () => {
          throw new Error('batch-2 boom')
        },
      )
    }, /batch-2 boom/)
    assert.ok(events.includes('batch-1-uninstall'))

    await bot.stop()
    assert.ok(events.includes('parent-async-uninstall'), 'stop() should await async uninstaller')
    assert.ok(events.includes('child-uninstall'))
  } finally {
    await bot.stop().catch(() => {})
  }

  // 3. Fail-once uninstaller is retried on subsequent stop()
  const bot2 = WechatyBuilder.build({ puppet: new PuppetMock() })
  let uninstallAttempts = 0
  bot2.useScoped(() => () => {
    uninstallAttempts += 1
    if (uninstallAttempts === 1) {
      throw new Error('uninstall transient failure')
    }
  })

  try {
    await bot2.start()
    await assert.rejects(() => bot2.stop(), /uninstall transient failure/)
    await bot2.stop()
    assert.equal(uninstallAttempts, 2)
  } finally {
    await bot2.stop().catch(() => {})
  }
})
