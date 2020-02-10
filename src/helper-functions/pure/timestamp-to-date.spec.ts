import { test } from 'tstest'
import { timestampToDate } from './timestamp-to-date'

/**
 * 1e11
 *   in milliseconds:  Sat Mar 03 1973 09:46:39 UTC
 *   in seconds:       Wed Nov 16 5138 9:46:40 UTC
 */
test('timestampToDate() for dealing with seconds', async t => {
  const SECONDS = 1e11 - 1
  const EXPECTED_DATE_NOW = 'Wed, 16 Nov 5138 09:46:39 GMT'

  const date = timestampToDate(SECONDS)
  t.equal(date.toUTCString(), EXPECTED_DATE_NOW, 'should parse seconds to right date')
})

test('timestampToDate() for dealing with milliseconds', async t => {
  const MILLISECONDS = 1e11 + 1
  const EXPECTED_DATE_UTC = 'Sat, 03 Mar 1973 09:46:40 GMT'

  const date = timestampToDate(MILLISECONDS)
  t.equal(date.toUTCString(), EXPECTED_DATE_UTC, 'should parse milliseconds to right date')
})
