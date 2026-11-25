/**
 * Portable, browser-compatible EventEmitter implementation for WinterTC environments.
 *
 * Why this module exists:
 * Node.js `node:events` is not available in standard browser environments and WinterTC-compliant
 * runtimes without bundler polyfills. This module provides a pure-ESM, dependency-free
 * EventEmitter implementing standard Node.js event listener semantics (registration order,
 * once-wrappers, error handling, listener counts) for cross-runtime portability.
 *
 * Architectural boundaries:
 * Part of `wechaty-puppet` shared infrastructure. Must not import `node:*` or rely on Node globals.
 *
 * Relationships:
 * - `PuppetEventEmitter`: Extends this class with typed puppet events.
 * - `WechatyEventEmitter`: Extends this class with typed Wechaty bot events.
 */

interface ListenerEntry {
  listener: (...args: any[]) => void
  _original?: (...args: any[]) => void
}

/**
 * Portable, cross-runtime EventEmitter adhering to standard event dispatcher semantics.
 */
export class EventEmitter {

  private _events: Map<string | symbol, ListenerEntry[]> = new Map()
  private _maxListeners = 10

  static defaultMaxListeners = 10

  /**
   * Returns the number of listeners listening to the specified event.
   *
   * @param emitter - Emitter instance to inspect.
   * @param event - Event name or symbol.
   * @returns Listener count for the event.
   */
  static listenerCount (emitter: EventEmitter, event: string | symbol): number {
    return typeof emitter.listenerCount === 'function' ? emitter.listenerCount(event) : 0
  }

  /**
   * Sets the maximum number of listeners allowed before warnings (kept for API parity).
   *
   * @param n - Maximum listener count.
   * @returns This emitter for chaining.
   */
  setMaxListeners (n: number): this {
    this._maxListeners = n
    return this
  }

  /**
   * Returns the current maximum listener value for the emitter.
   *
   * @returns Current max listeners count.
   */
  getMaxListeners (): number {
    return this._maxListeners
  }

  /**
   * Returns the number of listeners listening to the event.
   *
   * @param event - Event name or symbol.
   * @returns Number of attached listeners.
   */
  listenerCount (event: string | symbol): number {
    return this._events.get(event)?.length ?? 0
  }

  /**
   * Returns an array listing the events for which the emitter has registered listeners.
   *
   * @returns Array of registered event names.
   */
  eventNames (): (string | symbol)[] {
    return [...this._events.keys()]
  }

  /**
   * Returns a copy of the array of listeners for the event.
   *
   * @param event - Event name or symbol.
   * @returns Array of unwrapped listener functions.
   */
  listeners (event: string | symbol): Function[] {
    const list = this._events.get(event)
    return list ? list.map(entry => entry._original || entry.listener) : []
  }

  /**
   * Returns a copy of the array of raw listeners for the event (including wrappers).
   *
   * @param event - Event name or symbol.
   * @returns Array of raw listener functions.
   */
  rawListeners (event: string | symbol): Function[] {
    const list = this._events.get(event)
    return list ? list.map(entry => entry.listener) : []
  }

  /**
   * Adds the listener function to the end of the listeners array for the event.
   *
   * @param event - Event name or symbol.
   * @param listener - Callback function.
   * @returns This emitter for chaining.
   * @throws TypeError if listener is not a function.
   */
  addListener (event: string | symbol, listener: (...args: any[]) => void): this {
    if (typeof listener !== 'function') {
      throw new TypeError(`The "listener" argument must be of type Function. Received ${typeof listener}`)
    }
    let list = this._events.get(event)
    if (!list) {
      list = []
      this._events.set(event, list)
    }
    list.push({ listener })
    return this
  }

  /**
   * Alias for `addListener()`.
   *
   * @param event - Event name or symbol.
   * @param listener - Callback function.
   * @returns This emitter for chaining.
   */
  on (event: string | symbol, listener: (...args: any[]) => void): this {
    return this.addListener(event, listener)
  }

  /**
   * Adds the listener function to the beginning of the listeners array for the event.
   *
   * @param event - Event name or symbol.
   * @param listener - Callback function.
   * @returns This emitter for chaining.
   * @throws TypeError if listener is not a function.
   */
  prependListener (event: string | symbol, listener: (...args: any[]) => void): this {
    if (typeof listener !== 'function') {
      throw new TypeError(`The "listener" argument must be of type Function. Received ${typeof listener}`)
    }
    let list = this._events.get(event)
    if (!list) {
      list = []
      this._events.set(event, list)
    }
    list.unshift({ listener })
    return this
  }

  /**
   * Adds a one-time listener function for the event.
   *
   * @param event - Event name or symbol.
   * @param listener - Callback function.
   * @returns This emitter for chaining.
   * @throws TypeError if listener is not a function.
   */
  once (event: string | symbol, listener: (...args: any[]) => void): this {
    if (typeof listener !== 'function') {
      throw new TypeError(`The "listener" argument must be of type Function. Received ${typeof listener}`)
    }
    const wrapper = (...args: any[]) => {
      this.removeListener(event, wrapper)
      listener.apply(this, args)
    }
    const entry: ListenerEntry = {
      _original: listener,
      listener: wrapper,
    }
    let list = this._events.get(event)
    if (!list) {
      list = []
      this._events.set(event, list)
    }
    list.push(entry)
    return this
  }

  /**
   * Adds a one-time listener function to the beginning of the listeners array.
   *
   * @param event - Event name or symbol.
   * @param listener - Callback function.
   * @returns This emitter for chaining.
   * @throws TypeError if listener is not a function.
   */
  prependOnceListener (event: string | symbol, listener: (...args: any[]) => void): this {
    if (typeof listener !== 'function') {
      throw new TypeError(`The "listener" argument must be of type Function. Received ${typeof listener}`)
    }
    const wrapper = (...args: any[]) => {
      this.removeListener(event, wrapper)
      listener.apply(this, args)
    }
    const entry: ListenerEntry = {
      _original: listener,
      listener: wrapper,
    }
    let list = this._events.get(event)
    if (!list) {
      list = []
      this._events.set(event, list)
    }
    list.unshift(entry)
    return this
  }

  /**
   * Removes the specified listener from the listener array for the event.
   *
   * @param event - Event name or symbol.
   * @param listener - Callback function to remove.
   * @returns This emitter for chaining.
   */
  removeListener (event: string | symbol, listener: (...args: any[]) => void): this {
    const list = this._events.get(event)
    if (!list) return this
    const index = list.findIndex(
      entry => entry.listener === listener || entry._original === listener,
    )
    if (index !== -1) {
      list.splice(index, 1)
      if (list.length === 0) {
        this._events.delete(event)
      }
    }
    return this
  }

  /**
   * Alias for `removeListener()`.
   *
   * @param event - Event name or symbol.
   * @param listener - Callback function to remove.
   * @returns This emitter for chaining.
   */
  off (event: string | symbol, listener: (...args: any[]) => void): this {
    return this.removeListener(event, listener)
  }

  /**
   * Removes all listeners, or those of the specified event.
   *
   * @param event - Optional event name or symbol.
   * @returns This emitter for chaining.
   */
  removeAllListeners (event?: string | symbol): this {
    if (event !== undefined) {
      this._events.delete(event)
    } else {
      this._events.clear()
    }
    return this
  }

  /**
   * Synchronously calls each of the listeners registered for the event.
   *
   * @param event - Event name or symbol.
   * @param args - Arguments passed to listeners.
   * @returns `true` if the event had listeners, `false` otherwise.
   * @throws The unhandled Error if the event is 'error' and has no listeners.
   */
  emit (event: string | symbol, ...args: any[]): boolean {
    const list = this._events.get(event)
    if (!list || list.length === 0) {
      if (event === 'error') {
        const raw = args[0]
        if (raw instanceof Error) {
          throw raw
        }
        let detail = ''
        try {
          detail = typeof raw === 'object' && raw !== null ? JSON.stringify(raw) : String(raw)
        } catch {
          detail = String(raw)
        }
        const err = new Error(`Unhandled error. (${detail})`)
        ;(err as any).code = 'ERR_UNHANDLED_ERROR'
        ;(err as any).context = raw
        throw err
      }
      return false
    }
    const snapshot = [...list]
    for (const entry of snapshot) {
      entry.listener.apply(this, args)
    }
    return true
  }

}
