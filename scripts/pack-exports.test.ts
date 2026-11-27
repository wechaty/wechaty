/**
 * Unit tests for scripts/pack-exports.ts.
 *
 * Why this module exists:
 * Verifies that the WinterTC source-to-dist manifest transformer accurately rewrites
 * source-first exports, types, imports, and typesVersions to dist-ready mappings for packaging,
 * guarantees collision-free backup path generation, and preserves manifest integrity across
 * preparePack and restorePack lifecycles.
 */

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  backupPathForManifest,
  preparePack,
  restorePack,
  rewriteSourcePath,
  transformExportTarget,
  transformManifestForPack,
} from './pack-exports.ts'

test('rewriteSourcePath converts source paths to dist/esm', () => {
  assert.equal(rewriteSourcePath('./src/mod.ts', false), './dist/esm/src/mod.js')
  assert.equal(rewriteSourcePath('./src/mod.ts', true), './dist/esm/src/mod.d.ts')
  assert.equal(rewriteSourcePath('src/mods/filters.ts', false), './dist/esm/src/mods/filters.js')
  assert.equal(rewriteSourcePath('src/mods/filters.ts', true), './dist/esm/src/mods/filters.d.ts')
  assert.equal(rewriteSourcePath('./dist/esm/index.js', false), './dist/esm/index.js')
  assert.equal(rewriteSourcePath('some-external-package', false), 'some-external-package')
})

test('transformExportTarget handles nested condition maps', () => {
  const source = {
    types: './src/mod.ts',
    browser: './src/mod.ts',
    node: './src/mod.ts',
    default: './src/mod.ts',
  }

  const expected = {
    types: './dist/esm/src/mod.d.ts',
    browser: './dist/esm/src/mod.js',
    node: './dist/esm/src/mod.js',
    default: './dist/esm/src/mod.js',
  }

  assert.deepEqual(transformExportTarget(source), expected)
})

test('transformManifestForPack transforms full package manifest with typesVersions', () => {
  const manifest = {
    name: 'test-pkg',
    version: '2.0.0',
    types: './src/mod.ts',
    exports: {
      '.': {
        types: './src/mod.ts',
        browser: './src/mods/browser.ts',
        node: './src/mod.ts',
        default: './src/mods/browser.ts',
      },
      './users': {
        types: './src/mods/users.ts',
        browser: './src/mods/users.ts',
        node: './src/mods/users.ts',
        default: './src/mods/users.ts',
      },
    },
    imports: {
      '#payload-storage': {
        browser: './src/client/payload-storage.ts',
        node: './src/node/payload-storage.ts',
        default: './src/client/payload-storage.ts',
      },
    },
    typesVersions: {
      '*': {
        browser: [ './src/mods/browser.ts' ],
        users: [ './src/mods/users.ts' ],
        impls: [ './src/mods/impls.ts' ],
      },
    },
  }

  const transformed = transformManifestForPack(manifest)

  assert.deepEqual(transformed, {
    name: 'test-pkg',
    version: '2.0.0',
    types: './dist/esm/src/mod.d.ts',
    exports: {
      '.': {
        types: './dist/esm/src/mod.d.ts',
        browser: './dist/esm/src/mods/browser.js',
        node: './dist/esm/src/mod.js',
        default: './dist/esm/src/mods/browser.js',
      },
      './users': {
        types: './dist/esm/src/mods/users.d.ts',
        browser: './dist/esm/src/mods/users.js',
        node: './dist/esm/src/mods/users.js',
        default: './dist/esm/src/mods/users.js',
      },
    },
    imports: {
      '#payload-storage': {
        browser: './dist/esm/src/client/payload-storage.js',
        node: './dist/esm/src/node/payload-storage.js',
        default: './dist/esm/src/client/payload-storage.js',
      },
    },
    typesVersions: {
      '*': {
        browser: [ './dist/esm/src/mods/browser.d.ts' ],
        users: [ './dist/esm/src/mods/users.d.ts' ],
        impls: [ './dist/esm/src/mods/impls.d.ts' ],
      },
    },
  })
})

test('backupPathForManifest generates distinct paths for distinct files', () => {
  const pathA = backupPathForManifest('/path/a/package.json')
  const pathB = backupPathForManifest('/path/b/package.json')
  assert.notEqual(pathA, pathB, 'Different manifest paths must yield distinct backup paths')
  assert.equal(pathA, backupPathForManifest('/path/a/package.json'), 'Identical paths must produce identical backup paths')
})

test('preparePack and restorePack lifecycle cycle preserves file content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pack-exports-test-'))
  const pkgFile = join(dir, 'package.json')

  try {
    // Test with non-canonical 4-space indentation and extra whitespace to ensure byte-for-byte preservation
    const originalContent = JSON.stringify({
      name: 'pack-lifecycle-test',
      version: '1.0.0',
      exports: {
        '.': {
          types: './src/mod.ts',
          node: './src/mod.ts',
          default: './src/mod.ts',
        },
      },
    }, null, 4) + '\n\n'

    writeFileSync(pkgFile, originalContent, 'utf8')

    // 1. preparePack rewrites exports to dist/esm while preserving exact original raw bytes in backup
    preparePack(pkgFile)
    const preparedContent = JSON.parse(readFileSync(pkgFile, 'utf8'))
    assert.equal(preparedContent.exports['.'].node, './dist/esm/src/mod.js')

    const backupFile = backupPathForManifest(pkgFile)
    assert.ok(existsSync(backupFile), 'Backup file must exist after preparePack')
    assert.equal(readFileSync(backupFile, 'utf8'), originalContent, 'Backup must preserve exact raw bytes')

    // 2. An interrupted preparation (where pkgFile holds the prepared state) auto-recovers the original manifest
    preparePack(pkgFile)
    assert.ok(existsSync(backupFile), 'Backup file must exist after auto-recovered preparePack')
    assert.equal(readFileSync(backupFile, 'utf8'), originalContent, 'Backup must preserve the original source manifest')

    // 3. An orphaned backup where pkgFile was already restored (raw === backupRaw) unlinks backup and succeeds
    writeFileSync(pkgFile, originalContent, 'utf8')
    preparePack(pkgFile)
    assert.ok(existsSync(backupFile), 'Backup file must exist after preparePack on restored manifest')
    assert.equal(readFileSync(backupFile, 'utf8'), originalContent, 'Backup preserves raw bytes')

    // 4. A diverged manifest (conflicting with an existing backup) must reject to protect data
    const divergedContent = JSON.stringify({ name: 'diverged-pkg', version: '2.0.0' }, null, 2) + '\n'
    writeFileSync(pkgFile, divergedContent, 'utf8')
    assert.throws(
      () => preparePack(pkgFile),
      /current manifest has diverged/,
      'preparePack must throw and protect diverged manifests',
    )
    assert.equal(readFileSync(pkgFile, 'utf8'), divergedContent, 'Diverged manifest must not be overwritten')

    // Restore to prepared state so restorePack can clean up
    const preparedDist = JSON.stringify(transformManifestForPack(JSON.parse(originalContent)), null, 2) + '\n'
    writeFileSync(pkgFile, preparedDist, 'utf8')

    // 5. restorePack restores original content byte-for-byte and unlinks backup
    restorePack(pkgFile)
    assert.equal(readFileSync(pkgFile, 'utf8'), originalContent, 'Original content must be restored byte-for-byte')
    assert.ok(!existsSync(backupFile), 'Backup file must be cleaned up after restorePack')

    // 6. Calling restorePack again when no backup exists is a safe no-op
    restorePack(pkgFile)
    assert.equal(readFileSync(pkgFile, 'utf8'), originalContent, 'Content remains unchanged')
  } finally {
    restorePack(pkgFile)
    rmSync(dir, { recursive: true, force: true })
  }
})
