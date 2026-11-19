/**
 * Owns one generation's hook barrier, tasks, child ownership and cleanup ledger.
 * Hooks receive a frozen facade while the kernel controls sealing and retirement.
 */
import { LifecycleSupersededError, LifecycleUnsafeStateError } from './errors.ts'
import { observe, type Outcome, waitWithSignal } from './operations.ts'
import type {
  AsyncDisposable,
  Disposable,
  Lifecycle,
  LifecycleCondition,
  LifecycleHooks,
  LifecycleScope,
} from './types.ts'

type Release = () => void | PromiseLike<void>
type Failure = { readonly error: unknown }
type GenerationFailure = Failure & { readonly phase: 'start' | 'run' }

/** Native facades expose pending commands and cleanup to ownership checks between state commits. */
export const childIsIdle = new WeakMap<Lifecycle, () => boolean>()

const childOwners = new WeakMap<Lifecycle, GenerationScope>()

/**
 * Drives a generation's startup and one retirement pass at a time. A deadline
 * leaves that pass running, so a later stop can resume it without duplicating
 * hook calls or releases.
 */
export class GenerationScope {
  readonly generation: number
  readonly facade: LifecycleScope
  readonly signal: AbortSignal
  readonly #hooks: LifecycleHooks
  readonly #onFailure: () => void
  readonly #onLateRegistration: () => void
  readonly #onLateFailure: (error: unknown) => void
  readonly #controller = new AbortController()

  #sealed = false
  #reason: unknown
  #failure?: GenerationFailure
  #entered = false
  #startup?: Promise<Outcome>
  #stopHookRan = false
  #stopHookFailure?: Failure
  #releases: Release[] = []
  #tasks = new Set<Promise<void>>()
  #late = new Set<Promise<Outcome>>()
  #lateFailures: Array<{ release: Release; error: unknown }> = []
  #retirement?: { work: Promise<readonly unknown[]>; settled: boolean }

  /** Wire kernel callbacks without exposing retirement authority to hooks. */
  constructor(
    generation: number,
    hooks: LifecycleHooks,
    callbacks: {
      fail: () => void
      lateRegistration: () => void
      lateFailure: (error: unknown) => void
      setCondition: (condition: LifecycleCondition, value: boolean) => void
    },
  ) {
    this.generation = generation
    this.#hooks = hooks
    this.#onFailure = callbacks.fail
    this.#onLateRegistration = callbacks.lateRegistration
    this.#onLateFailure = callbacks.lateFailure
    this.signal = this.#controller.signal
    const facade: LifecycleScope = {
      signal: this.signal,
      use: resource => this.#use(resource),
      adopt: (resource, release) => {
        this.#register(() => release(resource))
        return resource
      },
      defer: release => this.#register(release),
      spawn: task => this.#spawn(task),
      start: child => this.#startChild(child),
      set: condition => {
        if (!this.#sealed) callbacks.setCondition(condition, true)
      },
      clear: condition => {
        if (!this.#sealed) callbacks.setCondition(condition, false)
      },
      fail: error => this.fail(error),
    }
    this.facade = Object.freeze(facade)
  }

  /** A sealed generation cannot accept new ownership or publish readiness. */
  get sealed(): boolean {
    return this.#sealed
  }

  /** The first failure, independently of the truthiness of its payload. */
  get failure(): GenerationFailure | undefined {
    return this.#failure
  }

  /** The first reason for sealing, shared by waiters and late registrations. */
  get reason(): unknown {
    return this.#reason
  }

  /** Resources left behind by an earlier pass or still releasing after sealing. */
  get hasCleanup(): boolean {
    return this.#releases.length > 0 || this.#late.size > 0 || this.#lateFailures.length > 0
  }

  /** Prevent new scope activity before user callbacks can observe interruption. */
  seal(reason: unknown): void {
    if (!this.#sealed) {
      this.#sealed = true
      this.#reason = reason
    }
  }

  /** Seal first because abort listeners can synchronously acquire or issue commands. */
  interrupt(reason: unknown): void {
    this.seal(reason)
    this.#controller.abort(this.#reason)
  }

  /** Preserve the first failure and its phase, then interrupt the hook before asking the kernel to retire. */
  fail(error: unknown, phase: GenerationFailure['phase'] = 'run'): void {
    if (!this.#sealed && !this.#failure) {
      this.#failure = { error, phase }
      this.interrupt(error)
      this.#onFailure()
    }
  }

  /** Observe the actual startup hook so cancellation never loses the join barrier. */
  boot(): Promise<Outcome> {
    this.#startup = observe(async () => {
      if (this.#sealed) {
        return
      }
      this.#entered = true
      await this.#hooks.onStart(this.facade)
    })
    return this.#startup
  }

  /** Start or join a retirement pass. Failed disposers stay registered for a later pass. */
  retire(retry: boolean): Promise<readonly unknown[]> {
    const current = this.#retirement
    if (current && !(retry && current.settled && this.hasCleanup)) {
      return current.work
    }
    const pass = { work: this.#retire(retry), settled: false }
    this.#retirement = pass
    void pass.work.then(() => { pass.settled = true })
    return pass.work
  }

  /** Forget a pass only after the kernel observes its outcome. */
  consumeRetirement(): void {
    this.#retirement = undefined
    this.#stopHookFailure = undefined
  }

  /** Wait for immediate late releases, optionally retrying prior failures once. */
  async finishLateReleases(retry: boolean): Promise<readonly unknown[]> {
    if (retry) {
      for (const { release } of this.#lateFailures.splice(0)) {
        this.#releaseLate(release)
      }
    }
    while (this.#late.size > 0) {
      await Promise.all(this.#late)
    }
    return this.#lateFailures.map(failure => failure.error)
  }

  /** Run graceful shutdown, interrupt I/O, join tasks, then release resources. */
  async #retire(retry: boolean): Promise<readonly unknown[]> {
    await this.#startup
    this.#startup = undefined
    if (this.#entered && !this.#stopHookRan) {
      this.#stopHookRan = true
      const stopped = await observe(() => this.#hooks.onStop?.(this.facade))
      if (!stopped.ok) {
        this.#stopHookFailure = { error: stopped.error }
      }
    }

    this.interrupt(this.#reason)
    await Promise.all(this.#tasks)

    const errors = this.#stopHookFailure ? [this.#stopHookFailure.error] : []
    const failed: Release[] = []
    while (this.#releases.length > 0) {
      const release = this.#releases.pop()!
      const outcome = await observe(release)
      if (!outcome.ok) {
        errors.push(outcome.error)
        failed.push(release)
      }
    }
    this.#releases = failed.reverse()
    errors.push(...await this.finishLateReleases(retry))
    return errors
  }

  /** Select and capture the resource's disposal method at registration. */
  #use<T extends AsyncDisposable | Disposable>(resource: T): T {
    const dispose = (resource as Partial<AsyncDisposable>)[Symbol.asyncDispose]
      ?? (resource as Partial<Disposable>)[Symbol.dispose]
    if (typeof dispose !== 'function') {
      throw new TypeError('Lifecycle resource must implement disposal')
    }
    this.#register(() => dispose.call(resource))
    return resource
  }

  /** Release late acquisitions immediately and retain any failure for retry. */
  #register(release: Release): void {
    if (!this.#sealed) {
      this.#releases.push(release)
      return
    }

    this.#releaseLate(release, true)
    throw this.#reason
  }

  /** Account for the release before invoking it, since it can reenter the lifecycle. */
  #releaseLate(release: Release, notify = false): void {
    const { promise, resolve } = Promise.withResolvers<Outcome>()
    this.#late.add(promise)
    void promise.then(outcome => {
      if (!outcome.ok) {
        // Each registration owns a release, even if callers reuse the same function.
        this.#lateFailures.push({ release, error: outcome.error })
        this.#onLateFailure(outcome.error)
      }
      this.#late.delete(promise)
    })
    if (notify) {
      this.#onLateRegistration()
    }
    void observe(release).then(resolve)
  }

  /** Retain tasks until settlement and route active rejections to the kernel. */
  #spawn(task: (signal: AbortSignal) => Promise<void>): void {
    if (this.#sealed) {
      throw this.#reason
    }
    const work = Promise.resolve().then(async () => {
      if (!this.signal.aborted) {
        await task(this.signal)
      }
    }).catch((error: unknown) => {
      if (!this.signal.aborted || error !== this.signal.reason) {
        this.fail(error)
      }
    })
    this.#tasks.add(work)
    void work.then(() => this.#tasks.delete(work))
  }

  /** Own a child until its stop succeeds, interrupting pending startup on parent abort. */
  async #startChild(child: Lifecycle): Promise<void> {
    if (this.#sealed) {
      throw this.#reason
    }
    const initial = child.state
    const canStart = initial.kind === 'stopped' || (initial.kind === 'failed' && initial.cleanupComplete)
    if (!canStart || childOwners.has(child) || childIsIdle.get(child)?.() === false) {
      throw new LifecycleUnsafeStateError('Child lifecycle is already owned or cannot be started safely')
    }

    childOwners.set(child, this)
    let earlyStop: Promise<Outcome> | undefined
    const stopDuringStartup = () => {
      earlyStop = observe(() => child.stop())
    }
    this.#register(async () => {
      const outcome = await (earlyStop ?? observe(() => child.stop()))
      earlyStop = undefined
      if (!outcome.ok) {
        throw outcome.error
      }
      if (child.state.kind !== 'stopped' || childIsIdle.get(child)?.() === false) {
        throw new LifecycleUnsafeStateError('Owned child has a replacement or unfinished retirement')
      }
      childOwners.delete(child)
    })

    this.signal.addEventListener('abort', stopDuringStartup, { once: true })
    try {
      await waitWithSignal(child.start(), this.signal)
    } finally {
      this.signal.removeEventListener('abort', stopDuringStartup)
    }

    if (this.#sealed) {
      throw this.#reason
    }
    const generation = child.state.generation
    this.#spawn(async signal => {
      // The stopping snapshot precedes both failure and normal exit. The
      // terminal snapshot distinguishes them and carries the child's cause.
      const exited = await child.whenState(
        state => state.generation !== generation || state.kind === 'failed' || state.kind === 'stopped',
        { signal },
      )
      this.fail(exited.kind === 'failed'
        ? new Error('Owned child lifecycle failed', { cause: exited.error })
        : new LifecycleSupersededError('Owned child lifecycle exited unexpectedly'))
    })
  }
}
