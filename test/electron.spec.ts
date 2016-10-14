import { test } from 'ava'

test('Electron smoke testing', async t => {
  t.true(true, 'test')
})

test.skip('Electron open wx', t => {
  t.pass('ok')
})
