import path from 'path'
import fs   from 'fs'

import { codeRoot } from './cjs.js'

import type { ApiStore } from './config.js'

function getOpenApiPath (...paths: string[]): string {
  return path.join(
    codeRoot,
    'out',
    ...paths,
  )
}

const puppetSwaggerFile = getOpenApiPath(
  'wechaty',
  'puppet.swagger.json',
)

const puppet: ApiStore = {
  v0: {
    data: fs.readFileSync(puppetSwaggerFile, 'utf-8'),
    file: puppetSwaggerFile,
  },
}

export {
  puppet,
}
