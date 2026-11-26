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
 * This script runs during `prepack` (transforming package.json exports to point to `dist/esm/`)
 * and `postpack` (restoring the source-first package.json from a backup), ensuring that tarballs
 * publish compiled outputs while the local working tree remains source-first.
 *
 * Architectural boundaries:
 * Owned by workspace build tooling. Invoked automatically by npm during `npm pack` or `npm publish`,
 * and callable from release scripts (`scripts/pack-release.sh`, `scripts/pack-browser-test.sh`).
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

  return result
}

function backupPathForPackage (pkgName: string): string {
  const safeName = pkgName.replace(/[^a-zA-Z0-9_.-]/g, '_')
  return join(tmpdir(), `wechaty-pack-${safeName}.backup.json`)
}

/**
 * Executes prepack preparation in the current working directory.
 */
export function preparePack (pkgPath = 'package.json'): void {
  if (!existsSync(pkgPath)) {
    throw new Error(`Cannot prepare pack: ${pkgPath} does not exist`)
  }

  const raw = readFileSync(pkgPath, 'utf8')
  const manifest = JSON.parse(raw) as Record<string, unknown>
  const name = String(manifest['name'] ?? 'unknown-package')
  const backup = backupPathForPackage(name)

  writeFileSync(backup, raw, 'utf8')

  const transformed = transformManifestForPack(manifest)
  writeFileSync(pkgPath, JSON.stringify(transformed, null, 2) + '\n', 'utf8')
}

/**
 * Executes postpack restoration in the current working directory.
 */
export function restorePack (pkgPath = 'package.json'): void {
  if (!existsSync(pkgPath)) {
    return
  }

  const raw = readFileSync(pkgPath, 'utf8')
  let manifest: Record<string, unknown>
  try {
    manifest = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return
  }

  const name = String(manifest['name'] ?? 'unknown-package')
  const backup = backupPathForPackage(name)

  if (existsSync(backup)) {
    const original = readFileSync(backup, 'utf8')
    writeFileSync(pkgPath, original, 'utf8')
    unlinkSync(backup)
  }
}

// CLI entry point
const action = process.argv[2]
if (action === 'prepare') {
  preparePack()
} else if (action === 'restore') {
  restorePack()
}
