#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import type { SpawnSyncOptions } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { inc, prerelease } from '@chatie/semver'

const INTERNAL_HOOK = 'CHATIE_INNER_PRE_HOOK'
const [ remoteName, remoteUrl ] = process.argv.slice(2)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

process.chdir(repositoryRoot)

if (process.env['NO_HOOK'] || process.env[INTERNAL_HOOK]) {
  process.exit(0)
}

function runOrExit (
  command: string,
  args: string[],
  options: SpawnSyncOptions = {},
): void {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

}

function fail (message: string): never {
  console.error(message)
  process.exit(1)
}

runOrExit('npm', [ 'run', 'lint' ])

const { version }: { version: string } = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'))
const isAlphaPrerelease = prerelease(version)?.[0] === 'alpha'
const nextVersion = isAlphaPrerelease
  ? inc(version, 'prerelease', 'alpha')
  : inc(version, 'patch')

if (!nextVersion) {
  fail(`Could not calculate the next version from ${version}.`)
}

if (!remoteUrl) {
  fail('Git did not provide a remote URL to the pre-push hook.')
}

const nextTag = `v${nextVersion}`
const localTag = spawnSync(
  'git',
  [ 'show-ref', '--verify', '--quiet', `refs/tags/${nextTag}` ],
  { stdio: 'ignore' },
)

if (localTag.error) {
  throw localTag.error
}

if (localTag.status === 0) {
  fail(`Refusing to create ${nextTag}: that tag already exists locally.`)
}

if (localTag.status !== 1) {
  process.exit(localTag.status ?? 1)
}

const remoteTag = spawnSync(
  'git',
  [ 'ls-remote', '--exit-code', '--tags', remoteUrl, `refs/tags/${nextTag}` ],
  { stdio: [ 'ignore', 'ignore', 'inherit' ] },
)

if (remoteTag.error) {
  throw remoteTag.error
}

if (remoteTag.status === 0) {
  fail(`Refusing to create ${nextTag}: that tag already exists on ${remoteName}.`)
}

if (remoteTag.status !== 2) {
  process.exit(remoteTag.status ?? 1)
}

const versionArgs = isAlphaPrerelease
  ? [ 'version', 'prerelease', '--preid=alpha' ]
  : [ 'version', 'patch' ]

runOrExit('npm', versionArgs)

const pushArgs = [ 'push', '--follow-tags' ]
if (remoteName) {
  pushArgs.push(remoteName)
}

runOrExit('git', pushArgs, {
  env: {
    ...process.env,
    [INTERNAL_HOOK]: '1',
  },
})

fail('The version commit and tag were pushed; the original push is cancelled because it was prepared before the version commit existed.')
