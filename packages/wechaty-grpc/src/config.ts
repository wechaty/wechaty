export { VERSION } from './version'

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
