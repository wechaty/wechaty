/**
 * Browser adapter for `@pipeletteio/nop`.
 *
 * Provides ESM-compatible named exports for the nop helper used by
 * `brolog` and `state-switch`.
 */

/**
 * No-operation function.
 */
export function nop (..._args: unknown[]): void {}

/**
 * Checks if the given function is the nop function.
 */
export function isNop (arg: unknown): boolean {
  return arg === nop
}

export default {
  isNop,
  nop,
}
