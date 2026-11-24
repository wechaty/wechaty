/**
 * Tests for the lockstep version checks and bump in `scripts/lockstep.ts`,
 * on temporary workspace fixtures and on this repository itself.
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'

import {
  assertVersion,
  loadWorkspaces,
  lockstepProblems,
  ROOT,
  setLockstepVersion,
  VERSIONED_SOURCES,
  type Workspace,
} from './lockstep.ts'

const workspace = (name: string, version: string, fields: Partial<Workspace['manifest']> = {}): Workspace => ({
  dir: `packages/${name}`,
  manifest: { name, version, ...fields },
})

/**
 * A temporary monorepo with `workspaces` and the `VERSIONED_SOURCES` files
 * (each holding `source`), removed when the test ends.
 */
function fixture (t: TestContext, workspaces: Workspace[], source = ''): string {
  const root = mkdtempSync(join(tmpdir(), 'wechaty-lockstep-'))
  t.after(() => rmSync(root, { force: true, recursive: true }))
  writeFileSync(join(root, 'package.json'), JSON.stringify({ workspaces: workspaces.map(w => w.dir) }))
  for (const { dir, manifest } of workspaces) {
    mkdirSync(join(root, dir), { recursive: true })
    writeFileSync(join(root, dir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  }
  for (const file of VERSIONED_SOURCES) {
    mkdirSync(join(root, file, '..'), { recursive: true })
    writeFileSync(join(root, file), source)
  }
  return root
}

test('this repository is in lockstep', () => {
  assert.deepEqual(lockstepProblems(loadWorkspaces(), ROOT), [])
})

test('lockstepProblems() accepts matching versions and ranges', () => {
  assert.deepEqual(lockstepProblems([
    workspace('a', '1.0.0'),
    workspace('b', '1.0.0', { dependencies: { a: '^1.0.0', other: '^9.0.0' }, devDependencies: { c: '^1.0.0' } }),
    workspace('c', '1.0.0', { peerDependencies: { a: '^1.0.0' } }),
  ]), [])
})

test('lockstepProblems() reports versions, ranges and order', () => {
  assert.deepEqual(lockstepProblems([
    workspace('a', '1.0.0', { dependencies: { b: '^1.0.0' } }),
    workspace('b', '1.0.1', { peerDependencies: { a: '^0.9.0' } }),
  ]), [
    'a comes before its dependency b in the workspaces list',
    'b is at 1.0.1, not 1.0.0',
    'b peerDependencies.a is "^0.9.0", not "^1.0.0"',
  ])
})

test('assertVersion() takes versions without a leading v', () => {
  assertVersion('2.0.0-alpha.19')
  assertVersion('2.0.0')
  assert.throws(() => assertVersion('v2.0.0'), /Not a version/)
  assert.throws(() => assertVersion(''), /Not a version/)
})

test('lockstepProblems() reports stale ranges in versioned sources', t => {
  const root = fixture(t, [ workspace('a', '1.0.0') ], "const LIST = {\n  'a' : '^0.1.0',\n  'other': '^9.0.0',\n}\n")
  assert.deepEqual(lockstepProblems(loadWorkspaces(root), root), [
    `${VERSIONED_SOURCES[0]} lists a at "^0.1.0", not "^1.0.0"`,
  ])
})

test('setLockstepVersion() bumps versions and internal ranges only', t => {
  const root = fixture(t, [
    workspace('a', '1.0.0'),
    workspace('b', '1.0.0', { dependencies: { a: '^1.0.0', other: '^9.0.0' }, peerDependencies: { a: '^1.0.0' } }),
  ], "const LIST = {\n  'a' : '^1.0.0',  // comment\n  'other': '^9.0.0',\n}\n")
  setLockstepVersion('1.1.0-alpha.1', root)

  assert.equal(
    readFileSync(join(root, VERSIONED_SOURCES[0]!), 'utf8'),
    "const LIST = {\n  'a' : '^1.1.0-alpha.1',  // comment\n  'other': '^9.0.0',\n}\n",
    'should bump workspace entries in versioned sources and keep the rest',
  )

  const b = JSON.parse(readFileSync(join(root, 'packages/b/package.json'), 'utf8'))
  assert.equal(b.version, '1.1.0-alpha.1')
  assert.deepEqual(b.dependencies, { a: '^1.1.0-alpha.1', other: '^9.0.0' }, 'should keep external ranges')
  assert.deepEqual(b.peerDependencies, { a: '^1.1.0-alpha.1' })
  assert.deepEqual(lockstepProblems(loadWorkspaces(root), root), [])
  assert.throws(() => setLockstepVersion('latest', root), /Not a version/)
})
