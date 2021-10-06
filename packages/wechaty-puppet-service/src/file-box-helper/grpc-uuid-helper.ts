import type {
  Readable,
}                       from 'stream'
import type {
  FileBox,
  UuidLoader,
  UuidSaver,
}                       from 'file-box'
import {
  puppet as pbPuppet,
}                       from 'wechaty-grpc'

import {
  chunkDecoder,
  chunkEncoder,
}                       from './grpc-transformer.js'

const uuidLoaderGrpc: (grpcClient: () => pbPuppet.PuppetClient) => UuidLoader = (
  grpcClient,
) => async function uuidLoader (
  this : FileBox,
  uuid : string,
) {
  const request = new pbPuppet.DownloadRequest()
  request.setId(uuid)

  const response = grpcClient().download(request)

  const stream = response
    .pipe(chunkDecoder())

  return stream
}

const uuidSaverGrpc: (grpcClient: () => pbPuppet.PuppetClient) => UuidSaver = (
  grpcClient,
) => async function uuidSaver (
  this   : FileBox,
  stream : Readable,
) {
  const response = await new Promise<pbPuppet.UploadResponse>((resolve, reject) => {
    const request = grpcClient().upload((err, response) => {
      if (err) {
        reject(err)
      } else {
        resolve(response)
      }
    })

    stream
      .pipe(chunkEncoder(pbPuppet.UploadRequest))
      .pipe(request)
  })

  const uuid = response.getId()
  return uuid
}

export {
  uuidLoaderGrpc,
  uuidSaverGrpc,
}
