#!/usr/bin/env ts-node

import test  from 'tstest'

import { FileBox } from 'wechaty-puppet'

import {
  MessageFileStreamResponse,
}                                 from 'wechaty-grpc'

import {
  packFileBoxToPb,
  unpackFileBoxFromPb,
}                             from './file-box-pb'

test('packFileBoxToPb()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const pb = await packFileBoxToPb(MessageFileStreamResponse)(fileBox)
  const restoredFileBox = await unpackFileBoxFromPb(pb)
  t.true(restoredFileBox instanceof FileBox, 'should get an instance of FileBOX')

  t.equal(restoredFileBox.name, fileBox.name, 'should get the right file box name')
  t.equal(await restoredFileBox.toBase64(), await fileBox.toBase64(), 'should get the right file box content')
})
