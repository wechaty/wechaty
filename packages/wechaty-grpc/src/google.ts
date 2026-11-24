/**
 * Pure ESM TypeScript implementations of standard Google Protocol Buffer wrappers:
 * `StringValue` and `Timestamp`. Replaces the legacy `google-protobuf` CommonJS classes
 * with zero runtime dependencies.
 */

/**
 * Pure ESM implementation of `google.protobuf.StringValue` wrapper message.
 * Provides backwards-compatible getter/setter methods for string payload wrapping.
 */
class StringValue {

  private _value?: string

  /**
   * Initializes a new StringValue wrapper instance.
   *
   * @param value Optional initial string value.
   */
  constructor (value?: string) {
    this._value = value
  }

  /**
   * Retrieves wrapped string value, defaulting to empty string if undefined.
   */
  getValue (): string {
    return this._value ?? ''
  }

  /**
   * Updates wrapped string value.
   *
   * @param value New string value.
   * @returns Current instance for chaining.
   */
  setValue (value: string): this {
    this._value = value
    return this
  }

  /**
   * Property getter for wrapped string value.
   */
  get value (): string | undefined {
    return this._value
  }

  /**
   * Property setter for wrapped string value.
   */
  set value (val: string | undefined) {
    this._value = val
  }

}

/**
 * Pure ESM implementation of `google.protobuf.Timestamp` well-known type.
 * Provides seconds/nanos conversion and Date interoperability without external runtime dependencies.
 */
class Timestamp {

  private _seconds = 0
  private _nanos = 0

  /**
   * Initializes a new Timestamp instance with seconds and nanos.
   *
   * @param seconds Whole seconds since Unix epoch. Defaults to 0.
   * @param nanos Fractional seconds in nanoseconds (0-999,999,999). Defaults to 0.
   */
  constructor (seconds = 0, nanos = 0) {
    this._seconds = seconds
    this._nanos = nanos
  }

  /**
   * Gets seconds component since Unix epoch.
   */
  getSeconds (): number {
    return this._seconds
  }

  /**
   * Sets seconds component since Unix epoch.
   *
   * @param seconds Number of seconds.
   * @returns Current instance for chaining.
   */
  setSeconds (seconds: number): this {
    this._seconds = seconds
    return this
  }

  /**
   * Gets nanoseconds component.
   */
  getNanos (): number {
    return this._nanos
  }

  /**
   * Sets nanoseconds component.
   *
   * @param nanos Number of nanoseconds (0-999,999,999).
   * @returns Current instance for chaining.
   */
  setNanos (nanos: number): this {
    this._nanos = nanos
    return this
  }

  /**
   * Sets timestamp from a JavaScript Date object.
   *
   * @param date Source Date instance.
   * @returns Current instance for chaining.
   */
  fromDate (date: Date): this {
    this._seconds = Math.floor(date.getTime() / 1000)
    this._nanos = (date.getTime() % 1000) * 1e6
    return this
  }

  /**
   * Converts timestamp into a JavaScript Date object.
   */
  toDate (): Date {
    return new Date(this._seconds * 1000 + Math.floor(this._nanos / 1e6))
  }

}

export {
  StringValue,
  Timestamp,
}
