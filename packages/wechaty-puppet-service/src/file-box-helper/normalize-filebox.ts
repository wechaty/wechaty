/**
 * Decides whether a file box can go over gRPC as JSON as it is.
 * URL, UUID and QR code boxes can; buffer and base64 boxes can when they are
 * at most 20KB; streams and local files cannot. `normalizeFileBoxUuid()`
 * uploads the others and returns a UUID file box in their place.
 */
import type {
  FileBox,
}                     from 'file-box'
import {
  FileBoxType,
  type FileBoxInterface,
}                     from 'file-box'

/**
 * Huan(202110): for testing propose, use 20KB as the threshold
 *  after stable we should use a value between 64KB to 256KB as the threshold
 */
const PASS_THROUGH_THRESHOLD_BYTES = 20 * 1024 // 20KB

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

const canPassthrough = (fileBox: FileBoxInterface) => {
  /**
   * 1. Green types: YES
   */
  if (greenFileBoxTypes.includes(fileBox.type)) {
    return true
  }

  /**
   * 2. Red types: NO
   */
  if (!yellowFileBoxTypes.includes(fileBox.type)) {
    return false
  }

  /**
   * 3. Yellow types: CHECK size
   */
  const size = fileBox.size
  if (size < 0) {
    // 1. Size unknown: NO
    return false
  } else if (size > PASS_THROUGH_THRESHOLD_BYTES) {
    // 2. Size: bigger than threshold: NO
    return false
  } else {
    // 3. Size: smaller than threshold: YES
    return true
  }

}

const normalizeFileBoxUuid = (FileBoxUuid: typeof FileBox) => async (fileBox: FileBoxInterface) => {
  if (canPassthrough(fileBox)) {
    return fileBox
  }

  const stream = await fileBox.toStream()

  const uuid = await FileBoxUuid
    .fromStream(stream, fileBox.name)
    .toUuid()

  const uuidFileBox = FileBoxUuid.fromUuid(uuid, {
    md5  : fileBox.md5,
    name : fileBox.name,
    size : fileBox.size,
  })

  return uuidFileBox
}

export {
  canPassthrough,
  normalizeFileBoxUuid,
}
