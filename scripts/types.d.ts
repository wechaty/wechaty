/**
 * Ambient type declarations for script tooling.
 */
declare module 'picomatch' {
  function picomatch (patterns: string | string[], options?: Record<string, unknown>): (input: string) => boolean
  namespace picomatch {
    function scan (input: string, options?: Record<string, unknown>): unknown
  }
  export default picomatch
}
