/**
 * Test helper that keeps the client's payload store out of the real home
 * directory.
 *
 * `PayloadStore` puts its files under `os.homedir()/.wechaty`, and a
 * `PuppetService` starts its store when the mock puppet logs in. Without
 * this helper the unit tests would leave files in the developer's home, and
 * under Deno (which may write only to `/tmp`) the store could not start.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { TestContext } from 'node:test'

/**
 * Points `os.homedir()` at a new temporary directory for the rest of the
 * test `t`, and removes the directory when the test ends. Returns its path.
 * It patches the shared `os` module object, so it also changes what code
 * that imports `os` or `node:os` sees.
 */
export function useTempHome (t: TestContext): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wechaty-puppet-service-home-'))
  t.mock.method(os, 'homedir', () => home)
  t.after(() => fs.rmSync(home, { force: true, recursive: true }))
  return home
}
