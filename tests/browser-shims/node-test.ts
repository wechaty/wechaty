/**
 * Browser adapter bridging `node:test` APIs to the in-page Mocha test harness
 * provided by `@web/test-runner`.
 *
 * This module allows unit tests written with standard `import { test, mock } from 'node:test'`
 * to execute natively inside browser window contexts without test source modifications.
 */

// Ensure environment globals expected by Node-targeted code exist in browser window
if (typeof (globalThis as any).global === 'undefined') {
  ;(globalThis as any).global = globalThis
}

if (typeof (globalThis as any).setImmediate === 'undefined') {
  ;(globalThis as any).setImmediate = (fn: (...args: unknown[]) => void, ...args: unknown[]) =>
    setTimeout(fn, 0, ...args)
  ;(globalThis as any).clearImmediate = (id: number) => clearTimeout(id)
}

if (typeof (globalThis as any).process === 'undefined') {
  ;(globalThis as any).process = {
    env: { NODE_ENV: 'test' },
    nextTick: (cb: (...args: unknown[]) => void, ...args: unknown[]) => queueMicrotask(() => cb(...args)),
    stderr: { write: () => {} },
    stdout: { write: () => {} },
    version: 'v20.0.0',
  }
}

/**
 * Record describing an individual mock invocation, matching `node:test` MockFunctionCall.
 */
export interface MockCall {
  arguments: unknown[]
  error?: unknown
  result?: unknown
  target?: unknown
  this?: unknown
}

/**
 * Mock function returned by `mock.fn` and `mock.method`.
 */
export interface MockFunction<T extends (...args: any[]) => any = (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>
  mock: {
    callCount: () => number
    calls: MockCall[]
    mockImplementation: (fn: T) => void
    resetCalls: () => void
    restore: () => void
  }
}

const originalMethods: { obj: any, orig: any, prop: string }[] = []

/** Fails consistently for mock timer operations the browser adapter cannot perform. */
function unsupportedMockTimers (): never {
  throw new Error('mock.timers is not supported in the browser test environment. Use standard browser timers.')
}

/**
 * Mocking utilities matching the `node:test` mock interface.
 */
export const mock = {
  /**
   * Spies on or stubs a function, recording calls in `mock.calls`.
   */
  fn: <T extends (...args: any[]) => any = (...args: any[]) => any>(
    implementation?: T,
  ): MockFunction<T> => {
    let currentImpl = implementation
    const calls: MockCall[] = []

    const mocked = function (this: unknown, ...args: unknown[]) {
      let result: unknown
      let error: unknown
      try {
        result = currentImpl ? currentImpl.apply(this, args) : undefined
        return result
      } catch (err) {
        error = err
        throw err
      } finally {
        calls.push({
          arguments: args,
          error,
          result,
          target: currentImpl,
          this: this,
        })
      }
    } as MockFunction<T>

    Object.defineProperty(mocked, 'mock', {
      value: {
        callCount: () => calls.length,
        calls,
        mockImplementation: (newImpl: T) => {
          currentImpl = newImpl
        },
        resetCalls: () => {
          calls.length = 0
        },
        restore: () => {},
      },
    })

    return mocked
  },

  /**
   * Spies on or mocks an object method, restoring original behavior on restore.
   */
  method: <T extends Record<string, any>, K extends keyof T>(
    object: T,
    property: K,
    implementation?: T[K],
  ): MockFunction<T[K]> => {
    const orig = object[property]
    originalMethods.push({ obj: object, orig, prop: property as string })

    let currentImpl = implementation
    const calls: MockCall[] = []

    const mocked = function (this: unknown, ...args: unknown[]) {
      let result: unknown
      let error: unknown
      try {
        if (currentImpl) {
          result = currentImpl.apply(this, args)
        } else if (typeof orig === 'function') {
          result = orig.apply(this, args)
        }
        return result
      } catch (err) {
        error = err
        throw err
      } finally {
        calls.push({
          arguments: args,
          error,
          result,
          target: currentImpl || orig,
          this: this,
        })
      }
    } as unknown as MockFunction<T[K]>

    const restoreFn = () => {
      object[property] = orig
    }

    Object.defineProperty(mocked, 'mock', {
      value: {
        callCount: () => calls.length,
        calls,
        mockImplementation: (newImpl: T[K]) => {
          currentImpl = newImpl
        },
        resetCalls: () => {
          calls.length = 0
        },
        restore: restoreFn,
      },
    })

    object[property] = mocked as unknown as T[K]
    return mocked
  },

  /**
   * Restores all mocked methods tracked by this module.
   */
  restoreAll: (): void => {
    while (originalMethods.length > 0) {
      const entry = originalMethods.pop()!
      entry.obj[entry.prop] = entry.orig
    }
  },

  /**
   * Fail explicitly until the browser adapter provides a mock clock.
   */
  timers: {
    enable: unsupportedMockTimers,
    reset: unsupportedMockTimers,
    tick: unsupportedMockTimers,
  },
}

/**
 * Sentinel error thrown when an individual subtest is skipped.
 * Caught by `t.test()` to prevent aborting the parent Mocha execution.
 */
class SubtestSkipError extends Error {
  constructor (message?: string) {
    super(message || 'Subtest skipped')
    this.name = 'SubtestSkipError'
  }
}

/**
 * Context passed to individual test executions and subtests, conforming to `node:test` TestContext.
 */
export interface TestContext {
  test: (name: string, fn: (t: TestContext) => Promise<void> | void) => Promise<void>
  after: (fn: () => Promise<void> | void) => void
  before: (fn: () => Promise<void> | void) => void
  diagnostic: (message: string) => void
  skip: (message?: string) => void
  todo: (message?: string) => void
  mock: typeof mock
}

/**
 * Options accepted by test() matching `node:test`.
 */
export interface TestOptions {
  only?: boolean
  skip?: boolean | string
  timeout?: number
  todo?: boolean | string
}

/**
 * Creates an isolated execution context for a test or subtest.
 *
 * Mocks created via `context.mock` are scoped to this context and automatically restored
 * upon context teardown.
 */
function createTestContext (mochaCtx?: any, isSubtest = false): TestContext {
  const afterHooks: (() => Promise<void> | void)[] = []
  const beforeHooks: (() => Promise<void> | void)[] = []
  let beforeHooksRun: Promise<void> | undefined
  const contextMocks: { restore: () => void }[] = []

  const scopedMock = {
    fn: mock.fn,
    method: <T extends Record<string, any>, K extends keyof T>(
      object: T,
      property: K,
      implementation?: T[K],
    ): MockFunction<T[K]> => {
      const mocked = mock.method(object, property, implementation)
      contextMocks.push({ restore: () => mocked.mock.restore() })
      return mocked
    },
    resetCalls: (): void => {
      // No-op for scoped tracker; individual function calls are reset on the MockFunction
    },
    restoreAll: (): void => {
      while (contextMocks.length > 0) {
        const entry = contextMocks.pop()!
        entry.restore()
      }
    },
    timers: mock.timers,
  }

  const context: TestContext = {
    after: (fn: () => Promise<void> | void) => {
      afterHooks.push(fn)
    },
    before: (fn: () => Promise<void> | void) => {
      beforeHooks.push(fn)
    },
    diagnostic: (message: string) => {
      console.log(`[test:diagnostic] ${message}`)
    },
    mock: scopedMock,
    skip: (message?: string) => {
      if (isSubtest) {
        console.log(`[test:skip:subtest] ${message || ''}`)
        throw new SubtestSkipError(message)
      } else if (typeof mochaCtx?.skip === 'function') {
        mochaCtx.skip()
      } else {
        console.log(`[test:skip] ${message || ''}`)
      }
    },
    test: async (subName: string, subFn: (t: TestContext) => Promise<void> | void) => {
      // The first subtest starts the parent's setup. Siblings share that result.
      beforeHooksRun ??= (async () => {
        for (const hook of beforeHooks) {
          await hook()
        }
      })()
      await beforeHooksRun

      const subContext = createTestContext(mochaCtx, true)
      try {
        await subFn(subContext)
      } catch (err) {
        if (err instanceof SubtestSkipError) {
          console.log(`[test:subtest:skipped] ${subName}: ${err.message}`)
          return
        }
        throw err
      } finally {
        try {
          const hooks = (subContext as any)._afterHooks || []
          for (const hook of hooks) {
            await hook()
          }
        } finally {
          subContext.mock.restoreAll()
        }
      }
    },
    todo: (message?: string) => {
      if (isSubtest) {
        console.log(`[test:todo:subtest] ${message || ''}`)
        throw new SubtestSkipError(`[TODO] ${message || ''}`)
      } else if (typeof mochaCtx?.skip === 'function') {
        mochaCtx.skip()
      } else {
        console.log(`[test:todo] ${message || ''}`)
      }
    },
  }

  Object.defineProperty(context, '_afterHooks', {
    configurable: true,
    enumerable: false,
    value: afterHooks,
    writable: true,
  })

  return context
}

export type TestFunction = (t: TestContext) => Promise<void> | void

/**
 * Runs a test function within an isolated context and tears it down after the test.
 */
async function runWithContext (fn: TestFunction, mochaCtx: any): Promise<void> {
  const context = createTestContext(mochaCtx, false)
  try {
    await fn(context)
  } finally {
    try {
      const hooks = (context as any)._afterHooks || []
      for (const hook of hooks) {
        await hook()
      }
    } finally {
      context.mock.restoreAll()
    }
  }
}

/**
 * Defines a test case compatible with node:test.
 */
export function test (
  name: string,
  optionsOrFn?: TestOptions | TestFunction,
  maybeFn?: TestFunction,
): void {
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn
  const options = typeof optionsOrFn === 'object' ? optionsOrFn : undefined

  const runner = (globalThis as any).it || (globalThis as any).test
  if (!runner) {
    throw new Error('No in-browser test runner (it/test) found on globalThis')
  }

  if (!fn || options?.skip) {
    runner.skip(name, () => {})
    return
  }

  if (options?.only) {
    test.only(name, fn)
    return
  }

  runner(name, async function (this: any) {
    if (options?.timeout && typeof this?.timeout === 'function') {
      this.timeout(options.timeout)
    }
    await runWithContext(fn, this)
  })
}

/**
 * Marks a test case as skipped.
 */
test.skip = (name: string, _optionsOrFn?: TestOptions | TestFunction, _maybeFn?: TestFunction): void => {
  const runner = (globalThis as any).it || (globalThis as any).test
  if (runner?.skip) {
    runner.skip(name, () => {})
  } else {
    console.log(`Skipped: ${name}`)
  }
}

/**
 * Marks a test case as the only one to run, preserving after hooks and mock restoration.
 */
test.only = (name: string, optionsOrFn?: TestOptions | TestFunction, maybeFn?: TestFunction): void => {
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn
  const options = typeof optionsOrFn === 'object' ? optionsOrFn : undefined

  if (!fn) {
    return
  }

  const runner = (globalThis as any).it || (globalThis as any).test
  if (runner?.only) {
    runner.only(name, async function (this: any) {
      if (options?.timeout && typeof this?.timeout === 'function') {
        this.timeout(options.timeout)
      }
      await runWithContext(fn, this)
    })
  } else {
    test(name, optionsOrFn as any, maybeFn)
  }
}

/**
 * Marks a test case as a todo item.
 */
test.todo = (name: string): void => {
  test.skip(`[TODO] ${name}`)
}

export const it = test

/**
 * Suite declaration bridging `node:test` describe to the in-page Mocha runner.
 * If running outside an active suite runner, executes `fn()` synchronously as a fallback.
 */
export const describe = (globalThis as any).describe || ((_name: string, fn: () => void) => fn())

/**
 * Suite-level setup hook executed once before all tests in the current suite.
 * Delegates to Mocha's global `before` or `beforeAll`.
 */
export const before = (globalThis as any).before || (globalThis as any).beforeAll

/**
 * Suite-level teardown hook executed once after all tests in the current suite.
 * Delegates to Mocha's global `after` or `afterAll`.
 */
export const after = (globalThis as any).after || (globalThis as any).afterAll

/**
 * Per-test setup hook executed before each individual test in the current suite.
 * Delegates to Mocha's global `beforeEach`.
 */
export const beforeEach = (globalThis as any).beforeEach

/**
 * Per-test teardown hook executed after each individual test in the current suite.
 * Delegates to Mocha's global `afterEach`.
 */
export const afterEach = (globalThis as any).afterEach

export default test
