import { access, chmod, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { test } from 'tstest'

import { cleanBuildOutput } from '../scripts/clean.js'
import { findLicenseFiles } from '../scripts/update-license.js'

const testPermissions = process.platform === 'win32' ? test.skip : test
const testSymlinks = process.platform === 'win32' ? test.skip : test

async function writeFixture (root: string, file: string): Promise<void> {
  const path = join(root, file)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, '')
}

test('license discovery preserves the maintenance file selection', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wechaty-license-files-'))
  const included = [
    'bin/main.ts',
    'examples/nested/example.js',
    'examples/nested/types.ts',
    'scripts/deep/maintenance.ts',
    'src/nested/module.js',
    'tests/sample.ts',
  ]
  const excluded = [
    'bin/not-typescript.js',
    'examples/readme.md',
    'src/.hidden.ts',
    'dist/generated.ts',
  ]

  try {
    for (const file of [ ...included, ...excluded ]) {
      await writeFixture(root, file)
    }

    const files = await findLicenseFiles(root)
    t.same(
      files.map(file => file.replaceAll('\\', '/')).sort(),
      included.sort(),
      'brace expansion includes the supported nested TypeScript and JavaScript files only',
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('license discovery reports an invalid search directory', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wechaty-license-files-'))
  const file = join(root, 'not-a-directory')

  try {
    await writeFile(file, '')
    let error: unknown
    try {
      await findLicenseFiles(file)
    } catch (caught) {
      error = caught
    }
    t.ok(error instanceof Error, 'a non-directory search path is rejected')
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

testPermissions('license discovery propagates permission errors', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wechaty-license-files-'))
  const source = join(root, 'src')

  try {
    for (const directory of [ 'bin', 'examples', 'scripts', 'src', 'tests' ]) {
      await mkdir(join(root, directory))
    }
    await chmod(source, 0)

    let error: unknown
    try {
      await findLicenseFiles(root)
    } catch (caught) {
      error = caught
    }
    t.ok(
      error && typeof error === 'object' && 'code' in error && error.code === 'EACCES',
      'permission failures are rejected rather than returned as an empty result',
    )
  } finally {
    await chmod(source, 0o700)
    await rm(root, { force: true, recursive: true })
  }
})

test('clean removes visible build contents while retaining dist and siblings', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wechaty-clean-'))
  const output = join(root, 'dist')

  try {
    await writeFixture(root, 'dist/nested/output.js')
    await writeFixture(root, 'dist/.hidden')
    await writeFixture(root, 'sibling.txt')

    await cleanBuildOutput(root)

    t.same(await readdir(output), [ '.hidden' ], 'dist remains and hidden children match existing glob cleanup')
    t.equal(await readFile(join(root, 'sibling.txt'), 'utf8'), '', 'unrelated sibling survives')
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('clean tolerates a missing dist directory without creating it', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wechaty-clean-'))

  try {
    await cleanBuildOutput(root)
    let exists = true
    try {
      await access(join(root, 'dist'))
    } catch {
      exists = false
    }
    t.equal(exists, false, 'missing output remains missing')
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('clean rejects a non-directory build output path', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wechaty-clean-'))

  try {
    await writeFile(join(root, 'dist'), 'preserve')
    let error: unknown
    try {
      await cleanBuildOutput(root)
    } catch (caught) {
      error = caught
    }
    t.ok(error instanceof Error, 'invalid build output is reported')
    t.equal(await readFile(join(root, 'dist'), 'utf8'), 'preserve', 'invalid target is not deleted')
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

testSymlinks('clean rejects a symlinked build output', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wechaty-clean-'))
  const outside = await mkdtemp(join(tmpdir(), 'wechaty-clean-outside-'))

  try {
    await writeFixture(outside, 'keep.txt')
    await symlink(outside, join(root, 'dist'), 'dir')

    let error: unknown
    try {
      await cleanBuildOutput(root)
    } catch (caught) {
      error = caught
    }
    t.ok(error instanceof Error, 'symlinked output is rejected')
    t.equal(await readFile(join(outside, 'keep.txt'), 'utf8'), '', 'symlink target remains untouched')
  } finally {
    await rm(root, { force: true, recursive: true })
    await rm(outside, { force: true, recursive: true })
  }
})
