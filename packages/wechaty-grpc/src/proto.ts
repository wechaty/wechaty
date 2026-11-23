/**
 * `proto.puppet.v0`: the path and text of `proto/wechaty/puppet.proto`, read
 * from the package root (`codeRoot`) when this module loads.
 */
/**
 * Huan(20200222): inspired from googleapis/nodejs-proto-files
 *  https://github.com/googleapis/nodejs-proto-files/blob/920fe4e5f8dee9a187e1858903894810a9b5feca/src/index.ts#L18-L20
 */
import path from 'path'
import fs   from 'fs'

import { codeRoot } from './cjs.ts'

import type { ApiStore } from './config.ts'

function getProtoPath (...paths: string[]): string {
  return path.join(
    codeRoot,
    'proto',
    ...paths,
  )
}

const puppetProtoFile = getProtoPath(
  'wechaty',
  'puppet.proto',
)

const puppet: ApiStore = {
  v0: {
    data: fs.readFileSync(puppetProtoFile).toString(),
    file: puppetProtoFile,
  },
}

export {
  puppet,
}
