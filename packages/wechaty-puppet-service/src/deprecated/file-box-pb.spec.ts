#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import { FileBox } from 'file-box'

import {
  puppet,
}                                 from 'wechaty-grpc'

import {
  packFileBoxToPb,
  unpackFileBoxFromPb,
}                             from './file-box-pb.js'

test('packFileBoxToPb()', async t => {
  const FILE_BOX_DATA = 'test'
  const FILE_BOX_NAME = 'test.dat'

  const fileBox = FileBox.fromBuffer(
    Buffer.from(FILE_BOX_DATA),
    FILE_BOX_NAME,
  )

  const pb = await packFileBoxToPb(puppet.MessageFileStreamResponse)(fileBox)
  const restoredFileBox = await unpackFileBoxFromPb(pb)
  t.ok(restoredFileBox instanceof FileBox, 'should get an instance of FileBOX')

  t.equal(restoredFileBox.name, fileBox.name, 'should get the right file box name')
  t.equal(await restoredFileBox.toBase64(), await fileBox.toBase64(), 'should get the right file box content')
})
