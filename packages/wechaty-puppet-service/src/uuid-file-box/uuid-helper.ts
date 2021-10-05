import type {
  Readable,
}                       from 'stream'
import type {
  UuidLoader,
  UuidSaver,
}                       from 'file-box'
import {
  puppet as pbPuppet,
}                       from 'wechaty-grpc'

import {
  chunkDecoder,
  chunkEncoder,
}                       from './transformer.js'

const uuidLoaderGrpc: (grpcClient: () => pbPuppet.PuppetClient) => UuidLoader = (
  grpcClient,
) => async (
  uuid: string,
) => {
  const request = new pbPuppet.DownloadRequest()
  request.setId(uuid)

  const response = grpcClient().download(request)

  return response.pipe(
    chunkDecoder(),
  )
}

const uuidSaverGrpc: (grpcClient: () => pbPuppet.PuppetClient) => UuidSaver = (
  grpcClient,
) => async (
  stream: Readable,
) => {
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

  const messageId = response.getId()

  return messageId
}

export {
  uuidLoaderGrpc,
  uuidSaverGrpc,
}
