/**
 * Public `wechaty-puppet-mock` entry point: `PuppetMock`, the `mock` namespace
 * (the `Mocker`, environments and mock users), and `VERSION`.
 */
import { VERSION }    from './config.ts'
import { PuppetMock } from './puppet-mock.ts'

import * as mock from './mock/mod.ts'

export {
  VERSION,
  PuppetMock,
  mock,
}
export default PuppetMock
