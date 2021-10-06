import type {
  FileBox,
}                 from 'file-box'
import {
  FileBoxType,
}                 from 'file-box'
/**
 * 1. Green:
 *  Can be serialized directly
 */
const greenFileBoxTypes = [
  FileBoxType.Url,
  FileBoxType.Uuid,
  FileBoxType.QRCode,
]
/**
 * 2. Yellow:
 *  Can be serialized directly, if the size is less than a threshold
 *  if it's bigger than the threshold,
 *  then it should be convert to a UUID file box before send out
 */
const yellowFileBoxTypes = [
  FileBoxType.Buffer,
  FileBoxType.Base64,
]

const PASS_THROUGH_THRESHOLD_BYTES = 2 * 1024 * 1024 // 2MB

const canPassthrough = (fileBox: FileBox) => {
  /**
   * 1. Green types
   */
  if (greenFileBoxTypes.includes(fileBox.type)) {
    return true
  }

  /**
   * 2. Yellow types
   */
  if (yellowFileBoxTypes.includes(fileBox.type)) {
    const size = fileBox.size
    if (size < 0) {
      return false
    }
    if (size < PASS_THROUGH_THRESHOLD_BYTES) {
      return true
    }
  }

  /**
   * 3. Red types
   */
  return false
}

const normalizeFileBoxUuid = (FileBoxUuid: typeof FileBox) => async (fileBox: FileBox) => {
  if (canPassthrough(fileBox)) {
    return fileBox
  }

  const stream = await fileBox.toStream()

  const uuid = await FileBoxUuid
    .fromStream(stream, fileBox.name)
    .toUuid()

  const uuidFileBox = FileBoxUuid.fromUuid(uuid, fileBox.name)
  return uuidFileBox
}

export {
  normalizeFileBoxUuid,
}
