#!/usr/bin/env -S node --import=tsx/esm
import { lstat, readdir, rm, stat } from 'node:fs/promises'
import { dirname, join, parse, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function cleanBuildOutput (repositoryRoot: string): Promise<void> {
  const root = resolve(repositoryRoot)
  const buildDirectory = resolve(root, 'dist')

  if (root === parse(root).root || dirname(buildDirectory) !== root) {
    throw new Error(`Refusing to clean build output outside a repository: ${root}`)
  }

  const rootStats = await stat(root)
  if (!rootStats.isDirectory()) {
    throw new Error(`Repository path is not a directory: ${root}`)
  }

  let entries: string[]
  try {
    const buildStats = await lstat(buildDirectory)
    if (buildStats.isSymbolicLink() || !buildStats.isDirectory()) {
      throw new Error(`Build output path is not a directory: ${buildDirectory}`)
    }
    entries = await readdir(buildDirectory)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }
    throw error
  }

  for (const entry of entries) {
    if (!entry.startsWith('.')) {
      await rm(join(buildDirectory, entry), { force: true, recursive: true })
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repositoryRoot = resolve(fileURLToPath(new URL('../', import.meta.url)))
  cleanBuildOutput(repositoryRoot)
    .catch(error => {
      console.error(error)
      process.exitCode = 1
    })
}
