/**
 * Shared settings for `wechaty-token`: the logger every module uses, and the
 * default discovery authority (`api.chatie.io`) used when a token or gRPC
 * target names none.
 */
import { log } from 'brolog'

const DEFAULT_AUTHORITY = 'api.chatie.io'

export {
  DEFAULT_AUTHORITY,
  log,
}
