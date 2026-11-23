import { packageJson } from './package-json.js'

const VERSION = packageJson.version || '0.0.0'

enum MajorVersionEnum {
  v0 = 'v0',
  // v1 = 'v1',
}

export type ApiStore = {
  [key in MajorVersionEnum]: {
    file: string,
    data: string,
  }
}

export {
  VERSION,
}
