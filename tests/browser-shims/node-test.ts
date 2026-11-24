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
   * Fake timer stubs. Fails explicitly since fake timers in browser runner require userland clock.
   */
  timers: {
    enable: (): never => {
      throw new Error('mock.timers is not supported in the browser test environment. Use standard browser timers.')
    },
    reset: (): void => {},
    tick: (): never => {
      throw new Error('mock.timers is not supported in the browser test environment. Use standard browser timers.')
    },
  },
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
 * Creates an isolated subtest execution context.
 */
function createTestContext (mochaCtx?: any): TestContext {
  const afterHooks: (() => Promise<void> | void)[] = []

  const context: TestContext = {
    after: (fn: () => Promise<void> | void) => {
      afterHooks.push(fn)
    },
    before: (_fn: () => Promise<void> | void) => {
      // Lifecycle hook for subtest initialization
    },
    diagnostic: (message: string) => {
      console.log(`[test:diagnostic] ${message}`)
    },
    mock,
    skip: (message?: string) => {
      if (typeof mochaCtx?.skip === 'function') {
        mochaCtx.skip()
      } else {
        console.log(`[test:skip] ${message || ''}`)
      }
    },
    test: async (_subName: string, subFn: (t: TestContext) => Promise<void> | void) => {
      const subContext = createTestContext(mochaCtx)
      try {
        await subFn(subContext)
      } finally {
        const hooks = (subContext as any)._afterHooks || []
        for (const hook of hooks) {
          await hook()
        }
      }
    },
    todo: (message?: string) => {
      if (typeof mochaCtx?.skip === 'function') {
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
 * Runs a test function within an isolated context and invokes all registered after hooks.
 */
async function runWithContext (fn: TestFunction, mochaCtx: any): Promise<void> {
  const context = createTestContext(mochaCtx)
  try {
    await fn(context)
  } finally {
    const hooks = (context as any)._afterHooks || []
    for (const hook of hooks) {
      await hook()
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
 * Marks a test case as the only one to run, preserving after hooks.
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
export const describe = (globalThis as any).describe || ((name: string, fn: () => void) => fn())
export const before = (globalThis as any).before || (globalThis as any).beforeAll
export const after = (globalThis as any).after || (globalThis as any).afterAll
export const beforeEach = (globalThis as any).beforeEach
export const afterEach = (globalThis as any).afterEach

export default test
