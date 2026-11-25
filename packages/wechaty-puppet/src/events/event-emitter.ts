/**
 * Portable, browser-compatible EventEmitter implementation extending standard WinterTC EventTarget.
 *
 * Why this module exists:
 * Node.js `node:events` is not available in standard browser environments and WinterTC-compliant
 * runtimes without bundler polyfills. This module provides a pure-ESM, dependency-free
 * EventTarget implementation conforming to WinterTC and W3C DOM EventTarget specifications, while
 * offering backward-compatible EventEmitter methods (`on`, `once`, `off`, `emit`) that are marked
 * deprecated in Wechaty v2.0 and slated for removal in Wechaty v3.0.
 *
 * Architectural boundaries:
 * Part of `wechaty-puppet` shared infrastructure. Must not import `node:*` or rely on Node globals.
 *
 * Relationships:
 * - `EventTarget`: Native ECMAScript / WinterTC base class extended by `EventEmitter`.
 * - `PuppetEventEmitter`: Extends this class with typed puppet events.
 * - `WechatyEventEmitter`: Extends this class with typed Wechaty bot events.
 */

interface ListenerEntry {
  capture: boolean
  once: boolean
  options?: boolean | AddEventListenerOptions
  raw: Function | EventListenerOrEventListenerObject
  wrapped: EventListenerOrEventListenerObject
  abortCleanup?: () => void
}

let nextSymbolId = 0
const SYMBOL_NAME_MAP = new WeakMap<symbol, string>()
function getEventTargetName (event: string | symbol): string {
  if (typeof event === 'string') {
    return event
  }
  let name = SYMBOL_NAME_MAP.get(event)
  if (!name) {
    name = `__wechaty_sym_${++nextSymbolId}__`
    SYMBOL_NAME_MAP.set(event, name)
  }
  return name
}

const EVENT_ARGS_MAP = new WeakMap<Event, unknown[]>()

/**
 * Portable, cross-runtime EventEmitter adhering to standard WinterTC EventTarget semantics.
 *
 * Extends globalThis.EventTarget so that `addEventListener`, `removeEventListener`, and `dispatchEvent`
 * serve as first-class standard Web APIs with native AbortSignal support. Legacy EventEmitter methods
 * (`on`, `once`, `off`, `emit`) are provided as deprecated adapters for backward compatibility.
 */
export class EventEmitter extends EventTarget {

  private _listenersMap: Map<string | symbol, ListenerEntry[]> = new Map()
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
   * Registers an event listener on the standard WinterTC EventTarget.
   *
   * @param type - Event name string.
   * @param listener - Callback receiving the standard Event (or CustomEvent).
   * @param options - Standard AddEventListenerOptions, including native `{ signal, once }`.
   */
  override addEventListener (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (!listener) {
      return
    }

    const capture = typeof options === 'object' ? Boolean(options.capture) : Boolean(options)
    const once = typeof options === 'object' ? Boolean(options.once) : false
    const signal = typeof options === 'object' ? options.signal : undefined

    if (signal?.aborted) {
      return
    }

    let list = this._listenersMap.get(type)
    if (!list) {
      list = []
      this._listenersMap.set(type, list)
    }

    // W3C DOM EventTarget specification: duplicate listener registration is a no-op
    const existingIndex = list.findIndex(entry => entry.raw === listener && entry.capture === capture)
    if (existingIndex !== -1) {
      return
    }

    const entry: ListenerEntry = {
      capture,
      once,
      options,
      raw: listener,
      wrapped: listener,
    }
    list.push(entry)

    if (signal) {
      const onAbort = () => {
        const idx = list.indexOf(entry)
        if (idx !== -1) {
          list.splice(idx, 1)
          if (list.length === 0) {
            this._listenersMap.delete(type)
          }
          super.removeEventListener(type, entry.wrapped, options)
        }
      }
      signal.addEventListener('abort', onAbort, { once: true })
      entry.abortCleanup = () => signal.removeEventListener('abort', onAbort)
    }

    if (once) {
      const self = this
      let fired = false
      const onceWrapper: EventListener = (event: Event) => {
        if (fired) {
          return
        }
        fired = true
        const idx = list.indexOf(entry)
        if (idx !== -1) {
          list.splice(idx, 1)
          if (list.length === 0) {
            self._listenersMap.delete(type)
          }
          entry.abortCleanup?.()
          super.removeEventListener(type, onceWrapper, options)
        }
        if (typeof listener === 'function') {
          listener.call(self, event)
        } else if (typeof listener?.handleEvent === 'function') {
          listener.handleEvent(event)
        }
      }
      entry.wrapped = onceWrapper
    }

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

    const list = this._listenersMap.get(type)
    if (!list) {
      return
    }

    const capture = typeof options === 'object' ? Boolean(options.capture) : Boolean(options)
    const index = list.findIndex(entry => (entry.raw === listener || entry.wrapped === listener) && entry.capture === capture)
    if (index !== -1) {
      const [entry] = list.splice(index, 1)
      if (entry) {
        entry.abortCleanup?.()
        super.removeEventListener(type, entry.wrapped, options)
      }
      if (list.length === 0) {
        this._listenersMap.delete(type)
      }
    }
  }

  /**
   * Registers a listener callback for the specified event using legacy EventEmitter syntax.
   *
   * @deprecated Use `addEventListener(type, listener, options)` instead. `on()` is legacy Node.js EventEmitter syntax and will be removed in Wechaty v3.0.
   * @param event - Event name or symbol.
   * @param listener - Callback invoked when the event occurs.
   * @param options - Optional AddEventListenerOptions including native `{ signal }`.
   * @returns This emitter for chaining.
   */
  on (
    event: string | symbol,
    listener: (...args: any[]) => void,
    options?: AddEventListenerOptions,
    prepend = false,
  ): this {
    if (typeof listener !== 'function') {
      throw new TypeError(`The "listener" argument must be of type Function. Received type ${typeof listener}`)
    }

    const targetName = getEventTargetName(event)
    const capture = typeof options === 'object' ? Boolean(options.capture) : false
    const once = typeof options === 'object' ? Boolean(options.once) : false
    const signal = typeof options === 'object' ? options.signal : undefined

    if (signal?.aborted) {
      return this
    }

    let list = this._listenersMap.get(event)
    if (!list) {
      list = []
      this._listenersMap.set(event, list)
    }

    const entry: ListenerEntry = {
      capture,
      once,
      options,
      raw: listener,
      wrapped: null as any,
    }

    if (signal) {
      const onAbort = () => {
        const idx = list.indexOf(entry)
        if (idx !== -1) {
          list.splice(idx, 1)
          if (list.length === 0) {
            this._listenersMap.delete(event)
          }
          super.removeEventListener(targetName, entry.wrapped, options)
        }
      }
      signal.addEventListener('abort', onAbort, { once: true })
      entry.abortCleanup = () => signal.removeEventListener('abort', onAbort)
    }

    let fired = false
    const wrapper: EventListener = (e: Event) => {
      if (once) {
        if (fired) {
          return
        }
        fired = true
        const idx = list.indexOf(entry)
        if (idx !== -1) {
          list.splice(idx, 1)
          if (list.length === 0) {
            this._listenersMap.delete(event)
          }
          entry.abortCleanup?.()
          super.removeEventListener(targetName, entry.wrapped, options)
        }
      }
      const rawArgs = EVENT_ARGS_MAP.get(e)
      if (rawArgs !== undefined) {
        listener.apply(this, rawArgs)
      } else {
        const detail = (e as CustomEvent).detail
        if (detail !== null && detail !== undefined) {
          listener.call(this, detail)
        } else {
          listener.call(this)
        }
      }
    }
    entry.wrapped = wrapper

    if (prepend && list.length > 0) {
      for (const item of list) {
        super.removeEventListener(targetName, item.wrapped, item.options)
      }
      super.addEventListener(targetName, wrapper, options)
      for (const item of list) {
        super.addEventListener(targetName, item.wrapped, item.options)
      }
      list.unshift(entry)
    } else {
      list.push(entry)
      super.addEventListener(targetName, wrapper, options)
    }

    return this
  }

  /**
   * Registers a one-time listener callback for the specified event using legacy EventEmitter syntax.
   *
   * @deprecated Use `addEventListener(type, listener, { once: true })` instead. `once()` is legacy Node.js EventEmitter syntax and will be removed in Wechaty v3.0.
   * @param event - Event name or symbol.
   * @param listener - Callback invoked once when the event occurs.
   * @returns This emitter for chaining.
   */
  once (event: string | symbol, listener: (...args: any[]) => void): this {
    return this.on(event, listener, { once: true })
  }

  /**
   * Removes a listener callback previously registered for the event using legacy EventEmitter syntax.
   *
   * @deprecated Use `removeEventListener(type, listener)` instead. `off()` is legacy Node.js EventEmitter syntax and will be removed in Wechaty v3.0.
   * @param event - Event name or symbol.
   * @param listener - Callback to remove.
   * @param options - Optional EventListenerOptions.
   * @returns This emitter for chaining.
   */
  off (
    event: string | symbol,
    listener: (...args: any[]) => void,
    options?: EventListenerOptions,
  ): this {
    const list = this._listenersMap.get(event)
    if (!list) {
      return this
    }

    const capture = typeof options === 'object' ? Boolean(options.capture) : false
    const index = list.findIndex(entry => (entry.raw === listener || entry.wrapped === listener) && entry.capture === capture)
    if (index !== -1) {
      const [entry] = list.splice(index, 1)
      if (entry) {
        entry.abortCleanup?.()
        super.removeEventListener(getEventTargetName(event), entry.wrapped, options)
      }
      if (list.length === 0) {
        this._listenersMap.delete(event)
      }
    }
    return this
  }

  /**
   * Alias for `on()`.
   *
   * @deprecated Use `addEventListener(type, listener, options)` instead. Will be removed in Wechaty v3.0.
   */
  addListener (event: string | symbol, listener: (...args: any[]) => void): this {
    return this.on(event, listener)
  }

  /**
   * Alias for `off()`.
   *
   * @deprecated Use `removeEventListener(type, listener)` instead. Will be removed in Wechaty v3.0.
   */
  removeListener (event: string | symbol, listener: (...args: any[]) => void): this {
    return this.off(event, listener)
  }

  /**
   * Prepends a listener to the event.
   *
   * @deprecated Will be removed in Wechaty v3.0. Standard EventTarget executes listeners in registration order.
   */
  prependListener (event: string | symbol, listener: (...args: any[]) => void): this {
    return this.on(event, listener, undefined, true)
  }

  /**
   * Prepends a one-time listener to the event.
   *
   * @deprecated Will be removed in Wechaty v3.0. Standard EventTarget executes listeners in registration order.
   */
  prependOnceListener (event: string | symbol, listener: (...args: any[]) => void): this {
    return this.on(event, listener, { once: true }, true)
  }

  /**
   * Removes all listeners for the specified event, or all listeners for all events if none specified.
   *
   * @deprecated Use `removeEventListener` or native `AbortSignal` instead. Will be removed in Wechaty v3.0.
   */
  removeAllListeners (event?: string | symbol): this {
    if (event !== undefined) {
      const list = this._listenersMap.get(event)
      if (list) {
        const targetName = getEventTargetName(event)
        for (const entry of [...list]) {
          entry.abortCleanup?.()
          super.removeEventListener(targetName, entry.wrapped, entry.options)
        }
        this._listenersMap.delete(event)
      }
    } else {
      for (const [key, list] of [...this._listenersMap.entries()]) {
        const targetName = getEventTargetName(key)
        for (const entry of list) {
          entry.abortCleanup?.()
          super.removeEventListener(targetName, entry.wrapped, entry.options)
        }
      }
      this._listenersMap.clear()
    }
    return this
  }

  /**
   * Sets the maximum number of listeners allowed before warnings (kept for API parity).
   */
  setMaxListeners (n: number): this {
    this._maxListeners = n
    return this
  }

  /**
   * Returns the current maximum listener value for the emitter.
   */
  getMaxListeners (): number {
    return this._maxListeners
  }

  /**
   * Returns the number of listeners listening to the event.
   */
  listenerCount (event: string | symbol): number {
    return this._listenersMap.get(event)?.length ?? 0
  }

  /**
   * Returns an array listing the events for which the emitter has registered listeners.
   */
  eventNames (): (string | symbol)[] {
    return [...this._listenersMap.keys()]
  }

  /**
   * Returns a copy of the array of unwrapped listener functions for the event.
   */
  listeners (event: string | symbol): Function[] {
    const list = this._listenersMap.get(event)
    return list ? list.map(entry => (typeof entry.raw === 'function' ? entry.raw : () => {})) : []
  }

  /**
   * Returns a copy of the array of raw listener functions for the event (including wrappers).
   */
  rawListeners (event: string | symbol): Function[] {
    const list = this._listenersMap.get(event)
    return list ? list.map(entry => (typeof entry.wrapped === 'function' ? entry.wrapped : () => {})) : []
  }

  /**
   * Synchronously dispatches an event across registered listeners.
   *
   * @param event - Event name or symbol.
   * @param args - Arguments passed to listeners.
   * @returns `true` if the event had listeners, `false` otherwise.
   * @throws The unhandled Error if the event is 'error' and has no listeners.
   */
  emit (event: string | symbol, ...args: any[]): boolean {
    const eventName = String(event)
    const count = this.listenerCount(event)

    if (count === 0) {
      if (eventName === 'error') {
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

    let detail: any
    if (eventName === 'logout') {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && 'contactId' in args[0]) {
        detail = args[0]
      } else {
        detail = Object.assign([args[0], args[1]], {
          user: args[0],
          reason: args[1],
        })
      }
    } else if (eventName === 'scan') {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && 'status' in args[0]) {
        detail = args[0]
      } else {
        detail = Object.assign([args[0], args[1], args[2]], {
          qrcode: args[0],
          status: args[1],
          data: args[2],
        })
      }
    } else if (eventName === 'room-join') {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && 'roomId' in args[0]) {
        detail = args[0]
      } else {
        detail = Object.assign([...args], {
          room: args[0],
          inviteeList: args[1],
          inviter: args[2],
          date: args[3],
        })
      }
    } else if (eventName === 'room-leave') {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && 'roomId' in args[0]) {
        detail = args[0]
      } else {
        detail = Object.assign([...args], {
          room: args[0],
          leaverList: args[1],
          remover: args[2],
          date: args[3],
        })
      }
    } else if (eventName === 'room-topic') {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && 'roomId' in args[0]) {
        detail = args[0]
      } else {
        detail = Object.assign([...args], {
          room: args[0],
          newTopic: args[1],
          oldTopic: args[2],
          changer: args[3],
          date: args[4],
        })
      }
    } else if (args.length === 0) {
      detail = undefined
    } else if (args.length === 1) {
      detail = args[0]
    } else {
      detail = [...args]
    }

    const customEvent = new CustomEvent(getEventTargetName(event), {
      cancelable: true,
      detail,
    })
    EVENT_ARGS_MAP.set(customEvent, args)

    this.dispatchEvent(customEvent)
    return true
  }

}
