/**
 * CI inventory enforcement test for Wechaty browser unit test coverage.
 *
 * Why this module exists:
 * Guarantees that every unit test across the Wechaty monorepo is accounted for in the
 * browser test suite. It prevents regressions where new tests are introduced without either
 * running under Chromium or carrying an explicit native requirement.
 *
 * Architectural boundaries:
 * Traverses monorepo sources, loads the canonical browser pattern list from
 * `web-test-runner.files.ts`, and verifies that test files are properly classified
 * without dead or obsolete exclusion patterns.
 *
 * Relationships:
 * - `web-test-runner.files.ts`: Source of truth for browser test inclusion/exclusion patterns.
 * - `.github/workflows/node.js.yml`: CI workflow executing this test under Node.js and Deno.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import picomatch from 'picomatch'

import { browserTestFiles } from '../web-test-runner.files.ts'

/**
 * Recursively discovers all `*.test.ts` files under a specified directory,
 * skipping build artifacts (`dist`), package management roots (`node_modules`),
 * and version control directories (`.git`).
 *
 * Normalizes all returned paths to forward-slash, working-directory-relative paths
 * (without leading `./`) so they match the glob pattern format used by
 * `web-test-runner.files.ts`.
 *
 * @param dir - The relative or absolute directory path to scan.
 * @returns Array of relative file paths to discovered `*.test.ts` files.
 * @throws `NodeJS.ErrnoException` if any directory within the tree is inaccessible.
 */
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
Either include them in web-test-runner.files.ts, name them *.native.test.ts / *.integration.test.ts, or add a documented exclusion in web-test-runner.files.ts:
${unclassified.join('\n')}`,
  )
})

test('no dead exclusion patterns in web-test-runner.files.ts', () => {
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
    `Found dead or obsolete exclusion patterns in web-test-runner.files.ts that match 0 files:
${deadPatterns.join('\n')}`,
  )
})
