/**
 * The native `#payload-storage`: places the LMDB folders of `PayloadStore`
 * under the user's home and removes them. Selected by the `node` condition
 * (Node.js, Deno, Bun) of `imports` in package.json. Counterpart:
 * `../client/payload-storage.ts`.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { PayloadStorage } from '../client/payload-storage.type.ts'

/**
 * Turns an opaque token or account id into exactly one path segment, so that
 * it can neither nest in another one's folder nor escape the root, which
 * `remove()` deletes recursively. Ids of letters, digits, `-` and `_` stay as
 * they are. `encodeURIComponent()` keeps dots, so `.` and `..` need their own rule.
 */
function segment (id: string): string {
  return encodeURIComponent(id).replace(/^\.{1,2}$/, dots => '%2E'.repeat(dots.length))
}

export const payloadStorage: PayloadStorage = {
  root: (token, version) =>
    path.join(os.homedir(), '.wechaty', 'wechaty-puppet-service', segment(token), version),

  // LMDB creates the missing parent folders when it opens the store.
  storePath: (root, accountId, storeName) =>
    path.join(root, segment(accountId), storeName),

  remove: root => fs.promises.rm(root, { force: true, recursive: true }),
}
