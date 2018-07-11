import { log }      from 'brolog'
import { FileBox }  from 'file-box'
import qrImage      from 'qr-image'

export function qrCodeForChatie (): FileBox {
  const CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5'
  const name                           = 'qrcode-for-chatie.png'
  const type                           = 'png'

  const qrStream = qrImage.image(CHATIE_OFFICIAL_ACCOUNT_QRCODE, { type })
  return FileBox.fromStream(qrStream, name)
}

/**
 * VERSION
 */
// tslint:disable:no-var-requires
let VERSION: string = '0.0.0'
try {
  VERSION = require('../../package.json').version
} catch (e) {
  VERSION = require('../package.json').version
}

export {
  VERSION,
  log,
}
