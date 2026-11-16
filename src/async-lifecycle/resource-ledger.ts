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
 * A per-generation LIFO cleanup ledger. Failed and pending releases remain
 * owned until a later unwind confirms that they completed.
 */

type Disposer = () => void | PromiseLike<void>

interface DisposerEntry {
  readonly dispose: Disposer
  readonly interruptsTasks: boolean
  readonly late: boolean
  complete: boolean
  pending: Promise<void> | undefined
  hasError: boolean
  lastError: unknown
  skipEpoch: number | undefined
}

class ResourceLedger {
  readonly #disposers: DisposerEntry[] = []
  #sealed = false
  #unwindEpoch = 0
  #unwindOperation: Promise<unknown[]> | undefined

  get sealed (): boolean {
    return this.#sealed
  }

  /**
   * Prevent new owned entries while allowing current cleanup to finish.
   */
  seal (): void {
    this.#sealed = true
  }

  /**
   * Add a disposer unless retirement has sealed the ledger. Cleanup entries
   * unwind in strict reverse registration order; `joinsTask` entries (spawned
   * task joins) run after them so closing a resource can unblock the task.
   */
  register (disposer: Disposer, joinsTask = false): boolean {
    if (this.#sealed) {
      return false
    }
    this.#disposers.push({
      dispose: disposer,
      interruptsTasks: !joinsTask,
      late: false,
      complete: false,
      pending: undefined,
      hasError: false,
      lastError: undefined,
      skipEpoch: undefined,
    })
    return true
  }

  /**
   * Track and immediately run an acquisition made after sealing.
   */
  async releaseLate (disposer: Disposer): Promise<void> {
    const entry: DisposerEntry = {
      dispose: disposer,
      interruptsTasks: false,
      late: true,
      complete: false,
      pending: undefined,
      hasError: false,
      lastError: undefined,
      skipEpoch: this.#unwindOperation ? this.#unwindEpoch : undefined,
    }
    this.#disposers.push(entry)
    await this.#release(entry)
  }

  /**
   * Run unfinished disposers in reverse order, retaining failed entries.
   */
  async unwind (): Promise<unknown[]> {
    if (this.#unwindOperation) {
      return this.#unwindOperation
    }
    this.#sealed = true
    const epoch = ++this.#unwindEpoch
    for (const entry of this.#disposers) {
      if (entry.late && entry.skipEpoch === undefined && (entry.pending || entry.hasError)) {
        entry.skipEpoch = epoch
      }
    }
    this.#unwindOperation = this.#unwind(epoch)
    try {
      return await this.#unwindOperation
    } finally {
      this.#unwindOperation = undefined
    }
  }

  async #unwind (epoch: number): Promise<unknown[]> {
    const errors: unknown[] = []

    // Close resources that can interrupt blocked tasks before joining them.
    for (const phase of [ true, false ]) {
      const attempted = new Set<DisposerEntry>()
      for (;;) {
        const entry = [ ...this.#disposers ].reverse().find(candidate =>
          !candidate.complete
          && candidate.interruptsTasks === phase
          && !attempted.has(candidate),
        )
        if (!entry) {
          break
        }
        attempted.add(entry)
        if (entry.late && entry.skipEpoch === epoch && !entry.pending) {
          if (entry.hasError) {
            errors.push(entry.lastError)
          }
          continue
        }
        try {
          await this.#release(entry)
        } catch (error) {
          entry.hasError = true
          entry.lastError = error
          errors.push(error)
        }
      }
    }

    return errors
  }

  async #release (entry: DisposerEntry): Promise<void> {
    if (entry.complete) {
      return
    }
    if (!entry.pending) {
      entry.hasError = false
      entry.lastError = undefined
      entry.pending = Promise.resolve().then(entry.dispose).then(() => {
        entry.complete = true
        const index = this.#disposers.indexOf(entry)
        if (index >= 0) {
          this.#disposers.splice(index, 1)
        }
      }, error => {
        entry.hasError = true
        entry.lastError = error
        throw error
      }).finally(() => {
        entry.pending = undefined
      })
    }
    return entry.pending
  }
}

export type {
  Disposer,
}
export {
  ResourceLedger,
}
