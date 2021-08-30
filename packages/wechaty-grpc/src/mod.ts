import * as grpc    from '@grpc/grpc-js'
import * as puppet  from './generated'

import {
  StringValue,
}               from 'google-protobuf/google/protobuf/wrappers_pb'

import * as proto   from './proto'
import * as openApi from './openapi'
import {
  VERSION,
}           from './config'

/**
 * https://stackoverflow.com/a/67697999/1123955
 *  Typescript class variables and error:
 *    “refers to a value, but is being used as a type here.
 *    Did you mean typeof' …”. Why exactly?
 */

export {
  grpc,
  openApi,
  proto,
  puppet,
  StringValue,
  VERSION,
}
