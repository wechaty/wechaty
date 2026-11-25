/**
 * The web-platform `#payload-storage`: names the origin-scoped IndexedDB
 * databases of `PayloadStore` and deletes them. Selected by the `browser` and
 * `default` conditions of `imports` in package.json, so it must not use
 * `node:*` modules or `process`. Counterpart: `../node/payload-storage.ts`.
 */
import { log } from 'wechaty-puppet'

import type { PayloadStorage } from './payload-storage.type.ts'

/**
 * `flash-store` prepends this to the location it is given to name the
 * database. It has no API to list databases, so the prefix is repeated here;
 * the `destroy()` tests in `payload-store.test.ts` fail in Chromium if it
 * ever changes.
 */
const FLASH_STORE_PREFIX = 'flash-store:'

/**
 * Resolves once the database is really gone and rejects when the deletion
 * fails. A `blocked` event is not an outcome: the deletion stays pending until
 * the other connections close, and `flash-store` handles close themselves on
 * request. So it is only logged.
 */
function deleteDatabase (name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror   = () => reject(request.error)
    request.onblocked = () => log.warn('PayloadStorage', 'remove() waits for another connection to close its database')
  })
}

export const payloadStorage: PayloadStorage = {
  // Encoding keeps a "/" inside a token or an account id from looking like a
  // separator, so that remove() matches exactly the databases under its root.
  root: (token, version) =>
    `wechaty-puppet-service/${encodeURIComponent(token)}/${version}`,

  storePath: (root, accountId, storeName) =>
    `${root}/${encodeURIComponent(accountId)}/${storeName}`,

  remove: async root => {
    if (typeof indexedDB === 'undefined') {
      throw new Error(
        'PayloadStorage: IndexedDB is not available in this runtime. '
        + 'Use a browser, or run on Node.js, Deno or Bun.',
      )
    }

    const prefix = `${FLASH_STORE_PREFIX}${root}/`
    const names = (await indexedDB.databases())
      .map(({ name }) => name)
      .filter(name => name !== undefined)
      .filter(name => name.startsWith(prefix))

    // Settle every deletion before reporting: a caller that retries, or opens
    // the stores again, must not race with a deletion still in flight.
    const errors = (await Promise.allSettled(names.map(deleteDatabase)))
      .filter(result => result.status === 'rejected')
      .map(result => result.reason)
    if (errors.length > 0) {
      throw new AggregateError(errors, `PayloadStorage: failed to delete ${errors.length} of ${names.length} databases`)
    }
  },
}
