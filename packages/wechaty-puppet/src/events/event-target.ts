/**
 * Clean-slate, portable EventTarget implementation conforming to WinterTC and W3C DOM EventTarget specifications.
 *
 * Why this module exists:
 * Wechaty v2 clean-slate architecture replaces legacy Node.js EventEmitter with standard
 * ECMAScript EventTarget, standard CustomEvent payloads, and bounded async iterators for AI agents.
 *
 * Architectural boundaries:
 * Part of `wechaty-puppet` core event infrastructure. Must not import `node:events`, `typed-emitter`,
 * or any Node.js runtime globals. Runs identically across browser, Deno, Bun, and Node.js.
 *
 * Relationships:
 * - `globalThis.EventTarget`: Native Web Platform standard base class extended by `WechatyEventTarget`.
 * - `globalThis.CustomEvent`: Native Web Platform event class extended by `WechatyEvent`.
 * - `PuppetSkeleton`: Extends `WechatyEventTarget` as the root foundation for all Wechaty puppet implementations.
 */

export interface WechatyEventMetadata {
  /** Unique identifier for event traceability across distributed puppet boundaries. */
  readonly id: string
  /** Optional distributed tracing correlation identifier. */
  readonly traceId?: string
  /** Source component or puppet instance originating this event. */
  readonly source?: string
  /** Unix epoch millisecond timestamp when the event was instantiated. */
  readonly timestamp: number
}

export interface WechatyEventInit<T = any> extends EventInit {
  detail?: T
  id?: string
  traceId?: string
  source?: string
  timestamp?: number
}

let nextEventSequence = 0

function isPlainObject (val: unknown): val is Record<string, any> {
  if (val === null || typeof val !== 'object') {
    return false
  }
  const proto = Object.getPrototypeOf(val)
  return proto === Object.prototype || proto === null
}

function generateEventId (): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `evt-${Date.now()}-${++nextEventSequence}`
}

/**
 * Standard W3C/WinterTC CustomEvent extension representing strongly-typed Wechaty events.
 *
 * Carries an immutable payload in `event.detail` alongside distributed tracing metadata.
 */
export class WechatyEvent<T = any> extends CustomEvent<T> implements WechatyEventMetadata {

  readonly id: string
  readonly traceId?: string
  readonly source?: string
  readonly timestamp: number

  constructor (type: string, init?: WechatyEventInit<T>) {
    super(type, {
      bubbles: init?.bubbles ?? false,
      cancelable: init?.cancelable ?? true,
      composed: init?.composed ?? false,
      detail: (init?.detail !== undefined && isPlainObject(init.detail))
        ? Object.freeze({ ...init.detail }) as unknown as T
        : (init?.detail as T),
    })
    this.id = init?.id ?? generateEventId()
    this.traceId = init?.traceId
    this.source = init?.source
    this.timestamp = init?.timestamp ?? Date.now()
  }

}

export interface EventIteratorOptions {
  /** Optional AbortSignal that halts iteration and cleans up underlying listeners when aborted. */
  signal?: AbortSignal
  /** Maximum number of unconsumed event payloads buffered in the queue before applying overflow strategy. Defaults to 1000. */
  highWaterMark?: number
  /** Backpressure overflow handling strategy when queue reaches highWaterMark. Defaults to 'drop-oldest'. */
  overflow?: 'drop-oldest' | 'drop-latest' | 'throw'
}

export interface TrackedListenerEntry {
  capture: boolean
  listener: EventListenerOrEventListenerObject
  once: boolean
  signal?: AbortSignal
  wrapped: EventListenerOrEventListenerObject
  abortCleanup?: () => void
}

const LISTENERS_MAP = new WeakMap<WechatyEventTarget, Map<string, TrackedListenerEntry[]>>()
const LEGACY_WRAPPER_MAP = new WeakMap<WechatyEventTarget, WeakMap<Function, EventListener>>()

function getListenersMap (target: WechatyEventTarget): Map<string, TrackedListenerEntry[]> {
  let map = LISTENERS_MAP.get(target)
  if (!map) {
    map = new Map()
    LISTENERS_MAP.set(target, map)
  }
  return map
}

function getLegacyWrapperMap (target: WechatyEventTarget): WeakMap<Function, EventListener> {
  let map = LEGACY_WRAPPER_MAP.get(target)
  if (!map) {
    map = new WeakMap()
    LEGACY_WRAPPER_MAP.set(target, map)
  }
  return map
}

/**
 * Clean-slate, cross-runtime EventTarget adhering to standard WinterTC EventTarget semantics.
 *
 * Provides native `addEventListener`, `removeEventListener`, `dispatchEvent`, one-shot `next()`,
 * and bounded async iteration `events()` for modern AI agent message consumption.
 */
export class WechatyEventTarget extends EventTarget {

  /**
   * Returns the count of active listeners registered for the specified event type.
   *
   * @param type - Event name string.
   * @returns Number of registered active listeners.
   */
  listenerCount (type: string): number {
    return getListenersMap(this).get(type)?.length ?? 0
  }

  /**
   * Returns an array listing the event names for which the target has registered listeners.
   *
   * @returns Array of event name strings.
   */
  eventNames (): string[] {
    return [...getListenersMap(this).keys()]
  }

  /**
   * Registers an event listener on the standard WinterTC EventTarget.
   *
   * @param type - Event name string.
   * @param listener - Callback receiving the Event or CustomEvent, or EventListenerObject.
   * @param options - Standard AddEventListenerOptions, including native `{ signal, once, capture }`.
   */
  override addEventListener (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (!listener) {
      return
    }

    const capture = typeof options === 'object' && options !== null ? Boolean(options.capture) : Boolean(options)
    const once = typeof options === 'object' && options !== null ? Boolean(options.once) : false
    const signal = typeof options === 'object' && options !== null ? options.signal : undefined

    if (signal?.aborted) {
      return
    }

    const listenersMap = getListenersMap(this)
    let list = listenersMap.get(type)
    if (!list) {
      list = []
      listenersMap.set(type, list)
    }

    // W3C DOM EventTarget specification: duplicate listener registration is a no-op
    const existingIndex = list.findIndex(entry => entry.listener === listener && entry.capture === capture)
    if (existingIndex !== -1) {
      return
    }

    const entry: TrackedListenerEntry = {
      capture,
      listener,
      once,
      signal,
      wrapped: listener,
    }

    if (signal) {
      const onAbort = () => {
        this.removeEventListener(type, listener, options)
      }
      signal.addEventListener('abort', onAbort, { once: true })
      entry.abortCleanup = () => signal.removeEventListener('abort', onAbort)
    }

    if (once) {
      let fired = false
      const onceWrapper: EventListener = (event: Event) => {
        if (fired) {
          return
        }
        fired = true
        this.removeEventListener(type, listener, options)
        if (typeof listener === 'function') {
          listener.call(this, event)
        } else if (typeof listener.handleEvent === 'function') {
          listener.handleEvent(event)
        }
      }
      entry.wrapped = onceWrapper
    }

    list.push(entry)
    super.addEventListener(type, entry.wrapped, options)
  }

  /**
   * Removes an event listener previously registered with `addEventListener`.
   *
   * @param type - Event name string.
   * @param listener - Callback or EventListener to remove.
   * @param options - Standard EventListenerOptions.
   */
  override removeEventListener (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    if (!listener) {
      return
    }

    const listenersMap = getListenersMap(this)
    const list = listenersMap.get(type)
    if (!list) {
      return
    }

    const capture = typeof options === 'object' && options !== null ? Boolean(options.capture) : Boolean(options)
    const index = list.findIndex(entry => (entry.listener === listener || entry.wrapped === listener) && entry.capture === capture)
    if (index !== -1) {
      const [entry] = list.splice(index, 1)
      if (entry) {
        entry.abortCleanup?.()
        super.removeEventListener(type, entry.wrapped, options)
      }
      if (list.length === 0) {
        listenersMap.delete(type)
      }
    }
  }

  /**
   * Dispatches an event on the standard EventTarget.
   *
   * @param event - Standard Event or WechatyEvent to dispatch.
   * @returns `true` if event was dispatched and not cancelled via `preventDefault()`.
   */
  override dispatchEvent (event: Event): boolean {
    return super.dispatchEvent(event)
  }

  /**
   * Synchronously dispatches a WechatyEvent across registered listeners.
   *
   * @param type - Event type name.
   * @param args - Single payload or legacy argument list.
   * @returns `true` if event had listeners and was not cancelled.
   */
  emit (type: string, ...args: any[]): boolean {
    const count = this.listenerCount(type)

    if (count === 0 && type === 'error') {
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

    let payload: any
    if (type === 'scan' && args.length > 1) {
      payload = Object.assign([...args], {
        qrcode: args[0],
        status: args[1],
        data: args[2],
      })
    } else if (type === 'logout' && args.length > 1) {
      payload = Object.assign([...args], {
        user: args[0],
        reason: args[1],
      })
    } else if (type === 'room-join' && args.length > 1) {
      payload = Object.assign([...args], {
        room: args[0],
        inviteeList: args[1],
        inviter: args[2],
        date: args[3],
      })
    } else if (type === 'room-leave' && args.length > 1) {
      payload = Object.assign([...args], {
        room: args[0],
        leaverList: args[1],
        remover: args[2],
        date: args[3],
      })
    } else if (type === 'room-topic' && args.length > 1) {
      payload = Object.assign([...args], {
        room: args[0],
        newTopic: args[1],
        oldTopic: args[2],
        changer: args[3],
        date: args[4],
      })
    } else {
      payload = args.length <= 1 ? args[0] : args
    }

    const event = new WechatyEvent(type, { detail: payload })
    const dispatched = this.dispatchEvent(event)
    return count > 0 && dispatched
  }

  /**
   * Returns a Promise that resolves with the payload of the next event of `type`,
   * or rejects if `options.signal` aborts before the event arrives.
   *
   * @param type - Event type name string.
   * @param options - Optional AbortSignal.
   * @returns Promise resolving to the event payload.
   */
  next<T = any> (type: string, options?: { signal?: AbortSignal }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const signal = options?.signal
      if (signal?.aborted) {
        reject(signal.reason ?? new DOMException('This operation was aborted', 'AbortError'))
        return
      }

      const onAbort = () => {
        this.removeEventListener(type, listener)
        reject(signal!.reason ?? new DOMException('This operation was aborted', 'AbortError'))
      }

      const listener = (event: Event) => {
        if (signal) {
          signal.removeEventListener('abort', onAbort)
        }
        const detail = (event as CustomEvent<T>).detail !== undefined
          ? (event as CustomEvent<T>).detail
          : (event as any)
        resolve(detail)
      }

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true })
      }

      this.addEventListener(type, listener, { once: true, signal })
    })
  }

  /**
   * Returns a bounded async iterable of event payloads adhering to the WHATWG stream backpressure design.
   *
   * Suitable for AI agent processing loops (`for await (const message of bot.events('message')) { ... }`).
   *
   * @param type - Event type name string.
   * @param options - Iteration configuration including highWaterMark and overflow policy.
   * @returns Bounded AsyncIterable yielding event payloads.
   */
  events<T = any> (type: string, options?: EventIteratorOptions): AsyncIterable<T> {
    const {
      signal,
      highWaterMark = 1000,
      overflow = 'drop-oldest',
    } = options ?? {}

    const self = this
    const queue: T[] = []
    let pendingResolve: ((result: IteratorResult<T>) => void) | null = null
    let pendingReject: ((err: any) => void) | null = null
    let closed = false
    let streamError: any = null

    const cleanup = () => {
      if (closed) return
      closed = true
      self.removeEventListener(type, onEvent)
      signal?.removeEventListener('abort', onAbort)
    }

    const onAbort = () => {
      cleanup()
      if (pendingResolve) {
        const resolve = pendingResolve
        pendingResolve = null
        pendingReject = null
        resolve({ done: true, value: undefined })
      }
    }

    const onEvent = (event: Event) => {
      if (closed) return
      const detail: T = (event as CustomEvent<T>).detail !== undefined
        ? (event as CustomEvent<T>).detail
        : (event as any)

      if (pendingResolve) {
        const resolve = pendingResolve
        pendingResolve = null
        pendingReject = null
        resolve({ done: false, value: detail })
        return
      }

      if (queue.length >= highWaterMark) {
        switch (overflow) {
          case 'drop-oldest':
            queue.shift()
            queue.push(detail)
            break
          case 'drop-latest':
            // drop incoming event
            break
          case 'throw':
            streamError = new DOMException(
              `Queue overflow: highWaterMark ${highWaterMark} exceeded`,
              'QuotaExceededError',
            )
            cleanup()
            if (pendingReject) {
              const reject = pendingReject
              pendingResolve = null
              pendingReject = null
              reject(streamError)
            }
            break
        }
      } else {
        queue.push(detail)
      }
    }

    if (!signal?.aborted) {
      self.addEventListener(type, onEvent)
      signal?.addEventListener('abort', onAbort, { once: true })
    } else {
      closed = true
    }

    const iterator: AsyncIterator<T> = {
      async next (): Promise<IteratorResult<T>> {
        if (streamError) {
          throw streamError
        }
        if (queue.length > 0) {
          const value = queue.shift()!
          return { done: false, value }
        }
        if (closed || signal?.aborted) {
          return { done: true, value: undefined }
        }
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          pendingResolve = resolve
          pendingReject = reject
        })
      },
      async return (): Promise<IteratorResult<T>> {
        cleanup()
        if (pendingResolve) {
          const resolve = pendingResolve
          pendingResolve = null
          pendingReject = null
          resolve({ done: true, value: undefined })
        }
        return { done: true, value: undefined }
      },
      async throw (err?: any): Promise<IteratorResult<T>> {
        cleanup()
        if (pendingReject) {
          const reject = pendingReject
          pendingResolve = null
          pendingReject = null
          reject(err)
        }
        throw err
      },
    }

    return {
      [Symbol.asyncIterator] () {
        return iterator
      },
    }
  }

  // =========================================================================
  // Legacy EventEmitter compatibility adapters (slated for complete removal in v3.0)
  // =========================================================================

  /**
   * Registers a listener callback using legacy EventEmitter syntax.
   *
   * @deprecated Use `addEventListener(type, listener, options)` or `events()` instead.
   */
  on (type: string, listener: (...args: any[]) => void, options?: AddEventListenerOptions): this {
    const legacyMap = getLegacyWrapperMap(this)
    const wrapper: EventListener = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail !== undefined && detail !== null) {
        if (Array.isArray(detail)) {
          listener.apply(this, detail)
        } else {
          listener.call(this, detail)
        }
      } else {
        listener.call(this)
      }
    }
    legacyMap.set(listener, wrapper)
    this.addEventListener(type, wrapper, options)
    return this
  }

  /**
   * Registers a one-time listener callback using legacy EventEmitter syntax.
   *
   * @deprecated Use `addEventListener(type, listener, { once: true })` or `next()` instead.
   */
  once (type: string, listener: (...args: any[]) => void, options?: AddEventListenerOptions): this {
    const legacyMap = getLegacyWrapperMap(this)
    const wrapper: EventListener = (event: Event) => {
      legacyMap.delete(listener)
      const detail = (event as CustomEvent).detail
      if (detail !== undefined && detail !== null) {
        if (Array.isArray(detail)) {
          listener.apply(this, detail)
        } else {
          listener.call(this, detail)
        }
      } else {
        listener.call(this)
      }
    }
    legacyMap.set(listener, wrapper)
    this.addEventListener(type, wrapper, { ...options, once: true })
    return this
  }

  /**
   * Removes a previously registered listener callback.
   *
   * @deprecated Use `removeEventListener(type, listener)` instead.
   */
  off (type: string, listener: (...args: any[]) => void, options?: EventListenerOptions): this {
    const legacyMap = getLegacyWrapperMap(this)
    const wrapper = legacyMap.get(listener) ?? (listener as any as EventListener)
    this.removeEventListener(type, wrapper, options)
    legacyMap.delete(listener)
    return this
  }

  /** @deprecated Alias for `on()`. */
  addListener (type: string, listener: (...args: any[]) => void): this {
    return this.on(type, listener)
  }

  /** @deprecated Alias for `off()`. */
  removeListener (type: string, listener: (...args: any[]) => void): this {
    return this.off(type, listener)
  }

  /** @deprecated Kept for legacy EventEmitter parity; registers listener in standard execution order. */
  prependListener (type: string, listener: (...args: any[]) => void): this {
    return this.on(type, listener)
  }

  /** @deprecated Kept for legacy EventEmitter parity; registers one-time listener in standard execution order. */
  prependOnceListener (type: string, listener: (...args: any[]) => void): this {
    return this.once(type, listener)
  }

  /** @deprecated Use native `AbortSignal` instead. */
  removeAllListeners (type?: string): this {
    const listenersMap = getListenersMap(this)
    if (type !== undefined) {
      const list = listenersMap.get(type)
      if (list) {
        for (const entry of [...list]) {
          this.removeEventListener(type, entry.wrapped, entry.capture)
        }
      }
    } else {
      for (const [key, list] of [...listenersMap.entries()]) {
        for (const entry of [...list]) {
          this.removeEventListener(key, entry.wrapped, entry.capture)
        }
      }
    }
    return this
  }

  /** @deprecated Kept for API compatibility; no-op. */
  setMaxListeners (_n: number): this {
    return this
  }

  /** @deprecated Kept for API compatibility; returns Infinity. */
  getMaxListeners (): number {
    return Infinity
  }

  /** @deprecated Returns unwrapped listener callbacks. */
  listeners (type: string): Function[] {
    const list = getListenersMap(this).get(type)
    return list ? list.map(e => (typeof e.listener === 'function' ? e.listener : (ev: any) => (e.listener as any).handleEvent(ev))) : []
  }

  /** @deprecated Returns wrapped listener functions. */
  rawListeners (type: string): Function[] {
    const list = getListenersMap(this).get(type)
    return list ? list.map(e => (typeof e.wrapped === 'function' ? e.wrapped : (ev: any) => (e.wrapped as any).handleEvent(ev))) : []
  }

}

export {
  WechatyEventTarget as EventEmitter,
}
