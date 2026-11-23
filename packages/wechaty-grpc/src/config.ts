/**
 * Package settings: `VERSION` (from the embedded `package-json.ts`) and the
 * `ApiStore` shape used by `proto.ts`.
 */
import { packageJson } from './package-json.ts'

const VERSION = packageJson.version || '0.0.0'

/** The protocol major versions an `ApiStore` holds. Only `v0` exists so far. */
type MajorVersion = 'v0'

export type ApiStore = {
  [key in MajorVersion]: {
    file: string,
    data: string,
  }
}

export {
  VERSION,
}
