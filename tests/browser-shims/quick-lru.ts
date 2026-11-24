/**
 * Browser adapter for `@alloc/quick-lru`.
 *
 * Provides ESM default export for QuickLRU cache used by Wechaty Puppet agents.
 */
export default class QuickLRU<KeyType = unknown, ValueType = unknown> {

  private readonly maxSize: number
  private readonly maxAge: number
  private readonly onEviction?: (key: KeyType, value: ValueType) => void
  private cache: Map<KeyType, { value: ValueType, expiry?: number }>
  private oldCache: Map<KeyType, { value: ValueType, expiry?: number }>
  private _size: number

  constructor (options: {
    maxSize: number
    maxAge?: number
    onEviction?: (key: KeyType, value: ValueType) => void
  }) {
    if (!(options.maxSize && options.maxSize > 0)) {
      throw new TypeError('`maxSize` must be a number greater than 0')
    }

    this.maxSize = options.maxSize
    this.maxAge = options.maxAge || Infinity
    this.onEviction = options.onEviction
    this.cache = new Map()
    this.oldCache = new Map()
    this._size = 0
  }

  get (key: KeyType): ValueType | undefined {
    if (this.cache.has(key)) {
      const item = this.cache.get(key)!
      return item.expiry && item.expiry <= Date.now() ? undefined : item.value
    }
    if (this.oldCache.has(key)) {
      const item = this.oldCache.get(key)!
      if (!item.expiry || item.expiry > Date.now()) {
        this.oldCache.delete(key)
        this.cache.set(key, item)
        return item.value
      }
    }
    return undefined
  }

  set (key: KeyType, value: ValueType, { maxAge = this.maxAge } = {}): this {
    const expiry = typeof maxAge === 'number' && maxAge !== Infinity ? Date.now() + maxAge : undefined
    this.cache.set(key, { value, expiry })
    this._size++
    if (this._size >= this.maxSize) {
      this._size = 0
      this.oldCache = this.cache
      this.cache = new Map()
    }
    return this
  }

  has (key: KeyType): boolean {
    return this.cache.has(key) || this.oldCache.has(key)
  }

  delete (key: KeyType): boolean {
    const deleted = this.cache.delete(key)
    return this.oldCache.delete(key) || deleted
  }

  clear (): void {
    this.cache.clear()
    this.oldCache.clear()
    this._size = 0
  }

}
