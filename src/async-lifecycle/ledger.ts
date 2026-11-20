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
 * The per-generation ownership ledger.
 *
 * Owns the list of release actions a generation registered (resources, deferred
 * cleanups, task joins, child stops) and the truth about which of them finished.
 * It knows nothing about generations, hooks or state: the engine decides *when*
 * to interrupt and unwind, and reads back {@link Ledger.clean} to decide whether
 * retirement really completed.
 *
 * Why not `AsyncDisposableStack`: retrying a failed release and joining a release
 * that is still running both need per-entry status, which the native stack
 * discards (consolidated v1 design, wechaty/wechaty#2911 §5).
 */

/** A release action. May be synchronous or asynchronous. */
type Release = () => void | PromiseLike<void>

/** Options for {@link Ledger.add}. */
interface LedgerEntryOptions {
  readonly release: Release
  /** Synchronous unblocking step run by {@link Ledger.interrupt}. */
  readonly interrupt?: () => void
  /**
   * `true` (default): a failed release stays owned and is retried by the next
   * unwind. `false`: the failure is reported once and the entry is dropped. Used
   * for task joins, where the task has already finished and holds nothing.
   */
  readonly retryable?: boolean
  /**
   * A task join. Every unwind runs all joins before any other entry, whatever
   * the registration order, because tasks use resources: a task spawned before
   * a resource may still be using it after the abort (C-RET-01 steps 6 and 7).
   */
  readonly join?: boolean
}

/** Options for {@link Ledger.unwind}. */
interface UnwindOptions {
  /**
   * Retry only these failed entries (handles from {@link Ledger.failedEntries});
   * other failed entries stay failed and are not run. Default: retry every one.
   */
  readonly retry?: ReadonlySet<object>
  /** `false`: leave running entries alone instead of joining them. Default `true`. */
  readonly joinRunning?: boolean
}

interface Entry {
  readonly release: Release
  readonly interrupt: (() => void) | undefined
  readonly retryable: boolean
  readonly join: boolean
  status: 'idle' | 'running' | 'failed'
  running: Promise<void> | undefined
  /** The last failure, kept so debt can be reported without re-running it. */
  failure: { readonly error: unknown } | undefined
  interrupted: boolean
}

/**
 * An ordered, retry-aware release ledger. Finished entries are removed, so an
 * empty ledger means everything it ever owned was released.
 */
class Ledger {

  readonly #entries: Entry[] = []
  #sealed = false
  #unwinding: Promise<unknown[]> | undefined

  /** Whether new registrations are refused. */
  get sealed (): boolean {
    return this.#sealed
  }

  /** Whether every registered release has completed. */
  get clean (): boolean {
    return this.#entries.length === 0
  }

  /** The last errors of releases that failed and still await a retry. */
  get failures (): unknown[] {
    return this.failuresExcept(new Set())
  }

  /**
   * Opaque handles of the entries that have failed so far. A caller snapshots
   * them to tell debt that existed before a pass from a failure first seen
   * during it (C-SCOPE-11): only the first is retried by that pass.
   */
  failedEntries (): ReadonlySet<object> {
    return new Set(this.#entries.filter(entry => entry.status === 'failed'))
  }

  /** The errors of failed entries that are not in `known`. */
  failuresExcept (known: ReadonlySet<object>): unknown[] {
    return this.#entries
      .filter(entry => entry.status === 'failed' && entry.failure && !known.has(entry))
      .map(entry => entry.failure!.error)
  }

  /** Refuse further {@link Ledger.add} calls. Already registered entries are kept. */
  seal (): void {
    this.#sealed = true
  }

  /**
   * Register a release action. Returns `false`, without registering, once sealed.
   */
  add (options: LedgerEntryOptions): boolean {
    if (this.#sealed) {
      return false
    }
    this.#entries.push(this.#entry(options.release, options.interrupt, options.retryable ?? true, options.join ?? false))
    return true
  }

  /**
   * Drop the entry registered with `release` if it has not started: its owner
   * found it holds nothing. A rejected `acquire` creation uses this, so a retry
   * loop does not grow the ledger (C-SCOPE-04). A running entry is left alone;
   * it removes itself when it finishes.
   */
  discard (release: Release): void {
    const entry = this.#entries.find(candidate => candidate.release === release)
    if (entry && entry.status === 'idle') {
      this.#remove(entry)
    }
  }

  /**
   * Track and immediately run a release that arrived after sealing.
   *
   * The entry stays in the ledger until it succeeds, so a later unwind joins it
   * while it runs and retries it if it failed. The returned promise settles with
   * this first run and rejects with its error.
   */
  addLate (release: Release): Promise<void> {
    const entry = this.#entry(release, undefined, true, false)
    this.#entries.push(entry)
    return this.#run(entry)
  }

  /**
   * Run every pending interrupt once, newest first, synchronously. Returns the
   * errors they threw; an interrupt error never marks its entry as unreleased.
   */
  interrupt (): unknown[] {
    const errors: unknown[] = []
    for (const entry of [ ...this.#entries ].reverse()) {
      if (!entry.interrupt || entry.interrupted) {
        continue
      }
      entry.interrupted = true
      try {
        entry.interrupt()
      } catch (error) {
        errors.push(error)
      }
    }
    return errors
  }

  /**
   * Release every unfinished entry, continuing past failures: first every task
   * join, then everything else, each newest first (C-RET-01 steps 6 and 7).
   *
   * A running entry is joined, not started again; a failed one is retried once
   * per unwind. Entries added while unwinding (late releases) are joined too.
   * Concurrent calls share one pass. Never rejects: the errors of this pass are
   * returned, and {@link Ledger.clean} tells whether anything is still owned.
   */
  unwind (options?: UnwindOptions): Promise<unknown[]> {
    this.#sealed = true
    this.#unwinding ??= this.#unwindPass(options).finally(() => {
      this.#unwinding = undefined
    })
    return this.#unwinding
  }

  async #unwindPass (options: UnwindOptions | undefined): Promise<unknown[]> {
    const errors: unknown[] = []
    const attempted = new Set<Entry>()
    const skip = (entry: Entry) => (options?.retry !== undefined && entry.status === 'failed' && !options.retry.has(entry))
      || (options?.joinRunning === false && entry.status === 'running')
    for (const entry of this.#entries) {
      if (skip(entry)) {
        attempted.add(entry)
      }
    }
    for (;;) {
      const entry = this.#entries.findLast(candidate => candidate.join && !attempted.has(candidate))
        ?? this.#entries.findLast(candidate => !attempted.has(candidate))
      if (!entry) {
        return errors
      }
      attempted.add(entry)
      try {
        await this.#run(entry)
      } catch (error) {
        errors.push(error)
      }
    }
  }

  #entry (release: Release, interrupt: (() => void) | undefined, retryable: boolean, join: boolean): Entry {
    return {
      release,
      interrupt,
      retryable,
      join,
      status      : 'idle',
      running     : undefined,
      failure     : undefined,
      interrupted : false,
    }
  }

  /** Start (or join) one entry's release. Rejects with the release error. */
  #run (entry: Entry): Promise<void> {
    if (entry.status === 'running') {
      return entry.running!
    }
    entry.status = 'running'
    entry.running = (async () => entry.release())().then(
      () => {
        this.#remove(entry)
      },
      (error: unknown) => {
        if (entry.retryable) {
          entry.status = 'failed'
          entry.failure = { error }
          entry.running = undefined
        } else {
          this.#remove(entry)
        }
        throw error
      },
    )
    return entry.running
  }

  #remove (entry: Entry): void {
    const index = this.#entries.indexOf(entry)
    if (index >= 0) {
      this.#entries.splice(index, 1)
    }
  }

}

export type {
  LedgerEntryOptions,
  UnwindOptions,
  Release,
}
export {
  Ledger,
}
