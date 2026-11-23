/**
 * Main `wechaty-grpc` entry point: the generated `puppet` service and messages
 * (`PuppetService`, `PuppetClient`, `IPuppetServer`, …), the `google` health
 * check service, the `grpc` runtime (`@grpc/grpc-js`), the `proto` sources, the
 * `StringValue` and `Timestamp` wrappers, the upload and download chunk
 * transformers, and `VERSION`.
 */
import * as grpc  from '@grpc/grpc-js'

import * as proto     from './proto.ts'

import {
  google,
  puppet,
}                     from './cjs.ts'
import { VERSION }    from './config.ts'
import {
  StringValue,
  Timestamp,
}                     from './google.ts'
import {
  chunkEncoder,
  chunkDecoder,
}                     from './chunk-transformer.ts'

export {
  chunkEncoder,
  chunkDecoder,
  google,
  grpc,
  proto,
  puppet,
  StringValue,
  Timestamp,
  VERSION,
}
