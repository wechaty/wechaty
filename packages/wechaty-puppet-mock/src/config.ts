import {
  FileBox,
}             from 'file-box'
import {
  log,
}             from 'wechaty-puppet'

import { packageJson } from './package-json.js'

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
