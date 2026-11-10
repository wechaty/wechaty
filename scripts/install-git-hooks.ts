#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

if (!existsSync(resolve(repositoryRoot, '.git'))) {
  process.exit(0)
}

const gitHooksPathResult = spawnSync(
  'git',
  [ 'rev-parse', '--path-format=absolute', '--git-path', 'wechaty-hooks' ],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
  },
)

if (gitHooksPathResult.error) {
  throw gitHooksPathResult.error
}

if (gitHooksPathResult.status !== 0) {
  process.exit(gitHooksPathResult.status ?? 1)
}

const gitHooksPath = gitHooksPathResult.stdout.trim()
if (!gitHooksPath) {
  throw new Error('Git did not provide a path for the hook directory.')
}

mkdirSync(gitHooksPath, { recursive: true })

const hookPath = resolve(gitHooksPath, 'pre-push')
const hookScriptPath = resolve(repositoryRoot, 'scripts/pre-push.ts')
rmSync(hookPath, { force: true })
symlinkSync(hookScriptPath, hookPath)

const result = spawnSync(
  'git',
  [ 'config', '--local', 'core.hooksPath', gitHooksPath ],
  {
    cwd: repositoryRoot,
    stdio: 'inherit',
  },
)

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
