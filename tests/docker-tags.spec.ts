#!/usr/bin/env -S node --import=tsx/esm

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { dockerTags } from '../scripts/docker-tags.ts'

test('Docker rolling tags preserve prerelease stages and discard patch and counters', async _t => {
  const cases = [
    [ '2.0.1', '2.0', 'latest' ],
    [ '2.0.9', '2.0', 'latest' ],
    [ '2.1.9', '2.1', 'next' ],
    [ '2.2.9', '2.2', 'latest' ],
    [ '2.3.9+build.10', '2.3', 'next' ],
    [ '2.2.9-alpha.10', '2.2-alpha', 'next' ],
    [ '2.0.1-alpha.10', '2.0-alpha', 'next' ],
    [ '2.0.9-alpha.11', '2.0-alpha', 'next' ],
    [ '2.0.1-beta.3', '2.0-beta', 'next' ],
    [ '2.0.1-rc.2', '2.0-rc', 'next' ],
    [ '2.0.1-alpha', '2.0-alpha', 'next' ],
    [ '2.0.1+build.10', '2.0', 'latest' ],
    [ '2.0.1-alpha.10+build.20', '2.0-alpha', 'next' ],
  ] as const

  for (const [ version, versionTag, channel ] of cases) {
    assert.deepStrictEqual(dockerTags(version), { versionTag, channel }, version)
  }
})

test('Docker rolling tag conversion rejects malformed versions', async _t => {
  for (const version of [ '2.0', 'not-a-version', '2.0.1-', '2.0.1-alpha..10' ]) {
    assert.throws(() => dockerTags(version), /Invalid package version/, version)
  }
})
