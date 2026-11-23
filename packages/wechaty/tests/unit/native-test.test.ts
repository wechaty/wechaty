import { test } from 'node:test'
import assert from 'node:assert/strict'

test('native mocks, cleanup, and async assertions', async t => {
  const target = { read: () => 'original' }
  const readMock = t.mock.method(target, 'read', () => 'mocked')

  t.after(() => {
    t.mock.restoreAll()
    assert.equal(target.read(), 'original')
  })

  assert.equal(target.read(), 'mocked')
  assert.deepStrictEqual(readMock.mock.calls[0]?.arguments, [])

  await t.test('awaited subtest', async () => {
    await assert.rejects(async () => {
      throw new Error('expected async failure')
    }, /expected async failure/)
  })
})
