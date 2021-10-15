/**
 * JavaScript Error Interface:
 *
 * interface Error {
 *   name: string;
 *   message: string;
 *   stack?: string;
 * }
 */
interface EcmaError extends Error {}

const isEcmaError = (payload: any): payload is EcmaError => payload instanceof Object
  && typeof payload.name    === 'string'
  && typeof payload.message === 'string'

export type { EcmaError }
export { isEcmaError }
