import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const runtime = process.argv[2] ?? 'both'
assert.ok(['node', 'deno', 'both'].includes(runtime), 'Expected node, deno, or both')

function run (command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    timeout: 600_000,
    shell: process.platform === 'win32' && command === 'npm',
  })
  if (result.error) {
    throw result.error
  }
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed`)
}

const consumer = await mkdtemp(path.join(tmpdir(), 'wechaty-examples-'))
try {
  run('npm', ['run', 'dist'], root)
  const packed = spawnSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', consumer], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 60_000,
  })
  assert.equal(packed.status, 0, packed.stderr)
  const [tarball] = JSON.parse(packed.stdout)
  assert.ok(tarball)
  assert.ok(!tarball.files.some((file: { path: string }) =>
    /examples\/canonical\/|canonical-examples\.test\.|scripts\/test-examples\./.test(file.path)),
  'Canonical examples and their harness must not ship in the production package')

  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
  const version = (name: string): string => lock.packages[`node_modules/${name}`].version
  await writeFile(path.join(consumer, 'package.json'), JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      wechaty: `file:./${tarball.filename}`,
      'wechaty-puppet-mock': version('wechaty-puppet-mock'),
      '@types/node': version('@types/node'),
      '@typescript/native': `npm:typescript@${version('@typescript/native')}`,
    },
  }))
  await cp(path.join(root, 'examples/canonical'), path.join(consumer, 'examples/canonical'), { recursive: true })
  await mkdir(path.join(consumer, 'tests/fixtures'), { recursive: true })
  await cp(path.join(root, 'tests/fixtures/canonical-examples.test.ts'), path.join(consumer, 'tests/fixtures/canonical-examples.test.ts'))
  await writeFile(path.join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      strict: true,
      noUncheckedIndexedAccess: true,
      skipLibCheck: true,
      esModuleInterop: true,
      outDir: 'out',
      types: ['node'],
    },
    include: ['examples/**/*.ts', 'tests/**/*.ts'],
  }))
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer)
  run(process.execPath, ['node_modules/@typescript/native/bin/tsc', '--project', 'tsconfig.json'], consumer)
  const test = 'out/tests/fixtures/canonical-examples.test.js'
  if (runtime !== 'deno') {
    run(process.execPath, ['--test', test], consumer)
  }
  if (runtime !== 'node') {
    run('deno', [
      'test', '--no-check', '--node-modules-dir=manual',
      '--allow-read', '--allow-env', '--allow-sys', '--deny-net', '--no-prompt',
      `--allow-ffi=${path.join(consumer, 'node_modules/leveldown')}`,
      test,
    ], consumer)
  }
} finally {
  await rm(consumer, { recursive: true, force: true })
}
