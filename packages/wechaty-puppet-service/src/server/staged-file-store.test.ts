/**
 * Unit tests for `StagedFileStore` enforcing per-file byte limits, total
 * disk capacity, entry limits, and TTL eviction.
 */
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { test } from 'node:test'

import { PayloadTooLargeError, StagedFileStore } from './staged-file-store.ts'

test('StagedFileStore enforces maxBytes, total capacity, and TTL eviction', async (t) => {
  const store = new StagedFileStore({
    maxBytes: 4,
    maxTotalBytes: 6,
    maxEntries: 2,
    ttlMs: 50,
  })
  t.after(() => store.destroy())

  // Rejects upload exceeding maxBytes
  await assert.rejects(
    () => store.stageFromStream(Readable.from([Buffer.from('12345')]), { name: 'big.txt' }),
    PayloadTooLargeError,
  )

  // Accepts upload within limits
  const first = await store.stageFromStream(Readable.from([Buffer.from('1234')]), { name: 'a.txt' })
  assert.equal(first.size, 4)
  assert.ok(store.get(first.id))

  // Rejects second upload that would exceed maxTotalBytes (4 + 3 > 6)
  await assert.rejects(
    () => store.stageFromStream(Readable.from([Buffer.from('123')]), { name: 'b.txt' }),
    PayloadTooLargeError,
  )

  // TTL eviction frees entry
  await new Promise(resolve => setTimeout(resolve, 70))
  assert.equal(store.get(first.id), undefined)
})
