import { spawnSync } from 'node:child_process'
import type { SpawnSyncReturns } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { test } from 'node:test'
import assert from 'node:assert/strict'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const coauthor = 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'

// The POSIX Git hook fixture is not portable to Windows.
const testPrePush = process.platform === 'win32' ? test.skip : test

type Repository = {
  remote: string
  repository: string
  temporaryDirectory: string
}

function testEnvironment (): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const name of [ 'PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'CI' ]) {
    const value = process.env[name]
    if (value !== undefined) {
      env[name] = value
    }
  }
  return env
}

function git (cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: testEnvironment(),
    timeout: 30_000,
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

function createRepository (options: {
  branch?: string
  lint?: string
  version?: string
} = {}): Repository {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'wechaty-pre-push-'))
  const repository = join(temporaryDirectory, 'repository')
  const remote = join(temporaryDirectory, 'remote.git')
  const branch = options.branch ?? 'main'
  const version = options.version ?? '2.0.0-alpha.2'
  const lint = options.lint ?? 'node -e ""'

  mkdirSync(repository)
  git(temporaryDirectory, 'init', '--bare', '--initial-branch=main', remote)
  git(repository, 'init', '--initial-branch', branch)
  git(repository, 'config', 'user.name', 'Test')
  git(repository, 'config', 'user.email', 'test@example.invalid')
  git(repository, 'config', 'commit.gpgsign', 'false')
  git(repository, 'config', 'tag.gpgsign', 'false')

  mkdirSync(join(repository, 'scripts'))
  copyFileSync(join(repositoryRoot, 'scripts/pre-push.ts'), join(repository, 'scripts/pre-push.ts'))
  mkdirSync(join(repository, 'node_modules', '@chatie'), { recursive: true })
  cpSync(join(repositoryRoot, 'node_modules/@chatie/semver'), join(repository, 'node_modules/@chatie/semver'), { recursive: true })
  cpSync(join(repositoryRoot, 'node_modules/semver'), join(repository, 'node_modules/semver'), { recursive: true })
  writeFileSync(join(repository, '.gitignore'), 'node_modules\n')
  writePackage(repository, version, lint)
  git(repository, 'add', '.')
  git(repository, 'commit', '-m', 'Initial test commit', '-m', coauthor)
  git(repository, 'remote', 'add', 'origin', remote)

  return { remote, repository, temporaryDirectory }
}

function writePackage (repository: string, version: string, lint: string): void {
  writeFileSync(join(repository, 'package.json'), JSON.stringify({
    name: 'pre-push-test',
    scripts: { lint },
    type: 'module',
    version,
  }))
}

function installHook (repository: string): void {
  const hook = join(repository, '.git/hooks/pre-push')
  writeFileSync(hook, `#!/bin/sh\nexec node "${join(repository, 'scripts/pre-push.ts')}" "$@"\n`)
  chmodSync(hook, 0o755)
}

function hookEnv (overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env = testEnvironment()
  delete env['NO_HOOK']
  delete env['CHATIE_INNER_PRE_HOOK']
  delete env['NODE_OPTIONS']
  delete env['NODE_V8_COVERAGE']
  for (const [ key, value ] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key]
    } else {
      env[key] = value
    }
  }
  return env
}

function push (
  repository: string,
  args: string[],
  env = hookEnv(),
): SpawnSyncReturns<string> {
  return spawnSync('git', [ 'push', ...args ], {
    cwd: repository,
    encoding: 'utf8',
    env,
    timeout: 60_000,
  })
}

function output (result: SpawnSyncReturns<string>): string {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`
}

function readVersion (repository: string): string {
  return JSON.parse(readFileSync(join(repository, 'package.json'), 'utf8')).version
}

function commitFile (repository: string, name: string, contents: string, message: string): void {
  writeFileSync(join(repository, name), contents)
  git(repository, 'add', name)
  git(repository, 'commit', '-m', message, '-m', coauthor)
}

function remoteHasRef (repo: Repository, ref: string): boolean {
  const result = spawnSync('git', [ '--git-dir', repo.remote, 'show-ref', '--verify', '--quiet', ref ], {
    cwd: repo.temporaryDirectory,
    encoding: 'utf8',
    env: testEnvironment(),
    timeout: 30_000,
  })
  return result.status === 0
}

function remoteRev (repo: Repository, ref: string): string {
  return git(repo.temporaryDirectory, '--git-dir', repo.remote, 'rev-parse', ref)
}

async function withRepository (
  options: { branch?: string, lint?: string, version?: string },
  run: (repo: Repository) => Promise<void> | void,
): Promise<void> {
  const repo = createRepository(options)
  try {
    await run(repo)
  } finally {
    rmSync(repo.temporaryDirectory, { force: true, recursive: true })
  }
}

testPrePush('pre-push keeps version tags local until manually pushed', { timeout: 180_000 }, async _t => {
  await withRepository({}, repo => {
    git(repo.repository, 'push', '--set-upstream', 'origin', 'main')
    installHook(repo.repository)
    git(repo.repository, 'config', 'push.followTags', 'true')
    git(repo.repository, 'tag', '-a', 'v2.0.0-alpha.1', '-m', 'Older local tag')
    commitFile(repo.repository, 'change.txt', 'change\n', 'Test change')

    const branchPush = push(repo.repository, [ 'origin', 'main' ])
    assert.equal(branchPush.status, 1, 'outer push is cancelled after the version commit is pushed')
    assert.match(branchPush.stderr ?? '', /tag remains local/, 'reports that the version tag remains local')
    assert.match(branchPush.stderr ?? '', /Push tags separately/, 'warns that tag updates were not forwarded')
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), remoteRev(repo, 'refs/heads/main'), 'remote branch has the version commit')
    assert.equal(git(repo.repository, 'rev-parse', 'refs/remotes/origin/main'), remoteRev(repo, 'refs/heads/main'), 'origin/main tracks the published version commit')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.3', 'alpha version is incremented')
    assert.deepStrictEqual(git(repo.repository, 'tag', '--list').split('\n'), [ 'v2.0.0-alpha.1', 'v2.0.0-alpha.3' ], 'both tags remain local')
    assert.equal(git(repo.temporaryDirectory, '--git-dir', repo.remote, 'tag', '--list'), '', 'no tags are pushed, even with push.followTags enabled')

    const tagPush = push(repo.repository, [ '--no-follow-tags', 'origin', 'v2.0.0-alpha.3' ])
    assert.equal(tagPush.status, 0, 'manual tag-only push succeeds')
    assert.equal(git(repo.temporaryDirectory, '--git-dir', repo.remote, 'tag', '--list'), 'v2.0.0-alpha.3', 'only the requested tag is pushed')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.3', 'manual tag push does not bump the version')
  })
})

testPrePush('pre-push leaves the first feature push unversioned', { timeout: 180_000 }, async _t => {
  await withRepository({
    branch: 'feat/example',
    lint: 'node -e "console.log(\'fixture-lint-ran\')"',
  }, repo => {
    installHook(repo.repository)
    const original = git(repo.repository, 'rev-parse', 'HEAD')
    const firstPush = push(repo.repository, [ '-u', 'origin', 'feat/example' ])

    assert.equal(firstPush.status, 0, 'first feature push succeeds')
    assert.match(output(firstPush), /fixture-lint-ran/, 'feature push runs lint')
    assert.equal(git(repo.repository, 'rev-parse', '--abbrev-ref', '@{upstream}'), 'origin/feat/example', 'upstream is configured by the original push')
    assert.equal(remoteRev(repo, 'refs/heads/feat/example'), original, 'remote receives the original commit')
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), original, 'HEAD stays on the original commit')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2', 'manifest version stays unchanged')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '1', 'no version commit is created')
    assert.equal(git(repo.repository, 'tag', '--list'), '', 'no local tags are created')

    commitFile(repo.repository, 'change.txt', 'change\n', 'Feature change')
    const second = git(repo.repository, 'rev-parse', 'HEAD')
    const secondPush = push(repo.repository, [ 'origin', 'feat/example' ])

    assert.equal(secondPush.status, 0, 'later feature push succeeds')
    assert.match(output(secondPush), /fixture-lint-ran/, 'later feature push still runs lint')
    assert.equal(remoteRev(repo, 'refs/heads/feat/example'), second, 'remote receives the new feature commit')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2', 'later feature push keeps the version')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '2', 'later feature push adds no version commit')
    assert.equal(git(repo.repository, 'tag', '--list'), '', 'later feature push adds no tags')

    writePackage(repo.repository, '2.0.0-alpha.2', 'node -e "console.error(\'fixture-lint-failed\'); process.exit(1)"')
    commitFile(repo.repository, 'package.json', readFileSync(join(repo.repository, 'package.json'), 'utf8'), 'Break lint')
    const third = git(repo.repository, 'rev-parse', 'HEAD')
    const failedPush = push(repo.repository, [ 'origin', 'feat/example' ])

    assert.equal(failedPush.status, 1, 'lint failure blocks the feature push')
    assert.match(output(failedPush), /fixture-lint-failed/, 'failing lint command runs')
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), third, 'lint failure leaves HEAD on the user commit')
    assert.equal(remoteRev(repo, 'refs/heads/feat/example'), second, 'lint failure publishes nothing')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2', 'lint failure leaves the version unchanged')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '3', 'lint failure adds no version commit')
    assert.equal(git(repo.repository, 'tag', '--list'), '', 'lint failure adds no tags')
  })
})

testPrePush('pre-push versions a release branch on its first push', { timeout: 180_000 }, async _t => {
  await withRepository({}, repo => {
    installHook(repo.repository)
    const branchPush = push(repo.repository, [ 'origin', 'main' ])

    assert.equal(branchPush.status, 1, 'outer release push exits 1')
    assert.match(branchPush.stderr ?? '', /tag remains local/, 'reports the release-only cancellation')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.3', 'main gets exactly one alpha bump')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '2', 'main gets exactly one version commit')
    assert.equal(git(repo.repository, 'tag', '--list'), 'v2.0.0-alpha.3', 'the new tag stays local')
    assert.equal(remoteRev(repo, 'refs/heads/main'), git(repo.repository, 'rev-parse', 'HEAD'), 'remote main receives the version commit without an upstream')
    assert.equal(git(repo.temporaryDirectory, '--git-dir', repo.remote, 'tag', '--list'), '', 'the version tag is not pushed')
  })

  await withRepository({ branch: 'v1.10' }, repo => {
    installHook(repo.repository)
    const branchPush = push(repo.repository, [ 'origin', 'HEAD' ])

    assert.equal(branchPush.status, 1, 'outer version-branch push exits 1')
    assert.match(branchPush.stderr ?? '', /tag remains local/)
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.3', 'v1.10 gets exactly one alpha bump')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '2')
    assert.equal(remoteRev(repo, 'refs/heads/v1.10'), git(repo.repository, 'rev-parse', 'HEAD'), 'remote version branch receives the version commit')
    assert.equal(remoteHasRef(repo, 'refs/heads/main'), false, 'pushing HEAD publishes only the version branch')
  })

  await withRepository({ branch: 'version-cleanup' }, repo => {
    installHook(repo.repository)
    const original = git(repo.repository, 'rev-parse', 'HEAD')
    const branchPush = push(repo.repository, [ '-u', 'origin', 'version-cleanup' ])

    assert.equal(branchPush.status, 0, 'a version-looking non-release branch pushes normally')
    assert.equal(remoteRev(repo, 'refs/heads/version-cleanup'), original)
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2', 'version-cleanup is outside the npm publish pattern')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '1')
    assert.equal(git(repo.repository, 'tag', '--list'), '')
  })
})

testPrePush('pre-push honors one eligible release destination and rejects other release updates', { timeout: 180_000 }, async _t => {
  await withRepository({ version: '2.0.0' }, repo => {
    git(repo.repository, 'checkout', '-b', 'unrelated')
    commitFile(repo.repository, 'unrelated.txt', 'unrelated\n', 'Unrelated')
    git(repo.repository, 'checkout', 'main')
    installHook(repo.repository)
    const originalMain = git(repo.repository, 'rev-parse', 'HEAD')
    const branchPush = push(repo.repository, [ 'origin', 'main:v1.10' ])

    assert.equal(branchPush.status, 1)
    assert.match(branchPush.stderr ?? '', /tag remains local/)
    assert.equal(readVersion(repo.repository), '2.0.1', 'stable versions increment by patch')
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD^'), originalMain, 'the version commit stays on the checked-out branch')
    assert.equal(remoteRev(repo, 'refs/heads/v1.10'), git(repo.repository, 'rev-parse', 'HEAD'), 'the requested destination receives the version commit')
    assert.equal(git(repo.temporaryDirectory, '--git-dir', repo.remote, 'show-ref'), `${git(repo.repository, 'rev-parse', 'HEAD')} refs/heads/v1.10`, 'unrelated refs stay unpushed')
  })

  await withRepository({}, repo => {
    git(repo.repository, 'checkout', '-b', 'feat/example')
    commitFile(repo.repository, 'feature.txt', 'feature\n', 'Feature')
    installHook(repo.repository)
    const mainCommit = git(repo.repository, 'rev-parse', 'main')
    const featureCommit = git(repo.repository, 'rev-parse', 'HEAD')
    const mismatched = push(repo.repository, [ 'origin', 'main:main' ])

    assert.equal(mismatched.status, 1, 'a release update from another checkout is rejected')
    assert.match(mismatched.stderr ?? '', /checked-out branch/)
    assert.equal(git(repo.repository, 'rev-parse', 'main'), mainCommit, 'rejection happens before npm version')
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), featureCommit)
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2')
    assert.equal(git(repo.repository, 'tag', '--list'), '')
    assert.equal(remoteHasRef(repo, 'refs/heads/main'), false)
  })

  await withRepository({}, repo => {
    git(repo.repository, 'checkout', '-b', 'feat/example')
    commitFile(repo.repository, 'feature.txt', 'feature\n', 'Feature')
    git(repo.repository, 'checkout', 'main')
    commitFile(repo.repository, 'main.txt', 'main\n', 'Main change')
    installHook(repo.repository)
    const mainCommit = git(repo.repository, 'rev-parse', 'HEAD')
    const multiple = push(repo.repository, [ 'origin', 'main', 'feat/example' ])

    assert.equal(multiple.status, 1, 'multiple branch updates that include a release are rejected')
    assert.match(multiple.stderr ?? '', /multiple branch updates/)
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), mainCommit, 'rejection happens before npm version')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '2')
    assert.equal(git(repo.repository, 'tag', '--list'), '')
    assert.equal(remoteHasRef(repo, 'refs/heads/main'), false)
    assert.equal(remoteHasRef(repo, 'refs/heads/feat/example'), false)
  })

  await withRepository({}, repo => {
    const mirror = join(repo.temporaryDirectory, 'mirror.git')
    git(repo.temporaryDirectory, 'init', '--bare', '--initial-branch=main', mirror)
    git(repo.repository, 'remote', 'set-url', '--add', '--push', 'origin', repo.remote)
    git(repo.repository, 'remote', 'set-url', '--add', '--push', 'origin', mirror)
    installHook(repo.repository)
    const original = git(repo.repository, 'rev-parse', 'HEAD')
    const multiUrl = push(repo.repository, [ 'origin', 'main' ])

    assert.equal(multiUrl.status, 1, 'a release push to a remote with several push URLs is rejected')
    assert.match(multiUrl.stderr ?? '', /2 push URLs/)
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), original, 'rejection happens before npm version')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2')
    assert.equal(git(repo.repository, 'tag', '--list'), '')
    assert.equal(remoteHasRef(repo, 'refs/heads/main'), false)
    assert.equal(spawnSync('git', [ '--git-dir', mirror, 'show-ref', '--verify', '--quiet', 'refs/heads/main' ], { env: testEnvironment() }).status, 1, 'the second push URL is not updated')
  })
})

testPrePush('pre-push ignores deletions and feature updates while a release branch is checked out', { timeout: 180_000 }, async _t => {
  await withRepository({}, repo => {
    git(repo.repository, 'checkout', '-b', 'feat/example')
    commitFile(repo.repository, 'feature.txt', 'feature\n', 'Feature')
    const featureCommit = git(repo.repository, 'rev-parse', 'HEAD')
    git(repo.repository, 'checkout', 'main')
    git(repo.repository, 'push', 'origin', 'feat/example')
    installHook(repo.repository)
    const mainCommit = git(repo.repository, 'rev-parse', 'HEAD')

    const deletion = push(repo.repository, [ 'origin', '--delete', 'feat/example' ])
    assert.equal(deletion.status, 0, 'branch deletion succeeds')
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), mainCommit, 'deletion leaves the release branch unbumped')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2')
    assert.equal(git(repo.repository, 'tag', '--list'), '')
    assert.equal(remoteHasRef(repo, 'refs/heads/feat/example'), false, 'the remote feature branch is deleted')

    const featurePush = push(repo.repository, [ 'origin', 'feat/example' ])
    assert.equal(featurePush.status, 0, 'a feature push from a release checkout succeeds')
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), mainCommit, 'the checked-out release branch is not bumped')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2')
    assert.equal(git(repo.repository, 'tag', '--list'), '')
    assert.equal(remoteRev(repo, 'refs/heads/feat/example'), featureCommit)
    assert.equal(remoteHasRef(repo, 'refs/heads/main'), false, 'the release branch itself is not pushed')
  })
})

testPrePush('pre-push rejects an existing next tag before creating a version commit', { timeout: 180_000 }, async _t => {
  await withRepository({}, repo => {
    installHook(repo.repository)
    git(repo.repository, 'tag', 'v2.0.0-alpha.3')
    const original = git(repo.repository, 'rev-parse', 'HEAD')
    const branchPush = push(repo.repository, [ 'origin', 'main' ])

    assert.equal(branchPush.status, 1)
    assert.match(branchPush.stderr ?? '', /already exists locally/)
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), original)
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2')
    assert.equal(git(repo.repository, 'tag', '--list'), 'v2.0.0-alpha.3')
    assert.equal(remoteHasRef(repo, 'refs/heads/main'), false)
  })

  await withRepository({}, repo => {
    git(repo.repository, 'tag', 'v2.0.0-alpha.3')
    git(repo.repository, 'push', 'origin', 'main', 'v2.0.0-alpha.3')
    git(repo.repository, 'tag', '-d', 'v2.0.0-alpha.3')
    commitFile(repo.repository, 'change.txt', 'change\n', 'After remote tag')
    installHook(repo.repository)
    const original = git(repo.repository, 'rev-parse', 'HEAD')
    const branchPush = push(repo.repository, [ 'origin', 'main' ])

    assert.equal(branchPush.status, 1)
    assert.match(branchPush.stderr ?? '', /already exists on origin/)
    assert.equal(git(repo.repository, 'rev-parse', 'HEAD'), original)
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2')
    assert.equal(git(repo.repository, 'tag', '--list'), '')
    assert.equal(remoteRev(repo, 'refs/heads/main'), git(repo.repository, 'rev-parse', 'HEAD~1'), 'remote main stays at the pre-collision commit')
  })
})

testPrePush('pre-push keeps a failed nested release push failed', { timeout: 180_000 }, async _t => {
  await withRepository({}, repo => {
    installHook(repo.repository)
    writeFileSync(join(repo.remote, 'hooks', 'pre-receive'), '#!/bin/sh\nexit 1\n', { mode: 0o755 })
    const branchPush = push(repo.repository, [ 'origin', 'main' ])

    assert.equal(branchPush.status, 1, 'nested push failure stays a failure')
    assert.doesNotMatch(branchPush.stderr ?? '', /tag remains local/, 'a failed nested push is not reported as published')
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.3', 'the hook does not retry the version bump')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '2')
    assert.equal(git(repo.repository, 'tag', '--list'), 'v2.0.0-alpha.3')
    assert.equal(remoteHasRef(repo, 'refs/heads/main'), false, 'the rejected version commit stays off the remote')
  })
})

testPrePush('pre-push bypasses versioning for NO_HOOK and the recursion guard', { timeout: 180_000 }, async _t => {
  await withRepository({}, repo => {
    installHook(repo.repository)
    const original = git(repo.repository, 'rev-parse', 'HEAD')
    const skipped = push(repo.repository, [ 'origin', 'main' ], hookEnv({ NO_HOOK: '1' }))

    assert.equal(skipped.status, 0)
    assert.equal(remoteRev(repo, 'refs/heads/main'), original)
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '1')
    assert.equal(git(repo.repository, 'tag', '--list'), '')

    commitFile(repo.repository, 'change.txt', 'change\n', 'Guarded change')
    const second = git(repo.repository, 'rev-parse', 'HEAD')
    const guarded = push(repo.repository, [ 'origin', 'main' ], hookEnv({ CHATIE_INNER_PRE_HOOK: '1' }))

    assert.equal(guarded.status, 0, 'the recursion guard lets the calling push finish')
    assert.equal(remoteRev(repo, 'refs/heads/main'), second)
    assert.equal(readVersion(repo.repository), '2.0.0-alpha.2')
    assert.equal(git(repo.repository, 'rev-list', '--count', 'HEAD'), '2')
    assert.equal(git(repo.repository, 'tag', '--list'), '')
  })
})
