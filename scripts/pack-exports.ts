/**
 * Prepack and postpack manifest transformation for WinterTC source-first packages.
 *
 * Why this module exists:
 * The monorepo uses pure WinterTC "source-first" exports during local development and testing,
 * pointing standard export conditions (`types`, `browser`, `node`, `default`) directly to
 * TypeScript source files in `src/`. Node.js 26+ and Deno execute these source files natively
 * with zero custom conditions.
 *
 * However, Node.js type-stripping policy refuses to strip types from files located under
 * `node_modules/`. When packages are packaged into npm release tarballs (`.tgz`), external
 * consumers require standard compiled JavaScript (`dist/esm/.../*.js`) and declarations
 * (`dist/esm/.../*.d.ts`).
 *
 * This script runs during `prepack` (transforming package.json exports, imports, types, and
 * typesVersions to point to `dist/esm/`) and `postpack` (restoring the source-first package.json
 * from a scoped backup), ensuring that tarballs publish compiled outputs while the local
 * working tree remains source-first.
 *
 * Architectural boundaries:
 * Owned by workspace build tooling. Invoked automatically by npm during `npm pack` or `npm publish`,
 * during Docker container builds, and callable from release scripts (`scripts/pack-release.sh`,
 * `scripts/pack-browser-test.sh`).
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Transforms a source TypeScript path to its compiled JavaScript or declaration counterpart.
 *
 * @param sourcePath - Relative path starting with `./src/` or `src/`
 * @param isTypes - Whether this path represents a type declaration
 * @returns The compiled path under `./dist/esm/src/`
 */
export function rewriteSourcePath (sourcePath: string, isTypes: boolean): string {
  if (!sourcePath.startsWith('./src/') && !sourcePath.startsWith('src/')) {
    return sourcePath
  }

  const normalized = sourcePath.startsWith('./') ? sourcePath.slice(2) : sourcePath
  if (isTypes) {
    return './dist/esm/' + normalized.replace(/\.ts$/, '.d.ts')
  }
  return './dist/esm/' + normalized.replace(/\.ts$/, '.js')
}

/**
 * Transforms an exports target (string, array, or condition map) from source to dist.
 *
 * @param target - Export target string, array, or nested condition map
 * @param isTypesContext - Whether the current resolution context represents type declarations
 * @returns Transformed target with source paths mapped to dist/esm/
 */
export function transformExportTarget (target: unknown, isTypesContext = false): unknown {
  if (typeof target === 'string') {
    return rewriteSourcePath(target, isTypesContext)
  }

  if (Array.isArray(target)) {
    return target.map(item => transformExportTarget(item, isTypesContext))
  }

  if (target && typeof target === 'object') {
    const transformed: Record<string, unknown> = {}
    for (const [ condition, value ] of Object.entries(target as Record<string, unknown>)) {
      const isTypes = condition === 'types' || isTypesContext
      transformed[condition] = transformExportTarget(value, isTypes)
    }
    return transformed
  }

  return target
}

/**
 * Transforms a package.json manifest object from source-first to dist-ready.
 *
 * Rewrites `types`, `exports`, `imports`, and `typesVersions` to point to compiled
 * JavaScript and declaration artifacts under `./dist/esm/`.
 *
 * @param manifest - The raw package.json manifest object
 * @returns A dist-ready copy of the manifest
 */
export function transformManifestForPack (manifest: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...manifest }

  if (result['types'] && typeof result['types'] === 'string') {
    result['types'] = rewriteSourcePath(result['types'], true)
  }

  if (result['exports'] && typeof result['exports'] === 'object') {
    const exportsMap = result['exports'] as Record<string, unknown>
    const transformedExports: Record<string, unknown> = {}

    for (const [ subpath, target ] of Object.entries(exportsMap)) {
      transformedExports[subpath] = transformExportTarget(target, subpath === 'types')
    }
    result['exports'] = transformedExports
  }

  if (result['imports'] && typeof result['imports'] === 'object') {
    const importsMap = result['imports'] as Record<string, unknown>
    const transformedImports: Record<string, unknown> = {}

    for (const [ specifier, target ] of Object.entries(importsMap)) {
      transformedImports[specifier] = transformExportTarget(target, false)
    }
    result['imports'] = transformedImports
  }

  if (result['typesVersions'] && typeof result['typesVersions'] === 'object') {
    const tvMap = result['typesVersions'] as Record<string, unknown>
    const transformedTv: Record<string, unknown> = {}

    for (const [ selector, subpaths ] of Object.entries(tvMap)) {
      if (subpaths && typeof subpaths === 'object' && !Array.isArray(subpaths)) {
        const transformedSubpaths: Record<string, unknown> = {}
        for (const [ key, paths ] of Object.entries(subpaths as Record<string, unknown>)) {
          if (Array.isArray(paths)) {
            transformedSubpaths[key] = paths.map(p =>
              typeof p === 'string' ? rewriteSourcePath(p, true) : p,
            )
          } else if (typeof paths === 'string') {
            transformedSubpaths[key] = rewriteSourcePath(paths, true)
          } else {
            transformedSubpaths[key] = paths
          }
        }
        transformedTv[selector] = transformedSubpaths
      } else {
        transformedTv[selector] = subpaths
      }
    }
    result['typesVersions'] = transformedTv
  }

  return result
}

/**
 * Computes a unique temporary backup path scoped to the absolute location of the target manifest.
 *
 * Guarantees that concurrent packaging operations across different workspaces or checkouts
 * never collide or overwrite each other's backup files.
 *
 * @param pkgPath - Relative or absolute path to package.json
 * @returns An absolute file path in the OS temporary directory
 */
export function backupPathForManifest (pkgPath: string): string {
  const absPath = resolve(pkgPath)
  const hash = createHash('sha256').update(absPath).digest('hex').slice(0, 16)
  return join(tmpdir(), `wechaty-pack-${hash}.backup.json`)
}

/**
 * Executes prepack preparation for a target package.json manifest.
 *
 * Backs up the source manifest to a uniquely scoped temporary file and rewrites
 * the manifest in place with dist-ready mappings. If a backup already exists from
 * an interrupted prior pack where the manifest was left in the prepared state,
 * automatically recovers the original source manifest before preparing anew.
 * Also cleans up orphaned backups when the manifest was already restored (matching
 * the backup byte-for-byte). Throws if the backup cannot be parsed or if the current
 * manifest has diverged from the backup to prevent accidental data loss.
 *
 * @param pkgPath - Relative or absolute path to the target package.json (defaults to 'package.json')
 */
export function preparePack (pkgPath = 'package.json'): void {
  if (!existsSync(pkgPath)) {
    throw new Error(`Cannot prepare pack: ${pkgPath} does not exist`)
  }

  const raw = readFileSync(pkgPath, 'utf8')
  let manifest: Record<string, unknown>
  try {
    manifest = JSON.parse(raw) as Record<string, unknown>
  } catch (err) {
    throw new Error(`Cannot prepare pack: failed to parse ${pkgPath}: ${String(err)}`)
  }

  let sourceRaw = raw
  const backup = backupPathForManifest(pkgPath)
  if (existsSync(backup)) {
    let backupRaw: string
    let backupManifest: Record<string, unknown>
    try {
      backupRaw = readFileSync(backup, 'utf8')
      backupManifest = JSON.parse(backupRaw) as Record<string, unknown>
    } catch (err) {
      throw new Error(
        `Cannot prepare pack: backup file exists at ${backup} but is corrupted: ${String(err)}. Remove or inspect the backup before continuing.`,
      )
    }

    // Check if the current manifest matches the transformed output of the backup
    const expectedPrepared = JSON.stringify(transformManifestForPack(backupManifest), null, 2) + '\n'
    if (raw === expectedPrepared) {
      // The current manifest was left in the prepared state from an interrupted pack.
      // Auto-recover the original source manifest from the backup before proceeding.
      writeFileSync(pkgPath, backupRaw, 'utf8')
      manifest = backupManifest
      sourceRaw = backupRaw
      unlinkSync(backup)
    } else if (raw === backupRaw) {
      // The working tree manifest was already restored (e.g. by a shell trap or checkout)
      // and is byte-for-byte identical to the backup. Clean up the orphaned backup.
      unlinkSync(backup)
    } else {
      // The current manifest has diverged from both the backup and its prepared state.
      // Refuse to overwrite to prevent silent data loss.
      throw new Error(
        `Cannot prepare pack: backup file already exists at ${backup} and current manifest has diverged. Remove or restore ${backup} to prevent data loss.`,
      )
    }
  }

  writeFileSync(backup, sourceRaw, 'utf8')

  const transformed = transformManifestForPack(manifest)
  writeFileSync(pkgPath, JSON.stringify(transformed, null, 2) + '\n', 'utf8')
}

/**
 * Executes postpack restoration for a target package.json manifest.
 *
 * Restores the original manifest from the scoped temporary backup and removes the backup file.
 * Derived directly from `pkgPath` without relying on parsing the potentially corrupted manifest.
 *
 * @param pkgPath - Relative or absolute path to the target package.json (defaults to 'package.json')
 */
export function restorePack (pkgPath = 'package.json'): void {
  const backup = backupPathForManifest(pkgPath)
  if (!existsSync(backup)) {
    return
  }

  const original = readFileSync(backup, 'utf8')
  writeFileSync(pkgPath, original, 'utf8')
  unlinkSync(backup)
}

// CLI entry point with entry-point guard and usage reporting
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const action = process.argv[2]
  const target = process.argv[3] ?? 'package.json'

  if (action === 'prepare') {
    preparePack(target)
  } else if (action === 'restore') {
    restorePack(target)
  } else {
    console.error('Usage: node scripts/pack-exports.ts prepare [package.json] | restore [package.json]')
    process.exit(1)
  }
}
