import { FileBox } from 'file-box'

function isFileBox (o: any): o is FileBox {
  if (o instanceof FileBox) {
    return true
  } else if (o && o.constructor && o.constructor.name === 'FileBox') {
    return true
  }

  return false
}

export { isFileBox }
