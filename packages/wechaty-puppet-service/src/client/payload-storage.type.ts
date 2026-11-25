/**
 * The contract both `#payload-storage` builds implement: where `PayloadStore`
 * keeps the stores of one token, and how that location is removed. The stores
 * themselves belong to `flash-store`, which picks its own backend by the same
 * export conditions, so the two always agree on the platform.
 */
export interface PayloadStorage {
  /**
   * Returns the location that holds every account of `token` for one cache
   * `version`. No other token or version lives under it.
   */
  root (token: string, version: string): string

  /** Returns the `FlashStore` location of one account's store under `root`. */
  storePath (root: string, accountId: string, storeName: string): string

  /**
   * Removes everything under `root`, including stores that another
   * `PayloadStore` created. The stores must be closed. Resolves when nothing
   * is left, also when there was nothing to remove; rejects otherwise.
   */
  remove (root: string): Promise<void>
}
