/**
 * Package settings: the logger, `NAME` and `VERSION` (from the embedded
 * `package-json.ts`), and `qrCodeForChatie()`, the image `PuppetMock` uses as
 * a room avatar when a room has none.
 */
import {
  FileBox,
}             from 'file-box'
import {
  log,
}             from 'wechaty-puppet'

import { packageJson } from './package-json.ts'

const VERSION = packageJson.version || '0.0.0'
const NAME    = packageJson.name    || 'NONAME'

const CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5'

function qrCodeForChatie (): FileBox {
  return FileBox.fromQRCode(CHATIE_OFFICIAL_ACCOUNT_QRCODE)
}

export {
  CHATIE_OFFICIAL_ACCOUNT_QRCODE,
  log,
  NAME,
  qrCodeForChatie,
  VERSION,
}
