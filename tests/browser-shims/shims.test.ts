/**
 * Comprehensive verification suite for browser testing shims.
 *
 * Verifies that in-browser replacements for `node:test` and `node:assert/strict`
 * faithfully adhere to the contracts required by standard portable Wechaty tests.
 */
import test, { mock } from 'node:test'
import assert, {
  deepEqual,
  deepStrictEqual,
  doesNotReject,
  doesNotThrow,
  equal,
  notDeepStrictEqual,
  notEqual,
  notStrictEqual,
  ok,
  rejects,
  strictEqual,
  throws,
} from 'node:assert/strict'

test('assert shim equality operations enforce strict semantics', () => {
  ok(true, 'truthy assertion')
  strictEqual(42, 42)
  equal('hello', 'hello')
  notStrictEqual(1, 2)
  notEqual('a', 'b')
  deepStrictEqual({ a: 1, b: [2] }, { a: 1, b: [2] })
  deepEqual({ a: 1 }, { a: 1 })
  notDeepStrictEqual({ a: 1 }, { a: 2 })
})

test('assert shim throws and doesNotThrow support expected patterns', () => {
  throws(() => {
    throw new Error('boom error')
  }, /boom/)

  throws(() => {
    const err = new Error('custom')
    ;(err as any).code = 'ERR_CUSTOM'
    throw err
  }, { code: 'ERR_CUSTOM' })

  throws(() => {
    throw new TypeError('type error')
  }, TypeError)

  doesNotThrow(() => {
    const _x = 1 + 1
  })
})

test('assert shim rejects and doesNotReject handle async operations', async () => {
  await rejects(async () => {
    throw new Error('async error')
  }, /async error/)

  await rejects(
    Promise.reject(new Error('promise error')),
    /promise error/,
  )

  await doesNotReject(async () => 'success')
  await doesNotReject(Promise.resolve('success'))
})

test('mock.fn records invocations and arguments conforming to node:test', () => {
  const spy = mock.fn((a: number, b: number) => a + b)
  const result = spy(10, 20)

  strictEqual(result, 30)
  strictEqual(spy.mock.callCount(), 1)
  strictEqual(spy.mock.calls.length, 1)
  deepStrictEqual(spy.mock.calls[0]?.arguments, [10, 20])
  strictEqual(spy.mock.calls[0]?.result, 30)
})

test('mock.method spies on and restores object properties', () => {
  const target = {
    compute (val: number) {
      return val * 2
    },
  }

  const mockedMethod = mock.method(target, 'compute', (val: number) => val * 10)
  strictEqual(target.compute(3), 30)
  strictEqual(mockedMethod.mock.calls.length, 1)
  deepStrictEqual(mockedMethod.mock.calls[0]?.arguments, [3])

  mockedMethod.mock.restore()
  strictEqual(target.compute(3), 6)
})

test('TestContext provides scoped mock and registers after hooks', async (t) => {
  let afterHookRan = false
  t.after(() => {
    afterHookRan = true
  })

  ok(typeof t.mock?.fn === 'function', 't.mock is available on TestContext')
  const fn = t.mock.fn(() => 'ok')
  strictEqual(fn(), 'ok')
  strictEqual(fn.mock.callCount(), 1)
})

test('test() accepts options in test(name, options, fn) signature', { timeout: 15000 }, (t) => {
  ok(t, 'options overload accepted')
})

test('TestContext before hook executes once before sibling subtests', async (t) => {
  let beforeHookCalls = 0
  t.before(async () => {
    await Promise.resolve()
    beforeHookCalls++
  })

  await t.test('first child', () => {
    strictEqual(beforeHookCalls, 1)
  })
  await t.test('second child', () => {
    strictEqual(beforeHookCalls, 1)
  })
  strictEqual(beforeHookCalls, 1)
})

test('unsupported mock timer operations fail explicitly', () => {
  throws(() => mock.timers.enable(), /mock\.timers is not supported/)
  throws(() => mock.timers.tick(1), /mock\.timers is not supported/)
  throws(() => mock.timers.reset(), /mock\.timers is not supported/)
})

test('subtest skip does not abort sibling subtests in the parent', async (t) => {
  let siblingExecuted = false

  await t.test('first child skips', (subT) => {
    subT.skip('skipping first child')
  })

  await t.test('second child runs', () => {
    siblingExecuted = true
  })

  ok(siblingExecuted, 'sibling subtest executed successfully despite first child skip')
})

test('t.mock.method isolates and restores mocked methods after execution', async (t) => {
  const service = {
    getValue () {
      return 'original'
    },
  }

  await t.test('subtest modifies service', (subT) => {
    subT.mock.method(service, 'getValue', () => 'mocked')
    strictEqual(service.getValue(), 'mocked')
  })

  // After subtest completes, subtest-scoped mock is restored
  strictEqual(service.getValue(), 'original', 'scoped mock was restored after subtest')
})

test('stream-promises pipeline shim pipes streams and settles on completion', async () => {
  const { pipeline } = await import('./stream-promises.ts')

  await doesNotReject(async () => {
    await pipeline()
    await pipeline({})
  })

  const source = {
    pipe: (target: any) => target,
  }
  const dest = {
    on: (event: string, cb: () => void) => {
      if (event === 'finish') {
        setTimeout(cb, 0)
      }
    },
  }

  await doesNotReject(async () => {
    await pipeline(source, dest)
  })
})


