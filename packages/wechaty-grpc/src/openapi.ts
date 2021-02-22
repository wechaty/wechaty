import path from 'path'
import fs from 'fs'

import { ApiStore } from './config'

function getOpenApiPath (...paths: string[]): string {
  return path.join(
    __dirname,
    '..',
    'generated',
    ...paths,
  )
}

const puppetSwaggerFile = getOpenApiPath(
  'wechaty',
  'puppet.swagger.json',
)

const puppet: ApiStore = {
  v0: {
    data: fs.readFileSync(puppetSwaggerFile).toString(),
    file: puppetSwaggerFile,
  },
}

export {
  puppet,
}
