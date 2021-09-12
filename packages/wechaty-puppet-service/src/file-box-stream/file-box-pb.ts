import type { FileBox }      from 'wechaty-puppet'
import type { Readable }     from 'stronger-typed-streams'

import {
  packFileBoxToChunk,
  unpackFileBoxFromChunk,
}                           from './file-box-chunk.js'
import {
  packFileBoxChunkToPb,
  unpackFileBoxChunkFromPb,
}                           from './chunk-pb.js'
import type { FileBoxPb }        from './file-box-pb.type.js'

function packFileBoxToPb<T extends FileBoxPb> (
  PbConstructor: { new(): T },
) {
  return async (fileBox: FileBox) => {
    const fileBoxChunkStream = await packFileBoxToChunk(fileBox)
    const pbFileBox = packFileBoxChunkToPb(PbConstructor)(fileBoxChunkStream)
    return pbFileBox
  }
}

async function unpackFileBoxFromPb<T extends FileBoxPb> (
  pbStream: Readable<T>,
): Promise<FileBox> {
  const fileBoxChunkStream = unpackFileBoxChunkFromPb(pbStream)
  const fileBox = await unpackFileBoxFromChunk(fileBoxChunkStream)
  return fileBox
}

export {
  packFileBoxToPb,
  unpackFileBoxFromPb,
}
