import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { test } from 'tstest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function git (cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

const testPrePush = process.platform === 'win32' ? test.skip : test

testPrePush('pre-push keeps version tags local until manually pushed', async t => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'wechaty-pre-push-'))
  const repository = join(temporaryDirectory, 'repository')
  const remote = join(temporaryDirectory, 'remote.git')

  try {
    mkdirSync(repository)
    git(temporaryDirectory, 'init', '--bare', '--initial-branch=main', remote)
    git(repository, 'init', '--initial-branch=main')
    git(repository, 'config', 'user.name', 'Test')
    git(repository, 'config', 'user.email', 'test@example.invalid')
    git(repository, 'config', 'commit.gpgsign', 'false')
    git(repository, 'config', 'tag.gpgsign', 'false')

    mkdirSync(join(repository, 'scripts'))
    copyFileSync(join(repositoryRoot, 'scripts/pre-push.ts'), join(repository, 'scripts/pre-push.ts'))
    symlinkSync(join(repositoryRoot, 'node_modules'), join(repository, 'node_modules'), 'dir')
    writeFileSync(join(repository, '.gitignore'), 'node_modules\n')
    writeFileSync(join(repository, 'package.json'), JSON.stringify({
      name: 'pre-push-test',
      scripts: { lint: 'node -e ""' },
      type: 'module',
      version: '2.0.0-alpha.2',
    }))
    git(repository, 'add', '.')
    git(repository, 'commit', '-m', 'Initial test commit', '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>')
    git(repository, 'remote', 'add', 'origin', remote)
    git(repository, 'push', '--set-upstream', 'origin', 'main')

    symlinkSync(join(repository, 'scripts/pre-push.ts'), join(repository, '.git/hooks/pre-push'))
    git(repository, 'config', 'push.followTags', 'true')
    git(repository, 'tag', '-a', 'v2.0.0-alpha.1', '-m', 'Older local tag')
    writeFileSync(join(repository, 'change.txt'), 'change\n')
    git(repository, 'add', 'change.txt')
    git(repository, 'commit', '-m', 'Test change', '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>')

    const env = { ...process.env }
    delete env['NO_HOOK']
    delete env['CHATIE_INNER_PRE_HOOK']
    delete env['NODE_OPTIONS']
    delete env['NODE_V8_COVERAGE']
    const branchPush = spawnSync('git', [ 'push', 'origin', 'main' ], {
      cwd: repository,
      encoding: 'utf8',
      env,
    })
    t.equal(branchPush.status, 1, 'outer push is cancelled after the version commit is pushed')
    t.match(branchPush.stderr, /tag remains local/, 'reports that the version tag remains local')
    t.equal(git(repository, 'rev-parse', 'HEAD'), git(temporaryDirectory, '--git-dir', remote, 'rev-parse', 'refs/heads/main'), 'remote branch has the version commit')
    t.equal(JSON.parse(readFileSync(join(repository, 'package.json'), 'utf8')).version, '2.0.0-alpha.3', 'alpha version is incremented')
    t.same(git(repository, 'tag', '--list').split('\n'), [ 'v2.0.0-alpha.1', 'v2.0.0-alpha.3' ], 'both tags remain local')
    t.equal(git(temporaryDirectory, '--git-dir', remote, 'tag', '--list'), '', 'no tags are pushed, even with push.followTags enabled')

    const tagPush = spawnSync('git', [ 'push', '--no-follow-tags', 'origin', 'v2.0.0-alpha.3' ], {
      cwd: repository,
      encoding: 'utf8',
      env,
    })
    t.equal(tagPush.status, 0, 'manual tag-only push succeeds')
    t.equal(git(temporaryDirectory, '--git-dir', remote, 'tag', '--list'), 'v2.0.0-alpha.3', 'only the requested tag is pushed')
    t.equal(JSON.parse(readFileSync(join(repository, 'package.json'), 'utf8')).version, '2.0.0-alpha.3', 'manual tag push does not bump the version')
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  }
})
