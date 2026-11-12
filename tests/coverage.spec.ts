import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  assertTestDiscovery,
  assertBaseline,
  coverageExitCode,
  coveragePassed,
  mergeUnloadedSources,
  normalizeLcovForRenderer,
  parseLcov,
  summarizeLcov,
} from '../scripts/coverage.ts'

const record = (source: string, lineHits = 1) => `TN:
SF:${source}
FN:1,example
FNDA:${lineHits},example
FNF:1
FNH:${lineHits}
BRDA:2,0,0,${lineHits}
BRDA:2,0,1,0
BRF:2
BRH:${lineHits}
DA:1,${lineHits}
DA:2,${lineHits}
LH:${lineHits ? 2 : 0}
LF:2
end_of_record
`

test('coverage parser rejects empty, incomplete, duplicate, and malformed LCOV', () => {
  assert.throws(() => parseLcov(''), /empty/)
  assert.throws(() => parseLcov('SF:src/file.ts\n'), /end_of_record/)
  assert.throws(() => parseLcov('SF:src/file.ts\nend_of_record\n'), /line data/)
  assert.throws(() => parseLcov(`${record('src/file.ts')}${record('src/file.ts')}`), /duplicate/)
  assert.throws(() => parseLcov(record('src/file.ts').replace('DA:1,1', 'DA:oops')), /Malformed LCOV line/)
})

test('empty discovery fails and report success cannot erase a failing test status', () => {
  assert.throws(() => assertTestDiscovery([]), /no \*\.spec\.ts files/)
  assert.doesNotThrow(() => assertTestDiscovery([ 'src/plugin.spec.ts' ]))
  assert.equal(coverageExitCode(1, 0), 1)
  assert.equal(coverageExitCode(0, 0), 0)
  assert.equal(coverageExitCode(0, 1), 1)
  assert.equal(coveragePassed(0, 0), true)
  assert.equal(coveragePassed(0, 1), false)
  assert.equal(coveragePassed(1, 0), false)
})

test('coverage baselines accept at-floor and above-floor measurements and reject regressions or invalid input', () => {
  const metrics = summarizeLcov(parseLcov(record('src/file.ts')))
  const baseline = { lines: 100, functions: 100, branches: 50 }
  assert.doesNotThrow(() => assertBaseline(metrics, baseline))
  assert.doesNotThrow(() => assertBaseline(metrics, { lines: 99, functions: 99, branches: 49 }))
  const lower = summarizeLcov(parseLcov(
    record('src/file.ts').replace('DA:1,1', 'DA:1,0').replace('LH:2', 'LH:1'),
  ))
  assert.throws(() => assertBaseline(lower, { ...baseline, lines: 60 }), /below/)
  assert.throws(() => assertBaseline(metrics, { ...baseline, branches: Number.NaN }), /invalid branches/)
  assert.throws(() => assertBaseline(metrics, { ...baseline, extra: 1 }), /only lines/)
  assert.throws(() => assertBaseline(metrics, null), /must be an object/)
})

test('unloaded-source supplement adds only zero-hit production records', () => {
  const unloaded = record('src/unloaded.ts', 0).replace('LH:0', 'LH:1')
  const combined = mergeUnloadedSources(
    record('src/loaded.ts'),
    record('src/loaded.ts', 0) + unloaded,
    [ 'src/loaded.ts', 'src/unloaded.ts' ],
  )
  const records = parseLcov(combined)
  assert.deepEqual(records.map(item => item.source), [ 'src/loaded.ts', 'src/unloaded.ts' ])
  assert.equal(records[1]?.metrics.lines.covered, 0)
  assert.throws(() => mergeUnloadedSources(
    record('src/loaded.ts'),
    record('src/loaded.ts') + record('src/unloaded.ts', 0),
    [ 'src/loaded.ts', 'src/unloaded.ts' ],
  ), /hits/)
})

test('renderer normalizes source paths and duplicate function names', () => {
  const absolute = `TN:
SF:/repo/src/loaded.ts
FN:23,get wechaty
FN:24,get wechaty
FNDA:1,get wechaty
FNDA:0,get wechaty
FNF:2
FNH:1
BRF:0
BRH:0
DA:23,1
DA:24,0
LH:1
LF:2
end_of_record
`
  const mixed = `${absolute}${record('src/unloaded.ts', 0)}`
  const normalized = normalizeLcovForRenderer(mixed, '/repo')
  assert.deepEqual(parseLcov(normalized).map(item => item.source), [ 'src/loaded.ts', 'src/unloaded.ts' ])
  assert.match(normalized, /FN:23,get wechaty \(1\)/)
  assert.match(normalized, /FN:24,get wechaty \(2\)/)
  assert.equal(parseLcov(normalized)[0]?.metrics.functions.percent, 50)
  assert.throws(
    () => normalizeLcovForRenderer(absolute.replace('FNDA:0,get wechaty\n', ''), '/repo'),
    /hit count does not match declarations/,
  )
})
