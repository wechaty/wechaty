import { FileBox } from 'wechaty-puppet'
import { FileBoxType } from 'file-box'

export const serializeFileBox = async (fileBox: FileBox): Promise<string> => {
  const serializableFileBoxTypes = [
    FileBoxType.Base64,
    FileBoxType.Url,
    FileBoxType.QRCode,
  ]
  if (serializableFileBoxTypes.includes(fileBox.type())) {
    return JSON.stringify(fileBox)
  }
  const base64 = await fileBox.toBase64()
  const name = fileBox.name
  return JSON.stringify(FileBox.fromBase64(base64, name))
}
