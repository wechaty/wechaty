#!/usr/bin/env node
/**
 * Generates the JavaScript stubs and TypeScript typings for every .proto file
 * into `out/` (gitignored). `npm run generate` runs it, and so do the lint,
 * test, coverage and build scripts first.
 *
 * It uses only npm devDependencies, so it works on Linux, macOS and Windows
 * without a system `protoc`, Go or network access:
 *   1. `protoc` and the gRPC Node plugin from `grpc-tools`: JavaScript messages
 *      (google-protobuf) and grpc-js service stubs;
 *   2. `protoc-gen-ts` from `grpc_tools_node_protoc_ts`: the service typings;
 *   3. `protoc-gen-ts` from `ts-protoc-gen`: the message typings, overwriting
 *      step 2's. They declare each enum with a `XxxMap` interface, as the 1.x
 *      output did and `wechaty-puppet-service` expects.
 * Inputs are `proto/` and the pinned files in `third-party/` (see its README).
 * The other-language packages in `polyglot/`, the OpenAPI document and
 * grpc-web stubs are not generated (wechaty/wechaty#3054).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_DIR = fileURLToPath(new URL('../', import.meta.url))
const OUT_DIR = join(PACKAGE_DIR, 'out')
const isWindows = process.platform === 'win32'

// npm workspaces install devDependencies at the monorepo root; resolve them
// through Node so this works from either location.
const require = createRequire(import.meta.url)
const packageDir = (name: string) => dirname(require.resolve(`${name}/package.json`))

const grpcToolsBin = join(packageDir('grpc-tools'), 'bin')
const exe = (name: string) => join(grpcToolsBin, isWindows ? `${name}.exe` : name)
const protocPath = exe('protoc')

if (!existsSync(protocPath)) {
  console.error(`protoc is missing at ${protocPath}: the grpc-tools install script must run (see allowScripts in the root package.json).`)
  process.exit(1)
}

/**
 * The path protoc should run for a Node-script plugin. On Windows protoc can
 * only start executables, so the script gets a `.cmd` shim in `shimDir`.
 */
function pluginPath (scriptPath: string, shimName: string, shimDir: string): string {
  if (!isWindows) {
    return scriptPath
  }
  const shim = join(shimDir, `${shimName}.cmd`)
  writeFileSync(shim, `@"${process.execPath}" "${scriptPath}" %*\r\n`)
  return shim
}

/** Every .proto file under `dir`, relative to `dir`, sorted for stable output. */
function protoFiles (dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter(file => file.endsWith('.proto'))
    .map(file => join(dir, file))
    .sort()
}

const shimDir = mkdtempSync(join(tmpdir(), 'wechaty-grpc-plugins-'))
try {
  const grpcTsPlugin = pluginPath(join(packageDir('grpc_tools_node_protoc_ts'), 'bin', 'protoc-gen-ts'), 'protoc-gen-grpc-ts', shimDir)
  const messageTsPlugin = pluginPath(join(packageDir('ts-protoc-gen'), 'bin', 'protoc-gen-ts'), 'protoc-gen-message-ts', shimDir)

  const inputs = [
    ...protoFiles(join(PACKAGE_DIR, 'third-party')),
    ...protoFiles(join(PACKAGE_DIR, 'proto')),
  ]
  const protoc = (args: string[]) => execFileSync(protocPath, [
    `-I${join(PACKAGE_DIR, 'third-party')}`,
    `-I${join(PACKAGE_DIR, 'proto')}`,
    ...args,
    ...inputs,
  ], { stdio: 'inherit' })

  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })

  // 1. JavaScript messages (google-protobuf) and grpc-js service stubs.
  protoc([
    `--js_out=import_style=commonjs,binary:${OUT_DIR}`,
    `--grpc_out=grpc_js:${OUT_DIR}`,
    `--plugin=protoc-gen-grpc=${exe('grpc_node_plugin')}`,
  ])
  // 2. Typings for the service stubs (and, provisionally, the messages).
  protoc([
    `--grpc_out=grpc_js:${OUT_DIR}`,
    `--plugin=protoc-gen-grpc=${grpcTsPlugin}`,
  ])
  // 3. Typings for the messages, overwriting step 2's.
  protoc([
    `--ts_out=${OUT_DIR}`,
    `--plugin=protoc-gen-ts=${messageTsPlugin}`,
  ])

  // The generated files are CommonJS; mark the directory so Node and Deno
  // load them as such from this ESM package.
  writeFileSync(join(OUT_DIR, 'package.json'), '{"type": "commonjs"}\n')
} finally {
  rmSync(shimDir, { recursive: true, force: true })
}
