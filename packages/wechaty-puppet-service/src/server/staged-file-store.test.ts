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

test('StagedFileStore awaits shared mkdir and reserves capacity across concurrent uploads', async (t) => {
  const store = new StagedFileStore({
    maxBytes: 10,
    maxTotalBytes: 6,
    maxEntries: 2,
  })
  t.after(() => store.destroy())

  const s1 = new Readable({ read () {} })
  const s2 = new Readable({ read () {} })

  const p1 = store.stageFromStream(s1, { name: 'c1.bin' })
  const p2 = store.stageFromStream(s2, { name: 'c2.bin' })

  s1.push(Buffer.from('1234'))
  s2.push(Buffer.from('5678'))
  s1.push(null)
  s2.push(null)

  const results = await Promise.allSettled([p1, p2])
  const fulfilled = results.filter(r => r.status === 'fulfilled')
  const rejected = results.filter(r => r.status === 'rejected')
  assert.equal(fulfilled.length, 1, 'only one concurrent 4-byte upload should fit in maxTotalBytes=6')
  assert.equal(rejected.length, 1)
  assert.ok(rejected[0]?.reason instanceof PayloadTooLargeError)
})
