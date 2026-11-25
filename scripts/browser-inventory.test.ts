/**
 * CI inventory enforcement test for Wechaty browser unit test coverage.
 *
 * Enforces that every unit test file across the monorepo is accounted for:
 * either it executes in Chromium via `web-test-runner.config.js`, or it has
 * an explicit native/integration/e2e designation or documented exclusion.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import picomatch from 'picomatch'

import { browserTestFiles } from '../web-test-runner.files.js'

function walkDir (dir: string): string[] {
  let results: string[] = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    if (file === 'node_modules' || file === 'dist' || file === '.git') {
      continue
    }
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      results = results.concat(walkDir(full))
    } else if (file.endsWith('.test.ts')) {
      results.push(full.replace(/^\.\//, '').replace(/\\/g, '/'))
    }
  }
  return results
}

test('every test file in the monorepo is accounted for in browser inventory', () => {
  const allTests = walkDir('.')

  const includePatterns = browserTestFiles.filter((p: string) => !p.startsWith('!'))
  const excludePatterns = browserTestFiles.filter((p: string) => p.startsWith('!')).map((p: string) => p.slice(1))

  const isIncluded = picomatch(includePatterns)
  const isExcluded = picomatch(excludePatterns)

  const browserMatched = new Set(allTests.filter(f => isIncluded(f) && !isExcluded(f)))

  assert.ok(browserMatched.size > 0, 'Chromium suite must match test files')

  const unclassified: string[] = []

  for (const testFile of allTests) {
    if (browserMatched.has(testFile)) {
      continue
    }

    // 1. Root scripts and test fixtures are native tooling
    if (testFile.startsWith('scripts/') || testFile.startsWith('tests/fixtures/')) {
      continue
    }

    // 2. Colocated native, integration, and e2e test files
    if (
      testFile.endsWith('.native.test.ts') ||
      testFile.endsWith('.integration.test.ts') ||
      testFile.endsWith('.e2e.test.ts')
    ) {
      continue
    }

    // 3. Explicit node directory code
    if (testFile.includes('/src/node/')) {
      continue
    }

    // 4. Files explicitly excluded in browserTestFiles
    if (isExcluded(testFile)) {
      continue
    }

    unclassified.push(testFile)
  }

  assert.deepEqual(
    unclassified,
    [],
    `Found unclassified unit test files not running in Chromium.
Either include them in web-test-runner.files.js, name them *.native.test.ts / *.integration.test.ts, or add a documented exclusion in web-test-runner.files.js:
${unclassified.join('\n')}`,
  )
})

test('no dead exclusion patterns in web-test-runner.files.js', () => {
  const allTests = walkDir('.')
  const deadPatterns: string[] = []

  for (const pattern of browserTestFiles) {
    if (!pattern.startsWith('!')) {
      continue
    }
    const rawPattern = pattern.slice(1)
    const isPatternExcluded = picomatch(rawPattern)
    const matches = allTests.filter(f => isPatternExcluded(f))
    if (matches.length === 0) {
      deadPatterns.push(pattern)
    }
  }

  assert.deepEqual(
    deadPatterns,
    [],
    `Found dead or obsolete exclusion patterns in web-test-runner.files.js that match 0 files:
${deadPatterns.join('\n')}`,
  )
})
