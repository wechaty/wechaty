/**
 * Type-level tests for `WechatyOptions` (checked by `tsc` in `lint:ts`): the
 * puppet name may be a known one or any other `wechaty-puppet-*` name, and
 * other strings are rejected.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { WechatyOptions } from './wechaty-options.ts'

test('WechatyOptions accepts any wechaty-puppet-* name', () => {
  const known: WechatyOptions = { puppet: 'wechaty-puppet-neo' }
  const thirdParty: WechatyOptions = { puppet: 'wechaty-puppet-third-party' }
  const scoped: WechatyOptions = { puppet: '@example/wechaty-puppet-private' }
  // @ts-expect-error A puppet name must be a `wechaty-puppet-*` package.
  const invalid: WechatyOptions = { puppet: 'not-a-puppet' }

  assert.deepEqual(
    [ known, thirdParty, scoped, invalid ].map(options => 'puppet' in options && options.puppet),
    [ 'wechaty-puppet-neo', 'wechaty-puppet-third-party', '@example/wechaty-puppet-private', 'not-a-puppet' ],
  )
})
