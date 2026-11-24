import {
  FileBox,
  FileBoxType,
}                     from 'file-box'
import type {
  FileBoxInterface,
}                     from 'file-box'

/**
 * @deprecated Will be removed after Dec 31, 2022
 */
export const serializeFileBox = async (fileBox: FileBoxInterface): Promise<string> => {
  const serializableFileBoxTypes = [
    FileBoxType.Base64,
    FileBoxType.Url,
    FileBoxType.QRCode,
  ]
  if (serializableFileBoxTypes.includes(fileBox.type)) {
    return JSON.stringify(fileBox)
  }
  const base64 = await fileBox.toBase64()
  const name = fileBox.name
  return JSON.stringify(FileBox.fromBase64(base64, name))
}
