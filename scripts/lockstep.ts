#!/usr/bin/env node
/**
 * Lockstep versions for the monorepo's packages (wechaty/wechaty#3054 step 8):
 * every workspace package publishes the same version, and each depends on the
 * others at `^<that version>`, so one release installs as a consistent set.
 *
 *   node scripts/lockstep.ts check           exit 1 and list the problems
 *   node scripts/lockstep.ts set <version>   bump every package, then the lockfile
 *   node scripts/lockstep.ts version         print the shared version
 *   node scripts/lockstep.ts order           print the package names, build order
 *
 * Besides the package.json files, `VERSIONED_SOURCES` hold ranges of workspace
 * packages in source code (`'<name>': '<range>'`), which follow too.
 *
 * The root package.json `workspaces` list is the build and publish order:
 * `check` also verifies that every package comes after the packages it
 * depends on. The release workflow (`.github/workflows/npm.yml`) and
 * `scripts/pack-release.sh` rely on this module.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Source files with `'<workspace name>': '<range>'` entries that must stay at
 * `^<version>`: wechaty's known puppet list names the workspace puppets, and
 * its unit test requires the same ranges as wechaty's package.json.
 */
export const VERSIONED_SOURCES = [ 'packages/wechaty/src/puppet-config.ts' ]

/** The `'<name>' : '<range>'` entries of `name` in a source file. */
const sourceEntry = (name: string) => new RegExp(`('${name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}'\\s*:\\s*')([^']*)(')`, 'g')

/** The dependency fields that may name another workspace package. */
const DEPENDENCY_FIELDS = [ 'dependencies', 'devDependencies', 'peerDependencies' ] as const

interface PackageJson {
  name: string
  version: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/** A workspace package: its folder (relative to the root) and manifest. */
export interface Workspace {
  dir: string
  manifest: PackageJson
}

/** The repository root, which holds the workspaces list. */
export const ROOT = fileURLToPath(new URL('../', import.meta.url))

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'))

/** The workspace packages under `root`, in the root package.json order. */
export function loadWorkspaces (root = ROOT): Workspace[] {
  const { workspaces } = readJson(join(root, 'package.json')) as { workspaces?: string[] }
  if (!Array.isArray(workspaces) || workspaces.length === 0) {
    throw new Error('The root package.json lists no workspaces')
  }
  return workspaces.map(dir => ({ dir, manifest: readJson(join(root, dir, 'package.json')) as PackageJson }))
}

/**
 * Everything that breaks lockstep, as readable messages (empty when none):
 * a version that differs from the first package's, an internal dependency
 * range other than `^<version>`, a package listed before one it depends on,
 * or (with `root`) a `VERSIONED_SOURCES` entry with another range.
 */
export function lockstepProblems (workspaces: Workspace[], root?: string): string[] {
  const problems: string[] = []
  const version = workspaces[0]!.manifest.version
  const names = workspaces.map(workspace => workspace.manifest.name)

  workspaces.forEach(({ manifest }, index) => {
    if (manifest.version !== version) {
      problems.push(`${manifest.name} is at ${manifest.version}, not ${version}`)
    }
    for (const field of DEPENDENCY_FIELDS) {
      for (const [ dependency, range ] of Object.entries(manifest[field] ?? {})) {
        const dependencyIndex = names.indexOf(dependency)
        if (dependencyIndex < 0) {
          continue
        }
        if (range !== `^${version}`) {
          problems.push(`${manifest.name} ${field}.${dependency} is "${range}", not "^${version}"`)
        }
        // Dev dependencies on later packages are fine: building does not need them.
        if (field !== 'devDependencies' && dependencyIndex > index) {
          problems.push(`${manifest.name} comes before its ${field.replace(/ies$/, 'y')} ${dependency} in the workspaces list`)
        }
      }
    }
  })

  if (root !== undefined) {
    for (const file of VERSIONED_SOURCES) {
      const source = readFileSync(join(root, file), 'utf8')
      for (const name of names) {
        for (const [ , , range ] of source.matchAll(sourceEntry(name))) {
          if (range !== `^${version}`) {
            problems.push(`${file} lists ${name} at "${range}", not "^${version}"`)
          }
        }
      }
    }
  }
  return problems
}

/**
 * Throws unless `version` looks like a SemVer version without a leading `v`,
 * for example `2.0.0-alpha.19`.
 */
export function assertVersion (version: string): void {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Not a version: "${version}" (expected for example 2.0.0-alpha.19)`)
  }
}

/**
 * Writes `version` into every workspace package.json, and `^<version>` into
 * every dependency range that names another workspace package, and in the
 * `VERSIONED_SOURCES` entries. Keeps each package.json's two-space format.
 * It does not touch the lockfile.
 */
export function setLockstepVersion (version: string, root = ROOT): void {
  assertVersion(version)
  const workspaces = loadWorkspaces(root)
  const names = new Set(workspaces.map(workspace => workspace.manifest.name))
  for (const { dir, manifest } of workspaces) {
    manifest.version = version
    for (const field of DEPENDENCY_FIELDS) {
      for (const dependency of Object.keys(manifest[field] ?? {})) {
        if (names.has(dependency)) {
          manifest[field]![dependency] = `^${version}`
        }
      }
    }
    writeFileSync(join(root, dir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  }
  for (const file of VERSIONED_SOURCES) {
    let source = readFileSync(join(root, file), 'utf8')
    for (const name of names) {
      source = source.replace(sourceEntry(name), `$1^${version}$3`)
    }
    writeFileSync(join(root, file), source)
  }
}

function main (args: string[]): number {
  const [ command, version ] = args
  switch (command) {
    case 'check': {
      const workspaces = loadWorkspaces()
      const problems = lockstepProblems(workspaces, ROOT)
      for (const problem of problems) {
        console.error(`lockstep: ${problem}`)
      }
      if (problems.length === 0) {
        console.info(`lockstep: ${workspaces.length} packages at ${workspaces[0]!.manifest.version}`)
      }
      return problems.length === 0 ? 0 : 1
    }
    case 'set': {
      setLockstepVersion(version ?? '')
      // The lockfile records each workspace's version too.
      const result = spawnSync('npm', [ 'install', '--package-lock-only', '--ignore-scripts' ], { cwd: ROOT, stdio: 'inherit' })
      return result.status ?? 1
    }
    case 'version':
      console.info(loadWorkspaces()[0]!.manifest.version)
      return 0
    case 'order':
      console.info(loadWorkspaces().map(workspace => workspace.manifest.name).join('\n'))
      return 0
    default:
      console.error('usage: node scripts/lockstep.ts check | set <version> | version | order')
      return 2
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2))
}
