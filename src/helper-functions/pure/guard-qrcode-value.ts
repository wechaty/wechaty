/**
  * QR CODE max char length: 7,089
  *   https://stackoverflow.com/a/12764370/1123955
  */
const MAX_LEN = 7089

export function guardQrCodeValue (value: string): string {
  if (value.length > MAX_LEN) {
    throw new Error('QR Code Value is larger then the max len. Did you return the image base64 text by mistake? See: https://github.com/wechaty/wechaty/issues/1889')
  }
  return value
}
