/**
 * `proto.puppet.v0`: the path and text of `proto/wechaty/puppet.proto`, read
 * from the package root (`codeRoot`) when this module loads.
 */
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { ApiStore } from './config.ts'

/**
 * Absolute file path to the root directory of the `wechaty-grpc` package.
 */
const codeRoot = fileURLToPath(new URL('..', import.meta.url))

/**
 * Resolves an absolute path inside the `proto/` directory of the `wechaty-grpc` package.
 *
 * @param paths Subpath segments relative to `packages/wechaty-grpc/proto/`.
 * @returns Fully qualified filesystem path.
 */
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

/**
 * Access store for raw proto definitions and schema files.
 */
const puppet: ApiStore = {
  v0: {
    get data () {
      try {
        return fs.readFileSync(puppetProtoFile, 'utf8')
      } catch {
        return ''
      }
    },
    file: puppetProtoFile,
  },
}

export {
  codeRoot,
  getProtoPath,
  puppet,
}
