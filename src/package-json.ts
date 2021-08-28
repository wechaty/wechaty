/**
 * This file will be overwrite when we publish NPM module
 * by scripts/generate_version.ts
 */
import { PackageJson } from 'type-fest'

/**
 * Huan(202108):
 *  The below default values is only for unit testing
 */
export const packageJson: PackageJson = {
  wechaty: {
    DEFAULT_APIHOST  : 'api.chatie.io',
    DEFAULT_PORT     : 8080,
    DEFAULT_PROTOCOL : 'io|0.0.1',
  },
}
export const GIT_COMMIT_HASH = 'GIT_COMMIT_HASH'
