#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import type { SpawnSyncOptions } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { inc, prerelease } from '@chatie/semver'

const INTERNAL_HOOK = 'CHATIE_INNER_PRE_HOOK'
// Same publish-branch rule as .github/workflows/npm.yml.
const RELEASE_BRANCH_REF = /^refs\/heads\/(main|v[0-9]+\.[0-9]+.*)$/
const ZERO_SHA = '0000000000000000000000000000000000000000'
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

function readGit (args: string[]): string | undefined {
  const result = spawnSync('git', args, { encoding: 'utf8' })
  if (result.error) {
    throw result.error
  }
  return result.status === 0 ? result.stdout.trim() : undefined
}

// The nested push targets the remote URL, so Git does not update the named
// remote's tracking ref itself. Map the pushed ref through that remote's fetch
// refspecs, as a push to the named remote would.
function updateTrackingRef (name: string | undefined, remoteRef: string, sha: string): void {
  if (!name || !readGit([ 'config', '--get', `remote.${name}.url` ])) {
    return
  }
  const fetchSpecs = (readGit([ 'config', '--get-all', `remote.${name}.fetch` ]) ?? '')
    .split('\n')
    .filter(Boolean)
  for (const spec of fetchSpecs) {
    const [ source, destination ] = spec.replace(/^\+/, '').split(':')
    if (!source || !destination) {
      continue
    }
    let trackingRef: string | undefined
    const wildcard = source.indexOf('*')
    if (wildcard >= 0 && destination.includes('*')) {
      const prefix = source.slice(0, wildcard)
      const suffix = source.slice(wildcard + 1)
      if (remoteRef.startsWith(prefix)
        && remoteRef.endsWith(suffix)
        && remoteRef.length >= prefix.length + suffix.length
      ) {
        const matched = remoteRef.slice(prefix.length, remoteRef.length - suffix.length)
        trackingRef = destination.replace('*', () => matched)
      }
    } else if (source === remoteRef) {
      trackingRef = destination
    }
    if (trackingRef) {
      runOrExit('git', [ 'update-ref', trackingRef, sha ])
      return
    }
  }
}

type RefUpdate = {
  localRef: string
  localSha: string
  remoteRef: string
  remoteSha: string
}

function parseRefUpdate (update: string): RefUpdate {
  const fields = update.trim().split(/\s+/)
  if (fields.length !== 4) {
    fail(`Invalid pre-push update: ${update}`)
  }

  const [ localRef, localSha, remoteRef, remoteSha ] = fields
  if (!localRef || !localSha || !remoteRef || !remoteSha) {
    fail(`Invalid pre-push update: ${update}`)
  }

  return {
    localRef,
    localSha,
    remoteRef,
    remoteSha,
  }
}

function isDeletion (update: RefUpdate): boolean {
  return update.localRef === '(delete)' || update.localSha === ZERO_SHA
}

function isTagUpdate (update: RefUpdate): boolean {
  return update.remoteRef.startsWith('refs/tags/')
}

function isLiveBranchUpdate (update: RefUpdate): boolean {
  return update.remoteRef.startsWith('refs/heads/') && !isDeletion(update)
}

function isReleaseRef (ref: string): boolean {
  return RELEASE_BRANCH_REF.test(ref)
}

function currentBranchRef (): string | undefined {
  const result = spawnSync('git', [ 'symbolic-ref', '--quiet', 'HEAD' ], {
    encoding: 'utf8',
    stdio: [ 'ignore', 'pipe', 'ignore' ],
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    return undefined
  }

  const ref = result.stdout.trim()
  return ref || undefined
}

function namesCheckedOutBranch (localRef: string, checkedOut: string): boolean {
  return localRef === checkedOut || localRef === 'HEAD'
}

function isSupportedReleaseUpdate (update: RefUpdate, checkedOut: string | undefined): boolean {
  return !!checkedOut
    && isReleaseRef(checkedOut)
    && isReleaseRef(update.remoteRef)
    && namesCheckedOutBranch(update.localRef, checkedOut)
}

function isReleaseRelated (update: RefUpdate, checkedOut: string | undefined): boolean {
  if (isReleaseRef(update.remoteRef)) {
    return true
  }

  return update.localRef !== 'HEAD'
    && isReleaseRef(update.localRef)
    && update.localRef !== checkedOut
}

const pushUpdates = (process.stdin.isTTY
  ? []
  : readFileSync(0, 'utf8').split('\n').filter(Boolean)
).map(parseRefUpdate)
const checkedOut = currentBranchRef()
const liveBranchUpdates = pushUpdates.filter(isLiveBranchUpdate)
const tagUpdates = pushUpdates.filter(isTagUpdate)

if (liveBranchUpdates.length === 0) {
  process.exit(0)
}

const releaseUpdates = liveBranchUpdates.filter(update => isReleaseRelated(update, checkedOut))

if (releaseUpdates.length === 0) {
  runOrExit('npm', [ 'run', 'lint' ])
  process.exit(0)
}

if (liveBranchUpdates.length !== 1) {
  fail('Refusing to version this push: multiple branch updates include a release branch.')
}

const releaseUpdate = liveBranchUpdates[0]
if (!releaseUpdate || !isSupportedReleaseUpdate(releaseUpdate, checkedOut)) {
  const described = releaseUpdate
    ? `${releaseUpdate.localRef} -> ${releaseUpdate.remoteRef}`
    : 'release update'
  fail(`Refusing to version ${described}: the checked-out branch must be the release source and the destination must be an eligible release branch.`)
}

const sideUpdates = pushUpdates.filter(update => update !== releaseUpdate && !isTagUpdate(update))
if (sideUpdates.length > 0) {
  fail('Refusing to version this push: a release update cannot be combined with branch deletions or other non-tag updates.')
}

// Git runs this hook once per push URL. Each run would bump the version again
// and leave the endpoints on different release commits, so refuse instead.
const pushUrls = remoteName
  ? (readGit([ 'remote', 'get-url', '--push', '--all', remoteName ]) ?? '').split('\n').filter(Boolean)
  : []
if (pushUrls.length > 1) {
  fail(`Refusing to version this push: ${remoteName} has ${pushUrls.length} push URLs. Push the release to one URL at a time.`)
}

runOrExit('npm', [ 'run', 'lint' ])

if (!checkedOut) {
  fail(`Refusing to version ${releaseUpdate.localRef} -> ${releaseUpdate.remoteRef}: the checked-out branch must be the release source and the destination must be an eligible release branch.`)
}

if (!remoteUrl) {
  fail('Git did not provide a remote URL to the pre-push hook.')
}

const sourceRef = releaseUpdate.localRef === 'HEAD' ? checkedOut : releaseUpdate.localRef

const { version }: { version: string } = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'))
const isAlphaPrerelease = prerelease(version)?.[0] === 'alpha'
const nextVersion = isAlphaPrerelease
  ? inc(version, 'prerelease', 'alpha')
  : inc(version, 'patch')

if (!nextVersion) {
  fail(`Could not calculate the next version from ${version}.`)
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

runOrExit('git', [
  'push',
  '--no-follow-tags',
  remoteUrl,
  `${sourceRef}:${releaseUpdate.remoteRef}`,
], {
  env: {
    ...process.env,
    [INTERNAL_HOOK]: '1',
  },
})

const publishedSha = readGit([ 'rev-parse', sourceRef ])
if (publishedSha) {
  updateTrackingRef(remoteName, releaseUpdate.remoteRef, publishedSha)
}

if (tagUpdates.length > 0) {
  console.error('Push tags separately; tag updates in the original push were not forwarded.')
}

fail('The version commit was pushed; the tag remains local. The original push is cancelled because it was prepared before the version commit existed.')
