#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }                 from 'tstest'
import * as path                from 'path'
import * as fs                  from 'fs'
import type { PuppetOptions }   from 'wechaty-puppet'
import PuppetMock               from 'wechaty-puppet-mock'
import getPort                  from 'get-port'
import temp                     from 'temp'
import { FileBox }              from 'file-box'

import PuppetService, { PuppetServer, PuppetServerOptions } from '../src/mod.js'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'
const __dirname = path.resolve()

test('message file test', async t => {
  const PORT = await getPort()
  const TOKEN = `insecure_${NIL_UUID_V4}`
  const ENDPOINT = `0.0.0.0:${PORT}`

  const FILE          = path.join(__dirname, 'tests', 'fixtures', 'smoke-testing.ts')
  const EXPECTED_SIZE = fs.statSync(FILE).size

  /**
   * Puppet Server
   */
  const puppet = new PuppetMock()
  puppet.messageFile = async () => FileBox.fromFile(FILE)

  const serverOptions = {
    endpoint: ENDPOINT,
    puppet: puppet,
    token: TOKEN,
  } as PuppetServerOptions

  const puppetServer = new PuppetServer(serverOptions)
  await puppetServer.start()

  /**
   * Puppet Service Client
   */
  const puppetOptions = {
    endpoint: ENDPOINT,
    token: TOKEN,
  } as PuppetOptions

  const puppetService = new PuppetService(puppetOptions)
  await puppetService.start()

  const file = await puppetService.messageFile('sb')

  const tmpFolder = temp.mkdirSync('test')
  const tmpFile = path.join(tmpFolder, 'uuid-file.dat')

  await file.toFile(tmpFile)
  const fileSize = fs.statSync(tmpFile).size

  t.equal(fileSize, EXPECTED_SIZE, 'should save file with the correct size')

  fs.rmSync(tmpFile)
  await puppetService.stop()
  await puppetServer.stop()
})
