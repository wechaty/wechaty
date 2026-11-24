/**
 * Test that a local file box returned by the served puppet's `messageFile()`
 * reaches the client (through a UUID file box) and saves with the same size.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as path                from 'path'
import * as fs                  from 'fs'
import type { PuppetOptions }   from 'wechaty-puppet'
import PuppetMock               from 'wechaty-puppet-mock'
import { freePort } from '../fixtures/free-port.ts'
import { useTempHome } from '../fixtures/temp-home.ts'
import temp                     from 'temp'
import { FileBox }              from 'file-box'

import PuppetService, { PuppetServer, type PuppetServerOptions } from '../../src/mod.ts'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'
const __dirname = path.resolve()

test('message file test', async t => {
  useTempHome(t)
  const PORT = await freePort()
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
    puppet,
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

  assert.equal(fileSize, EXPECTED_SIZE, 'should save file with the correct size')

  fs.rmSync(tmpFile)
  await puppetService.stop()
  await puppetServer.stop()
})
