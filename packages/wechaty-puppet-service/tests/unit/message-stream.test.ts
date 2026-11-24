/**
 * Unit tests for deprecated streaming RPCs: `messageFileStream`, `messageImageStream`,
 * and `messageSendFileStream` over ConnectRPC.
 *
 * Verifies that file names, metadata framing, and binary chunk streams roundtrip
 * without data loss or runtime errors.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FileBox } from 'file-box'
import { PuppetMock } from 'wechaty-puppet-mock'
import * as PUPPET from 'wechaty-puppet'

import { freePort } from '../fixtures/free-port.ts'
import { GrpcManager } from '../../src/client/grpc-manager.ts'
import {
  PuppetServer,
  type PuppetServerOptions,
} from '../../src/mod.ts'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'

test('messageFileStream, messageImageStream, and messageSendFileStream over ConnectRPC', async t => {
  const PORT = await freePort()
  const TOKEN = `insecure_${NIL_UUID_V4}`
  const ENDPOINT = `127.0.0.1:${PORT}`

  let sentFileBox: FileBox | undefined
  let sentFileBuffer: Buffer | undefined

  const puppet = new PuppetMock()
  puppet.messageFile = async () => FileBox.fromBuffer(Buffer.from('hello file stream'), 'downloaded.txt')
  puppet.messageImage = async () => FileBox.fromBuffer(Buffer.from('hello image stream'), 'downloaded.png')
  puppet.messageSendFile = async (_conversationId: string, fileBox: any) => {
    sentFileBox = fileBox
    sentFileBuffer = await fileBox.toBuffer()
  }

  const puppetServer = new PuppetServer({
    endpoint: ENDPOINT,
    puppet,
    token: TOKEN,
  } as PuppetServerOptions)
  const grpcManager = new GrpcManager({ endpoint: ENDPOINT, token: TOKEN })

  try {
    await puppetServer.start()
    await grpcManager.start()

    await t.test('messageFileStream yields initial name chunk and data chunks', async () => {
      const chunks: any[] = []
      for await (const chunk of grpcManager.client.messageFileStream({ id: 'msg-file-1' })) {
        chunks.push(chunk)
      }

      assert.ok(chunks.length >= 2, 'should yield at least metadata chunk and one data chunk')
      assert.equal(chunks[0].fileBoxChunk?.name, 'downloaded.txt', 'first chunk should contain file name')

      const combined = Buffer.concat(chunks.slice(1).map(c => Buffer.from(c.fileBoxChunk?.data || [])))
      assert.equal(combined.toString('utf8'), 'hello file stream', 'content should match')
    })

    await t.test('messageImageStream yields initial name chunk and data chunks', async () => {
      const chunks: any[] = []
      for await (const chunk of grpcManager.client.messageImageStream({ id: 'msg-img-1', type: PUPPET.types.Image.Artwork })) {
        chunks.push(chunk)
      }

      assert.ok(chunks.length >= 2, 'should yield at least metadata chunk and one data chunk')
      assert.equal(chunks[0].fileBoxChunk?.name, 'downloaded.png', 'first chunk should contain file name')

      const combined = Buffer.concat(chunks.slice(1).map(c => Buffer.from(c.fileBoxChunk?.data || [])))
      assert.equal(combined.toString('utf8'), 'hello image stream', 'image content should match')
    })

    await t.test('messageSendFileStream resolves filename from metadata chunk without setting read-only property', async () => {
      async function* uploadStream () {
        // Message 1: conversationId and fileBoxChunk.name
        yield {
          conversationId: 'conv-123',
          fileBoxChunk: {
            name: 'custom-stream-filename.txt',
          },
        }
        // Message 2: fileBoxChunk.data
        yield {
          conversationId: 'conv-123',
          fileBoxChunk: {
            data: new TextEncoder().encode('stream file content'),
          },
        }
      }

      const res = await grpcManager.client.messageSendFileStream(uploadStream())
      assert.ok(typeof res.id === 'string', 'should return response with id string')
      assert.ok(sentFileBox, 'puppet should have received the fileBox')
      assert.equal(sentFileBox.name, 'custom-stream-filename.txt', 'fileBox name should match metadata chunk')
      assert.ok(sentFileBuffer, 'puppet should have buffered the sent stream')
      assert.equal(sentFileBuffer.toString('utf8'), 'stream file content', 'fileBox buffer should match uploaded content')
    })
  } finally {
    await grpcManager.stop().catch(() => {})
    await puppetServer.stop().catch(() => {})
    await puppet.stop().catch(() => {})
  }
})
