import { log }      from 'brolog'
import { FileBox }  from 'file-box'
import qrImage      from 'qr-image'

export const CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5'

export function qrCodeForChatie (): FileBox {
  const name                           = 'qrcode-for-chatie.png'
  const type                           = 'png'

  const qrStream = qrImage.image(CHATIE_OFFICIAL_ACCOUNT_QRCODE, { type })
  return FileBox.fromStream(qrStream, name)
}

export { VERSION } from './version'

export {
  log,
}
