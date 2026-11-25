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

export const payloadStorage: PayloadStorage = {
  root: (token, version) =>
    path.join(os.homedir(), '.wechaty', 'wechaty-puppet-service', token, version),

  // LMDB creates the missing parent folders when it opens the store.
  storePath: (root, accountId, storeName) =>
    path.join(root, accountId, storeName),

  remove: root => fs.promises.rm(root, { force: true, recursive: true }),
}
