/**
 * Unit tests for scripts/pack-exports.ts.
 *
 * Why this module exists:
 * Verifies that the WinterTC source-to-dist manifest transformer accurately rewrites
 * source-first exports, types, and imports to dist-ready mappings for packaging,
 * and leaves non-source targets unmodified.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
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

test('transformManifestForPack transforms full package manifest', () => {
  const manifest = {
    name: 'test-pkg',
    version: '2.0.0',
    types: './src/mod.ts',
    exports: {
      '.': {
        types: './src/mod.ts',
        browser: './src/mods/browser.ts',
        node: './src/mod.ts',
        default: './src/mod.ts',
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
        default: './dist/esm/src/mod.js',
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
  })
})
