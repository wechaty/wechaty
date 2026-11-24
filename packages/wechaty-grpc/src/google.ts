/**
 * Pure ESM TypeScript implementations of standard Google Protocol Buffer wrappers:
 * `StringValue` and `Timestamp`. Replaces the legacy `google-protobuf` CommonJS classes
 * with Protobuf-ES v2 well-known schemas.
 */
import {
  create,
  toBinary,
  fromBinary,
} from '@bufbuild/protobuf'
import {
  StringValueSchema,
  TimestampSchema,
} from '@bufbuild/protobuf/wkt'

/**
 * Pure ESM implementation of `google.protobuf.StringValue` wrapper message.
 * Provides backwards-compatible getter/setter methods for string payload wrapping.
 */
class StringValue {

  readonly $typeName = 'google.protobuf.StringValue' as const
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
   * Serializes instance to standard protobuf binary wire format.
   */
  serializeBinary (): Uint8Array {
    const msg = create(StringValueSchema, { value: this._value ?? '' })
    return toBinary(StringValueSchema, msg)
  }

  /**
   * Deserializes standard protobuf binary wire format into a new StringValue instance.
   *
   * @param bytes Serialized protobuf binary payload.
   */
  static deserializeBinary (bytes: Uint8Array): StringValue {
    const msg = fromBinary(StringValueSchema, bytes)
    return new StringValue(msg.value)
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

  readonly $typeName = 'google.protobuf.Timestamp' as const
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
    const ms = date.getTime()
    this._seconds = Math.floor(ms / 1000)
    this._nanos = Math.round((ms - this._seconds * 1000) * 1e6)
    return this
  }

  /**
   * Creates a new Timestamp instance from a JavaScript Date object.
   *
   * @param date Source Date instance.
   */
  static fromDate (date: Date): Timestamp {
    return new Timestamp().fromDate(date)
  }

  /**
   * Property getter for seconds component.
   */
  get seconds (): bigint {
    return BigInt(this._seconds)
  }

  /**
   * Property setter for seconds component.
   */
  set seconds (val: bigint | number) {
    this._seconds = Number(val)
  }

  /**
   * Property getter for nanoseconds component.
   */
  get nanos (): number {
    return this._nanos
  }

  /**
   * Property setter for nanoseconds component.
   */
  set nanos (val: number) {
    this._nanos = val
  }

  /**
   * Converts timestamp into a JavaScript Date object.
   */
  toDate (): Date {
    return new Date(this._seconds * 1000 + Math.floor(this._nanos / 1e6))
  }

  /**
   * Serializes instance to standard protobuf binary wire format.
   */
  serializeBinary (): Uint8Array {
    const msg = create(TimestampSchema, {
      seconds: BigInt(this._seconds),
      nanos: this._nanos,
    })
    return toBinary(TimestampSchema, msg)
  }

  /**
   * Deserializes standard protobuf binary wire format into a new Timestamp instance.
   *
   * @param bytes Serialized protobuf binary payload.
   */
  static deserializeBinary (bytes: Uint8Array): Timestamp {
    const msg = fromBinary(TimestampSchema, bytes)
    return new Timestamp(Number(msg.seconds), msg.nanos)
  }

}

export {
  StringValue,
  Timestamp,
}
