/**
 * Unit tests for `chunk-transformer.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Type-level equality check, as tstest's `AssertEqual` did. */
type AssertEqual<T, Expected> = T extends Expected ? (Expected extends T ? true : false) : false

import { isMessage } from '@bufbuild/protobuf'
import {
  chunkEncoder,
  chunkDecoder,
  type Chunk,
}                   from './chunk-transformer.ts'
import { UploadRequestSchema } from './generated/wechaty/puppet/download-upload_pb.ts'

test('Chunk type imported from generated code', async _t => {
  const typeOk: AssertEqual<
    Chunk,
    string | Uint8Array
  > = true
  assert.ok(typeOk, 'should be `string | Uint8Array`')
})

test('chunkEncoder and chunkDecoder roundtrip with Protobuf-ES schema', async () => {
  const encoder = chunkEncoder(UploadRequestSchema)
  const decoder = chunkDecoder()

  const rawChunk = new Uint8Array([1, 2, 3, 4])
  const encoded = await new Promise<any>((resolve, reject) => {
    encoder.once('data', resolve)
    encoder.once('error', reject)
    encoder.write(rawChunk)
  })

  assert.ok(isMessage(encoded, UploadRequestSchema), 'encoded object must have Protobuf-ES message identity')
  assert.deepEqual(encoded.chunk, rawChunk)

  const decoded = await new Promise<Uint8Array>((resolve, reject) => {
    decoder.once('data', resolve)
    decoder.once('error', reject)
    decoder.write(encoded)
  })

  assert.deepEqual(decoded, rawChunk)
})

test('chunkEncoder and chunkDecoder roundtrip with plain Protobuf-ES objects', async () => {
  const encoder = chunkEncoder((init?: any) => ({ ...init }))
  const decoder = chunkDecoder()

  const rawChunk = new Uint8Array([1, 2, 3, 4])
  const encoded = await new Promise<any>((resolve, reject) => {
    encoder.once('data', resolve)
    encoder.once('error', reject)
    encoder.write(rawChunk)
  })

  assert.deepEqual(encoded.chunk, rawChunk)

  const decoded = await new Promise<Uint8Array>((resolve, reject) => {
    decoder.once('data', resolve)
    decoder.once('error', reject)
    decoder.write(encoded)
  })

  assert.deepEqual(decoded, rawChunk)
})

test('chunkEncoder decodes base64 string chunks to preserve wire-format bytes', async () => {
  const encoder = chunkEncoder(UploadRequestSchema)

  // 'AQID' is base64 for bytes [1, 2, 3]
  const encoded = await new Promise<any>((resolve, reject) => {
    encoder.once('data', resolve)
    encoder.once('error', reject)
    encoder.write('AQID')
  })

  assert.ok(isMessage(encoded, UploadRequestSchema))
  assert.deepEqual(encoded.chunk, new Uint8Array([1, 2, 3]), 'base64 string chunk should decode to binary bytes')
})

test('chunkEncoder falls back to UTF-8 for non-base64 text strings', async () => {
  const encoder = chunkEncoder(UploadRequestSchema)
  const encoded = await new Promise<any>((resolve, reject) => {
    encoder.once('data', resolve)
    encoder.once('error', reject)
    encoder.write('invalid base64 !!@@##')
  })
  assert.deepEqual(encoded.chunk, new TextEncoder().encode('invalid base64 !!@@##'))
})

test('chunkEncoder and chunkDecoder with legacy class constructor and NOCHUNK error', async () => {
  class LegacyChunkHolder {

    _data?: Uint8Array
    setChunk (val: Uint8Array) { this._data = val }
    getChunk () { return this._data }

}

  const encoder = chunkEncoder(LegacyChunkHolder as any)
  const encoded = await new Promise<any>((resolve, reject) => {
    encoder.once('data', resolve)
    encoder.once('error', reject)
    encoder.write(new Uint8Array([5, 6, 7]))
  })
  assert.deepEqual(encoded.getChunk(), new Uint8Array([5, 6, 7]))

  const rawFallbackEncoder = chunkEncoder(null as any)
  const rawObj = await new Promise<any>((resolve, reject) => {
    rawFallbackEncoder.once('data', resolve)
    rawFallbackEncoder.once('error', reject)
    rawFallbackEncoder.write(new Uint8Array([8, 9]))
  })
  assert.deepEqual(rawObj.chunk, new Uint8Array([8, 9]))

  const decoder = chunkDecoder()
  await assert.rejects(
    new Promise((resolve, reject) => {
      decoder.once('data', resolve)
      decoder.once('error', reject)
      decoder.write({} as any)
    }),
    /NOCHUNK/,
  )
})
