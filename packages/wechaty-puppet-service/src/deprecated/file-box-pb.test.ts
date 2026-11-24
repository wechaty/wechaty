/**
 * Unit test for a file box round trip through protobuf messages.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { FileBox } from 'file-box'

import {
  puppet,
}                                 from 'wechaty-grpc'

import {
  packFileBoxToPb,
  unpackFileBoxFromPb,
}                             from './file-box-pb.ts'

test('packFileBoxToPb()', async _t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const pb = await packFileBoxToPb(puppet.MessageFileStreamResponse)(fileBox)
  const restoredFileBox = await unpackFileBoxFromPb(pb)
  assert.ok(restoredFileBox instanceof FileBox, 'should get an instance of FileBOX')

  assert.equal(restoredFileBox.name, fileBox.name, 'should get the right file box name')
  assert.equal(await restoredFileBox.toBase64(), await fileBox.toBase64(), 'should get the right file box content')
})
